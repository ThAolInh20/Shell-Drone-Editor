# Bộ Uốn biến dạng nhóm (Group Deformer)

Bộ **Uốn nhóm (Group Deformer)** trong Animated Editor là một công cụ biến đổi không gian 3D nâng cao. Thay vì phải di chuyển từng drone hoặc dùng các công cụ co giãn (Scale) thông thường, công cụ này cho phép bạn "bẻ cong" hoặc "duỗi thẳng" toàn bộ nhóm drone được chọn như thể chúng làm bằng cao su dẻo.

---

## Cách kích hoạt bộ Uốn nhóm

Công cụ này chỉ hiển thị khi bạn đang chọn một nhóm drone trong Viewport:

1.  Dùng chuột quét chọn hoặc `Ctrl + Click` để chọn một nhóm drone bất kỳ.
2.  Bên bảng điều khiển Gizmo (panel bên phải), phần **`Biến dạng nhóm (Uốn)`** sẽ xuất hiện.
3.  Nhấp vào nút **`Uốn nhóm: TẮT`** để đổi trạng thái thành **`Uốn nhóm: ĐANG BẬT`**.
4.  Lúc này, trong Viewport 3D sẽ xuất hiện **3 khối cầu điều hướng Neon phát sáng**.

---

## Hai chế độ Biến dạng (Deform Type)

Tại menu **Loại biến dạng**, bạn có thể chọn một trong hai thuật toán uốn:

### Chế độ 1: Uốn cong (Bend - Bezier)
*   **Mô tả:** Bẻ cong đội hình drone theo một đường cong mượt mà.
*   **Cách hoạt động:** 3 quả cầu Neon tương ứng với đầu, giữa và cuối của đội hình drone đang chọn.
*   Nhấp chuột vào quả cầu Neon ở giữa và dùng trục Gizmo kéo dịch chuyển. Cả khối drone sẽ tự động uốn cong theo hình dạng cung Bezier tương ứng với vị trí quả cầu bạn kéo.
*   Thích hợp để uốn cong một hàng drone phẳng thành hình vòng cung, hoặc uốn cong một hình hộp thành hình bán nguyệt.

### Chế độ 2: Kéo thẳng (Straighten - Linear)
*   **Mô tả:** Ép các drone bị cong trở lại đường thẳng tuyến tính, hoặc kéo giãn cự ly.
*   **Cường độ kéo thẳng (Deform Strength):**
    *   Thanh trượt từ `0%` đến `100%`.
    *   Nếu để `100%`, các drone trong nhóm sẽ bị cưỡng bức xếp thẳng băng thành một đường thẳng tắp nối giữa hai điểm đầu cuối.
    *   Nếu giảm dần phần trăm, độ cong nguyên bản của đội hình sẽ được giữ lại một phần, giúp bạn làm phẳng nhẹ các nếp nhăn hoặc nếp gấp của đội hình drone một cách mịn màng.

---

## Áp dụng hoặc Hủy bỏ biến dạng

Trong quá trình uốn kéo các quả cầu Neon điều hướng:
*   Đội hình drone sẽ thay đổi hình dạng tạm thời để bạn quan sát.
*   **Nhấp nút Áp dụng (Apply):** Xác nhận hình dạng mới. Hệ thống sẽ lưu tọa độ của các drone vừa uốn vào Step hiện tại của timeline và ghi lại lịch sử thao tác (`saveStateToHistory` để có thể `Ctrl + Z`).
*   **Nhấp nút Huỷ bỏ (Cancel):** Gỡ bỏ các quả cầu Neon và hoàn nguyên đội hình drone về hình dáng ban đầu trước khi uốn.
