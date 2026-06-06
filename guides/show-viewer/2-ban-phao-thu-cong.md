# Bắn Pháo hoa Thủ công & Preset

Phân hệ Viewer hỗ trợ chế độ bắn pháo hoa thủ công (Interactive Mode), cho phép bạn chủ động phóng quả pháo hoa mong muốn lên bầu trời ảo để kiểm tra hiệu ứng nổ nổ của từng Preset cụ thể.

---

## Cách chọn Preset Pháo hoa

Mặc định khi khởi động ứng dụng, pháo hoa sẽ được bắn ra ở chế độ ngẫu nhiên (`Random`). Để chỉ định một loại pháo hoa cụ thể:

1. Nhấn phím **`ESC`** để mở bảng Menu tạm dừng (**Firework Selector**).
2. Tại trường **Type**, nhấp vào danh sách thả xuống.
3. Chọn một trong các preset pháo hoa có sẵn trong hệ thống:
   *   **`Random`:** Hệ thống tự chọn ngẫu nhiên các preset khi bắn.
   *   **`strobe`:** Pháo hoa chớp tắt nhấp nháy liên tục sau khi nổ.
   *   **`crackle`:** Phát tiếng nổ lách tách giòn giã kèm theo tia lửa nhỏ vàng kim.
   *   **`willow`:** Pháo nổ dạng liễu rủ, hạt rơi từ từ tạo dải dài lấp lánh kéo dài.
   *   **`ring` / `double_ring`:** Pháo nổ tạo thành một hoặc hai vòng tròn đồng tâm sắc nét.
   *   **`heart`:** Pháo nổ xếp thành hình trái tim 3D.
   *   **`sphere`:** Pháo nổ bung đều hình cầu đối xứng hoàn hảo.
   *   *Và các preset đặc thù khác phụ thuộc vào file cấu hình `src/factories/ShellPresetFactory.js`.*
4. Sau khi chọn, vùng hiển thị **Selected** ở phía trên menu sẽ thay đổi để hiển thị loại preset đang chọn cùng một màu sắc nhận diện.

---

## Thao tác bắn pháo hoa lên bầu trời

Sau khi đã chọn xong Preset:

1. Click chuột trái vào giữa màn hình 3D (hoặc nhấn phím `ESC` lần nữa) để khóa chuột và ẩn con trỏ.
2. Di chuyển chuột để đưa tâm ngắm (dấu chấm nhỏ màu trắng ở giữa màn hình) hướng về vị trí bạn muốn bắn pháo hoa tới trên bầu trời.
3. **Nhấp chuột trái:** Quả pháo hoa tương ứng sẽ được phóng lên từ bệ phóng dưới mặt đất hướng thẳng về phía điểm ngắm của bạn.
4. **Quy luật vật lý & kích nổ:**
   *   Hệ thống sẽ tính toán vận tốc đầu nòng và góc bắn dựa vào khoảng cách ngắm.
   *   Tạo ra âm thanh rít phóng đi, vệt khói phát sáng bám đuôi (Trail).
   *   Khi đạt độ cao cực đại hoặc hết thời gian kích nổ, quả pháo sẽ phát nổ, giải phóng các ngôi sao pháo hoa bay theo hình học của Preset và áp dụng các hiệu ứng rơi, cản gió, trọng lực cực kỳ chân thực.
