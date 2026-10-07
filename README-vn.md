# Mô phỏng và Trình diễn Drone Pháo hoa 3D - Shell Drone Animation

[English](README.md) | [Tiếng Việt](README-vn.md) | [日本語](README-ja.md) | [简体中文](README-zh.md)

**Drone shell editor** là phần mềm mô phỏng 3D cho pháo hoa và drone. Phần mềm hộ trợ biên kịch kịch bản pháo hoa, thiết kế đội hình drone, biên đạo đầy đủ cho 1 show trình diễn drone kết hợp với pháo hoa

---

<video src="public/preview/preview-ds.mp4" controls width="100%"></video>

## Giá trị nổi bật của giải pháp

- **Môi trường 3d chân thực:** Đảm bảo trải nghiệm chân thực 99%. 
- **Thư viện pháo hoa đa dạng:** Hơn trăm mẫu pháo hoa và hiệu ứng tích hợp sẵn, có thể kết hợp để tạo thành loại pháo hoa mới lên tới 500 mẫu.
- **Toàn bộ dữ liệu lưu dưới dạng JSON:** Đồng bộ, dễ dàng chia sẻ.
- **Đảm bảo chạy ổn định:** cho 100-200 pháo hoa cùng 1 lúc.
- **Giao diện chuyên nghiệp hiện đại:** Chuẩn hóa workflow cho Editor.

---

## Đối tượng sử dụng mục tiêu

- **Đơn vị tổ chức sự kiện và doanh nghiệp biểu diễn:** Dựng kịch bản mô phỏng 3D trực quan và trải nghiệm thực tế cho các kịch bản `pháo hoa` và `drone`.
- **Người đam mê nghệ thuật trình diễn pháo hoa và drone** Tạo ra các mẫu kịch bản pháo hoa và drone chuyên nghiệp và nghiệp dư.
- **Nhà thiết kế pháo hoa** Thiết kế, tùy biến hiệu ứng vật lý hạt pháo hoa.
- **Nhà thiết kế đội hình drone** Thiết kế, tùy biến đội hình drone và xây dựng animation cho drone.

---

## Các phân hệ tính năng chính

### 1. Không gian Mô phỏng 3D Tương tác
- Khung cảnh biểu diễn 3D tự do với hệ thống camera quỹ đạo linh hoạt, hỗ trợ thay đổi góc nhìn khán đài, góc nhìn từ trên cao hoặc góc nhìn kỹ thuật.
- Mô phỏng môi trường ban đêm, bầu trời sao, hiệu ứng ánh sáng động và mặt đất phản chiếu.

![show-preview](/public/preview/show-preview.png)

### 2. Trình biên tập Kịch bản Timeline
- Đồng bộ hóa toàn bộ sự kiện bắn pháo hoa và mốc chuyển trạng thái của drone theo tệp âm thanh biểu diễn.
- Cho phép kéo thả, căn chỉnh thời điểm kích nổ, điều chỉnh cao độ, hướng bắn và góc nổ theo từng mili-giây.

![Timeline](/public/preview/timeline.png)

### 3. Thiết kế Đội hình Drone 3D
- Công cụ tạo hình đội hình drone tĩnh trong không gian ba chiều.
- Hỗ trợ nhập vector từ ảnh 2D, mô hình lưới 3D và các thuật toán phân bổ điểm tự động.

![drone-formation](/public/preview/drone-formation.png)
### 4. Biên tập Chuyển động Hoạt họa Drone
- Quản lý chuyển động drone theo từng nhóm và từng phân đoạn thời gian.
- Tính toán quỹ đạo bay mượt mà, kiểm soát tốc độ di chuyển và ngăn ngừa va chạm giữa các điểm drone.

![drone-animation](/public/preview/drone-animation.png)

---

## Tải về và Cài đặt

### Dành cho người dùng cuối

1. Truy cập trang **[GitHub Releases](https://github.com/ThAolInh20/Shell-Drone_3d/releases)** của dự án.
2. Tải về gói cài đặt mới nhất dành cho Windows định dạng `.exe` hoặc gói nén `.zip`.
3. Giải nén hoặc chạy file cài đặt để bắt đầu sử dụng phần mềm.

*Lưu ý: Nếu hệ thống Windows hiển thị cảnh báo bảo mật SmartScreen, bạn có thể chọn `More Info` và chọn `Run anyway` để tiếp tục.*

---

## Hướng dẫn Vận hành Dành cho Nhà phát triển

Dự án yêu cầu môi trường **[Node.js](https://nodejs.org/)** phiên bản 18 trở lên.

### Bước 1: Sao chép mã nguồn và cài đặt thư viện
```bash
git clone https://github.com/ThAolInh20/Shell-Drone-Editor.git
cd shell-drone-animation
npm install
```

### Bước 2: Khởi chạy ứng dụng

#### Chế độ Desktop App với Electron (Khuyến nghị)
Mở ứng dụng độc lập với đầy đủ tính năng ghi tệp trực tiếp và điều hướng nhanh:
```bash
npm run electron:dev
```

#### Chế độ Trình duyệt Web
Khởi chạy máy chủ phát triển Vite:
```bash
npm run dev
```
Sau đó truy cập đường dẫn cục bộ hiển thị trên terminal (mặc định là `http://localhost:5173/`).

### Bước 3: Đóng gói phần mềm
Để biên dịch và đóng gói thành phần mềm cài đặt Windows hoàn chỉnh:
```bash
npm run electron:build
```
Tệp cài đặt sau khi đóng gói sẽ nằm trong thư mục `dist-electron`.

---

## Tài liệu

- **Tài liệu Hướng dẫn Chi tiết:** Tham khảo tại **[Drone Shell Wiki](https://drone-shell-wiki.netlify.app/)**.
- **Giấy phép:** Phần mềm được phân phối theo giấy phép mã nguồn mở **[MIT License](LICENSE)**.
- **Tài nguyên:** Có thể tìm các Json có sẵn tại [Google Drive](https://drive.google.com/drive/folders/1wa1nCjr2QiZ0Ln_I53Pf4XTsKmFOakKE?usp=sharing).