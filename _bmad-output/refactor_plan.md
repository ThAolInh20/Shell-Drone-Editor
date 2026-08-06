# Kế hoạch Loại bỏ Trùng lặp Selection Logic qua SelectionSolver

Kế hoạch này đề xuất tạo file lớp tiện ích [SelectionSolver.js](file:///e:/shell-drone-animation/src/core/SelectionSolver.js) để loại bỏ sự trùng lặp của các thuật toán chọn drone giữa [EditorDirector.js](file:///e:/shell-drone-animation/src/editor/EditorDirector.js) (Màn hình Editor Animation) và [FormationDirector.js](file:///e:/shell-drone-animation/src/formation/FormationDirector.js) (Màn hình Editor Formation).

## User Review Required

Việc refactor sẽ gom cụm các thuật toán chiếu tọa độ 3D về 2D (phục vụ chọn hộp marquee) và xử lý sự kiện click chuột chọn nhóm/cá nhân drone vào một file dùng chung duy nhất. Điều này giúp giảm khoảng 100 dòng mã trùng lặp ở mỗi lớp Director và tăng tính bảo trì cho hệ thống tương tác.

## Open Questions

Không có.

## Proposed Changes

### Core Selection Component

---

#### [NEW] [SelectionSolver.js](file:///e:/shell-drone-animation/src/core/SelectionSolver.js)
- Triển khai phương thức tĩnh `SelectionSolver.solveBoxSelection(params)`:
  - Nhận tọa độ chuột quét, viewport canvas, camera và tập hợp vị trí drone.
  - Thực hiện chiếu tọa độ 3D qua camera để tìm ra danh sách các drone nằm trong hộp chọn screen-space 2D.
  - Trả về danh sách chỉ số (indices) được chọn.
- Triển khai phương thức tĩnh `SelectionSolver.solveClickSelection(params)`:
  - Nhận danh sách giao điểm (intersects) từ raycast, thông tin sự kiện click và đối tượng state.
  - Giải quyết logic chọn/bỏ chọn drone đơn lẻ hoặc chọn toàn bộ nhóm (particle group) dựa trên trạng thái Shift/Ctrl và tùy chọn checkbox group UI.

### Directors Refactoring

---

#### [MODIFY] [FormationDirector.js](file:///e:/shell-drone-animation/src/formation/FormationDirector.js)
- Import `SelectionSolver` từ `src/core/SelectionSolver.js`.
- Loại bỏ toàn bộ phần tính toán lặp trong `performBoxSelection` và chuyển sang gọi `SelectionSolver.solveBoxSelection`.
- Cập nhật hàm `handleCanvasClick` để ủy quyền phần xử lý click chọn drone tiêu chuẩn sang `SelectionSolver.solveClickSelection`.

#### [MODIFY] [EditorDirector.js](file:///e:/shell-drone-animation/src/editor/EditorDirector.js)
- Import `SelectionSolver` từ `src/core/SelectionSolver.js`.
- Loại bỏ mã nguồn trùng lặp trong `performBoxSelection` và ủy quyền sang `SelectionSolver.solveBoxSelection`.
- Cập nhật hàm `handleCanvasClick` để ủy quyền xử lý click chọn drone tiêu chuẩn sang `SelectionSolver.solveClickSelection`.

## Verification Plan

### Automated Tests
- Chạy toàn bộ các test hiện tại để đảm bảo không lỗi:
  ```powershell
  npm test
  ```
- Viết unit test mới cho SelectionSolver.test.js kiểm thử giải thuật chiếu điểm 3D và logic quyết định click chọn nhóm.

### Manual Verification
1. Mở màn hình Editor Formation (formation.html) và màn hình Editor Animation (editor.html):
   - Kiểm tra hành vi chọn hộp marquee (quét chuột kéo hộp nét đứt) xem danh sách drone có được bôi màu chọn chính xác không.
   - Thử click đơn lẻ hoặc giữ Shift click nhiều drone, click chọn cả nhóm khi bật/tắt checkbox #ui-select-group xem hoạt động đúng kỳ vọng không.
