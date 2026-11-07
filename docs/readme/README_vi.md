# Firework & Drone Show Studio (Mô phỏng Trình diễn Drone và Pháo hoa 3D)

**Languages:** [English](README_en.md) | [Tiếng Việt](README_vi.md) | [日本語](README_ja.md) | [中文](README_zh.md)

Firework & Drone Show Studio là ứng dụng mô phỏng và biên tập trình diễn pháo hoa & drone 3D, được xây dựng bằng **Three.js** và **Vite**, sử dụng **Electron** để build phần mềm Desktop chuyên nghiệp.

---

## Hướng dẫn Tải và Cài đặt mã nguồn

### Cách 1: Sử dụng Git (Khuyên dùng)
Nếu máy bạn đã cài đặt [Git](https://git-scm.com/) (bạn có thể tải Git [tại đây](https://git-scm.com/downloads)), hãy mở Terminal (hoặc Command Prompt/PowerShell) và chạy lệnh sau:
```bash
git clone https://github.com/ThAolInh20/Shell-Drone-Editor.git
cd shell-drone-animation
```

### Cách 2: Tải file ZIP trực tiếp
1. Nhấp vào nút **Code** màu xanh lá cây ở góc trên bên phải của trang repository này.
2. Chọn **Download ZIP**.
3. Giải nén tệp ZIP vừa tải xuống và mở thư mục chứa mã nguồn.

---

## Cài đặt Môi trường & Chạy Ứng dụng

Dự án yêu cầu **[Node.js](https://nodejs.org/)** phiên bản 18 trở lên (bạn có thể tải Node.js [tại đây](https://nodejs.org/en/download)). Hãy đảm bảo bạn đã cài đặt Node.js trước khi tiếp tục.

### Bước 1: Cài đặt các Thư viện Phụ thuộc (Dependencies)
Mở terminal tại thư mục gốc của dự án (`shell-drone-animation`) và thực hiện lệnh:
```bash
npm install
```

### Bước 2: Khởi chạy Ứng dụng

Bạn có thể chạy ứng dụng theo 2 phương thức khác nhau tùy vào mục đích sử dụng:

#### Phương thức A: Chạy dưới dạng Desktop App với Electron (Khuyên dùng)
Phương thức này khởi chạy một ứng dụng Desktop độc lập bằng Electron. Chạy bằng cách này sẽ mở khóa các tính năng native cao cấp:
*   **Lưu file trực tiếp (`Ctrl + S`):** Lưu ngay lập tức các chỉnh sửa trực tiếp vào file `.json` nguồn mà **không** cần thông qua hộp thoại tải xuống của trình duyệt.
*   **Thanh Menu Điều Hướng Nhanh:** Chuyển đổi qua lại giữa 3 bộ công cụ biên tập cực kỳ nhanh chóng thông qua menu hệ thống của ứng dụng hoặc phím tắt (`Ctrl + 1`, `Ctrl + 2`, `Ctrl + 3`).

Để chạy ứng dụng ở chế độ Desktop, sử dụng lệnh:
```bash
npm run electron:dev
```

#### Phương thức B: Chạy trên Trình duyệt Web truyền thống
Chạy máy chủ phát triển Vite thông thường bằng lệnh:
```bash
npm run dev
```
Sau đó, truy cập vào địa chỉ local được hiển thị trên terminal (mặc định là `http://localhost:5173/`).
*Lưu ý: Khi chạy trên trình duyệt web, do cơ chế bảo mật của trình duyệt, tính năng lưu file trực tiếp sẽ tự động chuyển thành tải xuống file qua browser.*

---

## Hệ thống Thư viện Pháo hoa Dùng chung (Firework Engine)

Toàn bộ thuật toán mô phỏng vật lý, hình học, động học vi phân, hiệu ứng quang học và mẫu cấu hình pháo hoa được duy trì tập trung tại kho mã nguồn độc lập **[`@shell-drone/firework-engine`](https://github.com/ThaoLinn20/firework-engine)**. Kiến trúc này bảo đảm các ứng dụng khác nhau (như bản Studio này và bản TikTok Live) luôn dùng chung một bộ logic chuẩn và đồng bộ hiệu ứng hiển thị 100%.

### Cập nhật các loại pháo hoa mới nhất
Khi có thêm pháo hoa mới hoặc bản tối ưu hiệu năng được đẩy lên kho mã nguồn `firework-engine`, bạn có thể cập nhật cho ứng dụng bằng lệnh:
```bash
npm update @shell-drone/firework-engine
```

### Quy trình tạo mới hoặc đóng góp pháo hoa
Để tạo thêm hình dạng (Shape), động học (Dynamics) hoặc mẫu pháo (Preset) mới:
1. Mở thư mục `../firework-engine` (https://github.com/ThaoLinn20/firework-engine).
2. Viết mã nguồn hình dạng hoặc hiệu ứng trong thư mục `src/factories/` theo đúng mô hình Component-based Composition.
3. Chạy `npm test` và `npm run build` tại `firework-engine` để kiểm thử và biên dịch bundle.
4. Commit và push code lên nhánh `main`.
5. Chạy `npm update @shell-drone/firework-engine` tại project Studio này để nhận ngay pháo hoa mới.

---

## Biên dịch và Đóng gói

### B. Đóng gói Ứng dụng Desktop
Khi muốn đóng gói toàn bộ dự án thành phần mềm cài đặt Desktop chạy độc lập trên Windows:
1. **Chạy lệnh Đóng gói:**
   Chạy lệnh duy nhất dưới đây để tự động biên dịch mã nguồn qua Vite và đóng gói với `electron-builder`:
   ```bash
   npm run electron:build
   ```
   File được lưu vào thư mục `dist-electron`
   
## Update release notes
Các thay đổi mới nhất dc lưu tại đây [đây](../../RELEASE_NOTES.md)
