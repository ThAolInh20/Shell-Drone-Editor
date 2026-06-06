# Biên tập các Bước bay trên Timeline

Phần dưới của giao diện biên tập hoạt cảnh động chứa **Dòng thời gian bước bay (Timeline Step Panel)**. Trình diễn drone được xây dựng bằng cách nối tiếp nhiều bước bay (Steps), trong đó mỗi bước chứa một trạng thái phân bố tọa độ cố định của drone.

---

## Thao tác với thẻ Bước bay (Step Cards)

Mỗi Step trên Timeline được hiển thị dưới dạng một thẻ card nhỏ chứa các thông tin:
*   **Tên bước:** Ví dụ `Bước 1`, `Bước 2`...
*   **Mốc thời gian kích hoạt:** Thể hiện bằng mili-giây (`ms`). Ví dụ: `3000 ms` có nghĩa là bước này bắt đầu chạy từ giây thứ 3.0 của show.
*   **Màu sắc thẻ (UI Color):** Bạn có thể đổi màu sắc của từng thẻ trên Step Panel bên phải để dễ nhận diện trong quá trình biên soạn.
*   **Xem trước bước bay:** Click chuột trái vào một thẻ Step Card bất kỳ (khi đang tạm dừng phát). Khung nhìn 3D sẽ chuyển vạch kim thời gian (`playbackTime`) về thời điểm của bước đó và hiển thị vị trí drone tại bước đó.

---

## Kéo thả thay đổi thứ tự bay (HTML5 Drag & Drop)

Nếu bạn muốn thay đổi thứ tự xuất hiện của các hình khối trong kịch bản (ví dụ: đưa hình ngôi sao ở Step 4 lên trước hình tròn ở Step 2):

1.  Click chuột trái vào thẻ Step muốn dời đi và giữ chuột. Thẻ card sẽ mờ đi 50% để báo hiệu chế độ kéo đang bật.
2.  Kéo thẻ card rê qua các thẻ khác. Khi rê qua thẻ nào, đường biên thẻ đó sẽ chuyển sang màu xanh lá cây để thông báo vị trí drop khả dụng.
3.  **Thả chuột (Drop):** Thả chuột tại vị trí mong muốn.
4.  **Tự động tính toán lại thời gian (`recalculateTimes`):**
    *   Hệ thống sẽ thay đổi vị trí của phần tử Step trong mảng dữ liệu.
    *   Tự động tính toán lại các mốc thời gian bắt đầu chạy của tất cả các Step sau đó dựa trên thời lượng Transition và Hold của mỗi step.
    *   Cập nhật tức thì khung nhìn mô phỏng 3D để đảm bảo quỹ đạo chuyển động mượt mà theo đúng thứ tự mới.

---

## Thêm và Xóa các Bước bay

*   **Thêm bước mới:** Nhấp vào nút **`Thêm bước +`** (Add Step) ở góc trái timeline. Hệ thống sẽ tự động nhân bản (clone) bước hiện tại và nối tiếp vào cuối dòng thời gian.
*   **Xóa bước bay:** Nhấp vào nút dấu **`×`** nhỏ ở góc trên bên phải của thẻ Step Card. Hệ thống sẽ yêu cầu xác nhận trước khi xóa bỏ bước này khỏi kịch bản.

---

## Chọn nhóm điều phối (Active Group Dropdown)

Cạnh nút phát có một menu thả xuống: **`Nhóm đang chọn`** (Active Group).
*   Mặc định là **Nhóm mặc định** (áp dụng cho toàn bộ drone).
*   Nếu bạn chọn một nhóm cụ thể (ví dụ: `Group A`): Tất cả các thay đổi về tọa độ, hiệu ứng bay, hiệu ứng màu sắc ở Step đang chọn sẽ chỉ tác động lên các drone thuộc `Group A`. Các drone thuộc nhóm khác sẽ giữ nguyên trạng thái cũ. Điều này giúp bạn tạo ra những màn trình diễn đa dạng với nhiều luồng chuyển động riêng rẽ cùng lúc.
