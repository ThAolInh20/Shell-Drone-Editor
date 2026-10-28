# Ke hoach Tai cau truc He thong Hieu ung Phao hoa (Shell Effect Architecture Refactoring Plan)

Tai lieu nay xac dinh kien truc va lo trinh chi tiet de tai cau truc toan dien he thong hieu ung phao hoa, loai bo triet de tinh trang trung lap ma nguon (DRY violation), tinh gon lop nguyen khoi `FireworkSystem.js`, va chuan hoa mo hinh module hoa cho toan bo cac Active Effects.

---

## 1. Boi canh va Van de can giai quyet

### 1.1. Thuc trang hien tai
Trong qua trinh mo rong tinh nang Second Burst, he thong da boc lo nhung nhuoc diem nghiem trong ve mat kien truc:
- **Trung lap khoi tao hat (Duplicated Particle Initialization)**:
  Ham `createBurst` (dong 2027-2103) va `spawnSecondBurst` (dong 2198-2240) deu phai tu khai bao thu cong khoang 35 thuoc tinh cho moi hat phao (`effectState`, `phase`, `isCrossette`, `hasErraticDart`, `hasTadpoleFlurry`, `hasBurstSmoke`, `color2`, `dragCoefficient`, v.v.).
  Su lap lai nay da truc tiep gay ra loi truoc do: `spawnSecondBurst` bi thieu sot `effectState: null` va bo quen cac co kich hoat quang hoc.
- **Lop nguyen khoi (God Class) `FireworkSystem.js`**:
  File nay hien dai gan 4,000 dong, dong thoi ganh vac qua nhieu trach nhiem: quan ly Scene, cap nhat vat ly dan dao, Instanced Shell Rendering, dieu phoi am thanh, va chua mot chuoi `if-else` khong lo de xu ly tung hieu ung dac thu.
- **Strategy Pattern chua triet de**:
  Lop `BurstEffectProcessor` da duoc xay dung voi `effectsRegistry`, tuy nhien moi chi tiep nhan viec tinh toan van toc (`updateVelocity`) va do mo (`materialOpacity`).
  Toan bo logic kich hoat trang thai giua chung (Runtime Lifecycle) nhu: thoi diem bat toc cua `erratic-dart`, chu ky ban tia cua `tadpole-flurry`, chia nhanh vuong goc cua `crossette`, no vi mo `crackle` van bi viet truc tiep ben trong vong lap `updateBurstParticles`.

### 1.2. Muc tieu tai cau truc
1. **Duy nhat mot nguon chan ly (Single Source of Truth) cho Hat phao**:
   Moi hat phao no trong he thong (Main Burst, Second Burst, Pistil Core, Crossette Split) deu duoc tao ra thong qua mot Factory thong nhat.
2. **Mo hinh Active Effects cam-rut hoan toan (Pluggable Active Effects)**:
   Moi hieu ung chu dong (strobe, crackle, flow, erratic-dart, tadpole-flurry, crossette, burst-smoke, ghost) co vong doi doc lap, tu quan ly logic kich hoat ma khong can can thiep vao than vong lap chinh cua `FireworkSystem`.
3. **Tinh gon `FireworkSystem.js`**:
   Giam thieu do phuc tap cua vong lap `updateBurstParticles`, chuyen doi tu cay `if-else` 800 dong sang mo hinh Pipeline dieu phoi tinh gon.
4. **Bao toan 100% tinh tuong thich nguoc va hieu nang cao**:
   Khong lam thay doi bat ky cau truc JSON sequence nao hien co, dam bao toan bo 246 tests hien tai luon Pass.

---

## 2. Thiet ke Kien truc moi

### 2.1. Thanh phan 1: `BurstParticleFactory`
Thu muc: `src/factories/BurstParticleFactory.js`
Trach nhiem:
- Tinh toan day du cac tham so vat ly, quang hoc, va dong bo hoa `effectState` cho mot tap hop hat hoac tung hat don le.
- Cung cap cac phuong thuc chuan hoa:
  - `createParticles(burstContext)`: Sinh toan bo mang hat cho mot vu no (outer shell hoac core pistil).
  - `createParticle(particleParams)`: Khoi tao doi tuong hat hoan chinh voi gia tri mac dinh an toan cho tat ca cac truong hieu ung.
  - `createCrossetteBranches(parentParticle, options)`: Sinh 4 nhanh hat crossette vuong goc ke thua day du context.

Cau truc giao dien de xuat:
```javascript
export class BurstParticleFactory {
  static createBurstParticles({
    count,
    shapeType,
    dynamicsType,
    effects = [],
    origin,
    baseSpeed,
    speedVarianceRange,
    life,
    color,
    secondColor = null,
    parentVelocity = null,
    burstRotation = null,
    heightProfile = null,
    shellId = null,
    customConfig = {},
    isSecondBurst = false,
    secondBurstConfig = null
  }) {
    // 1. Khoi tao effectState qua BurstEffectProcessor
    // 2. Tinh toan profile dong luc hoc
    // 3. Khoi tao cac co Active Effects (erraticDart, tadpole, crossette, burstSmoke)
    // 4. Sinh mang hat hoan chinh, dam bao khong bao gio thieu flag
  }
}
```

### 2.2. Thanh phan 2: `EffectLifecycleDispatcher` (hoac mo rong `BurstEffectProcessor`)
Trach nhiem:
- Quan ly cac Handler chuyen trach cho tung loai Active Effect trong qua trinh hat bay:
  - `ErraticDartHandler`: Quan ly bo dem `erraticDartTriggerRatio`, kich hoat cu lao vut, tang toc van toc va tao vet sang uon luon.
  - `TadpoleFlurryHandler`: Quan ly bo dem ban tia mui ten (`tadpoleArrowTimer`) va vu no xoe cuoi chang (`spawnBurstParticleFlurry`).
  - `CrossetteHandler`: Quan ly bo dem thoi gian tach, sinh 4 nhanh vuong goc qua `BurstParticleFactory`.
  - `MicroCrackleHandler`: Quan ly no vi mo phat tia lua va phat am thanh sub-burst crackle.
  - `BurstSmokeHandler`: Quan ly phat khoi theo ty le `burstSmokeLimit`.
- Phuong thuc dieu phoi chinh:
  `BurstEffectProcessor.processLifecycle(particle, deltaTime, context)`

### 2.3. Thanh phan 3: Tinh gon `FireworkSystem.updateBurstParticles`
Vong lap cap nhat hat cua `FireworkSystem` se chi con lai 4 buoc tinh gon:
1. **Kinematics & Wind**: Tinh toan van toc theo profile va gio he thong (`BurstEffectProcessor.updateVelocity`).
2. **Water Collision Check**: Xu ly va cham mat nuoc tai `Y <= 0`.
3. **Active Effects Lifecycle**: Goi `BurstEffectProcessor.processLifecycle` de thuc thi cac hieu ung dac thu.
4. **Visual Sweep & Opacity**: Tinh toan do mo va mau sac hien thi (`BurstEffectProcessor.materialOpacity` va `BurstEffectProcessor.resolveColor`).

---

## 3. Lo trinh Trien khai chi tiet (Phased Implementation Roadmap)

### Giai doan 1: Xay dung `BurstParticleFactory` & Dong nhat khoi tao hat [HOAN THANH]
- **Muc tieu**: Xoa bo hoan toan code lap lai giua `createBurst` va `spawnSecondBurst`.
- **Cac buoc thuc hien**:
  1. Tao file `src/factories/BurstParticleFactory.js` voi cac phuong thuc chuan hoa `createParticle`, `resolveActiveEffectFlags`, `createCrossetteBranches`, `createRandomBurstRotation`.
  2. Refactor ham `FireworkSystem.createBurst` de su dung `BurstParticleFactory`.
  3. Refactor ham `FireworkSystem.spawnSecondBurst` de su dung chung `BurstParticleFactory` cho ca lop hat vo va loi pistil.
  4. Chuyen doi `createRandomBurstRotation` va nhanh Crossette de su dung `BurstParticleFactory`.
  5. Xay dung bo unit test `tests/factories/BurstParticleFactory.test.js` (6 tests).

### Giai doan 2: Module hoa Active Effects Lifecycle [HOAN THANH MOT PHAN / ON DINH]
- **Muc tieu**: Tach cac doan logic kich hoat hieu ung phuc tap ra khoi than ham `updateBurstParticles`.
- **Cac buoc thuc hien**:
  1. Mo rong `BurstEffectProcessor.js` de tiep nhan:
     - `processErraticDart(particle, deltaTime, lifeRatio, baseGravityScale)`: Xu ly toan bo vat ly bat toc va chuyen huong dot ngot.
     - `BurstParticleFactory.createCrossetteBranches`: Xu ly sinh 4 nhanh vuong goc kieu crossette.
  2. Tich hop `BurstEffectProcessor.processErraticDart` vao `FireworkSystem.updateBurstParticles`.
  3. Giu nguyen cac Event Bus emitters (`firework:crackle`, `smoke:spawn`) de dam bao khong anh huong toi giao tiep am thanh va khoi.

### Giai doan 3: Chuan hoa Mau sac & Strobe Processing [HOAN THANH]
- **Muc tieu**: Loai bo cac bien co doan nhan mau va hop nhat logic tinh toan mau `r, g, b` vao `BurstEffectProcessor`.
- **Cac buoc thuc hien**:
  1. Xay dung `BurstEffectProcessor.resolveParticleColor(particle, lifeRatio, options)` xu ly toan dien:
     - White Strobe & Glitter Strobe
     - Dying embers cooling
     - Standard strobe
     - Ghost reveal (3 giai doan: toi, flash reveal, fade)
     - Color Change (CC transition voi flash reveal)
     - Chrysanthemum spiral ignition sweep
     - Ghost flare reignition
     - Double helix color blending
     - Thermal cooling lifecycle (incandescent flash -> amber -> dark red)
  2. Tich hop vao `FireworkSystem.updateBurstParticles`, tinh gon hon 190 dong ma nguyen khoi.

### Giai doan 4: Kiem thu Toan dien & Benchmark Hieu nang [HOAN THANH]
- **Muc tieu**: Dam bao tinh on dinh, khong regression va tat ca test cases vuot qua 100%.
- **Cac buoc thuc hien**:
  1. Bo sung unit test chuyen sau trong `tests/factories/BurstParticleFactory.test.js` (6 tests) va `tests/factories/BurstEffectProcessor.test.js` (9 tests).
  2. Chay toan bo test suite: 34 files test, 254/254 tests PASS 100%.
  3. Kiem tra tinh tuong thich tren branch `refactor/shell-effect`.

---

## 4. Chien luoc Phong ngua Regression & Kiem thu

1. **Bao toan Quota hat va Bang mau**:
   - Khong lam thay doi cac hang so can ban trong `./src/config/fireworks.js` (`BASE_BURST_PARTICLES`, `MAX_BURST_PARTICLES`, `BURST_SPEED`, `BURST_LIFE`).
   - Tuan thu tuyet doi quy tac khong dung icon/emoji, giu tieng Anh la ngon ngu goc trong ma nguon va chuoi du lieu.
2. **Kiem tra Cheo cac bo Test san co**:
   - `SecondBurstFeature.test.js`: Dam bao tinh nang Second Burst hoat dong day du tat ca hieu ung.
   - `BurstEffectProcessor.test.js`: Kiem thu tinh dung dan cua cac profile dong luc hoc.
   - `ParticleDynamicsAndThermalLifecycle.test.js`: Kiem thu hanh vi tan bien nhiet va luc can khi dong hoc.
3. **Kiem chung tren Preview 3D thuc te**:
   - Test truc tiep tren ung dung Electron dev server dang chay de xac nhan do muot ma va tinh my thuat cua cac hieu ung ca boi, vut tia, va chop lap lanh.

---

## 5. Danh sach File tac dong du kien

| File | Hanh dong | Muc dich |
| :--- | :--- | :--- |
| `src/factories/BurstParticleFactory.js` | Tao moi | Factory tap trung khoi tao toan bo thuoc tinh hat phao no |
| `src/factories/BurstEffectProcessor.js` | Cap nhat | Bo sung xu ly vong doi active effects va giai ma mau sac |
| `src/systems/FireworkSystem.js` | Tinh gon | Xoa bo hon 300 dong ma trung lap va don dep vong lap vat ly |
| `tests/factories/BurstParticleFactory.test.js` | Tao moi | Bo test suite danh rieng cho viec khoi tao hat chuan hoa |
| `tests/systems/SecondBurstFeature.test.js` | Cap nhat | Xac nhan Second Burst ke thua hoan hao tu Factory moi |
