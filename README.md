# Mô phỏng Trình diễn Drone và Pháo hoa 3D (Shell Drone Animation)

Dự án này là một ứng dụng mô phỏng và biên tập trình diễn pháo hoa & drone 3D lập trình và tương tác trực quan, được xây dựng bằng **Three.js** và **Vite**, nay đã được tích hợp **Electron** để mang lại trải nghiệm phần mềm Desktop chuyên nghiệp.

---

## 📥 Hướng dẫn Tải và Cài đặt mã nguồn

Bạn có thể tải mã nguồn của dự án này bằng một trong hai cách sau:

### Cách 1: Sử dụng Git (Khuyên dùng)
Nếu máy bạn đã cài đặt Git, hãy mở Terminal (hoặc Command Prompt/PowerShell) và chạy lệnh sau:
```bash
git clone <your-repo-url>
cd shell-drone-animation
```
*(Lưu ý: Thay thế `<your-repo-url>` bằng liên kết repository thực tế của bạn).*

### Cách 2: Tải file ZIP trực tiếp
1. Nhấp vào nút **Code** màu xanh lá cây ở góc trên bên phải của trang repository này.
2. Chọn **Download ZIP**.
3. Giải nén tệp ZIP vừa tải xuống và mở thư mục chứa mã nguồn.

---

## 🛠️ Cài đặt Môi trường & Chạy Ứng dụng

Dự án yêu cầu **Node.js** phiên bản 18 trở lên. Hãy đảm bảo bạn đã cài đặt Node.js trước khi tiếp tục.

### Bước 1: Cài đặt các Thư viện Phụ thuộc (Dependencies)
Mở terminal tại thư mục gốc của dự án (`shell-drone-animation`) và thực hiện lệnh:
```bash
npm install
```

### Bước 2: Khởi chạy Ứng dụng

Bạn có thể chạy ứng dụng theo 2 phương thức khác nhau tùy vào mục đích sử dụng:

#### ⚡ Phương thức A: Chạy dưới dạng Desktop App với Electron (Khuyên dùng 🛸)
Phương thức này khởi chạy một ứng dụng Desktop độc lập bằng Electron. Chạy bằng cách này sẽ mở khóa các tính năng native cao cấp:
*   💾 **Lưu file trực tiếp (`Shift + S`):** Lưu ngay lập tức các chỉnh sửa trực tiếp vào file `.json` nguồn mà **không** cần thông qua hộp thoại tải xuống của trình duyệt (trải nghiệm mượt mà như Notepad chuyên nghiệp).
*   🗺️ **Thanh Menu Điều Hướng Nhanh:** Chuyển đổi qua lại giữa 3 bộ công cụ biên tập cực kỳ nhanh chóng thông qua menu hệ thống của ứng dụng hoặc phím tắt (`Ctrl + 1`, `Ctrl + 2`, `Ctrl + 3`).

Để chạy ứng dụng ở chế độ Desktop, sử dụng lệnh:
```bash
npm run electron:dev
```

#### 🌐 Phương thức B: Chạy trên Trình duyệt Web truyền thống
Chạy máy chủ phát triển Vite thông thường bằng lệnh:
```bash
npm run dev
```
Sau đó, truy cập vào địa chỉ local được hiển thị trên terminal (mặc định là `http://localhost:5173/`).
*Lưu ý: Khi chạy trên trình duyệt web, do cơ chế bảo mật của trình duyệt, tính năng lưu file trực tiếp sẽ tự động chuyển thành tải xuống file qua browser.*

---

## ⌨️ Bảng Phím Tắt Tiện Ích (Cheat Sheet)

Để tối ưu hóa hiệu suất biên tập và thiết kế các màn trình diễn drone/pháo hoa, hãy sử dụng các phím tắt hệ thống dưới đây:

### 🖥️ Điều hướng Ứng dụng Desktop (Chỉ áp dụng trên Electron)
*   **`Ctrl + 1`** (Mac: `Cmd + 1`): Chuyển nhanh sang trang **Biên tập Kịch bản Pháo hoa (Timeline Editor)**
*   **`Ctrl + 2`** (Mac: `Cmd + 2`): Chuyển nhanh sang trang **Biên tập Drone Hoạt cảnh (Animated Drone Editor)**
*   **`Ctrl + 3`** (Mac: `Cmd + 3`): Chuyển nhanh sang trang **Biên tập Đội hình Drone Tĩnh 3D (Static 3D Formation Editor)**
*   **`F12`** (hoặc `Ctrl + Shift + I`): Bật/Tắt Chrome Developer Tools để gỡ lỗi (debug)
*   **`Ctrl + R`** (Mac: `Cmd + R`): Tải lại (Reload) trang hiện tại
*   **`F11`** (Mac: `Cmd + Ctrl + F`): Bật/Tắt chế độ Toàn màn hình (Fullscreen)

### 🎵 Biên tập Kịch bản Pháo hoa (Timeline Editor)
*   **`Shift + S`** *(Mới)*: **Lưu trực tiếp** các thay đổi vào file sequence hiện đang mở. Tự động hiển thị hộp thoại **Save As** nếu lưu kịch bản mới.
*   **`Shift + T`**: Ẩn/Hiện bảng điều khiển dòng thời gian (Timeline Panel) *(chỉ hoạt động khi camera không bị khóa)*.
*   **`Space` (Phím Cách)**: Phát (Play) / Tạm dừng (Pause) dòng thời gian *(khi bảng timeline hiển thị và không tập trung vào ô nhập liệu)*.
*   **`Shift + C`** / **`Shift + V`**: Sao chép (Copy) / Dán (Paste) khối sự kiện pháo hoa đang được chọn.
*   **`Shift + 0`** (hoặc `)`): Thay đổi mức độ thu phóng của timeline *(các mức tỷ lệ: 25px/s, 50px/s, 100px/s, 200px/s)*.
*   **`Delete`** / **`Backspace`**: Xóa khối sự kiện pháo hoa đang chọn trên dòng thời gian.

### 🛸 Biên tập Drone Hoạt cảnh (`editor.html`)
*   **`Shift + S`** *(Mới)*: **Lưu trực tiếp** dữ liệu tọa độ và hoạt cảnh của các drone vào file đang chỉnh sửa.
*   **`Ctrl + Z`** / **`Ctrl + Y`**: Hoàn tác (Undo) / Làm lại (Redo) các thao tác thay đổi tọa độ và màu sắc của drone.
*   **`Ctrl + D`**: Nhân bản (Duplicate) các thực thể drone đang được chọn.
*   **`Shift + C`** / **`Shift + V`**: Sao chép / Dán dữ liệu tọa độ của các drone được chọn.
*   **`Delete`** / **`Backspace`**: Xóa các drone được chọn khỏi tất cả các bước (steps).

### 🎨 Biên tập Đội hình Drone Tĩnh 3D (`formation.html`)
*   **`Shift + S`** *(Mới)*: **Lưu trực tiếp** tọa độ đội hình drone tĩnh cùng cấu hình đường cong dẫn hướng (Hologram Guide).
*   **`Ctrl + Z`** / **`Ctrl + Y`**: Hoàn tác (Undo) / Làm lại (Redo) các thay đổi liên quan đến tọa độ, màu sắc và đường cong dẫn hướng.
*   **`Ctrl + D`**: Nhân bản (Duplicate) drone đang chọn.
*   **`Shift + C`** / **`Shift + V`**: Sao chép / Dán tọa độ drone đang chọn.
*   **`Delete`** / **`Backspace`**: Xóa các thực thể drone được chọn.

---

## 📦 Biên dịch và Đóng gói (Production Build)

### 🌐 A. Đóng gói cho Nền tảng Web (Vite Build)
Khi muốn biên dịch ứng dụng web thông thường để đưa lên máy chủ hoặc host tĩnh:

- **Biên dịch Dự án:**
  Tối ưu hóa mã nguồn và tạo ra thư mục tĩnh `dist` sẵn sàng cho việc hosting:
  ```bash
  npm run build
  ```

- **Chạy thử Bản biên dịch:**
  Kiểm tra và xem trước phiên bản đã được biên dịch ngay tại local:
  ```bash
  npm run preview
  ```

---

### 🛸 B. Đóng gói Ứng dụng Desktop (.EXE với Electron)
Khi muốn đóng gói toàn bộ dự án thành phần mềm cài đặt Desktop chạy độc lập trên Windows (`.exe`):

1. **Chạy lệnh Đóng gói:**
   Chạy lệnh duy nhất dưới đây để tự động biên dịch mã nguồn qua Vite và đóng gói với `electron-builder`:
   ```bash
   npm run electron:build
   ```

2. **Kết quả đầu ra:**
   Sau khi hoàn thành, thư mục `dist-electron/` sẽ tự động được tạo ra ở thư mục gốc với các sản phẩm:
   *   📦 **`ShellDroneEditor 0.0.0.exe`**: Bộ cài đặt phần mềm chuyên nghiệp (NSIS Installer), cho phép tùy chọn thư mục cài đặt và tự động tạo Shortcut trên Desktop.
   *   ⚡ **`win-unpacked/`**: Bản chạy trực tiếp không cần cài đặt, cực kỳ tiện lợi để khởi chạy và kiểm tra nhanh.

> [!WARNING]
> Thư mục `dist-electron/` chứa các tệp nhị phân có dung lượng lớn (~100MB) và đã được đưa vào cấu hình `.gitignore` để không bị đẩy lên GitHub. Tuyệt đối không thay đổi cấu hình này để tránh làm quá tải dung lượng repository.

