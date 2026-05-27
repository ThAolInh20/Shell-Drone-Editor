# Mô phỏng & Trình diễn Drone Pháo hoa (Shell Drone Animation)

**Shell Drone Animation** là một ứng dụng web 3D tương tác cho phép người dùng mô phỏng và dàn dựng các màn trình diễn pháo hoa kết hợp với các màn trình diễn ánh sáng drone đầy tính nghệ thuật. Ứng dụng được thiết kế nhằm mang lại trải nghiệm hình ảnh chân thực, sống động, xây dựng trên nền tảng **Three.js** và **Vite**.

Dự án này được phát triển 90% bằng cách sử dụng Antigravity, với sự hỗ trợ đắc lực từ BMAD giúp đẩy nhanh quá trình hoàn thiện.

## Các Tính năng Chính

- **Mô phỏng 3D:** Hiệu ứng pháo hoa và ánh sáng chân thực trong không gian ba chiều.
- **Trình biên tập Dòng thời gian (Timeline Editor):** Giao diện trực quan để dàn dựng pháo hoa, thêm các bản nhạc nền (audio) và đồng bộ hóa các kịch bản theo thời gian.
- **Tùy chỉnh linh hoạt:** Quản lý các thông số cấu hình pháo hoa, các tham số vật lý và góc nhìn camera.
- **Thiết kế Đội hình Drone tĩnh 3D (3D Static Drone Formation):** Thiết kế và tạo lập các đội hình nghệ thuật cho phi đội drone.
- **Biên tập dòng thời gian Drone 3D (3D Timeline Drone Editor):** Thiết kế và chỉnh sửa các hoạt cảnh di chuyển của drone trong thời gian thực.

---

## Cấu trúc Repository & Trạng thái Triển khai

Repository áp dụng chiến lược phân nhánh như sau:
- **Bản Desktop (Windows):** Để sử dụng trực tiếp công cụ biên tập pháo hoa & drone show dưới dạng ứng dụng Desktop (không cần cài đặt môi trường code phức tạp):
  **[https://github.com/ThAolInh20/Shell-Drone_3d/releases](https://github.com/ThAolInh20/Shell-Drone_3d/releases)**
- **Bản chạy trên web (Web Deployment):** Dự án đã được triển khai hoàn chỉnh. Bạn có thể xem demo trực tiếp và trải nghiệm ngay trên trình duyệt của mình tại:
  **[https://shell3d.netlify.app/](https://shell3d.netlify.app/)**
- **Mã nguồn Phát triển:** Toàn bộ mã nguồn phát triển, lịch sử commit và hướng dẫn cài đặt cục bộ được lưu trữ trên nhánh `dev`. Vui lòng chuyển sang nhánh [`dev`](https://github.com/ThAolInh20/Shell-Drone_3d/tree/dev) để xem chi tiết mã nguồn và đóng góp cho dự án.

---

## 📥 Tải về & Cài đặt (Download & Installation)

### 🚀 1. Tải ứng dụng chạy trên Desktop (Pre-built Desktop App via Releases)
Để sử dụng trực tiếp công cụ biên tập pháo hoa & drone show dưới dạng ứng dụng Desktop (không cần cài đặt môi trường code phức tạp):
1. Truy cập trang **[GitHub Releases](https://github.com/ThAolInh20/Shell-Drone_3d/releases)** của dự án.
2. Chọn phiên bản (tag) mới nhất và tải xuống file cài đặt dành cho Windows (Ví dụ: `ShellDroneEditor Setup 1.x.x.exe` hoặc file chạy trực tiếp Portable `ShellDroneEditor 1.x.x.exe`).
3. Mở file đã tải xuống để tiến hành cài đặt hoặc chạy trực tiếp phần mềm.

### 💻 2. Tải Source Code theo phiên bản cụ thể (Git Tags)
Nếu bạn muốn đóng góp phát triển và cần tải đúng source code của một phiên bản (tag) cố định:
* Sử dụng lệnh `git clone` cùng tùy chọn `--branch` để clone đúng tag mong muốn:
  ```bash
  git clone --branch <tag_name> https://github.com/ThAolInh20/Shell-Drone_3d.git
  ```
* Hoặc bạn có thể truy cập mục **[Tags](https://github.com/ThAolInh20/Shell-Drone_3d/tags)**, chọn tag tương ứng rồi bấm **Download ZIP** để tải mã nguồn nén về máy.