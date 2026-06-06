# Quản lý Nhóm drone & Gizmo điều khiển

Khi số lượng drone lên tới hàng trăm, việc di chuyển hoặc xoay từng drone đơn lẻ là bất khả thi. Phân hệ Static Designer cung cấp hệ thống **Nhóm drone (Groups)** và **Phím điều khiển Gizmo** trực quan để thao tác hàng loạt.

---

## Cách chọn nhiều Drone trong Viewport

*   **Chọn đơn lẻ:** Click chuột trái vào drone (chấm tròn sáng) để chọn.
*   **Chọn nhiều (Multi-select):** Nhấn giữ phím **`Ctrl`** và click chuột trái lần lượt vào các drone mong muốn.
*   **Chọn nhanh cả nhóm:** Nhấp chọn một drone thuộc nhóm, sau đó tích chọn hộp kiểm **`Chọn toàn bộ nhóm trong Viewport`** ở panel bên phải để tự động chọn tất cả các drone còn lại trong nhóm đó.

---

## Tổ chức Nhóm drone (Groups Panel)

Nhấn tổ hợp các drone đã chọn và sử dụng bảng **Nhóm drone** (Groups Panel) ở panel bên trái:

1.  **Gộp phân cấp (Nested Group):**
    *   Tạo nhóm dạng thư mục lồng nhau (Folder-tree).
    *   *Ứng dụng:* Giúp bạn di chuyển cả cụm lớn (ví dụ: một chiếc ô tô) nhưng vẫn có thể chọn nhóm nhỏ bên trong (ví dụ: chiếc bánh xe) để xoay riêng lẻ.
2.  **Gộp phẳng (Flat Group):**
    *   Gộp toàn bộ các drone đã chọn vào một nhóm phẳng duy nhất không phân tầng.
3.  **Hủy gộp (Ungroup):**
    *   Giải tán nhóm hiện tại, đưa các drone trở lại trạng thái tự do hoặc thuộc về nhóm cha cấp cao hơn.
4.  **Khôi phục vị trí nhóm / Tâm xoay (Reset Group):**
    *   *Khôi phục nhóm & đưa tâm xoay về gốc (0, 20, 0):* Đưa toàn bộ nhóm drone và điểm xoay của chúng về tọa độ trung tâm (0, 20, 0).
    *   *Khôi phục drone về tọa độ Step 1:* Đưa vị trí các drone về trạng thái đầu tiên của kịch bản gốc.
    *   *Chỉ khôi phục tâm xoay về (0, 20, 0):* Dời điểm Pivot về tâm tọa độ gốc mà không di chuyển drone.

---

## Bảng điều khiển Gizmo 3D trực quan

Hệ thống cung cấp 3 phím điều hướng Gizmo chuẩn công nghiệp ở góc phải màn hình:

*   **Move (Di chuyển):** Xuất hiện 3 mũi tên màu sắc (Đỏ - X, Xanh lá - Y, Xanh dương - Z). Nhấp giữ chuột vào các mũi tên và kéo để tịnh tiến nhóm drone.
*   **Rotate (Xoay):** Xuất hiện các vòng tròn xoay quanh 3 trục. Kéo để xoay nhóm drone quanh điểm tâm xoay (Pivot).
*   **Scale (Thu phóng):** Xuất hiện các khối vuông nhỏ. Kéo để phóng to, thu nhỏ hoặc kéo giãn nhóm drone theo chiều ngang/dọc.

---

## Căn chỉnh Tâm xoay (Pivot Alignment)

Tâm xoay (Pivot) quyết định vị trí trung tâm mà nhóm drone sẽ xoay quanh hoặc co giãn theo khi bạn dùng công cụ Rotate/Scale.

*   **Hiển thị Tâm xoay:** Tích chọn **`Hiển thị Tâm xoay`** ở panel bên phải để hiển thị một chấm sáng Neon (thường có các đường chỉ nối tới các drone trong nhóm).
*   **Căn tâm xoay tự động:** Nhấp vào nút **`Đặt Tâm vào Nhóm đã Chọn (Center to Selection)`**. Hệ thống sẽ tự động tính toán trọng tâm hình học của các drone đang được chọn và di chuyển điểm tâm xoay về đúng vị trí trung bình đó.
*   *Mẹo:* Đặt tâm xoay vào giữa nhóm trước khi xoay sẽ giúp vòng xoay của drone mượt mà và đối xứng.
