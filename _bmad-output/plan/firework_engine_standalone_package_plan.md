# Ke hoach kien truc: Tach thu vien doc lap Firework Engine (Standalone Package)

Tai lieu nay xac dinh ke hoach chi tiet de tach toan bo logic, hieu ung, thuat toan vat ly va he thong render phao hoa tu hai ung dung hien tai (Studio va TikTok Live) thanh mot thu vien doc lap: `@shell-drone/firework-engine`.

---

## 1. Muc tieu kien truc va Pham vi

- **Doc lap hoa tuyet doi (Single Source of Truth)**:
  - Toan bo thuat toan hinh dang (Shape t=0), dong hoc vi phan (Dynamics t>0), danh muc phan loai (Taxonomy), mau phao hoa (Presets) va shader GPU chi nam tai mot noi duy nhat.
  - Khi bo sung phao hoa hay thuat toan moi, ca Studio (`shell-drone-animation`) va TikTok Live (`shell-drone-live`) deu nhan duoc ban cap nhat dong bo ma khong can copy-paste thu cong.
- **Bao toan tinh nguyen ven cho 2 ung dung hien huu**:
  - Giu nguyen hai repository Git doc lap: `e:\shell-drone-animation` va `e:\shell-drone-live`. Khong lam xao tron lich su Git hay cau truc thu muc goc cua 2 du an.
  - Hai ung dung se dong vai tro la Consumers (nguoi tieu thu), tich hop thu vien qua dependency manager (`package.json`).
- **Ket nap day du dong gop tu ca hai nhanh**:
  - Tich hop tinh nang phao hoa xep chu (`TextGlyphAtlas.js` va shape `text_word`) tu ban Live vao thu vien chung de ban Studio cung dung duoc.
  - Tich hop bo phat sinh phao hoa theo cap do (`ProceduralShellGenerator.js`) de ho tro ca hai ben.
- **Chat luong kiem thu (100% Zero-Regression)**:
  - Di chuyen toan bo 13+ file headless test tu thu muc `tests/` sang thu vien chung, bao dam `vitest run` vuot qua 100% truoc khi tich hop nguoc lai.

---

## 2. Kien truc Thu muc Thu vien doc lap (`firework-engine`)

Thu vien doc lap se duoc khoi tao tai thu muc: `e:\firework-engine` (hoac mot repo Git doc lap).

```text
firework-engine/
├── package.json
├── vite.config.js (hoac tsup.config.js)
├── README.md
├── LICENSE
├── src/
│   ├── index.js                     # Public API Entrypoint
│   ├── config/
│   │   ├── fireworks.js             # Cau hinh vat ly, tham so, bang mau goc
│   │   └── layers.js                # Layer masks (LAYER_REFLECTION)
│   ├── factories/
│   │   ├── BurstShapeGenerator.js   # Sinh toa do hinh hoc tai t=0 (co kem text_word)
│   │   ├── BurstEffectProcessor.js  # Dong hoc vi phan, suy giam nhiet tai t>0
│   │   ├── BurstParticleFactory.js  # Zero-allocation particle pool CPU
│   │   ├── FireworkCompositionHelper.js # Taxonomy, composition templates
│   │   ├── ShellPresetFactory.js    # Catalog toan bo presets chuan snake_case
│   │   ├── TextGlyphAtlas.js        # Ma tran diem ky tu cho phao hoa chu
│   │   └── ProceduralShellGenerator.js # Phat sinh phao hoa dong theo tier
│   ├── entities/
│   │   ├── ShellEntity.js           # State machine qua phao (Launch -> Apex -> Burst)
│   │   └── CometEntity.js           # State machine sao bang & chùm tia
│   ├── systems/
│   │   ├── FireworkSystem.js        # WebGL burst particles & shaders
│   │   ├── TrailSystem.js           # GPU ring-buffer VBO trail & analytical kinematics
│   │   ├── CometSystem.js           # Comet particles & beams
│   │   ├── SmokeSystem.js           # Khoi be phong va khoi tren khong
│   │   └── SkyLightReactionSystem.js # Anh chop sang bau troi khi no
│   └── render/
│       ├── InstancedShellRenderer.js # InstancedMesh toi uu draw call qua phao
│       └── InstancedCometRenderer.js # InstancedMesh toi uu draw call comet
└── tests/                           # Headless Vitest test suite
    ├── factories/
    │   ├── BurstShapeGenerator.test.js
    │   ├── BurstEffectProcessor.test.js
    │   ├── BurstParticleFactory.test.js
    │   ├── ShellPresetFactory.test.js
    │   ├── ActiveEffectsTiming.test.js
    │   ├── ApexHangEffect.test.js
    │   ├── BreathingAndScintillationEffects.test.js
    │   └── ParticleDynamicsAndThermalLifecycle.test.js
    └── systems/
        ├── GpuTrailSimulation.test.js
        ├── BurstTrailInterpolation.test.js
        ├── CometClusterStarHead.test.js
        ├── DetachedBeamLifetime.test.js
        ├── ErraticDartEffect.test.js
        ├── SecondBurstFeature.test.js
        └── SmokeSystem.test.js
```

---

## 3. Public API Contract (`src/index.js`)

Thư viện cung cấp một bề mặt giao tiếp (Public API) rõ ràng, cho phép import có chọn lọc:

```javascript
// Configs & Taxonomy
export { FIREWORK_CONFIG } from './config/fireworks.js';
export {
  AVAILABLE_SHAPES,
  AVAILABLE_DYNAMICS,
  AVAILABLE_MODIFIERS,
  ACTIVE_EFFECTS,
  TIMED_EFFECT_TAGS,
  FireworkCompositionHelper
} from './factories/FireworkCompositionHelper.js';

// Factories & Generators
export { BurstShapeGenerator } from './factories/BurstShapeGenerator.js';
export { BurstEffectProcessor } from './factories/BurstEffectProcessor.js';
export { BurstParticleFactory } from './factories/BurstParticleFactory.js';
export { ShellPresetFactory } from './factories/ShellPresetFactory.js';
export { TextGlyphAtlas, layoutWord } from './factories/TextGlyphAtlas.js';
export { ProceduralShellGenerator } from './factories/ProceduralShellGenerator.js';

// Entities
export { ShellEntity } from './entities/ShellEntity.js';
export { CometEntity } from './entities/CometEntity.js';

// Three.js Systems & Renderers
export { FireworkSystem } from './systems/FireworkSystem.js';
export { TrailSystem } from './systems/TrailSystem.js';
export { CometSystem } from './systems/CometSystem.js';
export { SmokeSystem } from './systems/SmokeSystem.js';
export { SkyLightReactionSystem } from './systems/SkyLightReactionSystem.js';
export { InstancedShellRenderer } from './render/InstancedShellRenderer.js';
export { InstancedCometRenderer } from './render/InstancedCometRenderer.js';
```

---

## 4. Quy trinh Dong goi va Phat hanh (Build & Release Pipeline)

### 4.1 Cau hinh Package (`package.json`)
- Tên package: `@shell-drone/firework-engine`
- Phiên bản ban đầu: `1.0.0`
- `peerDependencies`: `three: ">=0.160.0"` (giúp tránh việc bị duplicate Three.js bundle giữa app và engine)
- Output formats:
  - `dist/index.mjs` (ESM cho Vite/modern bundler)
  - `dist/index.cjs` (CJS cho Node.js CLI/test)
  - `dist/index.d.ts` (Type definitions)

### 4.2 Cong cu Build
- Sử dụng `tsup` hoặc `vite build --mode lib`:
  ```javascript
  // vite.config.js trong firework-engine
  import { defineConfig } from 'vite';
  import { resolve } from 'path';

  export default defineConfig({
    build: {
      lib: {
        entry: resolve(__dirname, 'src/index.js'),
        name: 'FireworkEngine',
        fileName: (format) => `index.${format === 'es' ? 'mjs' : 'cjs'}`
      },
      rollupOptions: {
        external: ['three'],
        output: {
          globals: {
            three: 'THREE'
          }
        }
      }
    }
  });
  ```

### 4.3 CI/CD GitHub Actions (.github/workflows/release.yml)
- Khi merge vao nhanh `main` hoac tao git tag:
  1. Chạy `vitest run` kiểm tra toàn bộ unit tests.
  2. Chạy `vite build` tạo thư mục `dist/`.
  3. Publish gói lên GitHub Packages (`npm.pkg.github.com`) hoặc NPM Registry.

---

## 5. Ke hoach Tich hop vao 2 Ung dung Consumers

### 5.1 Tich hop vao `shell-drone-animation` (Studio)
1. Thêm dependency trong `e:\shell-drone-animation\package.json`:
   ```json
   {
     "dependencies": {
       "@shell-drone/firework-engine": "file:../firework-engine"
     }
   }
   ```
2. Cập nhật các file gọi logic pháo hoa (ví dụ `FireworkSequencer.js`, `ShowDirector.js`):
   Chuyển các import nội bộ sang import từ package:
   ```javascript
   // Truoc day:
   // import { ShellPresetFactory } from '../factories/ShellPresetFactory.js';
   // Hien tai:
   import { ShellPresetFactory, FireworkSystem } from '@shell-drone/firework-engine';
   ```
3. Chạy lại toàn bộ test suite của Studio để kiểm tra tính tương thích.

### 5.2 Tich hop vao `shell-drone-live` (TikTok Live)
1. Thêm dependency tương tự trong `e:\shell-drone-live\package.json`.
2. Dọn dẹp mã nguồn thừa:
   - Xóa các file trùng lặp tại `e:\shell-drone-live\src\factories/` (`BurstShapeGenerator.js`, `BurstEffectProcessor.js`, v.v.).
   - Xóa `TextGlyphAtlas.js` và `ProceduralShellGenerator.js` cục bộ vì đã được đưa vào package chung.
3. Cập nhật `InteractionManager.js` để gọi thẳng từ package `@shell-drone/firework-engine`.
4. Kiểm thử kết nối WebSocket TikTok và kích hoạt các hiệu ứng quà tặng để bảo đảm hoạt động mượt mà.

---

## 6. Quy trinh Lam viec khi Co Hieu ung Moi (Developer Workflow)

Khi bạn muốn sáng tạo thêm một loại pháo hoa mới hoặc nâng cấp thuật toán:

1. **Bước 1**: Mở repo `firework-engine`, viết thêm Shape trong `BurstShapeGenerator.js` hoặc thêm Preset trong `ShellPresetFactory.js`.
2. **Bước 2**: Viết unit test tương ứng trong `firework-engine/tests/` và chạy `pnpm test`.
3. **Bước 3**: Build package (`pnpm build`).
4. **Bước 4**:
   - Nếu đang dùng liên kết cục bộ (`file:../firework-engine`): Cả Studio và Live **tự động có hiệu ứng mới ngay lập tức**.
   - Nếu dùng qua GitHub Packages / NPM: Chạy lệnh sau tại thư mục của Studio hoặc Live:
     ```bash
     pnpm update @shell-drone/firework-engine
     ```

---

## 7. Lo trinh Thuc thi tung buoc (Implementation Phases)

| Phase | Nhiem vu cu the | Ket qua dau ra (Deliverables) |
|---|---|---|
| **Phase 1** | Khởi tạo thư mục `e:\firework-engine`, copy các file logic đã kiểm kê từ Studio và Live sang. | Mã nguồn lõi được tập hợp đầy đủ tại một nơi. |
| **Phase 2** | Đồng nhất tính năng `text_word` và `ProceduralShellGenerator` vào package chung. | Khắc phục hoàn toàn tình trạng lệch code giữa 2 repo. |
| **Phase 3** | Cấu hình Vite Library Mode / tsup, build ra `dist/` và thiết lập `src/index.js`. | Package có thể build và import độc lập. |
| **Phase 4** | Di chuyển 13+ file test sang `firework-engine/tests/`, chạy `vitest run` bảo đảm 100% pass. | Bảo chứng không có lỗi suy giảm (zero-regression). |
| **Phase 5** | Cấu hình Studio (`shell-drone-animation`) tiêu thụ package mới, chạy lại test Studio. | Studio hoạt động trơn tru qua thư viện chung. |
| **Phase 6** | Cấu hình Live (`shell-drone-live`) tiêu thụ package mới, dọn dẹp file trùng lặp, test TikTok gift. | Live hoạt động trơn tru qua thư viện chung. |
| **Phase 7** | Thiết lập GitHub Actions tự động hóa quy trình build và publish khi có release. | Hoàn tất hệ thống tự động hóa. |

