Cách tạo effect pháo
```js
// Unique shell types
const crysanthemumShell = (size = 1) => {
	const glitter = Math.random() < 0.25;
	const singleColor = Math.random() < 0.72;//0/72
	const color = singleColor ? randomColor({ limitWhite: true }) : [randomColor(), randomColor({ notSame: true })];
	const pistil = singleColor && Math.random() < 0.42;
	const pistilColor = pistil && makePistilColor(color);
	const secondColor = singleColor && (Math.random() < 0.2 || color === COLOR.White) ? pistilColor || randomColor({ notColor: color, limitWhite: true }) : null;
	const streamers = !pistil && color !== COLOR.White && Math.random() < 0.42;
	
	let starDensity = glitter ? 1.1 : 1.25;
	if (isLowQuality) starDensity *= 0.8; getRandomShellSize()
	if (isHighQuality) starDensity = 1.2;

	return {
		shellSize: size,
		spreadSize: 300 + size * 100,
		starLife: 900 + size * 200,
		starDensity,
		color,
		secondColor,
		glitter: glitter ? 'light' : '',
		glitterColor: whiteOrGold(),
		pistil,
		pistilColor,
		streamers,
		flower:false
		,smiley:false //tạo mặt cười
		,hearth:false //hiệu ứng trái tim
		,star:false
		,doubleRing:false
			
	};
};
const rumbleShell = (size = 1) => {
	const glitter = Math.random() < 0.25;
	const singleColor = Math.random() < 0.72;//0/72
	const color = singleColor ? randomColor({ limitWhite: true }) : [randomColor(), randomColor({ notSame: true })];
	const pistil = true;
	const pistilColor = pistil && makePistilColor(color);
	const secondColor = singleColor && (Math.random() < 0.2 || color === COLOR.White) ? pistilColor || randomColor({ notColor: color, limitWhite: true }) : null;
	const streamers = !pistil && color !== COLOR.White && Math.random() < 0.42;
	
	let starDensity = glitter ? 1.1 : 1.25;
	if (isLowQuality) starDensity *= 0.8; getRandomShellSize()
	if (isHighQuality) starDensity = 1.2;

	return {
		shellSize: size,
		spreadSize: 300 + size * 100,
		starLife: 900 + size * 200,
		starDensity,
		color,
		secondColor,
		glitter: glitter ? 'light' : '',
		glitterColor: whiteOrGold(),
		pistil,
		pistilColor,
		streamers,
		half:true
			
	};
};
const flowerShell = (size = 1) => {
	const glitter = Math.random() < 0.25;
	const singleColor = Math.random() < 1;
	const color = singleColor ? randomColor({ limitWhite: true }) : [randomColor(), randomColor({ notSame: true })];
	const pistil = singleColor && Math.random() < 0.42;
	const pistilColor = pistil && makePistilColor(color);
	const secondColor = singleColor && (Math.random() < 0.2 || color === COLOR.White) ? pistilColor || randomColor({ notColor: color, limitWhite: true }) : null;
	const streamers = !pistil && color !== COLOR.White && Math.random() < 0.42;
	let starDensity = glitter ? 1.1 : 1.25;
	if (isLowQuality) starDensity *= 0.8; getRandomShellSize()
	if (isHighQuality) starDensity = 1.2;
	return {
		shellSize: size,
		spreadSize: 300 + size * 100,
		starLife: 900 + size * 200,
		starDensity,
		color,
		secondColor,
		glitter: glitter ? 'light' : '',
		glitterColor: whiteOrGold(),
		pistil:true,
		pistilColor,
		
		flower:true
	};
};
const catShell = (size = 1) => {
	const glitter = Math.random() < 0.25;
	const singleColor = Math.random() < 1;
	const color = singleColor ? randomColor({ limitWhite: true }) : [randomColor(), randomColor({ notSame: true })];
	const pistil = singleColor && Math.random() < 0.42;
	const pistilColor = pistil && makePistilColor(color);
	const secondColor = singleColor && (Math.random() < 0.2 || color === COLOR.White) ? pistilColor || randomColor({ notColor: color, limitWhite: true }) : null;
	const streamers = !pistil && color !== COLOR.White && Math.random() < 0.42;
	let starDensity = glitter ? 1.1 : 1.25;
	if (isLowQuality) starDensity *= 0.8; getRandomShellSize()
	if (isHighQuality) starDensity = 1.2;
	return {
		shellSize: size,
		spreadSize: 300 + size * 100,
		starLife: 900 + size * 200,
		starDensity,
		color,
		secondColor,
		glitter: glitter ? 'light' : '',
		glitterColor: whiteOrGold(),
		pistil:false,
		pistilColor,
	
		cat:true
	};
};
const ringShellV2 = (size = 1) => {
	const glitter = Math.random() < 0.25;

	const palette = [
		COLOR.Red,
		COLOR.Gold,
		COLOR.White,
		COLOR.Blue
	];

	let starDensity = glitter ? 1.1 : 1.25;
	if (isLowQuality) starDensity *= 0.8;
	if (isHighQuality) starDensity = 1.2;

	return {
		shellSize: size,
		spreadSize: 300 + size * 100,
		starLife: 1900 + size * 200,
		starDensity,

		// 🔥 màu gốc (fallback)
		color: randomColor({ limitWhite: true }),

		// ✨ BẬT đổi màu theo vòng
		ringColorMode: 'sequential', // 'sequential' | 'gradient'
		ringPalette: palette,        // mảng màu
		ringColorSpeed: 1,           // tốc độ đổi (1 = mỗi điểm 1 màu)
		ringLoop: false,             // có quay vòng không

		glitter: glitter ? 'light' : '',
		glitterColor: whiteOrGold(),

		doubleRing: true
	};
};
const ovalShell = (size = 1) => {
	const glitter = Math.random() < 0.25;
	const singleColor = Math.random() < 1;
	const color = singleColor ? randomColor({ limitWhite: true }) : [randomColor(), randomColor({ notSame: true })];
	const pistil = singleColor && Math.random() < 0.42;
	const pistilColor = pistil && makePistilColor(color);
	const secondColor = singleColor && (Math.random() < 0.2 || color === COLOR.White) ? pistilColor || randomColor({ notColor: color, limitWhite: true }) : null;
	const streamers = !pistil && color !== COLOR.White && Math.random() < 0.42;
	let starDensity = glitter ? 1.1 : 1.25;
	if (isLowQuality) starDensity *= 0.8; getRandomShellSize()
	if (isHighQuality) starDensity = 1.2;
	return {
		shellSize: size,
		spreadSize: 300 + size * 100,
		starLife: 900 + size * 200,
		starDensity,
		color,
		secondColor,
		glitter: glitter ? 'light' : '',
		glitterColor: whiteOrGold(),
		pistil:false,
		pistilColor,
	
		oval:true
	};
};
const snowShell = (size = 1) => {
	const glitter = Math.random() < 0.25;
	const singleColor = Math.random() < 1;
	const color = singleColor ? randomColor({ limitWhite: true }) : [randomColor(), randomColor({ notSame: true })];
	const pistil = singleColor && Math.random() < 0.42;
	const pistilColor = pistil && makePistilColor(color);
	const secondColor = singleColor && (Math.random() < 0.2 || color === COLOR.White) ? pistilColor || randomColor({ notColor: color, limitWhite: true }) : null;
	const streamers = !pistil && color !== COLOR.White && Math.random() < 0.42;
	let starDensity = glitter ? 1.1 : 1.25;
	if (isLowQuality) starDensity *= 0.8; getRandomShellSize()
	if (isHighQuality) starDensity = 1.2;
	return {
		shellSize: size,
		spreadSize: 300 + size * 100,
		starLife: 900 + size * 200,
		starDensity,
		color,
		secondColor,
		glitter: glitter ? 'light' : '',
		glitterColor: whiteOrGold(),
		pistil,
		pistilColor,
		streamers,
		snow:true
	};
};
const fishShell = (size = 1) => {
	const glitter = Math.random() < 0.25;
	const singleColor = Math.random() < 1;
	const color = singleColor ? randomColor({ limitWhite: true }) : [randomColor(), randomColor({ notSame: true })];
	const pistil = singleColor && Math.random() < 0.42;
	const pistilColor = pistil && makePistilColor(color);
	const secondColor = singleColor && (Math.random() < 0.2 || color === COLOR.White) ? pistilColor || randomColor({ notColor: color, limitWhite: true }) : null;
	const streamers = !pistil && color !== COLOR.White && Math.random() < 0.42;
	let starDensity = glitter ? 1.1 : 1.25;
	if (isLowQuality) starDensity *= 0.8; getRandomShellSize()
	if (isHighQuality) starDensity = 1.2;
	return {
		shellSize: size,
		spreadSize: 300 + size * 100,
		starLife: 900 + size * 200,
		starDensity,
		color,
		secondColor,
		glitter: glitter ? 'light' : '',
		glitterColor: whiteOrGold(),
		pistil,
		pistilColor,
		streamers,
		fish:true
	};
};
const smileyShell = (size = 1) => {
	const glitter = Math.random() < 0.25;
	const singleColor = Math.random() < 1;
	const color = singleColor ? randomColor({ limitWhite: true }) : [randomColor(), randomColor({ notSame: true })];
	const pistil = singleColor && Math.random() < 0.42;
	const pistilColor = pistil && makePistilColor(color);
	const secondColor = singleColor && (Math.random() < 0.2 || color === COLOR.White) ? pistilColor || randomColor({ notColor: color, limitWhite: true }) : null;
	const streamers = !pistil && color !== COLOR.White && Math.random() < 0.42;
	let starDensity = glitter ? 1.1 : 1.25;
	if (isLowQuality) starDensity *= 0.8; getRandomShellSize()
	if (isHighQuality) starDensity = 1.2;
	return {
		shellSize: size,
		spreadSize: 300 + size * 100,
		starLife: 900 + size * 200,
		starDensity,
		color,
		secondColor,
		glitter: glitter ? 'light' : '',
		glitterColor: whiteOrGold(),
		
		streamers,
		smiley:true
	};
};

const waveShell = (size = 1) => {
	const glitter = Math.random() < 0.25;
	const singleColor = Math.random() < 1;
	const color = singleColor ? randomColor({ limitWhite: true }) : [randomColor(), randomColor({ notSame: true })];
	const pistil = singleColor && Math.random() < 0.42;
	const pistilColor = pistil && makePistilColor(color);
	const secondColor = singleColor && (Math.random() < 0.2 || color === COLOR.White) ? pistilColor || randomColor({ notColor: color, limitWhite: true }) : null;
	const streamers = !pistil && color !== COLOR.White && Math.random() < 0.42;
	let starDensity = glitter ? 1.1 : 1.25;
	if (isLowQuality) starDensity *= 0.8; getRandomShellSize()
	if (isHighQuality) starDensity = 1.2;
	return {
		shellSize: size,
		spreadSize: 300 + size * 100,
		starLife: 900 + size * 200,
		starDensity,
		color,
		secondColor,
		glitter: glitter ? 'light' : '',
		glitterColor: whiteOrGold(),
		
		
		strobe:true,
		wave:true
	};
};
const hearthShell = (size = 1) => {
	const glitter = Math.random() < 0.25;
	const singleColor = Math.random() < 1;
	const color = singleColor ? randomColor({ limitWhite: true }) : [randomColor(), randomColor({ notSame: true })];
	const pistil = singleColor && Math.random() < 0.42;
	const pistilColor = pistil && makePistilColor(color);
	const secondColor = singleColor && (Math.random() < 0.2 || color === COLOR.White) ? pistilColor || randomColor({ notColor: color, limitWhite: true }) : null;
	const streamers = !pistil && color !== COLOR.White && Math.random() < 0.42;
	let starDensity = glitter ? 1.1 : 1.25;
	if (isLowQuality) starDensity *= 0.8; getRandomShellSize()
	if (isHighQuality) starDensity = 1.2;
	return {
		shellSize: size,
		spreadSize: 300 + size * 100,
		starLife: 900 + size * 200,
		starDensity,
		color,
		secondColor,
		glitter: glitter ? 'light' : '',
		glitterColor: whiteOrGold(),
		pistil:true,
		pistilColor,
		streamers:false,
		hearth:true
	};
};
```
```js
function createBurstRectangleV2(count, particleFactory, width = 10, height = 5, startAngle = 0, arcLength = PI_2) {
	// Calculate the number of particles per row
	// Create an array to store random positions
	const positions = [];

	// Generate random positions within the rectangle
	for (let i = 0; i < count; i++) {
		const x = Math.random() * width - width / 2;
		const y = Math.random() * height - height / 2;
		positions.push({ x, y });
	}

	// Make a series of particles based on the random positions
	for (const { x, y } of positions) {
		// Calculate angle and size
		const angle = Math.atan2(y, x) + startAngle;
		const size = Math.sqrt(x * x + y * y) / Math.sqrt(width * width + height * height) * 50;

		// Call the particle factory with calculated angle and size
		particleFactory(angle, size);
	}
}



// Various star effects.
// These are designed to be attached to a star's `onDeath` event.

// Crossette breaks star into four same-color pieces which branch in a cross-like shape.
function crossetteEffect(star) {
	const startAngle = Math.random() * PI_HALF;
	createParticleArc(startAngle, PI_2, 4, 0.5, (angle) => {
		Star.add(
			star.x,
			star.y,
			star.color,
			angle,
			Math.random() * 0.6 + 0.75,
			600
		);
	});
}

function crossetteEffectV2(star) {
	const startAngle = Math.random() * PI_2;

	createParticleArc(startAngle, PI_2,  3, 0.8, (angle) => {
		const child = Star.add(
			star.x,
			star.y,
			star.color,
			angle,
			Math.random() * 1.4 + 1.2, // bay mạnh hơn
			1000 // sống lâu hơn
		);

		// ÍT BỊ RƠI
		child.heavy = true;

		// tắt gravity nếu engine cho phép
		child.gravity = 0; // nếu có

		// bay loạn thêm
		child.spinRadius = Math.random() * 0.6 + 0.2;

		// spark nhẹ để thấy hướng bay
		child.sparkFreq = 40;
		child.sparkLife = 400;
	});
}
//tạo hinh tròn bo
function floralEffectV2(star) {
	const count = 12 + 6 * quality;
	createBurstv2(count, (angle, speedMult) => {
		Star.add(
			star.x,
			star.y,
			star.color,
			angle,
			speedMult * 2.4,
			1000 + Math.random() * 300,
			star.speedX,
			star.speedY
		);
	});
	// Queue burst flash render
	BurstFlash.add(star.x, star.y, 46);
	soundManager.playSound('burstSmall');
}
function floralEffectV3(star) {
	const count = 12 + 6 * quality;
	createBurstRectangleV2(count, (angle, speedMult) => {
		Star.add(
			star.x,
			star.y,
			star.color,
			angle,
			speedMult * 2.4,
			1000 + Math.random() * 300,
			star.speedX,
			star.speedY
		);
	});
	// Queue burst flash render
	BurstFlash.add(star.x, star.y, 46);
	soundManager.playSound('burstSmall');
}
// Flower is like a mini shell
function floralEffect(star) {
	const count = 12 + 6 * quality;
	createBurst(count, (angle, speedMult) => {
		Star.add(
			star.x,
			star.y,
			star.color,
			angle,
			speedMult * 2.4,
			1000 + Math.random() * 300,
			star.speedX,
			star.speedY
		);
	});
	// Queue burst flash render
	BurstFlash.add(star.x, star.y, 46);
	soundManager.playSound('burstSmall');
}

// Floral burst with willow stars
function fallingLeavesEffect(star) {
	// airDrag = 1//sửa
	createBurst(7, (angle, speedMult) => {
		const newStar = Star.add(
			star.x,
			star.y,
			INVISIBLE,
			angle,
			speedMult * 2.4,
			2400 + Math.random() * 600,
			star.speedX,
			star.speedY
		);

		newStar.sparkColor = Math.random()< 0.7 ? COLOR.Gold:COLOR.White;
		newStar.sparkFreq = 144 / quality;
		newStar.sparkSpeed = 0.28;
		newStar.sparkLife = 750;
		newStar.sparkLifeVariation = 3.2;
		newStar.strobe = true
		
	});
	
	// Queue burst flash render
	BurstFlash.add(star.x, star.y, 46);
	soundManager.playSound('burstSmall');
}

// Crackle pops into a small cloud of golden sparks.
function crackleEffect(star) {
	const count = isHighQuality ? 32 : 16;
	createParticleArc(0, PI_2, count, 1.8, (angle) => {
		Spark.add(
			star.x,
			star.y,
			COLOR.Gold,
			angle,
			// apply near cubic falloff to speed (places more particles towards outside)
			Math.pow(Math.random(), 0.45) * 2.4,
			300 + Math.random() * 200
		);
	});
	soundManager.playSound('burstSmall');
	soundManager.playSound('burstSmall');
}
```