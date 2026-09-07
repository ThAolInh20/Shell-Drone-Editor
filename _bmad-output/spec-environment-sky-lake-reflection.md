---
title: 'Environment System: Night Sky Dome, Lake Plane, Distant Mountain, and Planar Reflection'
type: 'feature'
created: '2026-09-07'
status: 'planned'
baseline_branch: 'feat/add-background-v2'
context: [
  'src/core/SceneManager.js',
  'src/core/PostProcessingPipeline.js',
  'src/environment/SkyDome.js',
  'src/environment/WaterSurface.js',
  'src/environment/DistantMountains.js',
  'src/environment/PlanarReflector.js'
]
---

# Kế Hoạch Triển Khai Hệ Thống Môi Trường & Mặt Hồ Phản Chiếu Pháo Hoa

Tài liệu này xác định kiến trúc kỹ thuật, ranh giới hệ thống, các giai đoạn thực thi và tiêu chí đánh giá (Checklist) để xây dựng môi trường ban đêm 3D bao gồm Sky Dome, Hạt sao, Mặt trăng, Dãy núi phía xa, Mặt hồ nước chuyển động sóng và Phản chiếu pháo hoa thời gian thực.

---

## 1. Mục Tiêu & Ranh Giới Kỹ Thuật

- **Mục tiêu:** Tạo không gian môi trường ban đêm với góc nhìn điện ảnh (cinematic composition 50% trời - 50% hồ), phản chiếu chính xác ánh sáng pháo hoa nở rộ xuống mặt hồ với độ méo sóng tự nhiên.
- **Ranh giới:**
  - Không sửa đổi logic vật lý hoặc hệ thống hạt của pháo hoa đã có sẵn.
  - Tách biệt hoàn toàn module môi trường vào thư mục `src/environment/` hoặc tích hợp qua `SceneManager`.
  - Giữ mức khung hình ổn định 60 FPS bằng kỹ thuật Half-Resolution RenderTarget và Layer Filtering.

---

## 2. Kiến Trúc Module Đề Xuất

- `src/environment/SkyDome.js`: Quản lý vòm trời Gradient, Starfield (hạt sao lấp lánh), và Mặt trăng cùng hiệu ứng quầng sáng.
- `src/environment/DistantMountains.js`: Quản lý dãy núi silhouette bao quanh đường chân trời, hòa trộn cùng sương mù (fog).
- `src/environment/PlanarReflector.js`: Quản lý Reflection Camera, Oblique Near-Plane Clipping, và FBO `WebGLRenderTarget`.
- `src/environment/WaterSurface.js`: Quản lý Mesh mặt nước, Custom ShaderMaterial (Dual Normal Map scrolling, Schlick Fresnel, Distorted Projected UV).
- `src/core/SceneManager.js`: Tích hợp các module môi trường, quản lý render pass phụ và render pass chính.

---

## 3. Danh Sách Các Giai Đoạn Triển Khai (Milestones & Checklist)

### Giai Đoạn 1: Bầu Trời Đêm, Ngôi Sao & Cảnh Nền Chân Trời
- [x] Xây dựng class `SkyDome.js` sử dụng `SphereGeometry` (bán kính 1400, `THREE.BackSide`) với Gradient Shader (`#02020a` đến `#070e24`).
- [x] Tích hợp hệ thống sao `THREE.Points` với shader nhấp nháy động theo thời gian (`uTime`) và biến thiên màu sắc/kích thước.
- [x] Thêm Mesh mặt trăng, sprite hào quang và nguồn sáng moonlight chiếu nhẹ xuống hồ.
- [x] Xây dựng class `DistantMountains.js` tạo silhouette dãy núi đa tầng bao quanh đường chân trời hòa trộn sương mù.
- [x] Tích hợp vào `SceneManager.js` và đồng bộ với hệ thống chớp sáng pháo hoa `SkyLightReactionSystem`.

### Giai Đoạn 2: Hạ Tầng Phản Chiếu Phẳng (Planar Reflector Pipeline)
- [x] Xây dựng class `PlanarReflector.js` khởi tạo `THREE.WebGLRenderTarget` với độ phân giải `0.5x` màn hình thực tế (Linear Filter, HalfFloatType).
- [x] Thiết lập `THREE.PerspectiveCamera` phản chiếu đối xứng qua mặt phẳng $Y=0$.
- [x] Tính toán Oblique Near-Plane Clipping Matrix để loại bỏ hoàn toàn các vật thể nằm phía dưới mặt nước khỏi RenderTarget.
- [x] Thiết lập cơ chế Layer Masking (`LAYER_REFLECTION = 1`) để Reflection Camera chỉ render Bầu trời, Sao, Núi và Hạt pháo hoa (bỏ qua mặt hồ, bệ phóng, drone helper và UI).
- [x] Tích hợp pass phản chiếu và xử lý resize vào `SceneManager.js`, `main.js`, `editor/main.js` và `formation/main.js`.

### Giai Đoạn 3: Shader Mặt Nước & Biến Dạng Sóng (Dynamic Water Shader)
- [ ] Xây dựng class `WaterSurface.js` với `PlaneGeometry` đặt nằm ngang tại $Y=0$.
- [ ] Tạo `ShaderMaterial` nhận sampler2D từ `PlanarReflector.renderTarget.texture`.
- [ ] Tích hợp 2 lớp Normal Map cuộn ngược hướng nhau với tốc độ khác nhau để mô phỏng sóng lăn tăn.
- [ ] Cài đặt thuật toán biến dạng tọa độ chiếu (Distorted Projected UV) theo vector pháp tuyến sóng $\vec{N}_{xz}$.
- [ ] Cài đặt hiệu ứng Schlick Fresnel để pha trộn tự nhiên giữa màu xanh sâu của nước và hình ảnh phản chiếu pháo hoa theo góc nhìn.

### Giai Đoạn 4: Hậu Kỳ & Tích Hợp Toàn Cục (Post-Processing & Composition)
- [ ] Đồng bộ camera góc thấp ($Y \approx 3 - 8$), hướng chếch lên vùng nổ pháo hoa để đạt bố cục 50% trời - 50% hồ.
- [ ] Cấu hình `UnrealBloomPass` trong `PostProcessingPipeline.js` để bắt sáng đồng thời cả vệt pháo hoa trên trời và vệt phản chiếu trên mặt hồ.
- [ ] Tích hợp `SkyLightReactionSystem` để ánh chớp pháo hoa làm bừng sáng nhẹ cả vòm trời và mặt nước đồng bộ.
- [ ] Kiểm tra và xử lý resize sự kiện cửa sổ cho cả Main Renderer và Reflection RenderTarget.

### Giai Đoạn 5: Tối Ưu Hóa & Đánh Giá Hiệu Năng
- [ ] Tối ưu hóa bộ nhớ: Hủy giải phóng (dispose) textures, render targets, geometries khi chuyển đổi scene hoặc resize.
- [ ] Liên kết chất lượng phản chiếu (tắt/bật hoặc giảm scale) với thiết lập đồ họa `localStorage.getItem('graphics_quality')`.
- [ ] Đảm bảo chỉ số khung hình duy trì trên 60 FPS khi có nhiều chùm pháo hoa nổ đồng thời.

---

## 4. Ma Trận Xử Lý Trường Hợp Biên (Edge Cases)

| Tình huống / Trường hợp | Hiện tượng tiềm ẩn | Giải pháp kỹ thuật |
| :--- | :--- | :--- |
| Camera xoay xuống dưới mặt nước ($Y < 0$) | Reflection Camera bị đảo lộn, vỡ ma trận chiếu | Khóa giới hạn OrbitControls / FlyControls $Y_{\text{min}} \ge 1.0$. |
| Cửa sổ trình duyệt thay đổi kích thước | RenderTarget bị lệch tỉ lệ aspect ratio | Hook sự kiện `resize` để cập nhật lại buffer của `PlanarReflector`. |
| Pháo hoa nổ sát hoặc ngoài mép trên màn hình | SSR sẽ làm mất vệt phản chiếu | Kỹ thuật Planar Reflection đảm bảo vẫn thu đủ hình ảnh từ Reflection Camera. |
| Nhiều hạt pháo hoa nổ làm giảm FPS | Fill-rate bottleneck do shader mặt nước | Sử dụng RenderTarget Half-Resolution và tắt mipmap cho FBO phản chiếu. |
