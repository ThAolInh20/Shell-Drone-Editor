# Mô phỏng và Trình diễn Drone Pháo hoa 3D - Shell Drone Animation

[English](README.md) | [Tiếng Việt](README-vn.md) | [日本語](README-ja.md) | [简体中文](README-zh.md)

**Shell Drone Animation** là phần mềm mô phỏng và biên tập 3D chuyên nghiệp, kết hợp nghệ thuật pháo hoa tầm cao với nghệ thuật trình diễn ánh sáng drone trên cùng một dòng thời gian đồng bộ âm nhạc. Được xây dựng trên nền tảng **Three.js**, **Vite** và **Electron**, ứng dụng mang lại trải nghiệm trực quan hóa sống động, mượt mà và chuẩn xác phục vụ từ khâu lên ý tưởng đến trình diễn thực tế.

---

## Đối tượng sử dụng mục tiêu

- **Đơn vị tổ chức sự kiện và doanh nghiệp biểu diễn:** Dựng kịch bản mô phỏng 3D trực quan để thiết kế và trải nghiệm thực tế.
- **Nhà sáng tạo nội dung, VJ, Motion Graphics Designer và 3D Visualizer:** Tạo ra các thước phim visual trình diễn ánh sáng sống động lồng ghép vào sân khấu, MV âm nhạc và sản phẩm đồ họa 3D.
- **Chuyên gia pháo hoa và người đam mê mô phỏng:** Thiết kế, tùy biến hiệu ứng vật lý hạt pháo hoa và lập trình chuyển động đội hình drone theo nhịp điệu âm thanh.

---

## Giá trị nổi bật của giải pháp

- **Tích hợp hai trong một:** Kết hợp đồng thời hiệu ứng pháo hoa vật lý 3D và đội hình drone biểu diễn trên cùng một hệ trục không gian và timeline đồng bộ.
- **Thư viện hiệu ứng pháo hoa chân thực:** Tích hợp sẵn đa dạng chủng loại pháo hoa với độ hoàn thiện cao về màu sắc, đường rơi của hạt tàn, độ tỏa khói và âm thanh kích nổ.
- **Lưu trữ và chia sẻ kịch bản linh hoạt:** Dữ liệu kịch bản và đội hình được cấu trúc chuẩn hóa dưới dạng JSON nhẹ, dễ dàng nhập, xuất và chuyển giao giữa các hệ thống.
- **Hiệu năng cao trên Desktop:** Hỗ trợ phím tắt lưu trực tiếp vào tệp nguồn mà không cần thông qua hộp thoại tải về của trình duyệt, cùng khả năng chuyển đổi tức thì giữa các không gian làm việc.

---

## Các phân hệ tính năng chính

### 1. Không gian Mô phỏng 3D Tương tác
- Khung cảnh biểu diễn 3D tự do với hệ thống camera quỹ đạo linh hoạt, hỗ trợ thay đổi góc nhìn khán đài, góc nhìn từ trên cao hoặc góc nhìn kỹ thuật.
- Mô phỏng môi trường ban đêm, bầu trời sao, hiệu ứng ánh sáng động và mặt đất phản chiếu.

### 2. Trình biên tập Kịch bản Timeline
- Đồng bộ hóa toàn bộ sự kiện bắn pháo hoa và mốc chuyển trạng thái của drone theo tệp âm thanh biểu diễn.
- Cho phép kéo thả, căn chỉnh thời điểm kích nổ, điều chỉnh cao độ, hướng bắn và góc nổ theo từng mili-giây.

### 3. Thiết kế Đội hình Drone 3D
- Công cụ tạo hình đội hình drone tĩnh trong không gian ba chiều.
- Hỗ trợ nhập vector từ ảnh 2D, mô hình lưới 3D và các thuật toán phân bổ điểm tự động.

### 4. Biên tập Chuyển động Hoạt họa Drone
- Quản lý chuyển động drone theo từng nhóm và từng phân đoạn thời gian.
- Tính toán quỹ đạo bay mượt mà, kiểm soát tốc độ di chuyển và ngăn ngừa va chạm giữa các điểm drone.

### 5. Quản lý và Xuất nhập Dữ liệu Kịch bản
- Đóng gói toàn bộ cấu hình show diễn vào tệp JSON tiêu chuẩn.
- Tương thích cao, hỗ trợ tái sử dụng preset và xây dựng thư viện mẫu dùng chung.

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

## Tài liệu Hướng dẫn và Bản quyền

- **Tài liệu Hướng dẫn Chi tiết:** Tham khảo tại **[Drone Shell Wiki](https://drone-shell-wiki.netlify.app/)**.
- **Nhật ký Thay đổi:** Theo dõi cập nhật mới nhất tại [RELEASE_NOTES.md](RELEASE_NOTES.md).
- **Giấy phép:** Phần mềm được phân phối theo giấy phép mã nguồn mở **[MIT License](LICENSE)**.