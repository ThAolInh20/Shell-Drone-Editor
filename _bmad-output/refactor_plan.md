# Kế hoạch Tái cấu trúc FormationDirector theo Clean Architecture

Kế hoạch này tập trung vào việc tách biệt ranh giới giữa logic đồ họa Three.js, thao tác trực tiếp trên DOM, giao diện điều khiển (UI) và quản lý trạng thái trong màn hình Editor Formation (Static Formation Designer). Mục tiêu là cải thiện khả năng viết unit test, giảm trùng lặp mã nguồn và tuân thủ nguyên lý Clean Architecture.

## User Review Required

Việc refactor sẽ thay đổi cách lớp FormationDirector giao tiếp với giao diện người dùng FormationUI. Thay vì truyền trực tiếp đối tượng FormationDirector (chứa toàn bộ logic Three.js và DOM) vào UI, chúng ta sẽ định nghĩa một giao diện interface hoặc sử dụng EventBus để truyền dữ liệu và sự kiện. Điều này giúp cô lập giao diện khỏi thư viện đồ họa Three.js.

## Open Questions

1. Chúng ta có nên triển khai cơ chế Dependency Injection (DI) hoàn chỉnh cho tất cả các Director hay chỉ tập trung vào việc tách DOM của hộp chọn Selection Box và UI trước?
2. Bạn có muốn cấu hình một framework mock DOM (như jsdom) trong môi trường test để chạy unit test cho các thành phần UI sau khi refactor không?

## Proposed Changes

### Formation Component

---

#### [MODIFY] [FormationDirector.js](file:///e:/shell-drone-animation/src/formation/FormationDirector.js)
- Loại bỏ các mã nguồn thao tác trực tiếp với DOM liên quan đến hộp chọn (selectionBoxEl).
- Thay đổi constructor để nhận EventBus làm tham số (Dependency Injection) thay vì sử dụng globalEventBus trực tiếp.
- Tách biệt logic xử lý tương tác canvas (raycasting) và vẽ ghost hologram guide thành các phương thức hỗ trợ riêng biệt hoặc đóng gói thành lớp trung gian.
- Thay đổi cách khởi tạo setupFormationUI để giao tiếp qua interface/callback hoặc sự kiện thay vì truyền cả thực thể this.

#### [NEW] [SelectionBoxHelper.js](file:///e:/shell-drone-animation/src/formation/ui/SelectionBoxHelper.js)
- Đóng gói toàn bộ logic tạo, cập nhật kiểu dáng (style), ẩn/hiển thị của hộp chọn marquee DOM (selectionBoxEl).
- Lớp này sẽ được sử dụng bởi các lớp Director mà không cần Director phải trực tiếp gọi document.createElement hay document.body.appendChild.

#### [MODIFY] [FormationUI.js](file:///e:/shell-drone-animation/src/formation/ui/FormationUI.js)
- Refactor hàm setupFormationUI để chỉ tương tác với đối tượng trạng thái FormationState và giao tiếp với FormationDirector qua một interface định nghĩa sẵn (ví dụ: FormationUIListener hoặc EventBus).
- Đảm bảo UI không thể gọi trực tiếp các phương thức đồ họa hoặc thay đổi thuộc tính của Three.js trong Director.

## Verification Plan

### Automated Tests
- Chạy toàn bộ các test hiện tại để đảm bảo không lỗi:
  ```powershell
  npm test
  ```
- Viết bổ sung các bài unit test cho SelectionBoxHelper.js và các hàm xử lý tính toán vị trí drone trong trạng thái.

### Manual Verification
- Mở màn hình Editor Formation (formation.html) trong ứng dụng và kiểm tra:
  - Khả năng quét hộp chọn (marquee selection) nhiều drone cùng lúc.
  - Các thao tác thay đổi thuộc tính drone thông qua bảng điều khiển bên phải (Property Inspector).
  - Khả năng lưu/tải tệp cấu hình đội hình hoạt động chính xác.
