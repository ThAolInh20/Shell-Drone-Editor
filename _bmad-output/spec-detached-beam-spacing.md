---
title: 'Giãn các đầu comet trong Detached Beam'
type: 'bugfix'
created: '2026-10-20'
status: 'done'
baseline_commit: '32a872fd7e1ff5d2fac7657065ad909a897b7322'
context: []
---

<frozen-after-approval reason="Yêu cầu chỉnh sửa trực tiếp của người dùng">

## Intent

**Problem:** Detached Beam phóng cùng lúc các đầu sáng có vận tốc gần giống nhau, tạo chồng sáng.

**Approach:** Phóng nối tiếp theo thời gian mô phỏng; đầu đi trước nhanh hơn đầu theo sau; thêm lệch ngang nhẹ quanh hướng beam.

## Boundaries & Constraints

**Always:** Giữ tổng số hạt, màu, độ sáng, góc phóng và các hiệu ứng đi kèm. Hạt đầu xuất hiện ngay tại mốc show. Clear/destroy/tua phải hủy hạt đang chờ. Giữ nguyên thay đổi có sẵn trong demoShow.json.

**Ask First:** Thay đổi preset khác, giảm độ sáng hoặc mở rộng phạm vi ra toàn bộ pháo hoa.

**Never:** Dùng setTimeout; sửa vật lý CometEntity hoặc file kịch bản của người dùng.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|---|---|---|---|
| Detached nhiều hạt | Preset key/object hoặc detached alias | Một đầu phóng ngay; còn lại lần lượt | Không gom cùng frame mô phỏng |
| Nhiều hạt / high quality | Số lượng tăng | Giữ khoảng thời gian tối thiểu | Cho phép thời gian phun tăng |
| Frame dài | Qua nhiều mốc phóng | Hạt mới chỉ tiến phần dt sau mốc của nó | Không mất hoặc phóng bù cùng tuổi |
| Góc phóng nghiêng | angleOffset khác 0 | Giữ hướng chính, lệch ngang nhỏ | Không tạo quạt lớn |
| Clear/destroy | Còn tác vụ đang chờ | Không có comet sinh lại | Không để mesh chờ trong scene |
| Cluster thường / single | Không phải detached hoặc count 1 | Giữ cách phóng hiện có | Không rải thời gian ngoài phạm vi |

</frozen-after-approval>

## Code Map

- `src/systems/CometSystem.js`: tạo vận tốc, hàng đợi phóng và cập nhật thời gian.
- `tests/systems/DetachedBeamSpacing.test.js`: hồi quy phân bố, thời gian và lifecycle.

## Tasks & Acceptance

- [x] Nhận diện detached và tạo phân bố tốc độ giảm dần theo thứ tự phóng.
- [x] Lập lịch phóng khoảng 0.55 giây, cách tối thiểu 0.055 giây mỗi đầu; không timer ngoài mô phỏng.
- [x] Cập nhật theo các biên thời gian phóng; hỗ trợ nhiều chùm đồng thời và clear/destroy.
- [x] Kiểm thử seed cố định, quality, single, thường, nghiêng, dt dài và FPS khác nhau.
- [x] Chạy test comet/director liên quan, build và review.

**Acceptance Criteria:**
- Given nhiều đầu detached, when phóng, then đầu đầu tiên tức thì và các đầu sau có thời điểm khác nhau.
- Given các đầu cùng chùm, when so vận tốc dọc hướng beam, then đầu đi sau chậm hơn để tránh tụ sáng.
- Given cùng seed và thời gian mô phỏng, when chạy 30/60/120 FPS, then không đổi số lần phóng và tuổi hạt chỉ sai trong sai số số thực.
- Given đang còn hạt chờ, when clear hoặc destroy, then không tái sinh hạt sau update.
- Given preset thường hoặc single, when phóng, then không áp dụng giãn phóng detached.

## Spec Change Log

- Self-review giữ nguyên update(0) cho comet đã hoạt động; chỉ bỏ cập nhật zero-dt với hạt vừa tới mốc phóng. Có test hồi quy riêng.

## Verification

- `npm test -- tests/systems/DetachedBeamSpacing.test.js tests/systems/CometClusterStarHead.test.js tests/directors/FireworkSequencer.test.js tests/directors/ShowDirector.test.js`
- `npm run build`; `git diff --check`.
- Không khẳng định mức giảm chói thực tế nếu chưa kiểm chứng hình ảnh.

### Kết quả

- 18 test Detached Beam và 21 test director/sequencer: 39/39 pass.
- Khi chạy thêm CometClusterStarHead: 46/47 pass; test comet_tadpole_burst tại dòng 200 có lỗi không ổn định từng xuất hiện trước thay đổi này. Không sửa code hoặc test tadpole trong phạm vi này.
- Build pass, có cảnh báo chunk >500 kB. git diff --check pass.
- Review độc lập blind hunter, edge-case hunter và acceptance auditor không tìm thấy blocker.
- Mẫu 10 đầu, seed 314159, medium, màu 0xffaa44, ratioX/Y/Z = 0.5, sector center, sau 60 bước 1/60 giây: khoảng cách cặp gần nhất từ 1.1777 (baseline) lên 5.7352 (bản sửa), đủ 10 đầu ở cả hai. Đây là dữ liệu không gian, không phải phép đo độ chói hay khoảng cách màn hình.
- Browser bị từ chối quyền truy cập localhost nên chưa so ảnh trước/sau; server kiểm thử đã dừng.
- demoShow.json giữ nguyên SHA256 5CBDED88E4AE6AE46CADD44C15F305035BF91FF7BBE281B4662C25F826CB0E57. Không commit hoặc push.

## Suggested Review Order

**Đã được thay thế:** Người dùng phản hồi kiểu chuỗi này trông giả và cung cấp ảnh chùm sao dựng cột. Xem spec-detached-beam-column.md cho hành vi cuối cùng; không tiếp tục dùng tiêu chí tốc độ giảm đều và khoảng phóng tối thiểu55ms của bản này.

- Phân bố vận tốc và độ lệch ngang quanh hướng beam.
  [CometSystem.js:212](../src/systems/CometSystem.js#L212)
- Lưu thời điểm và snapshot cấu hình cho các đầu chưa phóng.
  [CometSystem.js:336](../src/systems/CometSystem.js#L336)
- Hủy hàng đợi khi clear và cập nhật đúng phần thời gian còn lại.
  [CometSystem.js:459](../src/systems/CometSystem.js#L459)
  [CometSystem.js:709](../src/systems/CometSystem.js#L709)
- Kiểm thử timing, vận tốc, FPS, quality và lifecycle.
  [DetachedBeamSpacing.test.js:1](../tests/systems/DetachedBeamSpacing.test.js#L1)
