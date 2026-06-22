# Tóm tắt công việc Refactor SOLID

Tài liệu này ghi lại danh sách các đầu việc cần triển khai cho quá trình refactor hệ thống class tuân theo các nguyên lý SOLID trên nhánh `refactor/SOLID-for-project`.

## Danh sách đầu việc cần thực hiện

1. **Thiết lập môi trường kiểm thử (Testing Environment)**
   - Cài đặt `vitest` làm `devDependencies` (`npm install -D vitest`).
   - Thêm script chạy test `"test": "vitest run"` vào `package.json`.

2. **Xây dựng bộ kiểm thử nền tảng (Regression Tests)**
   - Tạo file test `tests/factories/ShellPresetFactory.test.js` để kiểm tra khả năng tạo và kiểm định các preset pháo hoa.
   - Tạo file test `tests/directors/ShowDirector.test.js` để kiểm tra các trạng thái điều khiển timeline (`play`, `pause`, `stop`, `seek`) và kích hoạt sự kiện.

3. **Tái cấu trúc (Refactoring)**
   - **ShellPresetFactory (OCP):**
     - Loại bỏ khối `switch-case` cứng nhắc trong `createPresetByKey`.
     - Chuyển cấu trúc presets sang Registry/Strategy pattern (đăng ký động cấu hình preset).
   - **ShowDirector (SRP, OCP):**
     - Tách logic thực thi sự kiện `executeEvent` sang một class điều phối sự kiện độc lập `ShowEventDispatcher`.
     - Cho phép đăng ký các Event Handler tương ứng với từng loại sự kiện (`single`, `sequence`, `cometsequence`, `finale`, `audio`, `droneshow`).
   - **BaseFormationState (DIP):**
     - Chuyển đổi constructor của `BaseFormationState` để hỗ trợ Dependency Injection đối với `HistoryManager` và `ConstraintSolver`, giúp dễ dàng mock test.

4. **Kiểm tra và nghiệm thu**
   - Chạy toàn bộ các unit test để kiểm tra tính ổn định sau refactor (`npm run test`).
   - Khởi động chế độ dev và kiểm tra hoạt động thủ công của trình diễn drone & pháo hoa trên giao diện browser.
