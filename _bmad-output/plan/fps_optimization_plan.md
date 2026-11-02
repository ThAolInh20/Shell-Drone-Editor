# Kế hoạch tối ưu hóa hiệu năng và triệt tiêu sụt giảm FPS

## 1. Tổng quan mục tiêu
Kế hoạch này nhằm khắc phục triệt để các điểm nghẽn hiệu năng gây hiện tượng tụt khung hình (từ 60 FPS xuống 20-35 FPS hoặc micro-stutter) trong quá trình phát show pháo hoa và thao tác trên Timeline Editor.

Mục tiêu cốt lõi:
- Đảm bảo tốc độ khung hình ổn định ở mức 55 - 60 FPS trên màn hình tiêu chuẩn khi có từ 3.000 đến 5.000 hạt hoạt động đồng thời.
- Giảm thiểu hơn 95% áp lực cấp phát rác (Garbage Collection thrashing) trên V8 Main Thread.
- Triệt tiêu hoàn toàn hiện tượng Layout Thrashing (Synchronous Reflow) trên giao diện DOM.
- Tối ưu hóa chu kỳ kết xuất GPU của hệ thống phản chiếu mặt nước và xử lý hậu kỳ (Post-Processing).

---

## 2. Bảng phân tích chi tiết các điểm nghẽn (Root Cause Analysis)

### Điểm nghẽn 1: GC Thrashing trong render loop của FireworkSystem
- **Vị trí**: `./src/systems/FireworkSystem.js` (dòng 4166 - 4178) và `./src/factories/BurstEffectProcessor.js` (dòng 634 - 660).
- **Hiện trạng**: Trong hàm `updateBurstParticles`, mỗi hạt trên từng frame đều khởi tạo một anonymous object chứa options và nhận về một object `{ r, g, b }` mới tinh từ `resolveParticleColor`. Với 3.000 - 5.000 hạt ở 60 FPS, hệ thống sinh ra từ 360.000 đến 600.000 heap object mỗi giây, kích hoạt chu kỳ GC thu gom rác dồn dập khiến frame time nhảy vọt.
- **Giải pháp**:
  - Tái sử dụng một `_sharedColorOptions` singleton cấp module trong `FireworkSystem.js`.
  - Trong `BurstEffectProcessor.resolveParticleColor`, sử dụng một `_scratchColor = { r: 0, g: 0, b: 0 }` để ghi kết quả trả về, hoặc truyền trực tiếp mảng buffer `this.colors` và chỉ số `cIdx` để ghi trực tiếp không qua object trung gian.

### Điểm nghẽn 2: Cấp phát liên tục Vector3 và Color trong vòng lặp hạt
- **Vị trí**: `./src/systems/FireworkSystem.js` (dòng 3646, 3667, 3683, 3691, 3701, 3707, 3883, 4035, 4075).
- **Hiện trạng**: Sử dụng `new THREE.Vector3()`, `new THREE.Color()`, và `.clone()` bên trong vòng lặp `updateBurstParticles` cho va chạm mặt nước (hơi nước, tia nước) và tính toán vị trí vệt sáng nội suy.
- **Giải pháp**: Định nghĩa các scratch vectors và scratch colors tĩnh ở đầu file `./src/systems/FireworkSystem.js` (ví dụ `_scratchPos`, `_scratchVel`, `_scratchColor`, `_waterPuffPos`). Thay thế toàn bộ toán tử `new` bằng phương thức `.set(x, y, z)` hoặc `.copy()`.

### Điểm nghẽn 3: Layout Thrashing (Synchronous Reflow) trong TimelineEditor
- **Vị trí**: `./src/ui/TimelineEditor.js` (dòng 1980 - 1998 trong hàm `updatePlayhead`).
- **Hiện trạng**: Lệnh `this.trackContainer.getBoundingClientRect()` được gọi liên tục mỗi frame (60 lần/giây) bên trong `requestAnimationFrame` khi `autoScrollEnabled = true`. Thao tác này ép trình duyệt phải dừng thực thi để tính toán lại toàn bộ layout DOM. Đồng thời, việc cập nhật `this.playhead.style.left` kích hoạt lại pipeline Layout và Repaint trên Main Thread.
- **Giải pháp**:
  - Cache lại chiều rộng container (`this.cachedContainerWidth`) qua sự kiện window resize hoặc dùng thuộc tính không gây reflow `this.trackContainer.clientWidth`.
  - Chuyển đổi con trỏ Playhead sang sử dụng CSS Transform: `this.playhead.style.transform = 'translateX(' + x + 'px)'` kết hợp thuộc tính CSS `will-change: transform` để GPU Compositor xử lý hoàn toàn.

### Điểm nghẽn 4: Thiếu Object Pool ở TrailSystem
- **Vị trí**: `./src/systems/TrailSystem.js` (dòng 184 - 216 và dòng 283 - 290).
- **Hiện trạng**: Phương thức `spawnTrailParticle` liên tục cấp phát đối tượng hạt mới (`new THREE.Vector3()`, object particle) nhưng khi hạt chết thì chỉ cắt ngắn mảng, biến các object cũ thành rác cho GC.
- **Giải pháp**: Hiện thực cấu trúc `particlePool` (Free-list). Khi hạt hết vòng đời, đưa đối tượng trở lại pool. Khi sinh hạt mới, lấy lại từ pool và cập nhật thuộc tính bằng `.set()` thay vì gọi `new THREE.Vector3()`.

### Điểm nghẽn 5: Khởi tạo mảng tạm mới mỗi frame trong SmokeSystem
- **Vị trí**: `./src/systems/SmokeSystem.js` (dòng 1204 - 1352 trong hàm `update`).
- **Hiện trạng**: Khởi tạo mảng mới `const alive = [];` ở đầu mỗi frame, gọi `alive.push(puff)` rồi gán `this.puffs = alive`, khiến mảng cũ liên tục bị đẩy vào hàng đợi GC.
- **Giải pháp**: Áp dụng kỹ thuật dồn mảng tại chỗ (In-place Compaction / Two-pointer algorithm) với biến chỉ mục `writeIndex = 0`. Loại bỏ hoàn toàn mảng `alive` và vòng lặp phụ đếm số lượng hạt.

### Điểm nghẽn 6: Double Render Pass từ PlanarReflector
- **Vị trí**: `./src/core/SceneManager.js` (dòng 158 - 169) và `./src/environment/PlanarReflector.js` (dòng 160 - 185).
- **Hiện trạng**: Mỗi frame đều gọi `renderer.render(scene, this.reflectionCamera)`, buộc GPU phải render lại toàn bộ cảnh 3D lần thứ hai (gấp đôi draw calls và vertex processing).
- **Giải pháp**:
  - Áp dụng Three.js Layer Masking: Chỉ cho phép reflection camera render bầu trời và các cụm hạt phát sáng chính (`LAYER_REFLECTION`), loại trừ địa hình tĩnh, bàn làm việc, khói và vệt sáng phụ.
  - Hạ resolution scale của render target mặt nước xuống mức 0.35 - 0.50.
  - Throttling: Cập nhật phản chiếu cách frame (30 FPS) khi tải hệ thống cao.

### Điểm nghẽn 7: Quá tải Fill-rate của UnrealBloomPass trên màn hình HiDPI
- **Vị trí**: `./src/core/PostProcessingPipeline.js` (dòng 20 - 35).
- **Hiện trạng**: Bloom chạy ở độ phân giải gốc của viewport nhân với `pixelRatio`. Trên các màn hình 2K/4K (`pixelRatio >= 2.0`), số lượng pixel tính toán blur đa tầng tăng đột biến.
- **Giải pháp**: Khóa trần `maxPixelRatio` cho `EffectComposer` ở mức 1.25 hoặc 1.5.

---

## 3. Lộ trình thực hiện chi tiết (Implementation Phases)

### Giai đoạn 1: Triệt tiêu GC Thrashing & Sửa lỗi DOM Layout (Ưu tiên cao nhất)
1. **Task 1.1**: Sửa `TimelineEditor.js`:
   - Cache chiều rộng `trackContainer`.
   - Chuyển `this.playhead.style.left` sang `translateX` với GPU compositing.
2. **Task 1.2**: Tối ưu `resolveParticleColor` và `updateBurstParticles` trong `FireworkSystem.js`:
   - Tạo các module scratch vector và options singleton.
   - Loại bỏ mọi toán tử `new THREE.Vector3()` và `new THREE.Color()` trong vòng lặp cập nhật hạt.
3. **Task 1.3**: Viết test hồi quy kiểm tra tính chính xác của màu sắc và vị trí hạt sau khi áp dụng scratch objects.

### Giai đoạn 2: Tối ưu bộ nhớ đệm hạt trong SmokeSystem và TrailSystem
1. **Task 2.1**: Tái cấu trúc `SmokeSystem.js`:
   - Thay thế `const alive = []` bằng thuật toán In-place Compaction với `writeIndex`.
   - Gộp việc cập nhật `activeLaunchCount` và `activeAerialCount` vào vòng lặp chính.
2. **Task 2.2**: Bổ sung Object Pool cho `TrailSystem.js`:
   - Tạo mảng `this.particlePool = []`.
   - Tái sử dụng đối tượng hạt và các vector tọa độ/vận tốc.
3. **Task 2.3**: Chạy kiểm thử toàn bộ hệ sinh thái khói và vệt sáng (`vitest run tests/systems/SmokeSystem.test.js tests/systems/BurstTrailInterpolation.test.js`).

### Giai đoạn 3: Tối ưu GPU Render Pipeline & Planar Reflection
1. **Task 3.1**: Cấu hình Selective Layer Mask cho `PlanarReflector.js` và `SceneManager.js`:
   - Đảm bảo chỉ các đối tượng thuộc `LAYER_REFLECTION` mới được camera ảo ghi nhận.
   - Giảm độ phân giải mặc định của render target mặt nước xuống 0.5.
2. **Task 3.2**: Khóa giới hạn `pixelRatio` trong `PostProcessingPipeline.js`:
   - Giới hạn `Math.min(window.devicePixelRatio, 1.5)` cho `EffectComposer`.
3. **Task 3.3**: Chạy bộ test môi trường và phản chiếu (`vitest run tests/environment/PlanarReflector.test.js`).

---

## 4. Tiêu chí nghiệm thu (Acceptance Criteria)

1. **Hiệu năng CPU**:
   - Bộ nhớ Heap không còn tăng liên tục theo dạng răng cưa dốc đứng trong lúc trình diễn show.
   - Không có thông báo "Long Task" hoặc GC pause vượt quá 8ms trên Performance Profiler của DevTools.
2. **Hiệu năng DOM**:
   - Không còn cảnh báo "Forced synchronous reflow" liên quan đến `getBoundingClientRect` trong hàm `updatePlayhead`.
3. **Tốc độ khung hình (FPS)**:
   - FPS duy trì ổn định >= 55 FPS khi kích hoạt đồng thời nhiều loạt pháo hoa lớn.
4. **Tính toàn vẹn hệ thống**:
   - Toàn bộ 51 test suites và hơn 416 unit tests hiện có trong dự án phải vượt qua 100% không có lỗi hồi quy.

