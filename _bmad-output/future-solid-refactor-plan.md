# Kế hoạch Tái cấu trúc SOLID Tương lai

Tài liệu này đề xuất phương án và kế hoạch tái cấu trúc chi tiết cho 2 thành phần còn lại trong hệ thống nhằm hướng tới việc tuân thủ tuyệt đối các nguyên lý SOLID.

---

## 1. Tách Registry cho DroneFormationFactory (Nguyên lý OCP)

### Mô tả vấn đề hiện tại
Trong file [DroneFormationFactory.js](file:///e:/shell-drone-animation/src/factories/DroneFormationFactory.js#L699-L721), phương thức `createFormation` đang sử dụng một cấu trúc `switch-case` cứng để khởi tạo các hình dạng drone (`circle`, `triangle`, `grid`, `line`, `bezier`, `wave`, `sphere`, `cube`, `cylinder`, `star`, `text`). 
Mỗi khi có nhu cầu thêm một hình dạng drone mới, chúng ta bắt buộc phải vào sửa đổi trực tiếp file này để thêm nhánh `case` mới. điều này vi phạm nguyên lý **OCP (Open/Closed Principle)**.

### Giải pháp đề xuất
1. **Thiết lập Registry:**
   Định nghĩa một `Map` tĩnh hoặc thuộc tính instance lưu trữ các chiến lược tạo hình học:
   ```javascript
   static formationsRegistry = new Map();
   ```
2. **Đăng ký động:**
   Cung cấp phương thức đăng ký hình dạng mới từ bên ngoài:
   ```javascript
   static registerFormation(type, generatorFn) {
     this.formationsRegistry.set(type, generatorFn);
   }
   ```
3. **Mã nguồn sau refactor:**
   ```javascript
   static createFormation(type, count, params) {
     const generator = this.formationsRegistry.get(type);
     let positions;
     if (generator) {
       positions = generator(count, params);
     } else {
       positions = this.grid(count, params); // Fallback mặc định
     }
     
     if (params && params.variation) {
       positions = this.addVariation(positions, params.variation);
     }
     return positions;
   }
   ```

### Lợi ích mang lại
- **Mở rộng dễ dàng:** Các plugin, module ngoài hoặc luồng dữ liệu cấu hình JSON có thể tự đăng ký các hình dạng drone 3D độc lạ (như hình phễu, hình kim tự tháp) mà không cần build lại core engine.
- **Dễ viết Unit Test:** Mỗi hàm tạo hình học (như `circle`, `star`) có thể được test riêng biệt bằng cách gọi trực tiếp hoặc đăng ký cô lập trong môi trường test.

---

## 2. Tái cấu trúc DroneEntity (Nguyên lý SRP và DIP)

### Mô tả vấn đề hiện tại
Lớp [DroneEntity.js](file:///e:/shell-drone-animation/src/entities/DroneEntity.js) đang vi phạm đồng thời hai nguyên lý:
1. **SRP (Single Responsibility Principle):** Lớp này chịu hai trách nhiệm độc lập:
   - Quản lý động học bay vật lý (cập nhật vị trí, vận tốc, lực steer bám target).
   - Quản lý hiệu ứng trực quan (nhịp thở sáng LED, gọi hệ thống chuyển màu chuyển tiếp).
2. **DIP (Dependency Inversion Principle):** Lớp này import cứng và gọi trực tiếp các phương thức tĩnh của [TransitionColorSystem](file:///e:/shell-drone-animation/src/effects/transition/TransitionColorSystem.js) và [ArrivalColorSystem](file:///e:/shell-drone-animation/src/effects/arrival/ArrivalColorSystem.js) tại các dòng từ L117 đến L123. Nếu muốn thay thế cách chuyển màu LED, chúng ta buộc phải sửa đổi code của `DroneEntity`.

### Giải pháp đề xuất
1. **Tách biệt vai trò (SRP):**
   - Giữ `DroneEntity` thuần túy là đối tượng chứa dữ liệu trạng thái (State Object) bao gồm tọa độ, màu sắc hiện tại, id, và cấu hình.
   - Tách logic mô phỏng chuyển động động học bay thành một lớp vật lý `DroneKinematicsSolver` hoặc `PhysicsSystem`.
   - Tách logic điều khiển LED thành lớp `DroneLightingController`.

2. **Đảo ngược phụ thuộc (DIP):**
   Thay vì gọi trực tiếp static method của Color System, chúng ta truyền các bộ xử lý màu (Color Processors) qua cơ chế Dependency Injection vào constructor hoặc qua tham số của hàm update:
   ```javascript
   // Khai báo update nhận bộ xử lý màu từ ngoài truyền vào
   update(deltaTime, transitionSystem, arrivalSystem) {
     // Logic vật lý chuyển động...
     if (!this.hasArrived) {
       transitionSystem.apply(this, this.transitionColorConfig, performance.now() * 0.001);
     } else {
       arrivalSystem.apply(this, this.arrivalColorConfig, this.timeSinceArrival);
     }
     // ...
   }
   ```

### Lợi ích mang lại
- **Kiểm thử độc lập:** Chúng ta có thể kiểm tra thuật toán lái drone (steering physics) tới đích cực kỳ dễ dàng bằng các unit test cô lập mà không cần phải mock hay khởi tạo các thực thể liên quan đến đồ họa và hiệu ứng đèn LED của Three.js.
- **Tính linh hoạt cao:** Dễ dàng thay đổi các hiệu ứng chuyển đổi LED, tối ưu hóa hiệu năng render hàng loạt (như Instanced Mesh) mà không lo ảnh hưởng đến hệ thống bay vật lý mô phỏng.
