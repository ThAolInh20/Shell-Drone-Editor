# Bảng Tổng hợp Phím tắt Toàn hệ thống

Tài liệu này tổng hợp toàn bộ phím tắt thao tác nhanh trong phần mềm **Drone Shell Editor**, hỗ trợ tối ưu hóa tốc độ biên đạo, điều hướng dòng thời gian, điều khiển không gian 3D và tinh chỉnh biến đổi hình học.

---

## 1. Phím tắt Toàn cục & Chuyển đổi Màn hình (Global)

| Phím tắt | Chức năng thao tác |
| :--- | :--- |
| `Ctrl + 1` | Chuyển sang màn hình **Show Viewer** (Trình diễn pháo hoa & Diễn tập tổng hợp - `index.html`) |
| `Ctrl + 2` | Chuyển sang màn hình **Advanced Drone Editor** (Biên tập Hoạt cảnh Động - `editor.html`) |
| `Ctrl + 3` | Chuyển sang màn hình **Static Formation Designer** (Thiết kế Đội hình Tĩnh - `formation.html`) |
| `Ctrl + O` | Mở hộp thoại nạp kịch bản từ tệp ngoài (**Open / Import**) |
| `Ctrl + S` / `Shift + S` | Lưu trực tiếp kịch bản làm việc vào tệp JSON dự án |
| `Shift + Y` | Bật hoặc tắt bảng chẩn đoán hiệu năng kỹ thuật (HUD FPS, GPU, RAM, Particles) |
| `Shift + R` | Đặt lại vị trí và góc nhìn camera quan sát về tọa độ mặc định ban đầu |
| `Esc` | Thoát chế độ khóa chuột / Mở Menu tạm dừng và tùy chọn pháo hoa (Nếu Timeline mở: đóng Timeline) |
| `Enter` | Bật hoặc dừng chạy thử kịch bản trình diễn mẫu (**Demo Show**) khi đang khóa chuột trong Viewport |
| `Ctrl + Z` | Hoàn tác (Undo) thao tác vừa thực hiện |
| `Ctrl + Y` / `Ctrl + Shift + Z` | Làm lại (Redo) thao tác vừa hoàn tác |

---

## 2. Phím tắt Dòng thời gian (Timeline Sequencer)

*Yêu cầu nhấp chuột vào khu vực Timeline để kích hoạt tiêu điểm làm việc trước khi bấm phím:*

| Phím tắt | Chức năng thao tác |
| :--- | :--- |
| `Ctrl + T` | Mở hoặc đóng thanh Dòng thời gian Timeline |
| `Space` | Phát hoặc tạm dừng kịch bản từ mốc thời gian hiện tại của Playhead |
| `Shift + 0` hoặc `)` | Chuyển đổi tuần hoàn các mức thu phóng Zoom Timeline (`25`, `50`, `100`, `200 px/s`) |
| `B` | Đặt mốc nhịp phách (**Tap Beat**) tại vị trí kim Playhead trên làn âm thanh |
| `[` hoặc `Alt + Mũi tên trái` | Nhảy kim Playhead lùi về mốc nhịp beat liền trước (**Previous Beat**) |
| `]` hoặc `Alt + Mũi tên phải` | Nhảy kim Playhead tiến tới mốc nhịp beat liền sau (**Next Beat**) |
| `G` | Gộp các khối sự kiện đang chọn thành một nhóm (**Group Selected Blocks**) |
| `Shift + G` | Hủy gộp nhóm các khối sự kiện đang chọn (**Ungroup Selected Blocks**) |
| `Ctrl + C` | Sao chép khối sự kiện hoặc nhóm khối đang chọn |
| `Ctrl + V` | Dán khối đã sao chép vào vị trí kim neo Anchor Head (màu xanh lam) |
| `Delete` / `Backspace` | Xóa toàn bộ các khối sự kiện đang được chọn |
| `Ctrl` / `Shift` + Click | Chọn bổ sung nhiều khối sự kiện (Multi-select) |
| `F1` | Mở hướng dẫn tương tác thao tác cơ bản trên Timeline |

---

## 3. Phím tắt Điều khiển Camera Không gian 3D (Viewport)

| Phím tắt | Chức năng thao tác |
| :--- | :--- |
| `W` / `A` / `S` / `D` hoặc `Mũi tên` | Di chuyển vị trí camera (Tiến, Trái, Lùi, Phải) theo hướng ngắm |
| `Shift + W` / `Shift + S` | Nâng cao độ / Hạ thấp cao độ camera trong chế độ bay tự do |
| `Q` / `E` | Hạ thấp / Nâng cao độ camera theo phương thẳng đứng |
| `Chuột trái (khi khóa chuột)` | Kích hỏa bắn thử quả pháo hoa hoặc chùm sao băng đang chọn |
| `Chuột phải + Rê chuột` | Xoay tự do góc nhìn camera quanh điểm quan sát |
| `Cuộn chuột giữa` | Phóng to hoặc thu nhỏ khoảng cách tới mục tiêu |

---

## 4. Phím tắt Công cụ Gizmo & Tinh chỉnh Drone 3D

Áp dụng trong phân hệ **Static Formation** và **Animated Editor** khi có drone được chọn:

| Phím tắt | Chức năng thao tác |
| :--- | :--- |
| `Ctrl + G` | Chuyển đổi tuần hoàn qua 3 chế độ Gizmo: **Translate** (Di chuyển) ➔ **Rotate** (Xoay) ➔ **Scale** (Thu phóng) |
| `Ctrl + A` | Chọn tất cả drone trong khung cảnh (**Select All**) |
| `Ctrl + D` | Nhân bản nhanh toàn bộ các drone đang chọn (**Duplicate Selected**) |
| `Ctrl + C` | Sao chép tọa độ drone vào bộ nhớ tạm |
| `Ctrl + V` | Dán drone từ bộ nhớ tạm vào khung cảnh |
| `Delete` / `Backspace` | Xóa các drone đang chọn |
| `Ctrl + Chuột trái Kéo` | Quét chọn vùng chữ nhật (**Box Selection**) mà không bị xoay camera |
| `Ctrl + Phím Mũi tên` | Tinh chỉnh vị trí / góc xoay / tỉ lệ của drone theo từng bước nhỏ cố định |
| `Ctrl + Shift + Mũi tên Trái / Phải` | **Lật đối xứng theo trục ngang (Mirror Horizontal)** quanh trọng tâm nhóm |
| `Ctrl + Shift + Mũi tên Lên / Xuống` | **Lật đối xứng theo trục dọc (Mirror Vertical)** quanh trọng tâm nhóm |

---