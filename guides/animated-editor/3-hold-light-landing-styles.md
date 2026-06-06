# Kiểu Giữ đèn, Kiểu LED và Kiểu Cập bến

Hiệu ứng ánh sáng LED là linh hồn của màn trình diễn drone show. Phân hệ Biên tập Động cung cấp các công cụ kiểm soát chi tiết cách hiển thị màu sắc và cách thức bật sáng khi drone đến vị trí đích.

---

## Hiệu ứng động khi giữ vị trí (Hold Style)

Khi drone bay tới đích và đứng yên trong thời gian **Hold Time**, nếu bạn không muốn khối hình trông quá cứng nhắc, bạn có thể áp dụng các chuyển động vi mô nhẹ nhàng:

*   **Bình thường (None):** Drone đứng im tuyệt đối.
*   **Sóng nhấp nhô (Wave):** Cả khối hình uốn lượn nhấp nhô theo chiều dọc như sóng biển.
*   **Đung đưa (Swing):** Khối hình dao động nghiêng nhẹ sang trái/phải theo chiều ngang.
*   **Phập phồng (Pulse):** Cả khối hình co giãn nở ra rồi thu nhỏ lại tuần hoàn như nhịp thở.
*   **Xoay quanh (Orbit):** Các drone xoay nhẹ xung quanh trục tâm của nhóm.
*   **Xoáy ốc (Spiral):** Các hàng drone xoắn vặn nhẹ quanh trục đứng.
*   **Nở hoa (Expand):** Khối hình tỏa dần ra ngoài từ tâm.

---

## Hiệu ứng ánh sáng LED (Light Style)

Hệ thống hỗ trợ 7 chế độ chạy màu LED chất lượng cao:

1.  **Bình thường (Normal):** Drone hiển thị màu sắc cố định được chọn trong bảng màu.
2.  **Sparkle (Lấp lánh):** Các drone thay nhau chớp tắt lung linh tạo hiệu ứng bầu trời đầy sao lấp lánh.
3.  **Sparkle Random (Lấp lánh ngẫu nhiên):** Chớp nháy liên tục nhưng mỗi lần chớp sẽ đổi sang một màu ngẫu nhiên khác nhau.
4.  **Patch Sparkle (Lấp lánh theo mảng):** Chớp nháy sáng theo từng khu vực hoặc từng mảng nhóm drone cạnh nhau.
5.  **Blackout (Tối đen):** **Tắt hoàn toàn đèn LED của drone.**
    *   *Ứng dụng quan trọng:* Dùng để ẩn đường bay của drone. Khi drone bay chuyển tiếp giữa các hình dạng phức tạp, bạn nên cài đặt `Blackout` để khán giả không nhìn thấy các vệt bay hỗn loạn, sau đó bật sáng trở lại ở vị trí đích để tạo hiệu ứng bất ngờ.
6.  **Rainbow (Cầu vồng):** LED của các drone tự động biến đổi chạy tuần hoàn qua dải sắc cầu vồng rực rỡ.
7.  **Strobe (Chớp tắt đồng loạt):** Toàn bộ các drone chớp sáng rồi tắt đồng bộ cực nhanh, tạo hiệu ứng giật gân, cao trào.

---

## Hiệu ứng cập bến bật sáng (Landing Style)

Khi kết thúc hành trình bay chuyển tiếp và bắt đầu bước vào thời gian Hold, cách các drone bật sáng đèn LED được gọi là **Landing Style**:

*   **Instant (Đồng bộ):** Tất cả các drone đồng loạt bật sáng đèn cùng một lúc ngay khi bước bay kết thúc.
*   **Radial Ripple (Dần từ tâm):** Đèn LED được bật sáng dần từ tâm khối hình lan tỏa ra các drone ở viền ngoài giống như gợn sóng nước.
*   **Left-to-Right (Trái sang phải):** Đèn LED sáng dần từ các drone ở ngoài cùng bên trái sang dần các drone bên phải.
*   **Right-to-Left (Phải sang trái):** Đèn LED sáng dần từ hướng phải qua hướng trái.

---

## Chiều xoay LED (Rotation Direction)

Riêng với các hiệu ứng xoay (như Vortex hay Orbit), bạn có thể thiết lập:
*   **Theo chiều kim đồng hồ (CW):** Xoay theo hướng kim đồng hồ.
*   **Ngược chiều kim đồng hồ (CCW):** Xoay ngược hướng kim đồng hồ.
*   **Xen kẽ (Alternate):** Các hàng drone xen kẽ nhau sẽ xoay ngược chiều nhau, tạo chiều sâu 3D sống động.
