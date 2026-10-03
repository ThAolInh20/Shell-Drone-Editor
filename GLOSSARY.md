# Thuật Ngữ Dự Án: Drone Formation Editor

Tài liệu này quy định các thuật ngữ lập trình và thuật ngữ nghiệp vụ được sử dụng thống nhất trong codebase của dự án Drone Formation Editor, đặc biệt là các thành phần trên màn hình Editor (Timeline & Inspector).

## 1. Các Thành phần trên Timeline (Timeline Components)

### Playhead
- Định nghĩa: Đầu đọc phát nhạc/kịch bản thời gian thực.
- Hiển thị: Vạch dọc đứng màu đỏ (hoặc xanh lá khi đang phát) di chuyển trên timeline.
- Trong code: `this.playhead` (thuộc lớp `TimelineEditor`). Liên kết với `this.showDirector.elapsedTime` để lấy thời gian hiện tại của show.

### Anchor Head / Anchor Time
- Tên gọi khác: vạch xanh, vạch đỏ trên timeline
- Định nghĩa: Điểm neo thời gian (điểm chọn để chỉnh sửa/chèn hiệu ứng).
- Hiển thị: Vạch dọc đứng màu xanh dương (cyan) cố định trên timeline. Khi người dùng click vào ruler để chọn một thời điểm, điểm này sẽ thay đổi. Khi nhấn play, show sẽ bắt đầu phát từ vị trí này.
- Trong code: `this.anchorHead` (quản lý phần tử DOM hiển thị) và `this.anchorTime` (biến số thực lưu thời gian giây tương ứng).

### Ruler
- Định nghĩa: Thanh thước vạch thời gian (giây).
- Hiển thị: Phía trên cùng của timeline, chứa các vạch chia giây (ticks) và các con số thời gian.
- Trong code: `this.ruler` (thuộc lớp `TimelineEditor`).

### Tracks Area
- Định nghĩa: Vùng chứa các track (dòng) để đựng các khối sự kiện.
- Trong code: `this.tracksArea` (thuộc lớp `TimelineEditor`).

---

## 2. Các Loại Khối trên Timeline (Timeline Sequences)

### Audio Sequence (Audio Block)
- Định nghĩa: Khối kịch bản âm thanh nhạc nền.
- Hiển thị: Hộp chữ nhật dài màu tím trên timeline.
- Trong code: Sự kiện có `type: 'audio'`. Được bổ sung thêm thuộc tính `beats: []` để lưu trữ các điểm nhịp và `_file` để lưu trữ đối tượng file âm thanh gốc.

### Drone Show Sequence (Drone Block)
- Định nghĩa: Khối biểu diễn dữ liệu bay của drone (được nhập từ file JSON).
- Hiển thị: Hộp chữ nhật màu xanh cyan.
- Trong code: Sự kiện có `type: 'droneshow'`.

### Effect Sequence (Event Block)
- Định nghĩa: Các khối sự kiện bắn pháo hoa đơn lẻ hoặc pháo chuỗi (comet, single, sequence, finale).
- Hiển thị: Các hộp chữ nhật có màu cam/hồng/xanh lam tùy thuộc vào loại hiệu ứng.
- Trong code: Sự kiện có các kiểu `type: 'sequence'`, `type: 'cometsequence'`, hoặc `type: 'finale'`.

---

## 3. Thuật ngữ về Nhấp Nhạc (Audio Beat Editing)

### Beat
- Định nghĩa: Điểm nhịp của bản nhạc.
- Hiển thị: Chấm vàng (yellow dot) nhỏ nằm ở giữa trên khối âm thanh (audio block).
- Trong code: Được lưu trữ trong mảng `beats` của thực thể `audio` (đơn vị tính bằng giây, tương đối so với thời điểm bắt đầu của file nhạc).

### Tap Beat
- Định nghĩa: Hành động gõ nhịp thủ công để đánh dấu nhịp nhạc theo thời gian thực.
- Phím tắt: Phím `B` (khi đang trong ngữ cảnh timeline).
- Trong code: Phóng sự kiện `timeline:tap-beat` hoặc gọi trực tiếp phương thức `this.tapBeat()`.

### Snap-to-beat
- Định nghĩa: Tính năng tự động hút (snap) khối hiệu ứng đang kéo thả vào đúng vị trí điểm nhịp (chấm vàng) gần nhất nếu nằm trong vùng lân cận (ngưỡng 0.15s).
- Trong code: Xử lý trong luồng kéo thả `onDrag` của `TimelineEditor.js`.

---

## 4. Giao diện Điều khiển & Hệ thống (Control & System UI)

### Property Inspector
- Định nghĩa: Bảng bên phải hiển thị thông tin thuộc tính chi tiết của sự kiện đang chọn và cho phép sửa các tham số (thời gian, âm lượng, preset, màu sắc).
- Trong code: Lớp `PropertyInspector` (khởi tạo trong `TimelineEditor`).

### Show Director
- Định nghĩa: Bộ điều phối phát và đồng bộ hóa âm thanh/hiệu ứng.
- Trong code: Lớp `ShowDirector`.

---

## 5. Giao diện Màn hình (Screens & Navigation)

### Màn hình Editor Show
- Định nghĩa: Màn hình trình diễn pháo hoa và âm nhạc chính tích hợp timeline (Fireworks Display / Timeline Editor).
- Phím tắt chuyển đổi: `Ctrl + 1` (hoặc `Cmd + 1` trên macOS).
- Trong code: Khởi chạy qua [src/main.js](../src/main.js) (thông qua [index.html](../index.html)).

### Màn hình Editor Animation
- Định nghĩa: Màn hình biên tập hoạt ảnh và chuyển động nâng cao của drone (Advanced Drone Editor - Animated).
- Phím tắt chuyển đổi: `Ctrl + 2` (hoặc `Cmd + 2` trên macOS).
- Trong code: Khởi chạy qua [src/editor/main.js](../src/editor/main.js) (thông qua [editor.html](../editor.html)).

### Màn hình Editor Formation / Editor Static
- Định nghĩa: Màn hình thiết kế đội hình tĩnh và bố cục sắp xếp drone (Static Formation Designer).
- Phím tắt chuyển đổi: `Ctrl + 3` (hoặc `Cmd + 3` trên macOS).
- Trong code: Khởi chạy qua [src/formation/main.js](./src/formation/main.js) (thông qua [formation.html](./formation.html)).

---

## 6. Thuật ngữ Hệ thống Pháo hoa (Firework System Terms)

### Shell
- Định nghĩa: Quả pháo hoa hoàn chỉnh bao gồm thân pháo, thuốc nổ, hạt màu và hiệu ứng được nạp vào kịch bản.
- Trong code: Lớp `ShellEntity` và các preset định nghĩa trong [src/factories/ShellPresetFactory.js](./src/factories/ShellPresetFactory.js).

### Lift / Launch
- Định nghĩa: Giai đoạn quả pháo được phóng từ mặt đất lên độ cao định trước trước khi phát nổ.
- Trong code: Thuộc tính `launchTrail`, âm thanh `lift` trong [src/systems/AudioSystem.js](./src/systems/AudioSystem.js).

### Burst
- Định nghĩa: Thời điểm và hành động quả pháo phát nổ bung tỏa các hạt màu trên bầu trời.
- Trong code: Phương thức `createBurst` và `updateBurstParticles` trong [src/systems/FireworkSystem.js](./src/systems/FireworkSystem.js).

### Shape (Hình học không gian ban đầu)
- Định nghĩa: Cấu trúc hình học phân bổ vị trí và hướng vận tốc của các hạt tại thời điểm bắt đầu nổ (t = 0).
- Các dạng tiêu biểu: Sphere (hình cầu), Ring (vành nhẫn), Heart (trái tim), Star (ngôi sao), Willow (vòm liễu), Double Helix (xoắn kép).
- Trong code: Xử lý chuyên trách bởi [src/factories/BurstShapeGenerator.js](./src/factories/BurstShapeGenerator.js).

### Active Effects (Hiệu ứng bổ trợ có thể xếp chồng)
- Định nghĩa: Các thẻ hiệu ứng quang học và hành vi độc lập có thể bật/tắt hoặc kết hợp đồng thời (stackable) trên bất kỳ loại pháo hoa nào, không phụ thuộc vào Preset hay Shape cố định.
- Các dạng tiêu biểu:
  - `strobe`: Chớp nháy màu theo chu kỳ tần số cao.
  - `white-strobe`: Chớp nháy ánh sáng trắng lấp lánh ở nửa sau vòng đời.
  - `glitter-strobe`: Chớp nháy kim tuyến siêu nhanh tạo độ lấp lánh dày đặc.
  - `crackle`: Nổ vi hạt lách tách thành chùm tia lửa cầu mini ở 65% vòng đời.
  - `ghost`: Biến quang quét góc 3D từ bóng tối sang ánh sáng.
  - `ghost-flare`: Biến quang 3 giai đoạn gồm sáng ban đầu, ẩn tối ở giữa và tái bừng sáng chói lọi ở cuối.
  - `flow`: Tạo chuyển động xoáy uốn lượn tự do cho từng hạt.
  - `no-trail`: Tắt vệt đuôi sáng để giữ điểm nổ gọn gàng, sắc nét.
  - `crossette`: Phân tách hạt pháo chính thành 4 tia vuông góc tại giữa vòng đời.
- Trong code: Khai báo qua danh sách `AVAILABLE_EFFECT_TAGS` trong [src/factories/FireworkCompositionHelper.js](./src/factories/FireworkCompositionHelper.js) và quản lý trong mảng `effects` / `activeEffects` của sự kiện pháo hoa trên [src/ui/PropertyInspector.js](./src/ui/PropertyInspector.js).

### Dynamics (Động lực học hạt sau nổ)
- Định nghĩa: Quy luật chuyển động, lực cản không khí, độ trôi, độ chùng và xoáy của hạt theo thời gian (t > 0).
- Các dạng tiêu biểu: Standard (tỏa đều), Willow (liễu rủ tàn), Flow (dòng chảy uốn lượn), Falling Leaves (lá rơi chao đảo), Falling Comets (sao chổi rơi).
- Trong code: Xử lý chuyên trách bởi [src/factories/BurstEffectProcessor.js](./src/factories/BurstEffectProcessor.js).

### Pistil (Nhụy tâm / Lõi pháo)
- Định nghĩa: Cấu trúc hạt tạo thành lõi nhụy ở trung tâm quả pháo với màu sắc tương phản hoặc thời gian cháy riêng.
- Trong code: Thuộc tính `pistil: true` và `pistilColor` trong cấu hình pháo.

### Crossette (Sao tách chữ thập)
- Trong code: Cờ `isCrossette`, tập chỉ số hạt `crossetteIndices`, thời gian `crossetteSplitTime` trong [src/systems/FireworkSystem.js](./src/systems/FireworkSystem.js).

### Crackle (Nổ vi hạt lách tách)
- Trong code: Cờ `crackle`, phương thức `spawnMicroCrackle` trong [src/systems/TrailSystem.js](./src/systems/TrailSystem.js) và sự kiện `firework:crackle`.

### Dying Ember (Hạt than tàn)
- Trong code: Thuộc tính `isDyingEmber` trong [src/systems/FireworkSystem.js](./src/systems/FireworkSystem.js).

### Comet (Sao chổi)
- Trong code: Hệ thống [src/systems/CometSystem.js](./src/systems/CometSystem.js) và các kiểu sự kiện `cometsequence`.

### Bouquet (Chùm pháo / Pháo cụm)
- Trong code: Phương thức `triggerBouquetBurst` trong [src/systems/FireworkSystem.js](./src/systems/FireworkSystem.js).

### Ghost / Ghost Flare (Pháo biến quang / Tàng hình)
- Trong code: Hiệu ứng `ghost`, `ghost-flare`, `ghost-kamuro` trong [src/factories/BurstEffectProcessor.js](./src/factories/BurstEffectProcessor.js).

### Strobe / Glitter (Nhấp nháy / Kim tuyến)
- Trong code: Hiệu ứng `strobe`, `white-strobe`, `glitter-strobe` trong [src/systems/FireworkSystem.js](./src/systems/FireworkSystem.js).

