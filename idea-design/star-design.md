***
Mô tả cho đối tượng star
***
# mô tả
các star sẽ là hạt nhân chính cho dự án này
Các star có thể sẽ bao gồm các thuộc tính sau (đây là thuộc tính từ 1 dự án khác đang theo kiểu 2d, nếu lên 3d có thể cần cập nhật thêm sao cho phù hợp)

```json
const Star = {
	// Visual properties
	drawWidth: 3,
	airDrag:0.98,
	airDragHeavy: 0.992,
	
	// Star particles will be keyed by color
	active: createParticleCollection(),// hình như tạo ra các star
	_pool: [],

	_new() {
		return {};
	},

	add(x, y, color, angle, speed, life, speedOffX, speedOffY) {
		const instance = this._pool.pop() || this._new();
		instance.visible = true;
		instance.heavy = false;
		instance.x = x;
		instance.y = y;
		instance.prevX = x;
		instance.prevY = y;
		instance.color = color;
		instance.speedX = Math.sin(angle) * speed + (speedOffX || 0);;
		instance.speedY = Math.cos(angle) * speed + (speedOffY || 0);//góc bay theo chiều y
		instance.life = life ;
		instance.fullLife = life ;
		instance.spinAngle = Math.random() * PI_2;
		instance.spinSpeed = 0.8;
		instance.spinRadius = 0;
		instance.sparkFreq = 0; // ms between spark emissions
		instance.sparkSpeed = 1;
		instance.sparkTimer = 0;
		instance.sparkColor = color;
		instance.sparkLife = 750 ;
		instance.sparkLifeVariation = 0.25;
		instance.strobe = false;
		this.active[color].push(instance);
		return instance;
	},
    // Public method for cleaning up and returning an instance back to the pool.
	returnInstance(instance) {
		// Call onDeath handler if available (and pass it current star instance)
		instance.onDeath && instance.onDeath(instance);
		// Clean up
		instance.onDeath = null;
		instance.secondColor = null;
		instance.transitionTime = 0;
		instance.colorChanged = false;
		// Add back to the pool.
		this._pool.push(instance);
	}
};
```