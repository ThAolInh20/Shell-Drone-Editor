# Hệ thống Dẫn hướng (Guide System)

Để thiết kế các biểu tượng phức tạp (chữ nghệ thuật, logo thương hiệu, hình động vật, hình đồ vật), việc sắp xếp drone bằng mắt thường rất khó khăn. Phân hệ Static Designer hỗ trợ **Hệ thống dẫn hướng (Guide System)** ở panel bên phải giúp bạn nhập hình ảnh hoặc mô hình 3D làm mẫu để đồ theo.

---

## Chế độ 1: Hologram 3D (Mô hình ảo ảnh 3D)

Chế độ này cho phép bạn tải một mô hình 3D (định dạng hỗ trợ: `.glb` hoặc `.gltf`) làm bộ khung ảo để xếp drone khớp vào các đỉnh (vertices) hoặc viền bề mặt của mô hình.

### Cách tải mô hình:
1. Tại panel bên phải, mục **Chế độ dẫn hướng (Guide Mode)** chọn **Hologram 3D (Model)**.
2. Tại mục **Import Model (3D)**, click chọn file `.gltf` hoặc `.glb` từ máy tính.
3. Ứng dụng sẽ hiển thị mô hình dưới dạng khung lưới phát sáng bán trong suốt lơ lửng giữa không trung.

### Hiệu chỉnh mô hình ảo ảnh:
Bạn có thể căn chỉnh lại mô hình mẫu cho khớp với khu vực bay mong muốn thông qua các thanh trượt:
*   **Chiều cao (Y Offset):** Dịch chuyển mô hình lên cao hoặc xuống thấp so với mặt đất.
*   **Dịch ngang (X Offset) & Dịch sâu (Z Offset):** Di chuyển mô hình sang trái, phải, tiến, lùi.
*   **Tỉ lệ (Scale):** Thu nhỏ hoặc phóng to mô hình mẫu.
*   **Góc xoay (Rotation Y):** Xoay mô hình quanh trục đứng Y.
*   **Độ mờ (Opacity):** Tăng giảm độ trong suốt của mô hình để dễ nhìn thấy các drone bên trong.
*   **Hiển thị khung lưới (Wireframe):** Hộp kiểm giúp bật tắt hiển thị dạng khung lưới đường chỉ hay dạng khối đặc.
*   **Xoá Hologram:** Nhấp nút để gỡ bỏ mô hình mẫu khỏi màn hình.

---

## Chế độ 2: Ảnh tham chiếu 2D (Reference Image)

Chế độ này cho phép bạn tải một bức ảnh phẳng định dạng `.png` hoặc `.jpg` (như hình phác thảo logo) làm hình mẫu đồ họa 2D.

### Cách tải ảnh nền:
1. Chọn **Ảnh tham chiếu (2D)** tại mục **Chế độ dẫn hướng**.
2. Click **Import Ảnh Nền (2D)** và chọn tệp ảnh của bạn.
3. Ảnh sẽ xuất hiện trong không gian 3D.

### Cấu hình hướng đặt ảnh (Orientation):
Tùy thuộc vào việc bạn muốn thiết kế đội hình nhìn từ trên xuống hay nhìn từ đằng trước:
*   **Nằm ngang (XZ):** Ảnh được trải phẳng song song với mặt đất. Thích hợp khi bạn đứng trên cao nhìn xuống để sắp xếp drone.
*   **Thẳng đứng (XY):** Ảnh dựng thẳng đứng như một tấm bảng lớn. Thích hợp khi bạn đứng ở hướng chính diện (nhìn từ khán đài) để đồ hình drone.

### Hiệu chỉnh ảnh:
Tương tự như mô hình 3D, bạn cũng có các thanh trượt để chỉnh:
*   **X / Y / Z Offset:** Tịnh tiến vị trí ảnh mẫu.
*   **Scale:** Thu phóng độ to nhỏ của bức ảnh.
*   **Rotation:** Xoay góc nghiêng của ảnh.
*   **Opacity:** Chỉnh độ trong suốt của ảnh để drone không bị che khuất.
*   **Xoá ảnh tham chiếu:** Gỡ bỏ hình ảnh mẫu khỏi khung nhìn.
