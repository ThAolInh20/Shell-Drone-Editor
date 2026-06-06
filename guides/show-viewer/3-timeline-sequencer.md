# Bộ Biên tập Dòng thời gian (Timeline Sequencer)

Bộ Biên tập Timeline (`Ctrl + T`) trên màn hình Viewer là công cụ chính giúp bạn lắp ghép, đồng bộ nhạc nền và điều phối thời điểm phóng pháo hoa cũng như kịch bản bay của drone.

---

## Cách mở bộ Timeline

*   **Phím tắt kích hoạt:** Nhấn tổ hợp phím **`Ctrl + T`** khi đang ở màn hình Viewer (với con trỏ chuột không bị khóa).
*   **Giao diện:** Một bảng điều khiển tối màu bán trong suốt chiếm khoảng 35% chiều cao màn hình sẽ trượt lên từ cạnh dưới. Bạn có thể kéo ranh giới trên cùng của bảng này để thay đổi chiều cao của Timeline tùy ý.

---

## Chèn các tài nguyên vào Timeline

Dòng thời gian hiển thị các "Thẻ sự kiện (Event Blocks)" xếp chồng lên nhau trên các hàng (Tracks). Có 3 loại thẻ sự kiện:
1. **Thẻ Pháo hoa (Fireworks Sequence - Màu xanh dương/hồng):** Kích hoạt loạt bắn pháo hoa theo chu kỳ, số lượng nổ.
2. **Thẻ Nhạc nền (Audio Track - Màu tím):** Tải file âm thanh nền của chương trình trình diễn.
3. **Thẻ Drone Show (Drone Script - Màu lam sáng):** Chứa dữ liệu đường bay của hàng trăm drone đã biên dịch.

### Cách chèn file nhạc hoặc kịch bản bay drone:
*   **Cách 1 (Kéo thả trực tiếp):** Kéo file nhạc dạng `.mp3`, `.wav` hoặc file kịch bản drone dạng `.json` từ thư mục máy tính của bạn thả vào vùng trống của dòng thời gian Timeline.
*   **Cách 2 (Sử dụng nút bấm):** Nhấp vào nút **`Thêm Drone/Audio`** trên thanh công cụ để mở hộp thoại chọn file trên máy tính của bạn.
*   *Lưu ý: File nhạc hoặc drone sẽ được đặt tại vị trí vạch chỉ giờ màu xanh lam (Anchor Time) mà bạn click chọn trên thước đo.*

---

## Thao tác biên tập trực tiếp trên Timeline

Bạn có thể chỉnh sửa thời gian và vị trí của các khối sự kiện bằng các cử chỉ chuột và phím tắt:

*   **Thay đổi thời điểm bắt đầu (Kéo đi):** Nhấn giữ chuột trái vào giữa thẻ sự kiện và kéo sang trái/phải để dời mốc thời gian kích hoạt (Tự động hít lưới/snap mỗi 0.1 giây).
*   **Thay đổi thời lượng (Kéo giãn):** Di chuyển chuột vào mép bên phải của thẻ sự kiện cho đến khi con trỏ đổi thành dạng mũi tên hai đầu (`ew-resize`), nhấn giữ và kéo để tăng/giảm thời lượng của khối.
*   **Di chuyển kim thời gian:** Nhấp chuột trái vào dải thước đo thời gian (Time ruler) ở trên cùng để đặt kim chỉ giờ màu xanh lam (`Anchor Time`) hoặc nhấp phát nhạc để chạy kim đỏ phát (`Playhead`).
*   **Tùy chỉnh thông số chi tiết (Inspector):** Click chọn một thẻ sự kiện bất kỳ trên Timeline để hiển thị thông số của nó bên bảng **Property Inspector** ở góc dưới bên phải. Tại đây bạn có thể đổi tên, chỉnh sửa số lượng pháo hoa, đổi màu hạt bay, thay đổi âm lượng nhạc nền,...

---

## Phím tắt Chuyên dùng trên Timeline

Để tối ưu hóa tốc độ làm việc, hãy sử dụng các phím tắt sau (yêu cầu click chuột vào vùng Timeline trước để tập trung tiêu điểm):

| Phím tắt | Chức năng thao tác |
| :--- | :--- |
| **`Space`** | Phát hoặc Tạm dừng kịch bản từ vạch kim hiện tại |
| **`Shift + 0`** hoặc **`)`** | Chuyển đổi các mức thu phóng (Zoom) dòng thời gian (25px/s, 50px/s, 100px/s, 200px/s) |
| **`Ctrl + C`** | Sao chép thẻ sự kiện đang được chọn |
| **`Ctrl + V`** | Dán thẻ sự kiện đã copy vào vị trí kim chỉ giờ xanh lam (`Anchor Time`) |
| **`Delete`** hoặc **`Backspace`** | Xóa thẻ sự kiện đang được chọn |
| **`Ctrl + Z`** | Hoàn tác (Undo) thao tác vừa thực hiện trên Timeline |
| **`Ctrl + Y`** | Làm lại (Redo) thao tác vừa hoàn tác |
| **`Ctrl + S`** hoặc **`Shift + S`** | Lưu trực tiếp kịch bản vào file nguồn của dự án (Chỉ khả dụng trên Desktop App Electron) |
