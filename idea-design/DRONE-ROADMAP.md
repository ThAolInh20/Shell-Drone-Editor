# Drone Show Development Roadmap

## Mục tiêu chung
Xây dựng hệ thống drone show từng bước, bắt đầu từ format/di chuyển cơ bản, rồi nâng dần thêm animation và hiệu ứng. Cách này tránh over-engineering lúc đầu và cho phép kiểm thử sớm.

---

## Phase 1: Drone Format & Basic Motion (MVP)

**Mục tiêu**: Có thể tạo drone, gán chúng vào formation được định sẵn, và chạy timeline với các formation switch.

### Deliverables

1. **DroneEntity.js**
   - Giữ `position`, `velocity`, `targetPosition`
   - Giữ `color`, `intensity`, `size` (từ particle firework properties)
   - Có hàm `update(deltaTime)` di chuyển smooth đến target
   - Có hàm `setTarget()` để gán formation position mới

2. **DroneSystem.js**
   - Quản lý danh sách drone
   - Hàm `createDrones(count)` 
   - Hàm `update(deltaTime)` cập nhật tất cả
   - Hàm `setTargets(positions)` gán formation
   - Đánh dấu `instanceMatrix.needsUpdate`

3. **InstancedDroneMesh.js**
   - InstancedMesh với sphere/simple geometry
   - Material cơ bản (MeshBasicMaterial hoặc PointsMaterial)
   - Hỗ trợ color attribute cho vertex color

4. **DroneFormationFactory.js**
   - `circle(count, radius, y)` - hình tròn
   - `grid(rows, cols, spacing)` - hình lưới
   - `line(count, length, direction)` - hàng dài
   - `wave(count, amplitude, direction)` - sóng ngang
   - Tất cả return `Vector3[]` positions

5. **DroneShowSequencer.js**
   - Lưu timeline: `[{ time, cue }, ...]` 
   - Cue format: `{ type: 'formation', formation: String|Array, duration: Number }`
   - Hàm `addKeyframe(time, cue)`
   - Hàm `update(deltaTime)` - trigger cue đúng thời điểm
   - Hàm `reset()`

6. **Integration vào main.js**
   - Tạo `droneSystem` sau `sceneManager`
   - Thêm drone mesh vào scene
   - Gọi `droneSystem.update()` trong loop render
   - Tạo `droneSequencer` và gọi `.update()` cùng lúc

7. **Test & Demo**
   - File demo timeline: `config/sequences/droneDemo.json`
   - 3-5 formation đơn giản, chuyển mỗi 2 giây
   - Kiểm thử drone không trùng formation, không bị stuck

### Success Criteria
- [ ] 200 drone render mượt (60fps)
- [ ] Formation switch không có jitter
- [ ] Timeline cue trigger đúng thời điểm
- [ ] Có thể thay đổi formation từ config file

### Estimate
2-3 tuần (tùy experience với Three.js InstancedMesh)

---

## Phase 2: Motion Profile & Parameter Control

**Mục tiêu**: Mỗi format có thể điều chỉnh độc lập (speed, easing, phase offset, damping), nên tạo "motion profile" để đủ sự thay đổi mà không thêm lớp animation phức tạp.

### Deliverables

1. **DroneMotionProfile.js** (enum/config)
   - Định nghĩa các kiểu motion cho mỗi format
   - Ví dụ: `{ type: 'smooth', easing: 'easeInOut', damping: 0.8, arrivalSpeed: 0.3 }`
   - `{ type: 'wave', amplitude: 2, frequency: 0.5, phase: 0 }`
   - `{ type: 'swing', angle: 45, speed: 1.5 }`

2. **Upgrade DroneEntity.update()**
   - Thêm `motionProfile` parameter
   - Thêm `easing` cho movement (lerp hoặc spline)
   - Thêm `damping` để motion không cứng nhắc
   - Thêm `phase` offset để drone không đồng bộ perfect (phòng blink effect)
   - Hỗ trợ `arrivalEasing` khác để drone yên tĩnh khi đến target

3. **DronePropertyFactory.js**
   - Map `BurstEffectProcessor` properties → DroneEntity properties
   - Ví dụ: `gravityScale → damping`, `phase → phaseOffset`
   - Ví dụ: `effectType → motionProfile` (wave → wave motion, etc.)
   - Tạo preset cho từng motion type

4. **Upgrade cue format**
   - Từ: `{ type: 'formation', formation: 'circle' }`
   - Thành: `{ type: 'formation', formation: 'circle', motion: 'smooth', duration: 2, motionParams: { easing: 'easeInOut', damping: 0.7 } }`

5. **Upgrade DroneFormationFactory**
   - Thêm optional parameter: `withVariation: bool`, `phaseVariation: float`
   - Ví dụ: `circle(count, radius, { variation: 0.05, phaseOffset: true })`
   - Sinh formation với drone có phase ngẫu nhiên để không đồng pha

6. **Animation Curve Support**
   - Thêm easing library hoặc dùng THREE.Easing
   - Hỗ trợ: linear, easeIn, easeOut, easeInOut, elasticOut, etc.
   - Áp dụng vào speed transition khi đi từ formation này sang formation khác

7. **Test & Demo**
   - Test mỗi motion profile riêng
   - Mix formation + motion: circle + smooth, grid + wave, line + swing
   - Kiểm thử phase offset để tránh blink/overlap

### Success Criteria
- [ ] Drone motion cảm thấy tự nhiên, không máy móc
- [ ] Có thể tùy chỉnh speed/easing từ cue mà không code lại
- [ ] Phase offset hoạt động (drone không blink thành hình lưới hoàn hảo)
- [ ] Có 5+ motion preset sử dụng được

### Estimate
2-3 tuần

---

## Phase 3: Animation & Advanced Features

**Mục tiêu**: Thêm lớp visual/pose animation để drone không chỉ là điểm di chuyển, mà có thể xoay, scale, pulse nhẹ, hoặc chuẩn bị cho rig phức tạp sau này.

### Deliverables

1. **DroneAnimationLayer.js**
   - Tách riêng animation logic khỏi motion
   - Hỗ trợ overlay multiple animations
   - Ví dụ: base motion + xoay nhẹ + pulse sáng

2. **Upgrade DroneEntity**
   - Thêm `rotation`, `scale` ngoài position
   - Thêm `emissiveIntensity` để pulse sáng
   - Cập nhật `updateInstanceMatrix()` để ghi rotation/scale vào matrix
   - Thêm `animate(key, value, duration, easing)` để blend

3. **Built-in Animation Types**
   - `spin`: xoay quanh Y-axis theo nhịp
   - `pulse`: scale lên/xuống theo frequency
   - `bob`: di chuyển nhẹ lên/xuống
   - `shimmer`: opacity flicker
   - `rotate-to-direction`: xoay theo hướng motion

4. **Animation State Machine** (optional nhưng nên có)
   - State: `idle`, `moving`, `arriving`, `formed`
   - Trigger animation đặc thù cho từng state
   - Ví dụ: khi arriving, thêm slow-down animation

5. **Track Support in Sequencer**
   - Thêm cue type: `{ type: 'animation', drones: [indices], animation: 'spin', params: { speed: 2 }, duration: 3 }`
   - Tương tự track trong animation editor, nhưng cho drone

6. **Rig Foundation** (nếu muốn thêm con vật sau)
   - Thiết kế data structure cho skeleton (parent/child transform)
   - Thêm IK placeholder
   - Docs cho cách mở rộng sang character animation

7. **Test & Demo**
   - Circle formation + spin animation
   - Grid + pulse khi formation lock
   - Mix motion + animation trong một cue

### Success Criteria
- [ ] Animation layer hoạt động độc lập không ảnh hưởng motion
- [ ] Có thể apply 2-3 animation cùng lúc trên một drone
- [ ] State machine trigger animation đúng thời điểm
- [ ] Chuẩn bị được cho character animation sau

### Estimate
3-4 tuần

---

## Phase 4+ (Future)

- **Character Animation**: Thêm skeleton, IK, foot planting cho con vật
- **Collision Avoidance**: Nếu drone cần tránh drone khác hoặc object
- **Physics**: Gravity, wind, bounce effect
- **Integration with Fireworks**: Drone + burst particle cùng một cue
- **VFX Layer**: Light trail, glow, ghost effect
- **AI & Procedural Motion**: Boid flocking, sine wave dancing, v.v.

---

## Git Strategy

```bash
# Main branch: main (stable, ready to demo)
# Dev branch: dev (integration)
# Feature branches:
git checkout -b feat/drone-phase1-core      # Phase 1
git checkout -b feat/drone-phase2-motion    # Phase 2
git checkout -b feat/drone-phase3-anim      # Phase 3
```

Merge vào dev sau khi test xong, demo đầy đủ, rồi merge vào main khi stable.

---

## Notes

- **Không over-engineer Phase 1**: Chỉ cần di chuyển + formation switch, xong.
- **Dùng FireworkSystem as reference**: Cách nó xử lý particle, burst, timeline là tốt. Lấy pattern đó.
- **Tái sử dụng hệ màu/effect**: Map `BurstEffectProcessor` properties sang drone sớm, để sau này drone + pháo hoa có "cùng ngôn ngữ".
- **Test sớm, demo thường xuyên**: Sau mỗi phase, nên có demo chạy được, không phải chỉ "it compiles".
- **Giữ data-driven**: Tất cả formation, motion, animation nên từ JSON/config, không hardcode.

---

## Checklist Quick Start

- [ ] Đọc kỹ phase 1 deliverables
- [ ] Tạo file `src/entities/DroneEntity.js`
- [ ] Tạo file `src/systems/DroneSystem.js`
- [ ] Tạo file `src/factories/DroneFormationFactory.js`
- [ ] Tạo file `src/directors/DroneShowSequencer.js`
- [ ] Tạo file `src/render/InstancedDroneMesh.js`
- [ ] Integrate vào main.js
- [ ] Test với 10-50 drone trước (rồi scale lên 200+)
- [ ] Commit Phase 1 như feat/drone-phase1-core

Good luck! 🚀
