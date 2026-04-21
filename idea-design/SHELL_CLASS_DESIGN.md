# Shell Class - Complete Design Document

## 1. Architecture Overview

### Class Hierarchy
```
Shell (main firework shell class)
├── Launch Methods (launch, launchV2, launchV3, launchV4)
├── Burst Methods (burst, burstV2)
├── Related Classes
│   ├── Star (individual particles)
│   ├── Drone (formation element)
│   ├── FormationV2 (drone formations)
│   └── BurstFlash (visual flash effect)
└── Effect Classes
    ├── floralEffect
    ├── fallingLeavesEffect
    ├── crossetteEffect / crossetteEffectV2
    └── crackleEffect
```

---

## 2. Shell Class - Core Definition

### Constructor
```javascript
constructor(options) {
    Object.assign(this, options);
    this.starLifeVariation = options.starLifeVariation || 0.125;
    this.color = options.color || randomColor();
    this.glitterColor = options.glitterColor || this.color;
    
    // Auto-calculate starCount based on shell size
    if (!this.starCount) {
        const density = options.starDensity || 1;
        const scaledSize = this.spreadSize / 54;
        this.starCount = Math.max(6, scaledSize * scaledSize * density);
    }
}
```

### Key Methods

#### 1. **launch(position, launchHeight, thisNgieng = 1)**
- Launches shell from bottom of screen
- Parameters:
  - `position`: horizontal position (0-1)
  - `launchHeight`: burst height percentage
  - `thisNgieng`: angle offset
- Creates comet (projectile with trail)
- Triggers `burst()` on impact

#### 2. **launchV2(position, launchHeight, positionX = 0.5, color = COLOR.Gold)**
- Enhanced launch with color changing
- Applies color transition mid-flight
- Better control over horizontal offset

#### 3. **launchV3(startX, startY, launchHeight, speedMultiplier = 1, isFalling = true)**
- Supports falling/rising shells
- Custom start position
- Falling behavior for rain-like effect

#### 4. **launchV4(position, launchHeight, positionX = 0)**
- Advanced angled launch
- Supports complex trajectory

#### 5. **burst(x, y) / burstV2(x1, y1)**
- Main explosion effect
- Creates particles (stars) in burst pattern
- Handles pistils (inner shells) and streamers
- Applies visual effects (strobe, crackle, floral)
- Plays sound effects

---

## 3. Shell Configuration Properties

### Structure Properties
| Property | Type | Description |
|----------|------|-------------|
| `shellSize` | number | Size index (1-6, represents 3"-16") |
| `spreadSize` | number | Diameter of burst (300-500+) |
| `starCount` | number | Number of particles (calculated) |
| `starLife` | number | How long particles live (ms) |
| `starDensity` | number | Density multiplier (0.12-1.25) |
| `starLifeVariation` | number | Random variation ±% |

### Color Properties
| Property | Type | Description |
|----------|------|-------------|
| `color` | string\|string[]\|'random' | Main particle color(s) |
| `secondColor` | string\|null | Color transition target |
| `pistilColor` | string | Inner shell color |
| `glitterColor` | string | Spark/glitter color |

### Effect Flags
| Property | Type | Effect |
|----------|------|--------|
| `ring` | boolean | Ring burst pattern |
| `pistol` | boolean | Inner shell center |
| `streamers` | boolean | White streamer particles |
| `glitter` | string | 'light', 'medium', 'heavy', 'thick', 'streamer', 'willow' |
| `strobe` | boolean | Blinking stars |
| `strobev2` | boolean | Advanced strobe (freq: 220ms) |
| `crackle` | boolean | Popping effect |
| `crossette` | boolean | Secondary burst on impact |
| `crossetteV2` | boolean | Enhanced crossette |
| `horsetail` | boolean | Drooping particles |
| `floral` | boolean | Randomized burst |
| `fallingLeaves` | boolean | Slow golden fall |
| `hearth` | boolean | Heart shape pattern |
| `half` | boolean | Half-circle burst |
| `doubleRing` | boolean | Double ring pattern |
| `oval` | boolean | Oval/egg shape |

---

## 4. Glitter Configuration

### Glitter Modes
```javascript
{
    'light': {
        sparkFreq: 400,      // particles per second
        sparkSpeed: 0.3,     // speed of sparks
        sparkLife: 300,      // ms
        sparkLifeVariation: 2
    },
    'medium': {
        sparkFreq: 200,
        sparkSpeed: 0.44,
        sparkLife: 700,
        sparkLifeVariation: 2
    },
    'heavy': {
        sparkFreq: 80,
        sparkSpeed: 0.8,
        sparkLife: 1400,
        sparkLifeVariation: 2
    },
    'thick': {
        sparkFreq: 16,
        sparkSpeed: 1.5-1.65,
        sparkLife: 1400,
        sparkLifeVariation: 3
    },
    'streamer': {
        sparkFreq: 32,
        sparkSpeed: 1.05,
        sparkLife: 620,
        sparkLifeVariation: 2
    },
    'willow': {
        sparkFreq: 120,
        sparkSpeed: 0.34,
        sparkLife: 1400,
        sparkLifeVariation: 3.8
    }
}
```

---

## 5. Strobe Effect Configuration

### Strobe V1
```javascript
star.starLife *= 1.2;                    // Extend life
star.transitionTime = starLife * 0.46;   // Start strobe mid-life
star.strobeFreq = Math.random() * 20 + 40;  // 40-60ms
star.strobeOffset = strobeGroup * 25;    // Phase offset
star.strobeGroup = Math.floor(Math.random() * 4); // 4 groups
```

### Strobe V2
```javascript
star.starLife *= 1.9;
star.strobeFreq = 220;  // Fixed 220ms frequency
```

---

## 6. Shell Types Reference

### Category 1: Standard Bursts
- **Crysanthemum**: Classic circular burst, often bi-color
- **Rumble**: Half-circle with pistil
- **Ring**: Perfect circle of particles

### Category 2: Special Effects
- **Crackle**: Gold preferred, popping effect, sparse
- **Crossette/CrossetteV2**: Secondary bursts on particle death
- **Strobe/StrobeV2**: Blinking/strobing effect

### Category 3: Aesthetic Shapes
- **Flower**: Central pistil with radial burst
- **Hearth**: Heart-shaped pattern
- **Oval**: Egg-shaped burst

### Category 4: Artistic
- **Floral**: Randomized burst with multiple colors
- **Willow**: Slow drooping gold particles
- **Palm**: Sparse long-life particles
- **Horsetail**: Drooping effect with comet inheritance

### Category 5: Motion
- **Falling Leaves**: Invisible core, golden spiral fall
- **Ghost**: Invisible core, color flash effect

---

## 7. Launch Sequence Flow

```
1. Shell Creation
   └─ new Shell(config)
   
2. Launch Phase
   ├─ Calculate burst height based on launchHeight (0-1)
   ├─ Determine screen position (horizontal)
   ├─ Calculate launch velocity using: 
   │  velocity = pow(distance * 0.04, 0.64)
   ├─ Create comet (Star object)
   └─ Set comet properties:
      ├─ heavy = true (limits air drag)
      ├─ spinRadius = 0.35-0.85
      ├─ sparkFreq = 32/quality (or 8 if high quality)
      ├─ sparkLife = 320
      └─ onDeath callback = burst()

3. Flight
   ├─ Comet travels upward
   ├─ Affected by gravity (0.9 px/s²)
   ├─ Air drag (0.8 multiplier)
   └─ Produces spark trail

4. Burst
   ├─ Star factory creates particles
   ├─ Spreads at calculated speed
   ├─ Each star has:
   │  ├─ position
   │  ├─ velocity/angle
   │  ├─ life duration
   │  └─ color (primary + optional secondary)
   ├─ Optional: pistil (inner shell)
   ├─ Optional: streamers (white particles)
   └─ Sound effect plays
```

---

## 8. Burst Effect Details

### Star Factory
```javascript
const starFactory = (angle, speedMult) => {
    // Creates individual star particle
    const star = Star.add(
        x, y,                    // burst center
        color,                   // particle color
        angle,                   // direction
        speedMult * speed,       // velocity
        starLife + variation,    // lifetime
        horsetailSpeedX,         // horizontal momentum (for horsetail)
        initialVerticalSpeed     // upward momentum
    );
    
    // Optional properties
    star.strobeGroup = Math.floor(Math.random() * 4);
    star.secondColor = transitionColor;
    star.onDeath = effectCallback;
}
```

### Burst Patterns
1. **Default**: `createBurst()` - Full 360° circular
2. **Ring**: `createParticleArc()` - Squashed ring
3. **Heart**: `createHeartBurst()` - Heart shape
4. **Oval**: `createOvalBurst()` - Elliptical
5. **Half**: `createHalfBurst()` - Half circle
6. **DoubleRing**: `createDoubleRingBurst()` - Concentric

### Pistil (Inner Shell)
```javascript
if (this.pistil) {
    const innerShell = new Shell({
        spreadSize: this.spreadSize * 0.5,
        starLife: this.starLife * 0.6,
        starDensity: 1.4,
        color: this.pistilColor,
        glitter: 'light',
        glitterColor: whiteOrGold()
    });
    innerShell.burst(x, y);  // Recursive burst
}
```

---

## 9. Related Classes

### Star Class
- Represents individual particle
- Properties:
  - `x`, `y`: position
  - `speedX`, `speedY`: velocity
  - `color`, `secondColor`: for color transitions
  - `sparkFreq`, `sparkLife`: glitter settings
  - `strobe`, `strobeFreq`: blinking
  - `onDeath`: callback function
  - `visible`: rendering flag

### Drone Class
```javascript
class Drone {
    constructor(x, y, radius=2, speedX=0, speedY=0, color, life)
    
    // Methods
    update(timeStep, speed, gAcc, targetX, targetY)
    setSpeed(speedX, speedY)
    setTarget(x, y, duration)
    isAlive()
}
```

### FormationV2 Class
```javascript
class FormationV2 {
    constructor()
    addDrones(n, size=2, life=1000000)
    removeDrones()
    setSize(size)
    setTargetFormation(positions)
    // Properties
    drones[]
    targetFormation
    colorAnimator
    colorEffect
    movement
}
```

---

## 10. Complete Configuration Examples

### Crysanthemum Shell (Most Used)
```javascript
{
    shellSize: 3,                           // Size 3 (8")
    spreadSize: 400,                        // 300 + 3 * 100
    starLife: 1500,                         // 900 + 3 * 200
    starDensity: 1.1,                       // Random between 1.1-1.25
    color: '#ff0043' or '#1e7fff',         // Red or Blue
    secondColor: '#C0C0C0',                 // maybe gray transition
    glitter: 'light',                       // light sparks
    glitterColor: '#ffbf36',                // Gold
    pistil: true,                           // Has center burst
    pistilColor: '#ffffff',                 // White center
    streamers: false,                       // No streamers
    starLifeVariation: 0.125                // ±12.5% variation
}
```

### Crackle Shell
```javascript
{
    shellSize: 2,
    spreadSize: 305,                        // 380 + 2 * 75
    starLife: 800,                          // 600 + 2 * 100
    starDensity: 1,                         // Full density
    starLifeVariation: 0.32,
    glitter: 'light',
    glitterColor: '#ffbf36',                // Gold
    color: '#ffbf36',                       // 75% chance gold
    crackle: true,                          // Pops on death
    pistil: true,
    pistilColor: '#ffffff'
}
```

### Willow Shell
```javascript
{
    shellSize: 3,
    spreadSize: 400,                        // 300 + 3 * 100
    starDensity: 0.6,                       // Sparse
    starLife: 3600,                         // 3000 + 3 * 300  (LONG!)
    glitter: 'willow',                      // Slow gentle sparks
    glitterColor: '#ffbf36',                // Gold
    color: '_INVISIBLE_'                    // Core invisible
}
```

### Falling Leaves Shell
```javascript
{
    shellSize: 2,
    color: '_INVISIBLE_',                   // No core visible
    spreadSize: 360,                        // 300 + 2 * 120
    starDensity: 0.12,                      // Very sparse
    starLife: 600,                          // 500 + 2 * 50
    starLifeVariation: 0.5,
    glitter: 'medium',
    glitterColor: '#ffbf36',                // Gold sparks
    fallingLeaves: true                     // Spiral down effect
}
```

---

## 11. Key Physics Constants

```javascript
GRAVITY = 0.9;              // Acceleration downward (px/s²)
airDrag = 0.8;              // Air resistance multiplier
quality = 1|2|3;            // 1=low, 2=normal, 3=high
simSpeed = 1;               // Simulation speed multiplier
```

### Launch Velocity Formula
```javascript
// Distance from launch to burst point
const launchDistance = launchY - burstY;

// Velocity needed to reach that distance
const launchVelocity = Math.pow(launchDistance * 0.04, 0.64);

// For horsetail shells, multiply by 1.2
// Normal shells use this directly
```

### Hang Time
```javascript
// Duration comet stays airborne
const hangTime = launchVelocity * (horsetail ? 100 : 400) ms;
```

---

## 12. Design Patterns Used

### 1. **Factory Pattern** (Shell Creators)
```javascript
const crysanthemumShell = (size) => ({...config});
const shortTypes = {
    'Crysanthemum': crysanthemumShell,
    'Crackle': crackleShell,
    // ...
};
```

### 2. **Builder Pattern** (Configuration)
```javascript
new Shell({
    spreadSize: 300 + size * 100,
    starLife: 900 + size * 200,
    color: randomColor(),
    // ...
});
```

### 3. **Strategy Pattern** (Burst Effects)
```javascript
if (this.ring) createParticleArc();
else if (this.hearth) createHeartBurst();
else if (this.oval) createOvalBurst();
else createBurst();  // default
```

### 4. **Observer Pattern** (Callbacks)
```javascript
comet.onDeath = comet => this.burst(comet.x, comet.y);
star.onDeath = floralEffect;
star.onUpdate = () => { strobeLogic() };
```

### 5. **Template Method** (Launch Variants)
```javascript
// All launch methods follow same template:
1. Calculate physics
2. Create comet
3. Set particle properties
4. Register death callback
```

---

## 13. Extensibility Points

### Adding New Shell Type
```javascript
const customShell = (size = 1) => ({
    shellSize: size,
    spreadSize: 300 + size * 100,
    starLife: 1000 + size * 200,
    starDensity: 1.0,
    color: randomColor(),
    // Custom flag
    custom: true,
    // In burst(), check: if (this.custom) createCustomBurst();
});
```

### Adding New Burst Pattern
```javascript
// In burst() method:
if(this.custom){
    createCustomBurst(this.starCount, starFactory);
    check = 0;
}
```

### Adding New Glitter Type
```javascript
else if (this.glitter === 'custom') {
    sparkFreq = 150;
    sparkSpeed = 0.5;
    sparkLife = 800;
    sparkLifeVariation = 2.5;
}
```

---

## 14. Quick Reference - Shell Types Summary

| Type | File Location | Size Formula | Special Property |
|------|---------------|--------------|------------------|
| Crysanthemum | Line 3718 | 300 + size*100 | Most common |
| Rumble | Line 3751 | 300 + size*100 | Half burst |
| Flower | Line 3780 | 300 + size*100 | Pistil center |
| Ring | Line 4186 | 300 + size*100 | Perfect circle |
| Palm | Line 4186 | 250 + size*75 | Sparse + long-life |
| Crackle | Line 4302 | 380 + size*75 | Gold + popping |
| Crossette | Line 4320 | 300 + size*100 | Sub-bursts |
| Strobe | Line 4150 | 280 + size*92 | Blinking |
| Willow | Line 4290 | 300 + size*100 | Drooping gold |
| Horsetail | Line 4310 | 250 + size*38 | Comet inherit |
| Ghost | Line 4129 | inherited | Invisible→visible |
| Floral | Line 4265 | 300 + size*120 | Random colors |
| Falling Leaves | Line 4268 | 300 + size*120 | Spiral down |

---

## 15. Performance Optimization Tips

1. **Reduce sparkFreq for low quality** (automatically done: `sparkFreq / quality`)
2. **Use starDensity < 0.5 for sparse effects** (lighter computation)
3. **Limit glitter to 'light' or 'medium'** for mobile
4. **Use horsetail for long-life** effects (inherits comet velocity)
5. **Disable pistil & streamers** on low-end devices

---

## 16. Testing Checklist

- [ ] Test all 18 shell types
- [ ] Test color transitions (secondColor)
- [ ] Test strobe effects (both V1 & V2)
- [ ] Test pistil recursive burst
- [ ] Test falling leaves (invisible core)
- [ ] Test crackle popping sounds
- [ ] Test launch height variations
- [ ] Test quality levels (low/normal/high)
- [ ] Test on mobile devices
- [ ] Test all glitter modes

