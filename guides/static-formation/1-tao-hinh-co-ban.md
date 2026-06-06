# Công cụ Tạo hình Đội hình Cơ bản

Phần panel bên trái của Static Formation Designer cung cấp bảng điều khiển **Tạo hình đội hình (Shape Panel)** giúp bạn sinh nhanh tọa độ drone theo các dạng cấu trúc hình học hoặc ký tự.

---

## Chi tiết 10 Chế độ Tạo hình (Shape Type)

Hệ thống hỗ trợ các loại tạo hình toán học sau:

1.  **Lưới (Grid):** Xếp drone thành mạng lưới phẳng dạng lưới ô vuông (2D). Thường dùng làm đội hình xuất phát (Launch Pad) trên mặt đất.
2.  **Đường thẳng (Line):** Tạo một hàng drone thẳng hàng. Bạn có thể kéo nghiêng hoặc xoay hàng này trong không gian.
3.  **Tam giác (Triangle):** Phân bổ drone dọc theo chu vi của một hình tam giác cân.
4.  **Hình tròn (Circle):** Xếp drone đều trên đường biên tròn. Rất thích hợp làm viền hoa, bánh răng hoặc mặt trời.
5.  **Hình cầu (Sphere):** Phân bổ drone phân tán đều trên mặt ngoài của khối cầu 3D rỗng. Phù hợp làm quả địa cầu, hành tinh hoặc các khối phát sáng tròn.
6.  **Hình hộp (Cube):** Xếp drone tạo thành khung/bề mặt của hình hộp chữ nhật hoặc hình lập phương 3D.
7.  **Hình trụ (Cylinder):** Tạo khối ống trụ rỗng. Thích hợp làm cột sáng, tháp hoặc lốc xoáy đứng.
8.  **Hình sao (Star):** Sinh hình ngôi sao 5 cánh hoặc nhiều cánh hơn. Bạn có thể điều chỉnh số cánh sao mong muốn.
9.  **Chữ / Số (Text):** Nhập ký tự chữ hoặc số tùy ý (ví dụ: "HANOI", "2026"). Hệ thống sử dụng font chữ định sẵn để tự động sinh tọa độ các điểm drone khớp theo nét vẽ chữ.
10. **Tệp JSON:** Đọc tọa độ từ một danh sách các điểm `x, y, z` có sẵn từ tệp tin JSON ngoài.

---

## Các thông số hiệu chỉnh hình học

Khi chọn một hình dạng, bạn cần cấu hình các tham số bên dưới:

*   **Số lượng (Count):** Tổng số lượng drone sẽ tạo hoặc áp dụng (ví dụ: `100` drone).
*   **Bán kính / Khoảng cách (Spacing / Radius):**
    *   Với Lưới/Đường thẳng: Đây là cự ly giữa hai drone cạnh nhau.
    *   Với Hình tròn/Hình cầu/Hình sao: Đây là bán kính lớn nhất của hình.
*   **Chiều cao (Height):** Riêng với Hình trụ (Cylinder), điều chỉnh chiều cao của khối ống trụ.
*   **Số cánh sao (Star Points):** Số đỉnh cánh sao (mặc định là 5).
*   **Nội dung chữ (Text):** Ô nhập ký tự khi chọn chế độ tạo hình **Chữ / Số**.
*   **Tâm đội hình (Center X, Y, Z):** Tọa độ không gian nơi đặt tâm của hình học này.
*   **Chế độ tô (Fill Mode):**
    *   `Đặc (Solid)`: Drone phân bổ đều khắp diện tích bề mặt/thể tích của hình.
    *   `Rỗng (Outline)`: Drone chỉ xếp trên đường biên ngoài của hình (ví dụ: chu vi hình tròn, viền ngôi sao).

---

## Đối tượng áp dụng (Target)

Đây là tùy chọn cực kỳ quan trọng để quyết định hành vi sinh drone:

*   **Tạo drone mới (Create new drone):**
    *   Hệ thống sẽ sinh thêm các drone mới toanh vào cảnh.
    *   *Ví dụ:* Nếu cảnh đang có 0 drone, chọn "Tạo drone mới" với số lượng 50, nhấn Áp dụng sẽ tạo ra 50 drone xếp thành hình học đã chọn.
*   **Áp dụng vào nhóm chọn (Apply to selected):**
    *   **Không** sinh thêm drone mới. Thay vào đó, hệ thống sẽ lấy những drone bạn đang quét chọn trong khung nhìn và sắp xếp lại tọa độ của chúng theo hình học mới.
    *   *Ví dụ:* Bạn có 50 drone đang xếp lộn xộn, bạn quét chọn cả 50 drone, chọn "Áp dụng vào nhóm chọn", chọn hình dạng "Hình tròn", nhấn áp dụng. 50 drone đó sẽ ngay lập tức di chuyển xếp thành hình tròn.
