# 3D Firework & Drone Animation Simulation - Shell Drone Animation

[English](README.md) | [Tiếng Việt](README-vn.md) | [日本語](README-ja.md) | [简体中文](README-zh.md)

**Shell Drone Animation** is a professional 3D simulation and choreography software that combines high-altitude firework displays with drone light show choreography on a single timeline synchronized to music. Built on **Three.js**, **Vite**, and **Electron**, the application delivers an immersive, smooth, and precise visualization experience from initial concept design to real-world stage production.

---

## Target Users

- **Event Organizers and Show Production Companies:** Create intuitive 3D simulations for client pitch presentations, design evaluations, and project approvals before executing actual live shows.
- **Content Creators, VJs, Motion Graphics Designers, and 3D Visualizers:** Produce dynamic visual show sequences to integrate into stage performances, music videos, and 3D graphic showcases.
- **Pyrotechnic Professionals and Simulation Enthusiasts:** Design, customize physics-based particle firework effects, and choreograph drone swarm animations synchronized with musical beats.

---

## Key Advantages & Highlights

- **Dual-Engine Integration:** Simultaneously coordinates physical 3D firework effects and drone formation animations within a unified 3D coordinate space and synchronized timeline.
- **Realistic Firework Particle Library:** Features a built-in collection of realistic firework types with accurate colors, particle gravity trails, smoke dispersal, and explosion sound effects.
- **Flexible JSON Scenario Exchange:** Scenario and formation data are standardized into lightweight JSON structures for seamless importing, exporting, and portability across systems.
- **High-Performance Desktop Experience:** Supports native direct file saving to source files without browser download prompts, along with instant switching between specialized workspace modules.

---

## Core Feature Modules

### 1. Interactive 3D Simulation Space
- Free-form 3D stage environment featuring an orbital camera system supporting grandstand, bird-eye, and technical perspectives.
- Night-sky simulation environment with realistic starfields, dynamic lighting, and ground reflections.

### 2. Timeline Choreography Editor
- Synchronizes all firework launch events and drone transition milestones directly to audio tracks.
- Drag-and-drop timeline manipulation allowing millisecond-accurate adjustments for detonation times, launch heights, angles, and burst patterns.

### 3. 3D Drone Formation Studio
- Tools for designing and modeling static 3D drone formations in three-dimensional space.
- Supports vector imports from 2D graphics, 3D mesh models, and automated point distribution algorithms.

### 4. Drone Step & Transition Editor
- Manages drone swarm movements across customizable sub-groups and sequential animation steps.
- Computes smooth trajectory interpolation, velocity control, and collision avoidance pathways.

### 5. Scenario Data & Preset Management
- Packages complete show configurations into standardized JSON files.
- Highly reusable presets and templates for collaborative workflow and sharing.

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
