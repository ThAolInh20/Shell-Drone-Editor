# Ke hoach kien truc tuong tac moi truong: Gio, Khoi, Anh sang va Hat phao

Tai lieu nay xac dinh ban thiet ke kien truc va lo trinh nang cap he thong mo phong (Simulation Architecture), chuyen doi tu mo hinh cac phan he rieng le sang Mo hinh Moi truong Tuong tac Thong nhat (Unified Environmental Medium) nham toi uu hoa tinh chan thuc vat ly va chieu sau thi giac.

---

## 1. Boi canh va Muc tieu refactor

### 1.1. Hien trang cac phan he (Siloed Subsystems)
- **Gio (Wind)**: Dang duoc tinh toan rieng le trong [SmokeSystem.js](../../src/systems/SmokeSystem.js) thong qua goc quay `windDirection` va toc do `windSpeed`. Cac hat phao roi cham trong [FireworkSystem.js](../../src/systems/FireworkSystem.js) va doi hinh drone trong [DroneSystem.js](../../src/systems/DroneSystem.js) chua dong bo chung truong gio nay.
- **Anh sang (Radiance)**: Buoc dau da ho tro da nguon sang len khoi, tuy nhien co che dang ky den con phu thuoc su kien burst mot chieu, chua co hub tap trung de cac hat phao con (crossette splits) hoac den LED cua drone tham gia chieu sang the tich khoi.
- **Song xung kich va Khoi (Blast Wave & Smoke Interaction)**: Khi phao hoa no ngay giua mot dam khoi san co, khoi van dung yen tro tro ma chua co phan ung bi song xung kich vu no thoi bat sang hai ben.

### 1.2. Muc tieu kien truc moi
- **Truong dong luc hoc thong nhat**: Moi thuc the (khoi, hat sao phao hoa, drone) deu tham chieu den mot nguon dong luc hoc khi quyen duy nhat.
- **Phan ung vat ly da chieu**: Hat phao no sinh ra khoi, dong thoi song chan dong cua vu no xep lai the tich cac dam khoi cu xung quanh.
- **Quang hoc the tich xuyen suot**: Hat dang chay, den drone, va chop no cung chieu sang dam khoi theo chieu sau 3D.
- **Khong gay suy giam hieu nang (Zero GC & 60 FPS)**: Giu nguyen nguyen tac tai su dung bo nho dem `Float32Array` va gioi han nguon sang theo cau hinh do hoa.

---

## 2. Ma tran tuong tac giua cac thuc the (Entity Interaction Matrix)

| Nguon tac dong | Thuc the tiep nhan | Co che tuong tac vat ly / do hoa |
| :--- | :--- | :--- |
| **Truong gio (Wind Field)** | **Khoi (Smoke)** | Gio nen thoi dat cum khoi theo huong gio, ket hop nhiễu loan cuon xoay (Turbulence). |
| **Truong gio (Wind Field)** | **Hat phao roi (Embers)** | Cac hat tan phao roi cham (`willow`, `kamuro`, `isDyingEmber`) dat dong dieu cung huong voi khoi. |
| **Song no (Blast Wave)** | **Khoi hien huu (Puffs)** | Song chan dong tao xung luc xuyen tam (Radial Impulse) thoi dat khoi cu ra khoi tam no. |
| **Hat dang chay (Stars)** | **Khoi (Smoke)** | Cum hat sao toa anh sang the tich noi khoi (Internal Radiance), khoi doi mau theo mau hat. |
| **Den Drone (Drone LEDs)** | **Khoi (Smoke)** | Drone bay xuyen qua tang khoi se chieu hat mau LED len cac hat khoi lan can. |
| **Hat phao (Stars)** | **Mat nuoc (Water)** | Hat roi cham tiep xuc mat nuoc (y <= 0) bi dap tat kem theo tia nuoc / bot nho. |

---

## 3. Thiet ke Module va Phan chia trach nhiem

```
src/
├── environment/
│   ├── AtmosphereManager.js       // Single Source of Truth cho truong gio va doi luu nhiet
│   ├── WaterSurface.js            // Mat nuoc phan xa va phan xa anh sang phao
│   ├── SkyDome.js                 // Vòm trời đêm và ánh sáng khí quyển
│   └── DistantMountains.js        // Dãy núi phản xạ ánh sáng pháo hoa
│
├── systems/
│   ├── SkyLightReactionSystem.js  // Nang cap thanh RadianceHub dieu phoi nguon sang tap trung
│   ├── SmokeSystem.js             // Tiep nhan xung luc song no va nguon sang da diem
│   ├── FireworkSystem.js          // Ket noi truong gio cho hat phao roi cham
│   └── DroneSystem.js             // Ket noi gio cho drone va dang ky nguon sang LED
│
└── config/
    ├── fireworks.js               // Thong so vat ly song no, luc gio, va gioi han den
    └── rendering.js               // Cau hinh chat luong va thiet lap moi truong
```

---

## 4. Chi tiet thiet ke cac Module cot loi

### 4.1. AtmosphereManager (Truong gio & khi quyen tap trung)
Tao moi module tai `./src/environment/AtmosphereManager.js`:
- Quan ly cac tham so: `windSpeed`, `windDirection`, `turbulenceStrength`, `thermalDraft`.
- Cung cap ham API nhe:
  ```javascript
  getWindVectorAt(position, time, outVector = new THREE.Vector3())
  ```
- Tinh toan vector gio ket hop:
  `Vector Tong = Gio nen (Horizontal Direction) + Nhiễu loan Perlin 3D + Luc doi luu nhiet boc len theo truc Y`.

### 4.2. Blast Wave Smoke Displacement (Song no hat phao day dat khoi)
Tich hop trong ham `onBurst(detail)` cua `./src/systems/SmokeSystem.js`:
- Khi phao no tai `burstPos` voi ban kinh anh huong `blastRadius`:
  ```javascript
  const blastEffectiveRadius = blastRadius * 1.6;
  for (let i = 0; i < this.puffs.length; i++) {
    const puff = this.puffs[i];
    const dist = puff.position.distanceTo(burstPos);
    if (dist < blastEffectiveRadius && dist > 0.001) {
      const pushFactor = (1.0 - dist / blastEffectiveRadius);
      const pushStrength = pushFactor * pushFactor * blastImpulseScale;
      const pushDir = puff.position.clone().sub(burstPos).normalize();
      puff.velocity.addScaledVector(pushDir, pushStrength);
    }
  }
  ```
- Tao hieu ung thoi bay trung tam, khoi cuon thanh vanh dai xung quanh vu no.

### 4.3. RadianceHub (Dieu phoi nguon sang tap trung)
Chuyen hoa `./src/systems/SkyLightReactionSystem.js` thanh trung tam dang ky nguon sang:
- Cac he thong phat sang dang ky `EmitterNode`:
  - `burst_shockwave`: Chop sang tuc thi.
  - `star_cluster`: Cum hat phao dang chay voi ban kinh no rong dong.
  - `drone_cluster`: Doi hinh drone phat sang manh khi o gan khoi.
- Moi khung hinh render:
  - Hub thu thap, sap xep theo cuong do chieu sang hieu dung (`Effective Illuminance`).
  - Trich xuat Top N den cap cho `SmokeSystem.setMultiLights()`.
  - Cap nhat den phan xa cho `WaterSurface` va `DistantMountains`.

---

## 5. Lo trinh thuc thi 3 giai doan (Implementation Roadmap)

### Giai doan 1: Tuong tac Song no va Dong bo gio hat phao (Quick Impact) - DA HOAN THANH
1. **Song no day khoi (Blast Wave Push)**:
   - Da tich hop logic xung luc day xuyen tam trong `SmokeSystem.onBurst()`.
   - Da bo sung thong so `blastImpulseScale` va `blastImpulseRadiusMultiplier` trong `FIREWORK_CONFIG.SMOKE`.
2. **Dong bo gio cho hat phao roi cham**:
   - Da ket noi toc do va huong gio vao kinematic update cua cac hat `isDyingEmber`, `willow`, `falling-leaves` trong `FireworkSystem.updateBurstParticles()`.
3. **Kiem thu**:
   - Da co unit test kiem chung van toc hat khoi tang len khi co vu no gan tam va hat phao lech theo gio (`tests/systems/SmokeSystem.test.js`, `tests/factories/ParticleDynamicsAndThermalLifecycle.test.js`).

### Giai doan 2: Module hoa AtmosphereManager (Architecture Consolidation) - DA HOAN THANH
1. **Xay dung AtmosphereManager**:
   - Da tao class `AtmosphereManager` tai `src/environment/AtmosphereManager.js`.
   - Dong bo toan bo tinh toan gio va phat su kien `environment:wind:change`.
   - `SmokeSystem` va `FireworkSystem` ket noi truc tiep vao `AtmosphereManager`.
2. **Cap nhat UI Settings**:
   - Dieu chinh thanh truot Gio tren giao dien dong thoi cap nhat toan bo the gioi mo phong.
3. **Kiem thu**:
   - Kiem thu don vi cho vector gio tai cac toa do khong gian va do cao khac nhau (`tests/environment/AtmosphereManager.test.js`).

### Giai doan 3: Tich hop Quang hoc The tich da thuc the (Advanced Radiance) - DA HOAN THANH
1. **Nang cap RadianceHub / SkyLightReactionSystem**:
   - Ho tro phan bo da nguon sang dong thoi (`activeSmokeLights`) bao gom chop no, cum hat sao toa sang (`starRadiance`), va den doi hinh drone.
2. **Tich hop Drone LED chieu sang khoi**:
   - Thuc thi `DroneSystem.getLuminousCentroid()` de xac dinh trong tam phat sang, mau trung binh va cuong do doi hinh drone dang bay.
   - `SkyLightReactionSystem` ket noi `droneSystem`, tu dong cap nhat nguon sang cua drone vao luoi chieu sang the tich cua khoi ke ca khi khong co phao no.
3. **Kiem thu**:
   - Da bo sung unit test trong `tests/systems/SkyLightReactionSystem.test.js` xac nhan den drone chieu sang khoi doc lap va dong thoi cung phao hoa.
   - Toan bo 26 bo test voi 189 unit test deu pass 100%.

---

## 6. Tieu chi nghiem thu va Quan ly rui ro

### 6.1. Tieu chi nghiem thu (Acceptance Criteria)
- **Hieu ung Thi giac**:
  - Khi phao no giua man khoi, nhin ro hieu ung khoi cu bi thoi bat sang hai ben thay vi dung yen.
  - Khi tang toc do gio, ca khoi va bui tan phao roi deu dat nghieng cung mot goc dong nhat.
  - Khói nhan anh sang da chieu tu ca tam no lan cum hat dang bung toa.
- **Hieu nang (Performance)**:
  - Khong suy giam qua 2 FPS so voi hien tai tren moi cau hinh.
  - Khong phat sinh cap phat bo nho rac (`zero new Object allocations in render loop`).
- **Do on dinh (Reliability)**:
  - Toan bo bo kiem thu don vi hien tai van pass 100%.

### 6.2. Quan ly rui ro
- *Rui ro hat khoi bay qua nhanh ra ngoai khung hinh*: Gioi han van toc toi da (`maxVelocityClamp`) cho xung luc song no de tranh khoi bi vang qua manh lam mat the tich.
- *Rui ro overdraw tren GPU khi nhieu den*: Tiep tuc duy tri co che gioi han so luong den toi da theo preset do hoa (`qualityMaxLights` trong config).
