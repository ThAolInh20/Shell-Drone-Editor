---
title: 'Đổi Detached Beam thành chùm sao dựng cột'
type: 'bugfix'
created: '2026-10-20'
status: 'done'
baseline_commit: '32a872fd7e1ff5d2fac7657065ad909a897b7322'
context: []
---

<frozen-after-approval reason="Người dùng sửa yêu cầu tạo hình bằng ảnh tham chiếu">

## Intent

**Problem:** Bản giãn phóng trước tạo chuỗi comet cách đều, chưa đúng chùm nhiều sao dựng thành cột trong ảnh người dùng.

**Approach:** Cú phun ngắn có nhiều đầu nhỏ, vận tốc dọc được xáo trộn, tiết diện đĩa đặc hẹp để lấp thể tích cột. Giữ chuyển động đạn đạo.

## Boundaries & Constraints

**Always:** Default Detached Beam 36–44 sao nhỏ; nhóm đầu phóng ngay, toàn bộ phóng trong khoảng 0.12 giây. Tôn trọng clusterCount được truyền rõ ràng. Giữ màu người dùng chọn, không ép màu magenta từ ảnh. Queue theo thời gian mô phỏng giữ dt còn lại và hủy khi clear/destroy.

**Ask First:** Đổi preset khác, giảm độ sáng toàn cảnh hay thay trọng lực.

**Never:** Giữ dãy tốc độ giảm đều theo thứ tự phóng hoặc vòng hướng đều; sửa kịch bản người dùng; tiếp tục thay pipeline/màu/vật lý từ yêu cầu trước.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|---|---|---|---|
| Preset mặc định | comet_cluster_detached | 36–44 sao trước quality, đầu nhỏ khoảng 42% | Không thay count preset khác |
| Cú phụt | Nhiều hạt | Nhóm đầu xuất hiện tức thì, phần còn lại hết trong 0.12 giây | Không minimum gap 55ms |
| Vận tốc | Cùng hướng chính | Phủ nhiều mức dọc trục, không tương quan tăng/giảm với thời điểm | Xáo trộn strata |
| Tiết diện | Các hướng ngang | Có cả tâm và rìa đĩa, không vòng cứng | Lệch ngang nhỏ so vận tốc dọc |
| Kích thước | Detached / comet thường | Detached nhỏ, comet thường giữ nguyên | Giá trị scale sai dùng mặc định |
| Lifecycle/FPS | Nhiều frame hoặc frame dài | Giữ count/tuổi đúng, clear hủy pending | Không timer ngoài mô phỏng |

</frozen-after-approval>

## Code Map

- `src/factories/ShellPresetFactory.js`: mật độ và kích thước mặc định detached.
- `src/systems/CometSystem.js`: phân bố vận tốc/tiết diện và nhịp phóng.
- `src/entities/CometEntity.js`: bán kính hình học đầu detached.
- `tests/systems/DetachedBeamSpacing.test.js`: thay tiêu chí chuỗi thành tiêu chí chùm cột, giữ các test lifecycle.

## Tasks & Acceptance

- [x] Default preset 36–44 đầu và detachedHeadScale 0.42.
- [x] Giảm geometry đầu detached, giữ màu/độ sáng vật liệu và comet thường.
- [x] Xáo trộn vận tốc dọc khoảng 0.58–1.12 lần vận tốc danh định; hướng ngang trong đĩa hẹp.
- [x] Phóng nhóm đầu ngay và phần còn lại trong 0.12 giây, không thứ tự nhanh/chậm.
- [x] Cập nhật test tạo hình, nhiều FPS, frame dài, alias, quality, clear/destroy.
- [x] Chạy test liên quan, build và review.

**Acceptance Criteria:**
- Given preset detached mặc định, when phóng, then chùm có hàng chục đầu nhỏ trong một cú phụt ngắn.
- Given toàn bộ hướng phóng, when chiếu lên trục và mặt phẳng vuông góc, then có độ trải dọc và cả vùng trong/rìa tiết diện.
- Given thời điểm phóng, when so với tốc độ, then không còn quy luật đơn điệu của bản trước.
- Given preset thường hoặc single, when phóng, then không thay nhịp phóng hoặc kích thước.
- Given clear/destroy hoặc 30/60/120 FPS, when cập nhật queue, then không sinh lại hạt đã hủy và tuổi hạt phản ánh thời điểm thực sự phóng.

## Spec Change Log

- Ghost3StageFlare: nối hasGhostFlare với isGhostFlare (trước đây nhánh điều khiển không bật), nhận flag ghost-flare đứng riêng từ show dispatcher. Detached dùng mốc lifetime chung để đi qua ascent/dark/flare, không kích flare sớm theo apex từng hạt. Flare cuối kéo dài0.85s gồm attack ngắn và đuôi smoothstep² về0; Point size và mesh core/inner đi cùng envelope, không cắt sáng ở cuối.58/58 test liên quan pass, bao gồm Points, mesh, flag/effects,30/60/120 FPS và nhánh thường không flare.

- Người dùng phản hồi pha cuối0.35s quá gắt. Thay bằng tan dần1.1s cuối (hoặc60% lifetime nếu lifetime rất ngắn), opacity theo (1-smoothstep(t))²; PointsMaterial.size cũng giảm trực tiếp vì object scale không thu nhỏ sprite điểm. Khi thu hồi đặt opacity0. Test giữ mốc tắt chung, bổ sung mẫu độ sáng giảm dần1.5/1.8/2.1/2.4s và opacity<1% trước khi bị loại khỏi scene;32/32 test liên quan pass ở30/60/120 FPS.

- Người dùng yêu cầu các sao tắt gần đồng thời: thêm detachedLifetime mặc định2.5s tính từ lúc chùm bắt đầu, sai lệch ngẫu nhiên±30ms. Trừ thời gian chờ phóng khỏi lifetime từng đầu; fade0.35s cuối theo tuổi tuyệt đối và không bắt đầu fade sớm do đã tới apex. Đồng hồ tuổi vẫn tiến khi đầu đã ở pha decaying. Comet thường giữ vòng đời cũ.
- Hồi quy mới DetachedBeamLifetime.test.js kiểm tra sống/mờ/tắt chung ở30/60/120 FPS, bù release delay, bảo toàn comet thường. Nhóm3file lifetime/spacing/star-head:32/32 pass.

- Default detached có noTrail nên đi vào nhánh Points trước mesh. Áp dụng scale cho PointsMaterial.size lẫn core/inner geometry để thay đổi có tác dụng trên preset thực tế.
- Yêu cầu cột sao thay thế tiêu chí chuỗi nhanh–chậm và khoảng phóng 55 ms của spec-detached-beam-spacing.md.

## Verification

- Kiểm thử phân bố với seed cố định và trường hợp random trả cùng giá trị.
- Test comet/director/factory liên quan; build; diff check.
- Chưa khẳng định khớp ảnh hoặc giảm chói thực tế nếu chưa xem render. Browser localhost đã bị từ chối ở lượt trước; không thử lại hoặc dùng đường vòng.

### Kết quả

- 63/63 test qua 5 file DetachedBeamSpacing, CometClusterStarHead, ShellPresetFactory, FireworkSequencer, ShowDirector pass.
- npm run build pass; có cảnh báo bundle >500 kB. git diff --check pass.
- Ba review độc lập không có blocker.
- Mẫu seed314159, medium, preset mặc định, màu0xff33cc, ratioX/Y/Z .5, sector center: 42 sao, 11 phóng ngay; hạt cuối phóng tại0.11824s; Points size14.28 so34 cũ. Sau1s đủ42 sao, phạm vi X9.04/Y45.38/Z13.64 đơn vị. Đây là đo dữ liệu mô phỏng, không xác nhận hình ảnh render.
- Không sửa demoShow.json hoặc các thay đổi người dùng đang thực hiện trong file đó. Không commit hoặc push.

## Suggested Review Order

- Mật độ và kích thước preset.
  [ShellPresetFactory.js:957](../src/factories/ShellPresetFactory.js#L957)
- Độ lớn đầu sao trên hai nhánh render.
  [CometEntity.js:157](../src/entities/CometEntity.js#L157)
- Phủ thể tích và xáo trộn vận tốc.
  [CometSystem.js:222](../src/systems/CometSystem.js#L222)
- Nhịp phun ngắn và snapshot queue.
  [CometSystem.js:341](../src/systems/CometSystem.js#L341)
- Kiểm thử tạo hình và vòng đời.
  [DetachedBeamSpacing.test.js:1](../tests/systems/DetachedBeamSpacing.test.js#L1)
