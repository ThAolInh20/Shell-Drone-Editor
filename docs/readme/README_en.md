# 3D Firework & Drone Animation Simulation (Shell Drone Animation)

**Languages:** [English](README_en.md) | [Tiếng Việt](README_vi.md) | [日本語](README_ja.md) | [中文](README_zh.md)

This project is a 3D firework & drone animation simulation and editing application built with **Three.js** and **Vite**, utilizing **Electron** to build professional Desktop software.

---

## Download and Installation Guide

### Method 1: Using Git (Recommended)
If you have Git installed, open your Terminal (or Command Prompt/PowerShell) and run the following commands:
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

The project requires **Node.js** version 18 or higher. Please ensure Node.js is installed before proceeding.

### Step 1: Install Dependencies
Open the terminal at the project's root folder (`shell-drone-animation`) and execute:
```bash
npm install
```

### Step 2: Launch the Application

You can run the application using two different methods depending on your needs:

#### Method A: Run as a Desktop App with Electron (Recommended)
This method launches an independent Desktop application using Electron. Running it this way unlocks advanced native features:
*   **Direct File Saving (`Shift + S`):** Instantly save edits directly to the source `.json` file **without** going through the browser's download dialog (a seamless experience like professional Notepad).
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

## Production Build

### B. Package Desktop Application (.EXE with Electron)
When you want to package the entire project into an independent Desktop installer software for Windows (`.exe`):

1. **Run the Build Command:**
   Run the single command below to automatically compile the source code via Vite and package it with `electron-builder`:
   ```bash
   npm run electron:build
   ```
   The generated files will be saved in the `dist-electron` folder.

## Update release notes
The latest changes are stored [here](../../RELEASE_NOTES.md).
