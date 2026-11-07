# Firework & Drone Show Studio

**Languages:** [English](README.md) | [Tiếng Việt](docs/readme/README_vi.md) | [日本語](docs/readme/README_ja.md) | [中文](docs/readme/README_zh.md)

Firework & Drone Show Studio is a 3D firework & drone animation simulation and editing application built with **Three.js** and **Vite**, utilizing **Electron** to build professional Desktop software.

---

## Download and Installation Guide

### Method 1: Using Git (Recommended)
If you have [Git](https://git-scm.com/) installed (you can download Git [here](https://git-scm.com/downloads)), open your Terminal (or Command Prompt/PowerShell) and run the following commands:
```bash
git clone https://github.com/ThAolInh20/Shell-Drone-Editor.git
cd shell-drone-animation
```

### Method 2: Download ZIP File directly
1. Click the green **Code** button at the top right of this repository page.
2. Select **Download ZIP**.
3. Extract the downloaded ZIP file and open the source code folder.

---

## Environment Setup & Running the Application

The project requires **[Node.js](https://nodejs.org/)** version 18 or higher (you can download Node.js [here](https://nodejs.org/en/download)). Please ensure Node.js is installed before proceeding.

### Step 1: Install Dependencies
Open the terminal at the project's root folder (`shell-drone-animation`) and execute:
```bash
npm install
```

### Step 2: Launch the Application

You can run the application using two different methods depending on your needs:

#### Method A: Run as a Desktop App with Electron (Recommended)
This method launches an independent Desktop application using Electron. Running it this way unlocks advanced native features:
*   **Direct File Saving (`Ctrl + S`):** Instantly save edits directly to the source `.json` file **without** going through the browser's download dialog.
*   **Quick Navigation Menu:** Quickly switch between the 3 editing toolsets via the application's system menu or shortcuts (`Ctrl + 1`, `Ctrl + 2`, `Ctrl + 3`).

To run the application in Desktop mode, use the command:
```bash
npm run electron:dev
```

#### Method B: Run on a traditional Web Browser
Run the standard Vite development server using:
```bash
npm run dev
```
Then, access the local address displayed on the terminal (default is `http://localhost:5173/`).
*Note: When running on a web browser, due to browser security mechanisms, the direct file saving feature will automatically switch to downloading the file via the browser.*

---

## Shared Firework Engine System

The pyrotechnic simulation, mathematics, shapes, dynamics, visual effects, and preset configurations are maintained centrally in the standalone repository **[`@shell-drone/firework-engine`](https://github.com/ThaoLinn20/firework-engine)**. This architecture ensures that different applications (such as this Studio Editor and the TikTok Live version) always share the exact same pyrotechnic physics and visual fidelity.

### Updating to the Latest Fireworks
Whenever new fireworks or performance improvements are published to the engine repository, you can update your local application to the latest version by running:
```bash
npm update @shell-drone/firework-engine
```

### Developing or Adding New Fireworks
To create new firework shapes, dynamics, or presets:
1. Open or clone `../firework-engine` (https://github.com/ThaoLinn20/firework-engine).
2. Implement your shapes, kinematics, or presets in `src/factories/` following the Component-based Composition model.
3. Run `npm test` and `npm run build` inside `firework-engine` to verify that all unit tests pass and bundles are compiled.
4. Commit and push changes to `main`.
5. Run `npm update @shell-drone/firework-engine` in this studio project to immediately utilize the new fireworks.

---

## Compilation and Packaging

### B. Package Desktop Application
When you want to package the entire project into an independent Desktop installer software running on Windows:

1. **Run the Build Command:**
   Run the single command below to automatically compile the source code via Vite and package it with `electron-builder`:
   ```bash
   npm run electron:build
   ```
   The generated files will be saved in the `dist-electron` folder.

## Update release notes
The latest changes are stored [here](RELEASE_NOTES.md).
