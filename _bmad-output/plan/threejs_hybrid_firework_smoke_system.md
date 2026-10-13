# Thiết kế hệ thống khói pháo hoa Three.js — Hybrid Smoke System

> Mục tiêu: xây dựng hệ thống khói pháo hoa chạy trên Three.js `WebGLRenderer`, cân bằng chất lượng hình ảnh và FPS.
>
> Ý tưởng cốt lõi: không mô phỏng từng hạt khói nhỏ. Chỉ mô phỏng sự kiện tạo khói, các vùng khói lớn (Macro Smoke) và lớp khói tích tụ (Persistent Smoke Field); GPU đảm nhiệm việc tạo chi tiết, biến dạng và chiếu sáng.

## 1. Mục tiêu và phạm vi

Hệ thống gồm ba lớp chính:

1. **Rocket Trail:** một số ít particle cho vệt khói đuôi rocket.
2. **Macro Smoke:** các khối khói lớn cho vụ nổ, dùng shader tạo cấu trúc cuộn và chiều sâu.
3. **Persistent Smoke Field:** lưu dấu khói tích tụ qua nhiều loạt pháo bằng render target.

`SkyLightReactionSystem` cung cấp nguồn sáng từ pháo hoa cho shader khói. Thiết kế này kế thừa các thành phần hiện có như `SmokeSystem.js`, ring buffer và cơ chế ánh sáng, nhưng thay cách biểu diễn khói vụ nổ.

## 2. Kiến trúc tổng thể và tích hợp hệ thống hiện tại

Hệ thống khói kế thừa và mở rộng trực tiếp cấu trúc đang có tại `./src/systems/SmokeSystem.js`, tương thích với `SceneManager.js`, `FireworkSystem.js`, `CometSystem.js` và `SkyLightReactionSystem.js`:

```text
EventBus (firework:launch / firework:burst)
         │
         ├─── Rocket Trail (Thin particles via Float32Array ring buffer)
         │
         ├─── Macro Burst Smoke (8–12 volumes tối đa, fake spherical normal + noise)
         │
         └─── Persistent Smoke Field / Sky Dome Haze (Khói tích tụ theo vòm/tầng)
                      ▲
                      │
           SkyLightReactionSystem
           (uFlashPos, uFlashColor, uFlashIntensity, uFlashRadius)
```

**Nguyên tắc tương thích:**
- Giữ nguyên toàn bộ public interface hiện có của `SmokeSystem.js`: `addSmokePoint`, `spawnPuff`, `onLaunch`, `onBurst`, `setBurstFlash`, `setQuality`, `setDensity`, `setWindSpeed`, `setUnlimited`, `setLifespanMultiplier`, `clear`, `destroy`.
- Đảm bảo 100% test suite `tests/systems/SmokeSystem.test.js` tiếp tục vượt qua mà không bị break API.
- Tích hợp liền mạch với điều phối ánh sáng từ `SkyLightReactionSystem.js` cho cả Khói, Mây ([SkyDome.js](./src/environment/SkyDome.js)) và Núi ([DistantMountains.js](./src/environment/DistantMountains.js)).

## 3. Cấu trúc module và phân định trách nhiệm

Thay vì xáo trộn cấu trúc thư mục hiện tại của dự án, hệ thống giữ file trung tâm `./src/systems/SmokeSystem.js` làm Facade/Controller và nâng cấp shader/sub-module:

```text
src/
├── systems/
│   ├── SmokeSystem.js             <-- Facade, ring buffer, macro cluster & persistent integration
│   └── SkyLightReactionSystem.js  <-- Phối hợp ánh sáng khói, mây, núi, mặt nước
├── environment/
│   ├── SkyDome.js                 <-- Tích hợp tầng sương khói khí quyển (Haze / Persistent Field)
│   └── DistantMountains.js        <-- Bổ sung uFlashPos định hướng vệt sáng sườn núi
└── config/
    ├── fireworks.js               <-- Tham số cấu hình SMOKE
    └── rendering.js               <-- Cấu hình chất lượng khói
```

| Thành phần | Trách nhiệm |
|---|---|
| `SmokeSystem.js` | Quản lý vòng đời khói, ring buffer hạt vệt bay, macro puff clusters cho vụ nổ |
| `SkyLightReactionSystem.js` | Tính toán nguồn sáng mạnh nhất, truyền tọa độ `uFlashPos`, bán kính và màu sắc |
| `DistantMountains.js` | Nhận hướng vụ nổ để phản xạ viền núi theo góc azimuth |
| `SkyDome.js` | Tích hợp lớp sương khói trôi dạt lâu dài vào shader bầu trời đêm |

## 4. Rocket Trail — giữ particle nhưng giảm số lượng

Vệt khói rocket có tính chất tuyến tính, nhỏ và chuyển động liên tục. `THREE.Points` vẫn phù hợp cho lớp này.

Đề xuất ban đầu:

- Mỗi rocket có khoảng 3–5 điểm khói đang hoạt động.
- Dùng ring buffer `Float32Array` để tái sử dụng bộ nhớ.
- Shader điều chỉnh kích thước, opacity và độ mềm của điểm.
- Sinh điểm thưa hơn khi rocket di chuyển nhanh.
- Khi hết tuổi thọ, tái sử dụng slot thay vì tạo object mới mỗi frame.

Số lượng 3–5 là giá trị khởi đầu để benchmark, không phải giới hạn cố định. Nếu cần vệt dài hơn, có thể tăng số điểm hoặc cân nhắc ribbon trail.

API minh họa:

```js
rocketTrailSystem.emit({
  position,
  velocity,
  intensity: 0.5
});
```

`position` và `velocity` nên tái sử dụng dữ liệu có sẵn từ hệ thống rocket để tránh clone `Vector3` liên tục trong vòng lặp nóng.

## 5. Macro Smoke — khói vụ nổ

Khi nhận sự kiện nổ, hệ thống tạo một sự kiện khói chứa dữ liệu như:

```js
{
  position,
  birthTime,
  initialRadius,
  density,
  expansionSpeed,
  windResponse,
  seed
}
```

Từ sự kiện này, `MacroSmokeSystem` tạo một nhóm 2–6 vùng khói. Mỗi vùng có bán kính, độ lệch vị trí, độ lệch thời gian và seed khác nhau để tránh hình cầu đồng nhất.

### 5.1. Hình học và shader

- Dùng bounding sphere hoặc bounding box để giới hạn vùng render.
- Fragment shader xác định tia nhìn giao với thể tích, rồi lấy mẫu mật độ khói bên trong (ray marching).
- Bắt đầu với 2–3 octave noise; chỉ tăng chi tiết khi benchmark chứng minh cần thiết.
- Dùng depth của cảnh để dừng tia khi gặp vật thể chắn phía trước.

Mật độ khói có thể được mô tả bằng:

\[
\rho(\mathbf{x},t)
=
D(t)\,G(\mathbf{x},t)\,
\operatorname{smoothstep}
\left(\tau_0,\tau_1,N(\mathbf{x},t)\right)
\]

Trong đó:

- \(D(t)\): mật độ theo tuổi khói.
- \(G\): vùng hình học nền, không nhất thiết là hình cầu hoàn hảo.
- \(N\): noise đa tần.
- \(\tau_0,\tau_1\): ngưỡng điều khiển cấu trúc và độ gồ ghề.

### 5.2. Chuyển động và vòng đời

Tách chuyển động thành ba thành phần:

1. **Expansion:** khối khói bung ra nhanh rồi chậm dần.
2. **Advection:** vùng khói dịch chuyển theo gió.
3. **Turbulence:** noise biến đổi theo thời gian tạo chuyển động cuộn.

Bán kính tăng trưởng có thể dùng:

\[
R(t)=R_0+(R_{\max}-R_0)(1-e^{-kt})
\]

Mật độ giảm theo tuổi:

\[
D(t)=D_0 e^{-\lambda t}
\]

Các công thức này là mô hình khởi đầu có thể điều chỉnh theo phong cách hình ảnh. Gió cần ảnh hưởng cả tâm khói và tọa độ biến dạng; nếu chỉ dịch chuyển tâm, khói dễ trông như vật thể đặc trượt trong không khí.

## 6. Persistent Smoke Field — khói tích tụ

Phiên bản đầu nên dùng **2D ping-pong render targets**, chưa cần mô phỏng fluid 3D toàn phần.

```text
Smoke Field A
     |
     v
Update Pass
(reproject / advect / decay / deposit)
     |
     v
Smoke Field B
     |
     +---- đổi vai trò A/B ở lần cập nhật kế tiếp
```

Không đọc và ghi cùng một texture trong cùng pass.

Với mỗi pixel của field:

1. Xác định vị trí nguồn trong texture cũ sau khi bù chuyển động gió.
2. Đọc mật độ khói cũ.
3. Làm suy giảm mật độ theo thời gian.
4. Cộng lượng khói mới được rasterize vào field.
5. Ghi kết quả sang render target còn lại.

Mô hình rút gọn:

\[
D_{t+\Delta t}(\mathbf{x})
=
D_t(\mathbf{x}-\mathbf{w}\Delta t)
e^{-\lambda\Delta t}
+
S(\mathbf{x},t)
\]

Trong đó \(S\) là nguồn khói mới, \(\mathbf{w}\) là vận tốc gió và \(\lambda\) là hệ số suy giảm.

### Giới hạn của field 2D

Field 2D không lưu đầy đủ chiều sâu 3D. Dùng nó cho khói xa, lớp tích tụ và sương mù bầu trời; không dùng để thay thế hoàn toàn Macro Smoke.

Có thể ánh xạ field lên một mặt phẳng khói ở độ cao xác định hoặc một lớp nền trong không gian trình diễn. Nếu camera thay đổi góc mạnh, có thể cần nhiều lớp ở các độ sâu khác nhau hoặc nâng cấp sang atlas nhiều lớp.

Khuyến nghị ban đầu: render target 512 × 512; chỉ tăng lên 1024 × 1024 khi benchmark cho thấy cần thiết.

### Lưu ý triển khai render target

- Không lấy mẫu texture đang được render trong cùng pass.
- Dùng `renderer.setRenderTarget()` và khôi phục render target/trạng thái renderer sau pass.
- Quản lý resize và dispose rõ ràng.
- Chỉ cập nhật field theo nhịp riêng khi cần; Macro Smoke vẫn cập nhật theo frame.

## 7. Chiếu sáng từ nhiều vụ pháo nổ

`SkyLightReactionSystem.js` nên cung cấp danh sách nguồn sáng đang hoạt động thay vì chỉ chọn vụ nổ mạnh nhất.

```js
{
  position,
  color,
  intensity,
  radius,
  birthTime,
  decayRate
}
```

Mỗi frame, chọn tối đa một số nguồn phù hợp dựa trên khoảng cách, cường độ và tuổi nguồn. Với WebGL 2, uniform arrays là một lựa chọn đơn giản cho danh sách nguồn sáng có giới hạn.

Mô hình tán xạ khởi đầu:

\[
L_s =
\rho\,\sigma_s\,L_i\,p(\theta)\,A(d)
\]

Trong đó:

- \(\rho\): mật độ khói.
- \(\sigma_s\): hệ số tán xạ.
- \(L_i\): cường độ ánh sáng tới.
- \(p(\theta)\): hàm pha theo góc tán xạ.
- \(A(d)\): suy giảm theo khoảng cách.

Ánh sáng cần được tích lũy cùng sự suy giảm truyền sáng dọc tia nhìn. Tránh cộng RGB trực tiếp không giới hạn vì dễ làm khói cháy trắng và mất sắc xám tối.

## 8. Thứ tự render

Pipeline logic ban đầu:

1. Render nền bầu trời và môi trường.
2. Cập nhật Persistent Smoke Field khi đến chu kỳ cập nhật.
3. Render lớp khói tích tụ ở xa.
4. Render Macro Smoke ở gần.
5. Render rocket trail và pháo hoa theo quy tắc depth/blending của scene.
6. Post-processing: bloom cho pháo sáng, tone mapping và hiệu chỉnh màu.

Thứ tự cuối cùng cần được kiểm chứng trong scene thực tế. Đặc biệt, cần kiểm tra `depthTest`, `depthWrite`, alpha blending và depth buffer khi ray marching để khói không xuyên qua vật thể chắn phía trước.

Không mặc định bật `depthWrite = true` cho mọi vật thể khói bán trong suốt.

## 9. API công khai của `SmokeSystem`

```js
class SmokeSystem {
  constructor({ renderer, scene, camera, config }) {
    // Initialize trail, macro smoke,
    // persistent field and lighting.
  }

  emitRocketTrail(event) {
    // Emit a small number of trail particles.
  }

  emitBurst(event) {
    // Create macro smoke and schedule deposits.
  }

  setWind(wind) {
    // Update the shared wind vector.
  }

  setLights(lights) {
    // Update active firework light sources.
  }

  update(deltaTime, elapsedTime) {
    // Advance event lifecycles and smoke state.
  }

  render() {
    // Execute smoke-specific render passes.
  }

  resize(width, height) {
    // Resize screen-dependent resources.
  }

  dispose() {
    // Release geometries, materials and render targets.
  }
}
```

Đây là skeleton API, chưa phải implementation hoàn chỉnh.

Ví dụ dữ liệu sự kiện nổ:

```js
{
  id: "burst-001",
  position,
  color,
  intensity: 1.0,
  radius: 40,
  timestamp
}
```

Các hệ thống pháo hoa chỉ gọi API của `SmokeSystem`, không truy cập trực tiếp vào dữ liệu nội bộ của `MacroSmokeSystem` hay `PersistentSmokeField`.

## 10. Cấu hình chất lượng và trần ngân sách an toàn
 
```js
export const smokeConfig = {
  trail: {
    maxParticles: 4096,
    particlesPerRocket: 4
  },

  macroSmoke: {
    // Giới hạn cứng số volume đồng thời để bảo vệ GPU fillrate (thay vì 128)
    maxVolumes: 16,
    volumesPerBurst: 3,
    maxRaySteps: 24
  },

  persistentField: {
    resolution: 512,
    updateInterval: 1 / 15,
    decayRate: 0.08
  },

  lighting: {
    // CPU chọn lọc 1–2 nguồn sáng chủ đạo cho mỗi volume thay vì loop 8 đèn trong fragment shader
    maxDominantLightsPerVolume: 2,
    maxRadius: 650
  }
};
```

**Nguyên tắc giới hạn quan trọng:**
- `maxVolumes` được khống chế ở mức 16 khối đồng thời trên toàn bộ scene để tránh sập FPS khi bắn salvo liên tục.
- Khối khói sau 1.2–1.5 giây sẽ hòa tan mượt mà vào tầng sương khói nền (Persistent Field/Haze) thay vì duy trì tính toán độc lập kéo dài.
- Ánh sáng pháo hoa được tính toán theo mô hình bán cầu với pháp tuyến giả lập (fake spherical normal) và tán xạ pha (phase scattering) để tạo khối 3D mà không tốn chi phí raymarching đa đèn.

## 11. Quality Controller và tối ưu hiệu năng

Nên có ba preset chất lượng:

| Preset | Chiến lược |
|---|---|
| High | Tăng bước ray marching, độ phân giải field và chi tiết noise |
| Balanced | 24–32 bước ray marching, field 512², tối đa 8 nguồn sáng gần |
| Performance | Giảm bước ray marching, octave noise và số volume được render |

Các tối ưu quan trọng:

- Frustum culling và giới hạn số volume nhìn thấy.
- Giảm bước ray marching cho volume nhỏ hoặc ở xa.
- Dùng LOD theo kích thước chiếm trên màn hình.
- Tránh cấp phát object và mảng mới trong vòng lặp mỗi frame.
- Cập nhật Persistent Smoke Field theo nhịp riêng.
- Giới hạn số nguồn sáng được xét trong mỗi volume.
- Benchmark trên thiết bị mục tiêu trước khi tăng chất lượng.

Không nên giả định một số draw call thấp đồng nghĩa GPU rẻ. Một volume phủ phần lớn màn hình với shader nặng vẫn có thể chiếm nhiều thời gian GPU.

## 12. Kế hoạch triển khai theo giai đoạn

### Giai đoạn 1 — Chuẩn hóa API và đo hiệu năng

- Giữ `SmokeSystem.js` làm facade.
- Chuẩn hóa dữ liệu sự kiện nổ và gió.
- Đo FPS, frame time, số volume và số particle hiện tại.
- Tách cấu hình ra `smokeConfig.js`.

**Tiêu chí hoàn thành:** hệ thống mới có thể nhận sự kiện mà không làm thay đổi logic phát nổ của pháo hoa.

### Giai đoạn 2 — Rocket Trail và Macro Smoke

- Tối ưu ring buffer cho trail.
- Tạo bounding volume và shader khói.
- Thêm expansion, density decay và noise biến dạng.
- Kiểm tra depth và alpha blending.

**Tiêu chí hoàn thành:** khói vụ nổ có hình khối, không lộ hình cầu trơn, chuyển động ổn định khi camera di chuyển.

### Giai đoạn 3 — Persistent Smoke Field

- Tạo hai render target ping-pong.
- Triển khai advection, decay và deposit.
- Render lớp khói tích tụ ở xa.
- Xử lý resize, reset và dispose.

**Tiêu chí hoàn thành:** khói của nhiều loạt pháo có thể lưu lại, trôi và nhạt dần mà không cần duy trì từng hạt.

### Giai đoạn 4 — Ánh sáng nhiều nguồn

- Mở rộng `SkyLightReactionSystem`.
- Chọn nguồn sáng theo khoảng cách và cường độ.
- Thêm suy giảm truyền sáng và mô hình tán xạ.
- Kiểm tra màu khói dưới các màu pháo khác nhau.

**Tiêu chí hoàn thành:** nhiều vụ nổ có thể cùng ảnh hưởng tới khói mà không làm khói cháy trắng.

### Giai đoạn 5 — Tối ưu và benchmark

- Kiểm tra cảnh ít pháo, cảnh nhiều pháo và cảnh khói chồng lớp.
- Đo CPU frame time và GPU frame time nếu có công cụ phù hợp.
- Điều chỉnh Quality Controller.
- Kiểm tra rò rỉ tài nguyên sau nhiều lần tạo/xóa cảnh.

**Tiêu chí hoàn thành:** đạt mục tiêu FPS do dự án đặt ra trên thiết bị tham chiếu, với chất lượng hình ảnh chấp nhận được.

## 13. Những rủi ro cần kiểm tra

1. **Overdraw:** ray marching có thể đắt hơn particle nếu bounding volume quá lớn.
2. **Field 2D bị phẳng:** camera thay đổi góc mạnh có thể làm lộ mặt phẳng khói.
3. **Tích tụ quá đậm:** deposit và decay không cân bằng khiến bầu trời nhanh chóng bị phủ kín.
4. **Ánh sáng không nhất quán:** nguồn sáng đã tắt nhưng khói vẫn giữ màu quá lâu.
5. **Transparency sorting:** nhiều volume trong suốt có thể cho kết quả khác nhau tùy thứ tự render.
6. **WebGL compatibility:** cần kiểm tra phiên bản Three.js, WebGL 2 và khả năng hỗ trợ render target của thiết bị mục tiêu.

## 14. Quyết định kỹ thuật cuối cùng

Tao khuyến nghị triển khai theo thứ tự này:

1. `RocketTrailSystem` — ít particle, ring buffer.
2. `MacroSmokeSystem` — khối khói lớn, shader noise và ray marching có giới hạn.
3. `SkyLightReactionSystem` — hỗ trợ nhiều nguồn sáng.
4. `PersistentSmokeField` — khói tích tụ bằng ping-pong render targets.
5. `SmokeQualityController` — culling, LOD và benchmark.

**Đừng bắt đầu bằng fluid simulation 3D toàn phần.** Nó tăng đáng kể độ phức tạp và chi phí GPU, trong khi mục tiêu hiện tại là khói pháo hoa đẹp, tích tụ được và chạy ổn định trên trình duyệt.

Thiết kế này là bản kiến trúc và kế hoạch triển khai; các công thức, giới hạn và cấu hình cần được xác thực bằng shader thực tế và benchmark trong scene của dự án.
