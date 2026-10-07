# 3D Firework & Drone Animation Simulation - Shell Drone Animation

[English](README.md) | [Tiếng Việt](README-vn.md) | [日本語](README-ja.md) | [简体中文](README-zh.md)

**Drone Shell Editor** is a 3D simulation software for fireworks and drones. The software supports firework choreography scripting, drone formation design, and complete choreography for combined drone and firework shows.

---

<video src="public/preview/preview-ds.mp4" controls width="100%"></video>

## Key Advantages & Highlights

- **Realistic 3D Environment:** Delivers a 99% realistic simulation experience.
- **Diverse Firework Library:** Over a hundred built-in firework templates and effects, combinable to create up to 500 new firework variations.
- **Standardized JSON Data Storage:** Synchronized, easy to share and transfer.
- **Stable Performance:** Guaranteed stable execution for 100-200 simultaneous fireworks.
- **Professional & Modern UI:** Standardized workflow tailored for creators and editors.

---

## Target Users

- **Event Organizers and Show Production Companies:** Create intuitive 3D simulations and realistic previews for `firework` and `drone` scenarios.
- **Firework & Drone Show Enthusiasts:** Craft both professional and creative amateur drone and firework choreography scripts.
- **Pyrotechnic Designers:** Design and customize physics-based particle firework effects.
- **Drone Formation Designers:** Design, customize drone swarm formations and choreograph drone animations.

---

## Core Feature Modules

### 1. Interactive 3D Simulation Space
- Free-form 3D stage environment featuring an orbital camera system supporting grandstand, bird-eye, and technical perspectives.
- Night-sky simulation environment with realistic starfields, dynamic lighting, and ground reflections.

![show-preview](/public/preview/show-preview.png)

### 2. Timeline Choreography Editor
- Synchronizes all firework launch events and drone transition milestones directly to audio tracks.
- Drag-and-drop timeline manipulation allowing millisecond-accurate adjustments for detonation times, launch heights, angles, and burst patterns.

![Timeline](/public/preview/timeline.png)

### 3. 3D Drone Formation Studio
- Tools for designing and modeling static 3D drone formations in three-dimensional space.
- Supports vector imports from 2D graphics, 3D mesh models, and automated point distribution algorithms.

![drone-formation](/public/preview/drone-formation.png)
### 4. Drone Step & Transition Editor
- Manages drone swarm movements across customizable sub-groups and sequential animation steps.
- Computes smooth trajectory interpolation, velocity control, and collision avoidance pathways.

![drone-animation](/public/preview/drone-animation.png)

---

## Download & Installation

### For End Users

1. Visit the project's **[GitHub Releases](https://github.com/ThAolInh20/Shell-Drone_3d/releases)** page.
2. Download the latest installer for Windows in `.exe` or compressed `.zip` format.
3. Extract or run the installer to start using the software.

*Note: If the Windows SmartScreen security prompt appears, click `More Info` and select `Run anyway` to continue.*

---

## Developer Guide

The project requires **[Node.js](https://nodejs.org/)** version 18 or higher.

### Step 1: Clone Repository and Install Dependencies
```bash
git clone https://github.com/ThAolInh20/Shell-Drone-Editor.git
cd shell-drone-animation
npm install
```

### Step 2: Launch the Application

#### Desktop App with Electron (Recommended)
Launch the standalone desktop application with direct file saving and system navigation:
```bash
npm run electron:dev
```

#### Web Browser Mode
Start the Vite development server:
```bash
npm run dev
```
Then access the local address displayed in the terminal (default is `http://localhost:5173/`).

### Step 3: Package Application
To compile and package into a complete Windows Desktop installer:
```bash
npm run electron:build
```
The packaged installer will be saved in the `dist-electron` directory.

---

## Quick Keyboard Shortcuts

- **Space:** Play or pause the show simulation.
- **Ctrl + S:** Save scenario changes directly to the source file in Desktop mode.
- **Ctrl + 1:** Switch to the Main Timeline Choreography Editor.
- **Ctrl + 2:** Switch to the 3D Static Drone Formation Studio.
- **Ctrl + 3:** Switch to the Drone Step & Transition Editor.

---

## Documentation and License

- **Detailed Documentation:** Refer to the **[Drone Shell Wiki](https://drone-shell-wiki.netlify.app/)**.
- **Release Notes:** Track recent updates in [RELEASE_NOTES.md](RELEASE_NOTES.md).
- **License:** Distributed under the open-source **[MIT License](LICENSE)**.
