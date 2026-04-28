# Drone Show Architecture for This Project (Three.js)

## 1. Mục tiêu

Thiết kế này không phải là một engine drone độc lập. Nó là một tầng choreography chạy trên kiến trúc hiện có của dự án `shell-drone-animation`.

Mục tiêu chính:
- Hỗ trợ 100 đến 1000 drone mà vẫn giữ animation mượt
- Tách rõ: điều phối show, tạo formation, assign target, cập nhật render
- Dùng lại mô hình runtime đang có trong project: director, sequencer, system, entity, factory
- Cho phép drone thừa hưởng một phần thuộc tính của hạt pháo hoa để đồng bộ ngôn ngữ hình ảnh

---

## 2. Nguyên tắc kiến trúc

Điểm chốt:
> Drone không tự lập kế hoạch đường bay.

Trong project này, logic nên nằm ở tầng điều phối, không nằm trong từng drone riêng lẻ.

Tầng điều phối sẽ chịu trách nhiệm:
- Sinh formation
- Gán drone vào target
- Tạo timeline / cue
- Chọn motion profile
- Đồng bộ màu, nhịp sáng, trail và hiệu ứng phụ

Drone chỉ làm 2 việc:
- Di chuyển đến target được giao
- Cập nhật state hiển thị

---

## 3. Cách gắn vào logic hiện tại của project

Codebase hiện tại đang đi theo hướng:
- `main.js` chỉ bootstrap runtime
- `ShowDirector` điều phối show
- `FireworkSequencer` bơm cue theo timeline
- `FireworkSystem` xử lý logic pháo và burst particle
- `TrailSystem`, `SmokeSystem`, `CometSystem` lo các hiệu ứng phụ
- `SceneManager` lo môi trường / scene container

Với drone show, nên giữ cùng triết lý đó:
- Drone show là một sequence layer, không phải một nhánh engine riêng
- Formation và motion profile chỉ là dữ liệu đầu vào cho director / sequencer
- Render state của drone nên được cập nhật theo kiểu batch, tương tự cách project đang xử lý particle và trail

---

## 4. Cấu trúc thư mục đề xuất

```txt
/src
  /entities
    DroneEntity.js
  /systems
    DroneSystem.js
    DroneMotionSystem.js
  /directors
    DroneShowDirector.js
    DroneShowSequencer.js
  /factories
    DroneFormationFactory.js
    DronePropertyFactory.js
  /render
    InstancedDroneMesh.js
```

Ghi chú:
- Nếu muốn bám chặt hơn nữa vào project hiện tại, có thể gộp `DroneShowSequencer` vào `ShowDirector` thay vì tách riêng
- `DronePropertyFactory` là nơi map thuộc tính particle của pháo hoa sang thuộc tính drone

---

## 5. Class Design

### 5.1 DroneEntity

`DroneEntity` đại diện cho một drone hiển thị trong scene.

Nhiệm vụ:
- Giữ `position`, `velocity`, `targetPosition`
- Giữ các thuộc tính hiển thị như `color`, `intensity`, `size`, `trail`, `phase`
- Update matrix và custom instance data

```js
export default class DroneEntity {
  constructor(id, index, instancedMesh) {
    this.id = id;
    this.index = index;
    this.mesh = instancedMesh;

    this.position = new THREE.Vector3();
    this.velocity = new THREE.Vector3();
    this.targetPosition = new THREE.Vector3();

    this.color = new THREE.Color(0x00ffff);
    this.intensity = 1;
    this.size = 1;
    this.phase = Math.random() * Math.PI * 2;
    this.life = 1;

    this.trailEnabled = false;
    this.trailLife = 0;
    this.trailIntensity = 0;

    this.speed = 5;
    this.state = 'idle';
  }

  update(deltaTime) {
    const direction = new THREE.Vector3().subVectors(this.targetPosition, this.position);
    const distance = direction.length();

    if (distance > 0.01) {
      direction.normalize();
      this.velocity.copy(direction).multiplyScalar(this.speed);
      this.position.addScaledVector(this.velocity, deltaTime);
      this.state = 'moving';
    } else {
      this.state = 'idle';
    }

    this.updateInstanceMatrix();
  }

  updateInstanceMatrix() {
    const matrix = new THREE.Matrix4();
    matrix.setPosition(this.position);
    this.mesh.setMatrixAt(this.index, matrix);
  }

  setTarget(target) {
    this.targetPosition.copy(target);
    this.state = 'moving';
  }
}
```

### 5.2 DroneSystem

`DroneSystem` quản lý toàn bộ drone.

Nhiệm vụ:
- Tạo danh sách drone
- Cập nhật tất cả drone mỗi frame
- Đánh dấu buffer cần upload lại
- Nhận cue từ sequencer / director

```js
export default class DroneSystem {
  constructor(instancedMesh) {
    this.mesh = instancedMesh;
    this.drones = [];
  }

  createDrones(count) {
    for (let i = 0; i < count; i++) {
      this.drones.push(new DroneEntity(i, i, this.mesh));
    }
  }

  update(deltaTime) {
    for (const drone of this.drones) {
      drone.update(deltaTime);
    }

    this.mesh.instanceMatrix.needsUpdate = true;
  }

  setTargets(targets) {
    this.drones.forEach((drone, index) => {
      if (targets[index]) {
        drone.setTarget(targets[index]);
      }
    });
  }
}
```

### 5.3 DroneFormationFactory

Tạo formation cho từng cảnh.

Nên ưu tiên formation dạng dữ liệu để đưa vào timeline:
- `circle`
- `grid`
- `wave`
- `spoke`
- `ring`
- `logo`
- `burst`

```js
export default class DroneFormationFactory {
  static circle(count, radius = 10, y = 0) {
    const positions = [];

    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      positions.push(new THREE.Vector3(
        Math.cos(angle) * radius,
        y,
        Math.sin(angle) * radius
      ));
    }

    return positions;
  }

  static grid(rows, cols, spacing = 2) {
    const positions = [];

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        positions.push(new THREE.Vector3(
          col * spacing,
          0,
          row * spacing
        ));
      }
    }

    return positions;
  }
}
```

### 5.4 DroneShowSequencer

Điều khiển timeline cho drone show.

Nó nên đóng vai trò tương tự `FireworkSequencer` trong project hiện tại:
- Lưu cue theo thời gian
- Chuyển formation đúng thời điểm
- Bơm thêm thuộc tính hiển thị nếu cue yêu cầu

```js
export default class DroneShowSequencer {
  constructor(droneSystem) {
    this.droneSystem = droneSystem;
    this.timeline = [];
    this.currentTime = 0;
    this.currentIndex = 0;
  }

  addKeyframe(time, cue) {
    this.timeline.push({ time, cue });
    this.timeline.sort((a, b) => a.time - b.time);
  }

  update(deltaTime) {
    this.currentTime += deltaTime;

    while (this.currentIndex < this.timeline.length) {
      const next = this.timeline[this.currentIndex];
      if (this.currentTime < next.time) break;

      if (next.cue.targets) {
        this.droneSystem.setTargets(next.cue.targets);
      }

      if (next.cue.properties) {
        this.droneSystem.applyProperties?.(next.cue.properties);
      }

      this.currentIndex++;
    }
  }

  reset() {
    this.currentTime = 0;
    this.currentIndex = 0;
  }
}
```

### 5.5 InstancedDroneMesh

Render optimization nên đi theo hướng instancing, giống cách hệ thống particle hoạt động hiện tại.

```js
export default class InstancedDroneMesh {
  constructor(count) {
    const geometry = new THREE.SphereGeometry(0.1, 8, 8);
    const material = new THREE.MeshBasicMaterial({ color: 0x00ffff });

    this.mesh = new THREE.InstancedMesh(geometry, material, count);
  }

  getMesh() {
    return this.mesh;
  }
}
```

---

## 6. Drone có thể dùng thuộc tính nào của hạt pháo hoa

Đây là phần nên thêm vào design vì nó giúp drone show đồng bộ với ngôn ngữ visual của project hiện tại.

Các thuộc tính hiện có trong hệ thống pháo hoa có thể map sang drone như sau:

| Thuộc tính pháo hoa | Ý nghĩa hiện tại | Ứng dụng cho drone |
|---|---|---|
| `color` | Màu của burst / particle | Màu đèn drone |
| `brightnessMultiplier` | Độ sáng theo độ cao | Cường độ đèn / emissive |
| `sizeMultiplier` | Tỉ lệ kích thước hạt | Scale body hoặc light halo |
| `life` / `age` | Vòng đời hạt | Độ mờ, nhịp sáng, fade in/out |
| `velocity` | Vận tốc particle | Vectơ di chuyển của drone |
| `spawnTrail` | Có sinh vệt sáng hay không | Drone để lại light trail |
| `trailLife` | Tuổi thọ trail | Độ dài vệt sáng |
| `trailIntensity` | Cường độ trail | Độ đậm / sáng của vệt |
| `emitSpark` | Tạo spark phụ | Flash hoặc blink ngắn ở waypoint |
| `spin` | Nhịp xoay / quỹ đạo phụ | Drone quay nhẹ hoặc rung nhẹ |
| `phase` | Pha dao động | Lệch nhịp để tránh đồng pha |
| `turbulence` | Độ ngẫu nhiên / nhiễu | Dao động nhỏ khi bay |
| `effectType` | Kiểu hiệu ứng | Motion profile của formation |
| `gravityScale` | Trọng lực tác động lên particle | Độ trễ đi xuống / damping |

### Gợi ý mapping thực tế

- `color` -> màu LED drone
- `brightnessMultiplier` -> intensity của drone
- `sizeMultiplier` -> scale drone hoặc glow radius
- `spawnTrail` -> bật light trail khi drone di chuyển
- `trailLife` + `trailIntensity` -> độ dài và độ sáng của trail
- `phase` + `turbulence` -> tạo nhịp bay tự nhiên, tránh mọi drone di chuyển cùng nhịp
- `effectType` -> quyết định motion profile, ví dụ `wave`, `flower`, `falling-comets`, `heart`

Điểm quan trọng:
> Các thuộc tính này chỉ là nguồn dữ liệu tham khảo cho drone show, chưa phải là code thực thi.

---

## 7. Cách dữ liệu nên chảy qua hệ thống

Luồng đề xuất:

1. `ShowDirector` hoặc một `DroneShowDirector` nhận cue từ timeline
2. Sequencer quyết định formation và thuộc tính drone cho từng đoạn
3. `DroneFormationFactory` sinh target positions
4. `DronePropertyFactory` map thuộc tính kiểu particle sang thuộc tính drone
5. `DroneSystem` gán target và state
6. `InstancedDroneMesh` render batch

Nếu cần đồng bộ với phần pháo hoa sẵn có trong project, drone show nên dùng chung:
- hệ màu
- nhịp thời gian
- quy ước effect name
- cách scale theo năng lượng / độ cao / cường độ

---

## 8. Điểm cần tránh

- Không để drone tự tính đường bay trong từng entity
- Không tạo một loop render riêng cho drone
- Không nhét formation logic trực tiếp vào `main.js`
- Không để drone show tách hẳn khỏi hệ timeline / director hiện có
- Không dùng update per-object nặng nếu đã chọn instancing

---

## 9. Kết luận

Thiết kế drone này phù hợp nếu được hiểu là một module choreography nằm trên kiến trúc hiện có của project, không phải một engine mới.

Phần mạnh nhất của hướng đi này là:
- tách rõ điều phối và thực thi
- dễ mở rộng bằng formation và cue mới
- có thể tái sử dụng ngôn ngữ particle của pháo hoa cho drone để tạo cảm giác cùng một thế giới hình ảnh

Phần cần giữ chặt là:
- timeline phải deterministic
- assignment phải ổn định
- render state phải batch-friendly

Nếu triển khai tiếp, bước hợp lý tiếp theo là viết bản design riêng cho `DronePropertyFactory` và mapping giữa `BurstEffectProcessor` với motion profile của drone.