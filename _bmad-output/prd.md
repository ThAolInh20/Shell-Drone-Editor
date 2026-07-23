---
stepsCompleted: ['step-01-init', 'step-02-discovery', 'step-02b-vision', 'step-02c-executive-summary', 'step-03-success', 'step-04-journeys']
inputDocuments:
  - "docs/Structure-project.md"
  - "docs/Up-structure-project.md"
  - "docs/Merge-Dev-To-ToolEdit.md"
  - "docs/readme/README_en.md"
  - "docs/readme/README_vi.md"
  - "docs/readme/README_ja.md"
  - "docs/readme/README_zh.md"
  - "idea-design/DRONE-ROADMAP.md"
  - "idea-design/drone-design.md"
  - "idea-design/shell-shape.md"
  - "idea-design/SHELL_CLASS_DESIGN.md"
  - "idea-design/star-design.md"
  - "idea-design/basic-design.md"
  - "_bmad-output/future-solid-refactor-plan.md"
  - "_bmad-output/solid-refactor-summary.md"
  - "_bmad-output/spec-improve-firework-system.md"
  - "_bmad-output/plan/optimization_plan.md"
  - "STRUCTURE.md"
documentCounts:
  briefCount: 0
  researchCount: 0
  brainstormingCount: 0
  projectDocsCount: 18
classification:
  projectType: "Web Application / Desktop Application (Electron hybrid)"
  domain: "3D Simulation & Choreography"
  complexity: "Medium"
  projectContext: "brownfield"
workflowType: 'prd'
---

# Product Requirements Document - Shell-Drone-Editor

**Author:** ThaoLinn20
**Date:** 2026-07-23

## Executive Summary

Dự án Shell-Drone-Editor hướng tới xây dựng một giải pháp biên đạo và mô phỏng 3D thời gian thực tích hợp, kết hợp đồng bộ giữa drone nghệ thuật và trình diễn pháo hoa. Sản phẩm giải quyết bài toán phức tạp trong việc thiết kế show diễn ánh sáng đa phương tiện bằng cách cung cấp cho các nhà biên đạo nghệ thuật một bộ công cụ thiết kế chuyên sâu đồng bộ theo sóng âm thanh (audio-driven choreography). Tầm nhìn dài hạn của dự án là thiết lập một nền tảng tiêu chuẩn và kiến tạo một cộng đồng sáng tạo sôi nổi, nơi người dùng có thể tự do thiết kế, chia sẻ hoặc giao dịch thương mại các kịch bản trình diễn ngắn (show segments) dưới dạng số.

### What Makes This Special

Sản phẩm sở hữu những điểm độc đáo vượt trội so với các công cụ mô phỏng riêng lẻ:
- **Đồng bộ hóa âm thanh chuyên sâu:** Tích hợp Web Audio API trực tiếp vào [AudioSystem.js](file:///e:/shell-drone-animation/src/systems/AudioSystem.js) để xây dựng dòng thời gian (timeline) tương tác sóng âm thanh (audio waveform), hỗ trợ kéo thả và căn chỉnh chính xác từng mili-giây giữa tiết tấu âm nhạc, nhịp nổ pháo hoa và hành trình bay của drone.
- **Mô phỏng 3D hiệu năng cao:** Tận dụng tối đa lớp kết xuất [InstancedDroneMesh.js](file:///e:/shell-drone-animation/src/render/InstancedDroneMesh.js) trên Three.js để mô phỏng mượt mà từ 1000 đến 5000 drone cùng hàng nghìn hạt pháo hoa thời gian thực ở tốc độ 60 FPS mà không gặp hiện tượng gián đoạn hình ảnh (lag).
- **Ngôn ngữ hình ảnh đồng nhất:** Drone nghệ thuật được thiết kế để thừa hưởng một phần thuộc tính thị giác (màu sắc, cường độ sáng, hiệu ứng vệt sáng/trail) của hạt pháo hoa, tạo nên sự giao thoa nghệ thuật hoàn hảo trong show diễn.
- **Định dạng kịch bản chuẩn hóa:** Định dạng kịch bản dựa trên cấu trúc phân cấp dữ liệu tối ưu, giúp tệp tin gọn nhẹ, mở đường cho việc trao đổi và thương mại hóa dễ dàng trong cộng đồng.

## Project Classification

- **Loại dự án (Project Type):** Ứng dụng Web / Desktop (Electron hybrid wrapper)
- **Lĩnh vực (Domain):** Mô phỏng 3D & Biên đạo trình diễn nghệ thuật (Creative Tech)
- **Độ phức tạp (Complexity):** Trung bình (Medium) - Đòi hỏi tính toán hình học 3D, mô phỏng động học bay vật lý và tối ưu hóa hiệu năng render Three.js.
- **Ngữ cảnh dự án (Project Context):** Tái cấu trúc và mở rộng trên mã nguồn hiện có (Brownfield) dựa trên cấu trúc [STRUCTURE.md](file:///e:/shell-drone-animation/STRUCTURE.md).

## Success Criteria

### User Success

Người dùng có thể nhanh chóng hoàn thành thiết kế, đồng bộ hóa một đoạn trình diễn drone và pháo hoa ngắn trong vòng dưới 15 phút ngay sau khi tải tệp âm thanh lên. Trải nghiệm thao tác trên dòng thời gian timeline sóng âm trực quan, dễ hiểu và không cần qua đào tạo phức tạp.

### Business Success

Thiết lập thành công tiêu chuẩn định dạng kịch bản show diễn dạng tệp JSON, tạo nền tảng cho việc hình thành cộng đồng chia sẻ, đánh giá và giao dịch thương mại các đoạn show diễn ánh sáng ngắn.

### Technical Success

Ứng dụng duy trì tốc độ ổn định 60 FPS trong suốt quá trình mô phỏng từ 1000 đến 5000 drone và pháo hoa thời gian thực trên các trình duyệt hiện đại nhờ áp dụng kỹ thuật Instanced Mesh nâng cao và tối ưu hóa luồng tính toán. Cấu trúc mã nguồn đạt chuẩn SOLID giúp giảm thiểu thời gian phát triển và tích hợp các hình dạng drone hoặc hiệu ứng mới xuống dưới 1 ngày làm việc.

### Measurable Outcomes

- Thiết kế và xuất bản show diễn hoàn chỉnh trong vòng 15 phút.
- Hiệu năng mô phỏng luôn ổn định ở mức 60 FPS khi chạy từ 1000 đến 5000 drone.
- Tốc độ phát triển tính năng hình dạng/hiệu ứng mới dưới 1 ngày làm việc.

## Product Scope

### MVP - Minimum Viable Product

- Tích hợp timeline âm thanh hiển thị biểu đồ sóng âm (waveform) có hỗ trợ kéo tua và thu phóng.
- Bộ công cụ kéo thả cơ bản để gán mốc thời gian nổ pháo hoa và gán tọa độ mục tiêu cho drone.
- Trình mô phỏng 3D thời gian thực hiệu năng cao hỗ trợ từ 1000 đến 5000 drone (sử dụng Instanced Mesh kết hợp cơ chế Web Workers hoặc tối ưu hóa CPU/GPU).
- Hỗ trợ nhập và xuất kịch bản show diễn dưới dạng tệp JSON chuẩn hóa.

### Growth Features (Post-MVP)

- Tính năng tự động phát hiện nhịp nhạc (beat detection) để tự động căn chỉnh mốc thời gian kích nổ pháo hoa.
- Bộ công cụ thiết kế quỹ đạo bay tự do của drone (Bezier path/spline editor).
- Nền tảng web cộng đồng tích hợp giúp người dùng chia sẻ, bình luận và mua bán kịch bản trình diễn.

### Vision (Future)

- Chế độ thiết kế biên đạo cộng tác thời gian thực (Multi-user choreography) cho nhóm thiết kế chuyên nghiệp.
- Hỗ trợ xem trước thực tế ảo (VR/AR preview).
- Khả năng xuất định dạng kịch bản tương thích trực tiếp với các hệ thống bay vật lý của các hãng drone thực tế ngoài đời.

## User Journeys

### Hành trình 1: Nhà biên đạo chuyên nghiệp (Minh, 32 tuổi) - Đường thành công (Success Path)

- **Bối cảnh:** Minh cần thiết kế một màn trình diễn ánh sáng hoành tráng kết hợp 2500 drone và pháo hoa đồng bộ theo bản nhạc EDM dài 3 phút cho một sự kiện ra mắt sản phẩm vào ngày mai.
- **Mở đầu:** Minh mở ứng dụng, tạo dự án mới và tải file âm thanh lên. Timeline ngay lập tức hiển thị biểu đồ sóng âm (audio waveform) chi tiết.
- **Diễn tiến:** Anh kéo thả các điểm kích hoạt pháo hoa tầm cao vào các đỉnh bass của nhạc. Đối với drone, Minh chọn nhóm 2500 chiếc, dùng công cụ biến dạng uốn nhóm ([4-uon-nhom-deformer.md](file:///e:/shell-drone-animation/guides/animated-editor/4-uon-nhom-deformer.md)) để bẻ cong và co giãn đội hình theo đường dẫn Bezier để tạo hình logo sản phẩm chuyển đổi mượt mà.
- **Cao trào:** Anh nhấn Play, trình mô phỏng 3D thời gian thực hiển thị màn diễn cực kỳ trơn tru ở tốc độ 60 FPS.
- **Kết quả:** Minh hài lòng, nhấn xuất file JSON kịch bản chỉ bằng một cú click để chuyển giao cho đội kỹ thuật chạy thực tế ngoài trời.

### Hành trình 2: Biên đạo mô phỏng quy mô lớn (Linh, 28 tuổi) - Tình huống biên & Phục hồi lỗi (Edge Case & Recovery)

- **Bối cảnh:** Linh muốn thử thách giới hạn của ứng dụng bằng cách thiết kế show diễn phức tạp với 5000 drone và hiệu ứng pháo hoa dày đặc.
- **Mở đầu:** Linh nâng số lượng drone lên 5000 và chạy chuyển đổi đội hình liên tục.
- **Diễn tiến:** Luồng chính của ứng dụng bắt đầu có hiện tượng sụt giảm khung hình xuống 25 FPS do CPU quá tải tính toán động học lái bay. Hệ thống phát hiện sụt giảm hiệu năng, tự động chuyển luồng tính toán vật lý sang Web Workers và cảnh báo Linh giản lược bớt các điểm nội suy keyframe dư thừa.
- **Cao trào & Kết quả:** Sau khi hệ thống tự động tối ưu hóa và Linh xác nhận áp dụng đề xuất, tốc độ khung hình phục hồi về mức 60 FPS ổn định. Linh có thể tiếp tục hoàn thiện thiết kế mà không bị treo hay giật ứng dụng.

### Hành trình 3: Nhà sáng tạo nội dung tự do (Sơn, 24 tuổi) - Chia sẻ và Kinh doanh (Community Creator Path)

- **Bối cảnh:** Sơn là một lập trình viên đồ họa tự do, muốn thiết kế các hiệu ứng và hình học drone 3D độc đáo để bán hoặc chia sẻ cho cộng đồng kiếm thêm thu nhập.
- **Mở đầu:** Sơn mở ứng dụng và thiết kế một hiệu ứng chuyển đổi đội hình drone hình 'Rồng bay' tuyệt đẹp sử dụng công cụ thiết kế Bezier nâng cao.
- **Diễn tiến:** Anh đóng gói kịch bản này kèm theo siêu dữ liệu (metadata) bao gồm: số lượng drone yêu cầu (1500 chiếc), thời lượng (45 giây) và nhạc nền đi kèm.
- **Cao trào & Kết quả:** Sơn nhấn nút tải lên "Chợ kịch bản cộng đồng" (Community Marketplace) trực tiếp từ giao diện của phần mềm. Tác phẩm của anh được hiển thị công khai và Sơn có thể theo dõi số lượng lượt tải xuống cùng đánh giá từ những người dùng khác.

### Hành trình 4: Người vận hành trình diễn thực địa (Nam, 40 tuổi) - Chế độ Trình chiếu chuyên dụng (Show Operator Path)

- **Bối cảnh:** Nam là kỹ thuật viên chịu trách nhiệm chạy show diễn ánh sáng tại địa điểm biểu diễn trực tiếp trước hàng ngàn khán giả. Anh cần một giao diện phát sóng cực kỳ ổn định và hiển thị trực quan trạng thái hệ thống để làm màn hình giám sát.
- **Mở đầu:** Nam mở ứng dụng ở chế độ Trình chiếu (Show Viewer Mode). Giao diện biên tập bị ẩn đi hoàn toàn, chỉ giữ lại trình phát 3D màn hình lớn, timeline chạy show, thanh kiểm soát âm lượng và bảng đo đạc hiệu năng hệ thống (FPS, bộ nhớ RAM, tình trạng load âm thanh).
- **Diễn tiến:** Anh tải tệp kịch bản JSON và file âm thanh chất lượng cao của show diễn vào hệ thống. Nam bật tính năng chạy thử (Dry Run) không phát âm thanh để kiểm tra lại toàn bộ chuyển động của 5000 drone trên màn hình mô phỏng.
- **Cao trào & Kết quả:** Khi sự kiện chính bắt đầu, Nam nhấn nút phát show diễn (Play). Ứng dụng phát nhạc đồng bộ ra hệ thống loa lớn, đồng thời màn hình mô phỏng 3D hiển thị hành trình bay của drone khớp hoàn toàn thời gian thực để Nam và ban tổ chức giám sát trực quan mọi diễn biến trên bầu trời. Anh bật tính năng khóa giao diện (Lock Mode) để đảm bảo không có ai vô tình click nhầm làm gián đoạn buổi biểu diễn.

### Journey Requirements Summary

Các hành trình người dùng trên làm hiển lộ các yêu cầu tính năng cụ thể sau:
- **Biên đạo và Dòng thời gian:** Tích hợp timeline âm thanh hiển thị biểu đồ sóng âm (waveform), bộ kéo thả pháo hoa trực quan, công cụ uốn nén nhóm drone uốn nhóm deformer theo đường dẫn Bezier.
- **Độ tin cậy & Hiệu năng:** Cơ chế chuyển đổi tính năng mô phỏng động học sang luồng phụ bằng Web Workers khi tải cao (trên 1000 drone), bảng chỉ số đo đạc hiệu năng phần cứng thực tế (FPS, RAM), công cụ tự động đề xuất giảm keyframe dư thừa.
- **Hệ thống tệp & Cộng đồng:** Khả năng đóng gói metadata kịch bản và xuất bản/tải lên trực tiếp cổng thông tin chợ kịch bản từ phần mềm.
- **Chế độ Trình chiếu (Show Viewer Mode):** Giao diện phát sóng đơn giản hóa, chức năng Chạy thử tắt tiếng (Dry Run) và Khóa giao diện an toàn (Lock Mode).
