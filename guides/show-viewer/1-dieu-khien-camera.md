# Điều khiển Camera & Theo dõi Hiệu năng

Phân hệ Viewer hỗ trợ một camera 3D bay tự do chuyên nghiệp cho phép bạn kiểm soát góc quay toàn cảnh của show diễn từ bất kỳ vị trí nào: từ mặt đất cho tới đỉnh cao nổ của pháo hoa.

---

## Chế độ khóa chuột (Pointer Lock)

Để bắt đầu nhìn xung quanh không gian 3D bằng chuyển động chuột:
1. Nhấp chuột trái vào bất kỳ vị trí nào trên vùng hiển thị 3D.
2. Khi chuột bị khóa (ẩn con trỏ), dòng chữ hướng dẫn ở trung tâm màn hình sẽ biến mất.
3. Di chuyển chuột để quay góc nhìn (tương tự game bắn súng góc nhìn thứ nhất FPS).
4. Để thoát chế độ khóa chuột, nhấn phím **`ESC`** trên bàn phím. Thao tác này sẽ hiển thị lại con trỏ chuột và mở Menu Pháo hoa (Pause Menu).

---

## Các phím di chuyển tự do

Khi đang ở chế độ khóa chuột, bạn có thể bay trong không gian 3D bằng các phím sau:

| Phím bấm | Chức năng di chuyển |
| :--- | :--- |
| **`W`** hoặc **`Mũi tên lên`** | Di chuyển camera tiến về phía trước |
| **`S`** hoặc **`Mũi tên xuống`** | Di chuyển camera lùi về phía sau |
| **`A`** hoặc **`Mũi tên trái`** | Di chuyển camera dịch sang bên trái |
| **`D`** hoặc **`Mũi tên phải`** | Di chuyển camera dịch sang bên phải |

*Mẹo: Góc di chuyển sẽ phụ thuộc vào hướng camera đang nhìn. Nếu bạn hướng camera lên bầu trời và nhấn `W`, bạn sẽ bay thẳng lên cao.*

---

## Bảng theo dõi hiệu năng & chẩn đoán hệ thống (HUD)

Để kiểm soát hiệu năng dựng hình của dự án (số lượng hạt particle pháo hoa, FPS, cảnh báo lỗi), bạn có thể bật bảng HUD:

*   **Phím tắt kích hoạt:** Nhấn tổ hợp phím **`Shift + Y`** khi đang chạy mô phỏng.
*   **Bảng HUD ở góc trái hiển thị:**
    *   **Mode:** Trạng thái hoạt động (`Live` hoặc `Paused`).
    *   **Locked:** Có đang khóa chuột để xoay camera hay không (`Yes`/`No`).
    *   **Moving:** Có đang di chuyển camera hay không và hướng di chuyển (`forward`, `backward`, `idle`,...).
    *   **Preset:** Tên Preset pháo hoa đang được chọn để bắn thủ công.
    *   **Sequence:** Tên kịch bản trình diễn đang được tải.
    *   **Shell & Effect:** Loại pháo hoa và hiệu ứng hạt phát ra gần nhất.
    *   **Launch/Burst:** Tổng số quả pháo đã phóng / số quả đã phát nổ thành công trong session hiện tại.
    *   **Fallback S/E:** Số lượng hình dáng hoặc hiệu ứng bị lỗi phải dùng cấu hình dự phòng (giúp kiểm tra tính hợp lệ của script).
    *   **Warnings / Last Warn:** Số lượng cảnh báo hệ thống và chi tiết cảnh báo lỗi gần nhất gặp phải.
    *   **Stats Chart (Đồ thị ở góc trên):** Hiển thị thời gian dựng khung hình (Frame time in ms), FPS thời gian thực, lượng bộ nhớ RAM/GPU chiếm dụng sơ bộ giúp đánh giá độ giật lag của trình diễn.
