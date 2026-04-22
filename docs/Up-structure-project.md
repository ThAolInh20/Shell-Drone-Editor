---
name: update-structure-map
description: Lệnh tự động cập nhật lại file STRUCTURE.md dựa trên bộ quy tắc chuẩn
---

<objective>
Quét lại toàn bộ source code hiện tại và cập nhật (ghi đè) nội dung mới nhất vào file `STRUCTURE.md` ở thư mục gốc, đảm bảo cấu trúc dự án luôn được phản ánh chính xác nhất theo thời gian thực.
</objective>

<rules>
1. ĐỌC và TUÂN THỦ nghiêm ngặt bộ quy tắc `<rules>`, `<output_format>` và `<process>` đã được định nghĩa sẵn trong file `docs/Structure-project.md`.
2. TÌM KIẾM những thay đổi mới nhất trong thư mục `src/` (file thêm mới, file bị xóa, thay đổi logic hàm, thay đổi import/export).
3. KHÔNG TỰ Ý SÁNG TẠO định dạng. Phải xuất ra đúng cấu trúc markdown đã quy định.
4. TẬP TRUNG cập nhật sự thay đổi trong các mục:
   - Module interfaces (có hàm nào mới/cũ bị thay đổi)
   - Relationship Graph (có liên kết nào mới xuất hiện)
   - Cross-Module Dependencies & Anti-patterns (các vấn đề kiến trúc mới phát sinh)
</rules>

<process>
1. Đọc nội dung file `docs/Structure-project.md` để lấy context về cách định dạng.
2. Quét toàn bộ thư mục `src/` và phân tích các class/function/import.
3. Ghi đè kết quả phân tích mới nhất vào file `STRUCTURE.md` ở thư mục gốc dự án.
4. Xuất ra một báo cáo ngắn gọn (Summary) về những thay đổi kiến trúc đáng chú ý vừa được tìm thấy (Ví dụ: Thêm file mới X, liên kết mới Y).
</process>
