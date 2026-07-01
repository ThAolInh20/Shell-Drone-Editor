# 3D烟花与无人机动画模拟 (Shell Drone Animation)

**Languages:** [English](README_en.md) | [Tiếng Việt](README_vi.md) | [日本語](README_ja.md) | [中文](README_zh.md)

本项目是一个3D烟花和无人机动画模拟及编辑应用程序，使用 **Three.js** 和 **Vite** 构建，并利用 **Electron** 构建专业的桌面软件。

---

## 下载与安装指南

### 方法 1: 使用 Git (推荐)
如果您的计算机已安装 Git，请打开终端（或命令提示符/PowerShell）并运行以下命令：
```bash
git clone https://github.com/ThAolInh20/Shell-Drone-Editor.git
cd shell-drone-animation
```

### 方法 2: 直接下载 ZIP 文件
1. 点击此仓库页面右上角的绿色 **Code** 按钮。
2. 选择 **Download ZIP**。
3. 解压下载的 ZIP 文件并打开源代码文件夹。

---

## 环境设置与运行应用程序

该项目需要 **Node.js** 18 或更高版本。在继续之前，请确保已安装 Node.js。

### 步骤 1: 安装依赖项
在项目的根文件夹 (`shell-drone-animation`) 打开终端并执行：
```bash
npm install
```

### 步骤 2: 启动应用程序

您可以根据需要使用两种不同的方法运行应用程序：

#### 方法 A: 作为 Electron 桌面应用运行 (推荐)
此方法使用 Electron 启动独立的桌面应用程序。以这种方式运行可解锁高级原生功能：
*   **直接文件保存 (`Shift + S`):** 立即将编辑直接保存到源 `.json` 文件，而**无需**通过浏览器的下载对话框（如同专业记事本般的无缝体验）。
*   **快速导航菜单:** 通过应用程序的系统菜单或快捷键（`Ctrl + 1`、`Ctrl + 2`、`Ctrl + 3`）在3个编辑工具集之间快速切换。

要在桌面模式下运行应用程序，请使用以下命令：
```bash
npm run electron:dev
```

#### 方法 B: 在传统 Web 浏览器上运行
使用以下命令运行标准的 Vite 开发服务器：
```bash
npm run dev
```
然后，访问终端上显示的本地地址（默认为 `http://localhost:5173/`）。
*注意: 在网络浏览器上运行时，由于浏览器的安全机制，直接文件保存功能将自动切换为通过浏览器下载文件。*

---

## 生产构建

### B. 打包桌面应用程序 (使用 Electron 制作 .EXE)
当您想将整个项目打包成独立的 Windows 桌面安装程序软件（`.exe`）时：

1. **运行构建命令:**
   运行以下单个命令以通过 Vite 自动编译源代码，并使用 `electron-builder` 进行打包：
   ```bash
   npm run electron:build
   ```
   生成的文件将保存在 `dist-electron` 文件夹中。

## 更新发布说明
最新的更改存储在[这里](../../RELEASE_NOTES.md)。
