# Các phương án tối ưu hóa hiệu năng hệ thống pháo hoa

Tài liệu này mô tả chi tiết 4 phương án tối ưu hóa nhằm giúp hệ thống có thể hoạt động mượt mà khi trình diễn đồng thời hàng trăm quả pháo hoa và hàng chục ngàn hạt hiệu ứng.

## Phương án 1: Instanced Rendering cho các hạt Comet bay (Floral Child)
* **Vấn đề hiện tại:** Mỗi hạt comet bay từ pháo bouquetCometSphere được tạo ra dưới dạng một ShellEntity độc lập (chứa coreMesh là THREE.Mesh và haloPoints là THREE.Points). Khi có nhiều pháo nổ cùng lúc, hàng trăm hạt comet con sẽ tạo ra hàng trăm Group vật thể riêng biệt, dẫn đến số lượng draw calls tăng vọt khiến CPU bị nghẽn cổ chai.
* **Giải pháp:** Sử dụng THREE.InstancedMesh đại diện cho tất cả các lõi comet và phần hào quang đang hoạt động. Khi pháo nổ, hệ thống chỉ cập nhật ma trận vị trí (setMatrixAt) và màu sắc (setColorAt) của các Instance có sẵn trong bộ đệm thay vì tạo mới Mesh.
* **Ưu điểm:** Giảm draw calls của toàn bộ các hạt comet đang bay từ hàng trăm xuống còn đúng 2 draw calls.
* **Phạm vi ảnh hưởng:** Điều chỉnh cách khởi tạo và cập nhật ShellEntity trong [FireworkSystem.js](file:///e:/shell-drone-animation/src/systems/FireworkSystem.js).

## Phương án 2: Gộp tất cả các vụ nổ (Burst Points) vào một Particle System toàn cục
* **Vấn đề hiện tại:** Mỗi khi một quả pháo nổ, hệ thống tạo ra một đối tượng THREE.Points mới với BufferGeometry và PointsMaterial riêng biệt. Nếu có 50 quả pháo đang nổ dở dang, sẽ có 50 đối tượng THREE.Points hoạt động song song, tạo ra 50 draw calls cho pháo hoa.
* **Giải pháp:** Sử dụng một đối tượng THREE.Points tĩnh duy nhất cho toàn bộ pháo hoa trong scene (tương tự như cách [TrailSystem.js](file:///e:/shell-drone-animation/src/systems/TrailSystem.js) đang làm). Khi pháo nổ, hệ thống chỉ ghi đè dữ liệu hạt mới vào các vùng trống trong buffer của hệ thống hạt toàn cục.
* **Ưu điểm:** Gom tất cả các vụ nổ đang diễn ra vào 1 draw call duy nhất.
* **Phạm vi ảnh hưởng:** Chỉnh sửa phương thức createBurst và handleBurstUpdate trong [FireworkSystem.js](file:///e:/shell-drone-animation/src/systems/FireworkSystem.js) để tích hợp hệ thống hạt chung.

## Phương án 3: Tính toán vật lý hạt trên GPU (GPU Particle System / Shader Particles)
* **Vấn đề hiện tại:** JavaScript trên CPU đang tính toán vị trí, vận tốc, trọng lực của từng hạt ở mỗi frame, sau đó tải lại mảng dữ liệu vị trí khổng lồ lên GPU. Băng thông truyền dữ liệu CPU-to-GPU rất lớn là nguyên nhân gây lag khi số lượng hạt đạt hàng chục ngàn.
* **Giải pháp:** Khai báo vị trí bắt đầu, vận tốc bắt đầu và thời gian sinh của từng hạt trên GPU một lần duy nhất. Sử dụng Vertex Shader để tính toán quỹ đạo bay của hạt tại thời điểm t dựa trên biến thời gian uTime truyền lên từ CPU ở mỗi frame.
* **Ưu điểm:** Giải phóng hoàn toàn cho CPU. GPU xử lý song song cực kỳ nhanh, cho phép hiển thị mượt mà hơn 100.000 hạt cùng lúc mà không tụt FPS.
* **Phạm vi ảnh hưởng:** Viết lại shader vật liệu của pháo hoa trong [FireworkSystem.js](file:///e:/shell-drone-animation/src/systems/FireworkSystem.js).

## Phương án 4: Tối ưu hóa hệ thống khói (SmokeSystem) bằng InstancedMesh
* **Vấn đề hiện tại:** Các cụm khói bốc lên đang được quản lý như các Mesh riêng lẻ trong THREE.Group, tạo ra thêm rất nhiều draw calls khi màn khói dày đặc.
* **Giải pháp:** Chuyển đổi SmokeSystem sang sử dụng THREE.InstancedMesh dùng chung một chất liệu và texture khói.
* **Ưu điểm:** Toàn bộ hệ thống khói chỉ tiêu tốn đúng 1 draw call bất kể mật độ khói dày đến mức nào.
* **Phạm vi ảnh hưởng:** Thay đổi cơ chế sinh và cập nhật các puff khói trong [SmokeSystem.js](file:///e:/shell-drone-animation/src/systems/SmokeSystem.js).
