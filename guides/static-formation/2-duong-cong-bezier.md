# Công cụ Vẽ & Kéo cong Bezier

Đường cong Bezier là một tính năng đặc biệt trong Shape Panel cho phép bạn tạo ra các dải drone uốn lượn mềm mại trong không gian 3D, thay vì các đường thẳng hay hình học cứng nhắc thông thường.

---

## Kích hoạt chế độ Bezier

1. Trong phần **Tạo hình đội hình (Shape)** ở panel bên trái, hãy nhấp chọn hình dạng **Đường cong Bezier**.
2. Một nút bấm đặc biệt **`Vẽ & Kéo Cong Bezier: TẮT`** sẽ hiển thị. Hãy click vào đó để chuyển thành **`Vẽ & Kéo Cong Bezier: BẬT`**.
3. Tại giao diện Viewport 3D, bạn sẽ thấy xuất hiện một đường nét đứt màu xanh nối giữa **3 quả cầu phát sáng màu neon nổi bật**:
   *   **`P0 (Quả cầu đầu)`**: Điểm bắt đầu của đường cong.
   *   **`P1 (Quả cầu giữa)`**: Điểm neo kiểm soát hướng và độ cong (Control Point).
   *   **`P2 (Quả cầu cuối)`**: Điểm kết thúc của đường cong.

---

## Điều chỉnh đường cong trực quan bằng chuột

Hệ thống cho phép bạn điều chỉnh vị trí của cả 3 điểm kiểm soát trong không gian 3 chiều:

1.  **Chọn điểm cầu:** Nhấp chuột trái vào bất kỳ quả cầu neon nào (`P0`, `P1`, `P2`) trong Viewport 3D.
2.  **Sử dụng Gizmo:** Ngay khi chọn quả cầu, một bộ mũi tên định hướng Gizmo (đỏ - X, xanh lá - Y, xanh dương - Z) sẽ xuất hiện tại tâm quả cầu đó.
3.  **Kéo thả:** Nhấp giữ chuột trái vào các mũi tên và di chuyển chuột để kéo quả cầu neo tới tọa độ mong muốn. Đường cong nét đứt sẽ liên tục cập nhật uốn theo thời gian thực.
4.  **Chỉnh độ cao nhanh:** Ngoài việc kéo trực tiếp bằng Gizmo, bạn có thể kéo thanh trượt **`Y Offset (Chiều cao)`** (hoặc `ui-bezier-control-y`) trên bảng điều khiển bên trái để thay đổi nhanh độ vồng cao (tọa độ Y) của điểm kiểm soát ở giữa (`P1`).

---

## Áp dụng phân bố drone lên đường cong

Sau khi đã tạo được hình dáng đường cong ưng ý:

1.  Thiết lập **Số lượng (Count)** drone muốn trải (ví dụ: `20` drone).
2.  Chọn **Đích (Target)**:
    *   *Tạo drone mới*: Trải 20 drone mới dọc theo đường cong này.
    *   *Áp dụng vào nhóm chọn*: Lấy các drone đang chọn bám khít dọc theo đường cong.
3.  Nhấp nút **`Áp dụng tạo hình`**. Các drone sẽ tự động được phân bổ đều dọc theo đường cong Bezier từ điểm đầu `P0` đến điểm cuối `P2` dưới dạng các chấm sáng tròn lung linh.
