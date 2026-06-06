# Hướng dẫn sử dụng Bộ ứng dụng Shell Drone Animation

Chào mừng bạn đến với tài liệu hướng dẫn sử dụng của **Shell Drone Animation** — bộ ứng dụng mô phỏng và biên tập trình diễn pháo hoa & drone 3D lập trình tương tác chuyên nghiệp.

Dưới đây là sơ đồ cấu trúc của bộ tài liệu hướng dẫn sử dụng mới, được chia theo từng thư mục tương ứng với từng ứng dụng độc lập:

---

## Sơ đồ Cấu trúc Tài liệu

```
guides/
├── README.md (Trang cổng vào chính - Bạn đang ở đây)
│
├── show-viewer/ (Phân hệ Trình diễn & Viewer chính)
│   ├── README.md (Tổng quan & Mục lục Viewer)
│   ├── 1-dieu-khien-camera.md (Cách bay tự do, khóa chuột & bảng HUD chẩn đoán)
│   ├── 2-ban-phao-thu-cong.md (Cách bắn pháo thủ công & các Preset pháo hoa)
│   └── 3-timeline-sequencer.md (Bộ biên tập timeline, ghép nhạc nền & drone show)
│
├── static-formation/ (Phân hệ Thiết kế Đội hình Tĩnh)
│   ├── README.md (Tổng quan & Mục lục Thiết kế tĩnh)
│   ├── 1-tao-hinh-co-ban.md (10 loại hình dạng toán học: Grid, Star, Text,...)
│   ├── 2-duong-cong-bezier.md (Vẽ & bẻ cong Bezier bằng 3 điểm cầu Neon)
│   ├── 3-he-thong-dan-huong.md (Import mô hình Hologram 3D & ảnh tham chiếu 2D)
│   └── 4-quan-ly-nhom-va-gizmo.md (Gộp nhóm lồng nhau, Gizmo 3D & đổi tâm xoay)
│
└── animated-editor/ (Phân hệ Biên tập Hoạt cảnh Động)
    ├── README.md (Tổng quan & Mục lục Biên tập động)
    ├── 1-timeline-buoc-bay.md (Quản lý Step cards, Kéo thả đổi vị trí step)
    ├── 2-hieu-ung-chuyen-va-bay.md (Timing, 6 chế độ bay: Vortex, Helix, Disperse,...)
    ├── 3-hold-light-landing-styles.md (Hiệu ứng LED Rainbow, Strobe, Blackout & Landing)
    └── 4-uon-nhom-deformer.md (Công cụ biến dạng nhóm Deformer: Bend & Straighten)
```

---

## Hướng dẫn nhanh theo từng App

Nhấp vào các liên kết bên dưới để truy cập nhanh hướng dẫn chi tiết cho từng ứng dụng:

### 1. [Hướng dẫn Phân hệ Trình diễn Viewer (show-viewer)](./show-viewer/README.md)
*   *Tập tin chính:* `index.html` chạy qua `src/main.js`
*   *Mục đích:* Trình diễn toàn cảnh pháo hoa nổ theo nhịp điệu nhạc nền và di chuyển drone đồng bộ.
*   *Nội dung nổi bật:* [Cách di chuyển camera tự do](./show-viewer/1-dieu-khien-camera.md), [Bắn thử pháo hoa thủ công](./show-viewer/2-ban-phao-thu-cong.md), [Ghép nhạc và chạy Sequencer](./show-viewer/3-timeline-sequencer.md).

### 2. [Hướng dẫn Phân hệ Thiết kế Đội hình Tĩnh (static-formation)](./static-formation/README.md)
*   *Tập tin chính:* `formation.html` chạy qua `src/formation/main.js`
*   *Mục đích:* Thiết kế hình dáng tĩnh (blueprint) cho hàng trăm drone trước khi đưa vào chuyển cảnh.
*   *Nội dung nổi bật:* [Chi tiết các chế độ tạo hình](./static-formation/1-tao-hinh-co-ban.md), [Vẽ uốn đường cong Bezier 3D](./static-formation/2-duong-cong-bezier.md), [Đồ hình theo ảnh 2D và mô hình 3D gltf](./static-formation/3-he-thong-dan-huong.md), [Tổ chức nhóm lồng nhau](./static-formation/4-quan-ly-nhom-va-gizmo.md).

### 3. [Hướng dẫn Phân hệ Biên tập Hoạt cảnh Động (animated-editor)](./animated-editor/README.md)
*   *Tập tin chính:* `editor.html` chạy qua `src/editor/main.js`
*   *Mục đích:* Biên soạn chuyển chuyển động mượt mà của drone giữa các hình khối theo thời gian.
*   *Nội dung nổi bật:* [HTML5 kéo thả Step cards](./animated-editor/1-timeline-buoc-bay.md), [6 kiểu bay nghệ thuật và hiệu ứng bay](./animated-editor/2-hieu-ung-chuyen-va-bay.md), [Chế độ nhấp nháy LED & tắt đèn ẩn đường bay](./animated-editor/3-hold-light-landing-styles.md), [Bộ uốn nắn nhóm drone Deformer](./animated-editor/4-uon-nhom-deformer.md).

---

## Phím tắt Hệ thống Chung (Dùng trên Desktop App Electron)

| Phím tắt | Chức năng hoạt động |
| :--- | :--- |
| **`Ctrl + 1`** | Mở/Chuyển nhanh sang màn hình **Trình diễn Viewer** |
| **`Ctrl + 2`** | Mở/Chuyển nhanh sang màn hình **Thiết kế Đội hình Tĩnh** |
| **`Ctrl + 3`** | Mở/Chuyển nhanh sang màn hình **Biên tập Hoạt cảnh Động** |
| **`Shift + S`** | Lưu trực tiếp thay đổi xuống tệp tin nguồn (không qua hộp thoại Tải xuống) |
