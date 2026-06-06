# Cấu hình Hiệu ứng Chuyển trạng thái & Hiệu ứng Bay

Khi chuyển từ hình dạng của Step này sang Step tiếp theo, các drone cần bay theo các lộ trình được chỉ định để tạo cảm hứng nghệ thuật và đảm bảo an toàn bay (tránh va chạm). Bảng điều khiển bên phải cho phép bạn cấu hình sâu các hiệu ứng này.

---

## Cấu hình Thời gian (Timing)

Mỗi bước bay có hai thông số thời gian quan trọng tính bằng mili-giây (`ms`):
*   **Thời gian giữ (Hold Time):** Khoảng thời gian drone đứng yên hoàn toàn ở vị trí đích để khán giả ngắm nhìn đội hình.
*   **Thời gian chuyển (Transition Time):** Khoảng thời gian drone cất cánh bay dịch chuyển từ tọa độ cũ sang tọa độ mới. Cự ly bay càng xa thì bạn nên để thời gian Transition này càng lớn để đảm bảo drone không vượt quá tốc độ bay vật lý cho phép.

---

## Chi tiết 6 Kiểu bay chuyển đổi (Transition Style)

Tại mục **Chế độ (Mode)** của kiểu chuyển đổi, bạn có thể chọn các thuật toán bay sau:

1.  **Transform (Mặc định):** Thuật toán tự động tìm lộ trình trực tiếp tối ưu nhất cho từng drone từ vị trí cũ sang vị trí mới. Các drone sẽ di chuyển theo đường thẳng tuyến tính ngắn nhất.
2.  **Move (Di chuyển nhóm):** Di chuyển tịnh tiến đồng bộ cả nhóm drone. Thích hợp khi bạn muốn di chuyển cả khối hình từ trái sang phải mà không làm biến dạng cấu trúc hình học bên trong.
3.  **Disperse (Vỡ tung rồi tụ):** Drones phát nổ bung ra xa theo các hướng ngẫu nhiên như một cụm pháo hoa xòe rộng, sau đó mới thu hẹp khoảng cách và hội tụ vào vị trí hình khối mới. Tạo cảm giác bùng nổ đẹp mắt.
4.  **Vortex (Cơn lốc xoáy):** Drone di chuyển theo quỹ đạo xoắn ốc dạng lốc xoáy cuộn tròn xung quanh tâm dọc. Có thể điều chỉnh chiều xoay (CW - theo chiều kim đồng hồ, CCW - ngược chiều kim đồng hồ, hoặc Alternate - xen kẽ).
5.  **Cascade (Thác đổ):** Drone di chuyển dịch chuyển dạng sóng thác đổ. Các drone ở đỉnh cao di chuyển trước, kéo theo các drone phía dưới di chuyển sau, tạo hiệu ứng dợn sóng nước chảy.
6.  **Helix (Xoắn kép DNA):** Nhóm drone chia làm các nhánh bay đan xen chéo qua nhau tạo thành các đường xoắn kép như chuỗi cấu trúc DNA.

---

## Hiệu ứng vật lý & ánh sáng trong lúc bay (Flight Effect)

Để tạo hiệu ứng động tự nhiên khi drone đang trong hành trình chuyển tiếp:

### 1. Hiệu ứng bay (Flight Move Effect)
Tạo ra các rung động gợn sóng nhỏ theo thuật toán nhiễu để đường bay mềm mại hơn:
*   **Tốc độ di chuyển (Move Speed):** Biên độ dao động lệch vị trí của drone.
*   **Tần số di chuyển (Move Freq):** Tốc độ nhấp nhô nhanh hay chậm của làn sóng.

### 2. Hiệu ứng ánh sáng bay (Flight Light Effect)
Cách thức đèn LED nhấp nháy trong lúc bay:
*   **Tốc độ ánh sáng (Light Speed) & Tần số ánh sáng (Light Freq):** Điều khiển chu kỳ chớp sáng của bóng đèn LED khi drone đang di chuyển.

### 3. Hiệu ứng lấp lánh (Sparkle Effect)
Cho phép drone phát ra hiệu ứng phát sáng nhấp nháy lấp lánh như bụi kim tuyến trong lúc bay:
*   **Màu Lấp lánh (Sparkle Col):** Chọn màu sắc riêng cho hiệu ứng lấp lánh (ví dụ màu vàng neon hoặc xanh băng).
*   **Tần số lấp lánh (Spark Freq):** Tần suất xuất hiện nhấp nháy.
*   **Số lượng lấp lánh (Spark Qty):** Số lượng drone tham gia chớp sáng lấp lánh cùng lúc.
