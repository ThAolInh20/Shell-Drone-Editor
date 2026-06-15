# Hướng dẫn tạo và chỉnh sửa Pháo hoa (Shell Creation Workflow)

Tài liệu này cung cấp bản đồ cấu trúc mã nguồn của hệ thống pháo hoa 3D, danh sách các file chịu trách nhiệm trong pipeline, cùng với các biểu mẫu code mẫu (code templates) và quy trình 4 bước để lập trình viên hoặc AI có thể nhanh chóng tạo hiệu ứng pháo hoa mới.

---

## 🗺️ Bản đồ Pipeline Pháo Hoa (Firework Pipeline Map)

Hệ thống pháo hoa được thiết kế theo dạng đường ống (pipeline) phân chia nhiệm vụ rõ ràng:

```mermaid
graph TD
    A[PropertyInspector.js / Timeline UI] -->|Chọn Preset Key| B[ShellPresetFactory.js]
    B -->|Cấu hình Preset| C[FireworkSystem.js]
    C -->|Tạo hạt & Chọn Shape| D[BurstShapeGenerator.js]
    C -->|Vật lý & Cập nhật Hiệu ứng| E[BurstEffectProcessor.js]
    C -->|Sinh khói & Vệt sáng| F[TrailSystem.js]
```

### 📂 Các tệp tin liên quan trực tiếp:

1. **Preset & Đăng ký (UI & Factory):**
   - [ShellPresetFactory.js](file:///e:/shell-drone-animation/src/factories/ShellPresetFactory.js): Nơi định nghĩa các bộ tham số pháo hoa mặc định (presets) như màu sắc, kích thước, hiệu ứng kích hoạt, hình dáng. Bạn cần khai báo preset mới tại đây để nó hiển thị lên giao diện Timeline.
   - [PropertyInspector.js](file:///e:/shell-drone-animation/src/ui/PropertyInspector.js): Giao diện hiển thị thuộc tính để chỉnh sửa thủ công cho từng sequence. Nó tự động đồng bộ danh sách preset từ factory.

2. **Hình học & Định hình hạt (Geometry & Coordinates):**
   - [BurstShapeGenerator.js](file:///e:/shell-drone-animation/src/factories/BurstShapeGenerator.js): Lớp tĩnh tính toán tọa độ vector 3D ban đầu cho các hạt khi pháo nổ (ví dụ: `sphere`, `ring`, `heart`, `star`, `willow`, `smiley`, v.v.). Thêm hình dáng mới tại đây.

3. **Vật lý & Động lực học hiệu ứng (Physics & Dynamic Effects):**
   - [BurstEffectProcessor.js](file:///e:/shell-drone-animation/src/factories/BurstEffectProcessor.js): Điều khiển vận tốc, trọng lực riêng biệt, tạo nhấp nháy (strobe), lách tách (crackle), vệt khói (trail) hoặc chuyển động sóng (wave) cho các hạt theo thời gian thực (realtime update). Thêm hiệu ứng rơi hay chuyển động mới tại đây.

4. **Trọng tâm hệ thống (System Engine):**
   - [FireworkSystem.js](file:///e:/shell-drone-animation/src/systems/FireworkSystem.js): Trái tim của hệ thống pháo hoa. Quản lý việc phóng quả pháo từ mặt đất, kích hoạt vụ nổ tại độ cao chỉ định, sinh vật thể Point Cloud của Three.js và cập nhật toàn bộ trạng thái trong vòng lặp render.
   - [TrailSystem.js](file:///e:/shell-drone-animation/src/systems/TrailSystem.js): Hệ thống sinh các hạt phụ cho vệt sáng comet rủ xuống hoặc bụi tia lửa lách tách khi pháo nổ.

---

## 📝 Biểu mẫu Code Mẫu (Code Templates)

### 1. Thêm Shape mới vào `BurstShapeGenerator.js`

Mở [BurstShapeGenerator.js](file:///e:/shell-drone-animation/src/factories/BurstShapeGenerator.js):
- **Bước A:** Đăng ký tên shape trong hàm static `resolveShape(shellType)`:
  ```javascript
  case 'my-custom-shape':
    return 'my-custom-shape';
  ```
- **Bước B:** Thêm logic tính toán hướng vector trong hàm static `direction(...)`:
  ```javascript
  if (shape === 'my-custom-shape') {
    // angle: góc phân bổ từ 0 đến 2*PI dựa trên chỉ số hạt
    // index: chỉ số hạt hiện tại
    // count: tổng số lượng hạt của vụ nổ
    const radius = 1.0;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    const z = (Math.random() - 0.5) * 0.2; // độ dày 3D
    return new THREE.Vector3(x, y, z).normalize();
  }
  ```

### 2. Thêm Hiệu ứng chuyển động mới vào `BurstEffectProcessor.js`

Mở [BurstEffectProcessor.js](file:///e:/shell-drone-animation/src/factories/BurstEffectProcessor.js):
- **Bước A:** Đăng ký tên hiệu ứng vào Set `SUPPORTED_EFFECTS`:
  ```javascript
  'my-custom-effect'
  ```
- **Bước B:** Cập nhật logic thay đổi vận tốc hạt trong `updateVelocity(...)`:
  ```javascript
  } else if (effectType === 'my-custom-effect') {
    gravityScale = 0.15; // Lực hút nhẹ
    // Thay đổi vận tốc dựa trên thời gian trôi qua (age)
    velocity.x += Math.sin(age * 5) * 0.05; 
    velocity.multiplyScalar(0.995); // Độ ma sát không khí
    
    // Nếu muốn sinh vệt sáng comet rủ xuống:
    spawnTrail = true;
    trailLife = 0.5; // Thời gian sống của hạt đuôi
    trailIntensity = 0.6; // Độ sáng của hạt đuôi
  }
  ```

### 3. Đăng ký Preset mới vào `ShellPresetFactory.js`

Mở [ShellPresetFactory.js](file:///e:/shell-drone-animation/src/factories/ShellPresetFactory.js):
- **Bước A:** Đăng ký preset vào danh sách hiển thị `presetMenuEntries` trong `constructor()`:
  ```javascript
  { key: 'myCustomPreset', label: 'My Custom Firework' }
  ```
- **Bước B:** Đăng ký key trong switch-case `createPresetByKey(key)`:
  ```javascript
  case 'myCustomPreset':
    return this.validatePreset(this.myCustomPresetShell(size));
  ```
- **Bước C:** Viết hàm cấu hình preset tương ứng:
  ```javascript
  myCustomPresetShell(size = 1) {
    return {
      ...this.basePreset(size),
      shellType: 'myCustomPreset',
      shapeType: 'my-custom-shape', // Tên shape đã khai báo ở BurstShapeGenerator
      effectType: 'my-custom-effect', // Tên effect đã khai báo ở BurstEffectProcessor
      strobe: true, // kích hoạt nhấp nháy phụ trợ
      particleCountMultiplier: 1.2 // số lượng hạt (nhân thêm 1.2 lần)
    };
  }
  ```

---

## 🚀 Quy trình 4 bước tạo pháo hoa mới nhanh chóng

1. **Bước 1 (Định hình dáng):** Thiết kế toán học tọa độ 3D và khai báo shape mới trong [BurstShapeGenerator.js](file:///e:/shell-drone-animation/src/factories/BurstShapeGenerator.js). *(Bỏ qua nếu dùng lại hình cầu `sphere` hay hình tròn `ring` có sẵn).*
2. **Bước 2 (Thiết lập hiệu ứng vật lý):** Khai báo hiệu ứng chuyển động hạt và sinh vệt đuôi (trail) trong [BurstEffectProcessor.js](file:///e:/shell-drone-animation/src/factories/BurstEffectProcessor.js). *(Bỏ qua nếu dùng lại hiệu ứng `standard` hoặc `crackle` có sẵn).*
3. **Bước 3 (Đăng ký Preset):** Tạo hàm preset mới và đăng ký key hiển thị trong UI tại [ShellPresetFactory.js](file:///e:/shell-drone-animation/src/factories/ShellPresetFactory.js).
4. **Bước 4 (Kiểm thử):** Khởi chạy local server bằng lệnh `npm run dev`, mở Timeline Editor (bấm `Ctrl + T`), chọn biểu tượng preset mới trong Property Inspector để bắn thử và quan sát chuyển động của pháo hoa.
