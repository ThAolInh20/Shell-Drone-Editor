# Ke hoach kien truc Firework Composition Architecture

Tai lieu nay xac dinh ke hoach chi tiet chuyen doi he thong phao hoa tu mo hinh Preset nguyen khoi sang mo hinh Composition (Thanh phan doc lap: Shape, Dynamics, Modifiers, Visual Effects) kem he thong Template khoi dong nhanh (Quick Presets).

---

## 1. Muc tieu kien truc

- **Doc lap hoan toan (Decoupling)**:
  - Shape khong biet va khong phu thuoc Dynamics.
  - Dynamics khong hard-code Shape.
  - Visual Effects la mot ngan xep (stack) doc lap co the ghep noi bat ky so luong hieu ung nao.
  - Modifiers (nhu Pistil, Instant Burst) hoat dong nhu cac bo bien doi doc lap.
- **Dung luong to hop vo han**: Nguoi dung co the tao ra hang tram ngan bien the phao hoa chi voi vai thanh phan co ban.
- **Tuong thich nguoc 100%**: Cac file sequence cu hoac thiet lap timeline hien tai van hoat dong chinh xac nho bo chuyen doi Legacy Preset Adapter.
- **Giu nguyen Quick Presets**: Cung cap danh sach Preset nhu cac bo mau khoi dong nhanh (Templates) de nguoi dung chon nhanh 1-click.

---

## 2. Mo hinh du lieu chuan (Unified Composition Schema)

```javascript
const fireworkComposition = {
  // 1. Thong tin Preset goc (neu xuat phat tu template)
  preset: 'custom', // hoac 'peony', 'willow', 'heart-strobe', ...

  // 2. Hinh hoc khong gian tai thoi diem no t = 0
  shape: {
    type: 'heart', // 'sphere' | 'ring' | 'heart' | 'star' | 'fish' | 'cat' | 'flower' | 'smiley' | 'lightning' | 'galaxy' | 'oval' | 'upward-spray'
    options: {
      scale: 1.0,
      rotation: {
        x: 0,
        y: 0,
        z: 0
      }
    }
  },

  // 3. Dong luc hoc & quy dao chuyen dong tai t > 0
  dynamics: {
    type: 'flow', // 'standard' | 'flow' | 'willow' | 'fallingLeaves' | 'snow' | 'galaxySpin' | 'fallingComets' | 'bouquet'
    options: {
      gravity: 0.8,
      turbulence: 0.3,
      drag: 0.98
    }
  },

  // 4. Bo bo tro cau truc no
  modifiers: {
    pistil: false,      // No phan tang nhuy ben trong
    instantBurst: false // Bung van toc toi da ngay lap tuc
  },

  // 5. Ngan xep hieu ung quang hoc & hat phu
  effects: [
    {
      type: 'strobe',
      options: {
        frequency: 10,
        intensity: 1.5
      }
    },
    {
      type: 'crackle',
      options: {
        density: 0.5
      }
    }
  ]
};
```

---

## 3. Cau truc thu muc va phan chia trach nhiem

```
src/
├── config/
│   ├── fireworks.js               // Thong so vat ly, multipliers va default configs
│   └── firework-presets.js        // Danh sach Template Presets chuan hoa Composition
│
├── factories/
│   ├── BurstShapeGenerator.js     // Tinh toan hinh hoc khong gian (Shape vectors at t=0)
│   ├── BurstEffectProcessor.js    // Xu ly vat ly & quang hoc (Dynamics & Effects at t>0)
│   ├── ShellPresetFactory.js      // Quan ly cac Preset Template va chuyen doi Schema
│   └── FireworkFactory.js         // Khoi tao tong hop thuc the phao hoa
│
├── systems/
│   ├── FireworkSystem.js          // Runtime quan ly vong doi particle & render
│   ├── TrailSystem.js             // Runtime quan ly vet duoi particle
│   └── CometSystem.js             // Runtime quan ly phao chùm & sao choi
│
├── directors/
│   └── FireworkSequencer.js       // Dispatch event tu timeline sequence
│
└── ui/
    └── PropertyInspector.js       // Giao dien bien tap thuoc tinh truc quan
```

---

## 4. Cac giai doan thuc hien (Implementation Phases)

### Giai doan 1: Chuan hoa Data Schema, Configs va Preset Templates
- Tao bo Preset Templates trong `./src/config/fireworks.js` hoac `./src/factories/ShellPresetFactory.js` quy dinh ro thanh phan `shape`, `dynamics`, `modifiers`, `effects` cho tung preset truyen thong (`peony`, `willow`, `heart-strobe`, `fish-flow`, `crysanthemum-cc`, `galaxy-spin`, v.v.).
- Chuyen `willow` khoi danh sach Shape va dua sang danh sach Dynamics.
- Xay dung `resolveComposition(config)` de tu dong chuyen doi du lieu sequence cu sang Composition moi.

### Giai doan 2: Nang cap Runtime Engine (Core Factories & Systems)
- Cap nhat `BurstShapeGenerator.js` nhan cac tham so `shapeType`, `scale`, `rotation` doc lap voi Dynamics.
- Cap nhat `BurstEffectProcessor.js` xu ly `dynamics` (standard, flow, willow, fallingLeaves, snow, galaxySpin, bouquet) tach biet khoi `shape`.
- Dong bo `FireworkSystem.js` va `FireworkSequencer.js` de chap nhan ca 2 dang: Object Composition va Legacy Shell Preset.

### Giai doan 3: Nang cap Property Inspector UI
- **Nhom 1: Quick Preset / Template**: Dropdown chon nhanh preset co san. Khi chon se tu dong fill du lieu vao cac control ben duoi.
- **Nhom 2: Shape (Hinh dang)**: Dropdown chon 1 Shape chinh (`sphere`, `ring`, `heart`, `star`, `fish`, `cat`, `flower`, `smiley`, `lightning`, `galaxy`, `oval`, `upward-spray`).
- **Nhom 3: Dynamics (Dong luc hoc no)**: Dropdown chon Dynamics chinh (`standard`, `flow`, `willow`, `fallingLeaves`, `snow`, `galaxySpin`, `bouquet`).
- **Nhom 4: Modifiers (Bo tro cau truc)**: Checkbox toggles cho `Pistil` va `Instant Burst`.
- **Nhom 5: Visual Effects Stack**: He thong Tag Selector de them/xoa nhieu hieu ung quang hoc (`strobe`, `crackle`, `ghost`, `trail`, `colorShift`).

### Giai doan 4: Kiem thu toan dien va Tich hop ngon ngu
- Cap nhat tu dien ngon ngu (`en.js`, `vi.js`, `zh.js`, `ja.js`) cho toan bo ten Shape, Dynamics, Modifiers, Effects.
- Test thu nghiem cac to hop da dang:
  - Heart + Flow + Strobe + Crackle
  - Star + Willow + Crackle + Pistil
  - Fish + Snow + Glitter + Instant Burst
  - Galaxy + Galaxy Spin + Ghost + Trail
- Kiem tra tinh tuong thich khi luu va mo lai cac file timeline sequence cu.
