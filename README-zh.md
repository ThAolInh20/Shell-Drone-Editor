# 3D 烟花与无人机表演模拟器 - Shell Drone Animation

[English](README.md) | [Tiếng Việt](README-vn.md) | [日本語](README-ja.md) | [简体中文](README-zh.md)

**Drone Shell Editor** 是一款专为烟花与无人机打造的 3D 模拟软件。支持烟花剧本编排、无人机编队设计，以及无人机与烟花结合表演的完整舞台编导。

---

<video src="public/preview/preview-ds.mp4" controls width="100%"></video>

## 核心优势与亮点

- **逼真的 3D 仿真环境：** 保证 99% 的拟真模拟体验。
- **丰富的烟花效果库：** 内置百余种烟花预设与特效，支持组合创造多达 500 种全新烟花样式。
- **统一的 JSON 数据存储：** 标准化同步，便于快速分享与协作。
- **出色的运行稳定性：** 确保 100-200 发烟花同屏并发稳定流畅运行。
- **现代专业的交互界面：** 为创作者量身定制的标准编辑器工作流。

---

## 目标用户群体

- **活动策划与演出制作机构：** 为“烟花”和“无人机”表演剧本构建直观的 3D 仿真模拟与真实预演。
- **烟花与无人机表演艺术爱好者：** 创作专业级及创意业余级的烟花与无人机编排脚本。
- **烟花特效设计师：** 自定义设计与微调基于物理特性的烟花粒子特效。
- **无人机编队设计师：** 设计并自定义无人机集群编队，构建流畅的无人机飞行动画。

---

## 主要功能模块

### 1. 交互式 3D 模拟空间
- 自由三维舞台场景，搭载灵活的轨道摄像机系统，支持看台视角、俯瞰视角和专业技术视角切换。
- 夜空环境模拟，具备真实星空、动态光影及地面反射效果。

![show-preview](/public/preview/show-preview.png)

### 2. 时间线编排编辑器
- 将所有烟花发射事件及无人机状态转换节点与音频曲目精准同步。
- 支持时间线拖拽操作，实现毫秒级微调爆炸时间、发射高度、方向与绽放角度。

![Timeline](/public/preview/timeline.png)

### 3. 3D 静态无人机编队工作室
- 三维空间内的静态无人机编队建模与造型工具。
- 支持从 2D 图像提取矢量、导入 3D 网格模型以及自动点阵分布算法。

![drone-formation](/public/preview/drone-formation.png)
### 4. 无人机步骤与过渡动画编辑器
- 按分组和时间步进管理无人机集群的连续运动动画。
- 自动计算平滑轨迹插值、速度控制及防碰撞安全路径。

![drone-animation](/public/preview/drone-animation.png)

---

## 下载与安装

### 最终用户指南

1. 访问项目的 **[GitHub Releases](https://github.com/ThAolInh20/Shell-Drone_3d/releases)** 页面。
2. 下载适用于 Windows 的最新安装程序（`.exe` 或压缩包 `.zip` 格式）。
3. 解压或运行安装程序即可开始使用软件。

*注意：若系统弹出 Windows SmartScreen 安全提示，请点击“更多信息 (More Info)”并选择“仍要运行 (Run anyway)”继续。*

---

## 开发者运行指南

本项目运行环境需要 **[Node.js](https://nodejs.org/)** 18 或更高版本。

### 步骤 1：克隆仓库并安装依赖
```bash
git clone https://github.com/ThAolInh20/Shell-Drone-Editor.git
cd shell-drone-animation
npm install
```

### 步骤 2：启动应用程序

#### Electron 桌面应用模式（推荐）
启动具备直接文件保存与快速导航功能的独立桌面应用：
```bash
npm run electron:dev
```

#### Web 浏览器模式
启动 Vite 开发服务器：
```bash
npm run dev
```
随后访问终端中显示的本地地址（默认为 `http://localhost:5173/`）。

### 步骤 3：打包构建
编译并打包为完整的 Windows 桌面安装包：
```bash
npm run electron:build
```
打包生成的文件将保存在 `dist-electron` 目录下。

---

## 快捷键一览

- **Space：** 播放或暂停模拟演示。
- **Ctrl + S：** 在桌面端直接保存剧本修改至源文件。
- **Ctrl + 1：** 切换至主时间线编排编辑器。
- **Ctrl + 2：** 切换至 3D 静态无人机编队工作室。
- **Ctrl + 3：** 切换至无人机步骤与过渡动画编辑器。

---

## 文档与开源许可

- **详细文档：** 请参阅 **[Drone Shell Wiki](https://drone-shell-wiki.netlify.app/)**。
- **更新日志：** 最新版本记录请查看 [RELEASE_NOTES.md](RELEASE_NOTES.md)。
- **开源许可：** 本软件基于 **[MIT License](LICENSE)** 开源协议分发。
