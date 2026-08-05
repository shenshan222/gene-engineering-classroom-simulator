# 基因工程课堂实验模拟器

一个面向高中生物课堂的交互式基因工程学习工具。学生可以在自由画布中拖动 DNA、逐碱基观察双链序列、使用限制酶切割、连接片段，并完成 PCR 引物选择等实验任务。

项目同时提供固定学案和随机训练两种模式，适合课堂演示、学生自主练习和基因工程基本操作复习。

> 当前版本：`0.1.0`。核心课堂功能和 Windows 安装包构建链已经可用，公开在线演示仍在准备中。

## 主要特性

- 每条 DNA 都是可自由拖动的独立组件。
- 双链 DNA 由逐个碱基对组成，可以直接观察互补关系。
- 选择限制酶后，可以预览上下链错位切口，并点击相应碱基间隙完成真实位点切割。
- 酶切后生成的每个片段都可以独立移动和继续操作。
- DNA 连接酶根据末端类型、突出链和黏性末端序列判断能否连接。
- 支持线性 DNA、环状 DNA、兼容黏性末端和 PCR 引物选择。
- 提供撤销、重做、重置、即时反馈和自动完成判定。
- 支持鼠标、触控板和触摸屏操作。
- 所有题目生成与判定均在浏览器本地完成，不上传学生数据。

## 学习活动

| 活动 | 内容 | 核心学习目标 |
| --- | --- | --- |
| 活动 1 | 线性 DNA 酶切与连接 | 识别限制酶位点，切下目的片段并插入受体 DNA |
| 活动 2 | 环状 DNA 重组 | 理解受体环化、环状 DNA 单点切开和重组质粒闭环 |
| 活动 3 | PCR 引物选择 | 判断引物结合位置、反向互补关系和 3′端延伸方向 |
| 活动 4 | 兼容黏性末端 | 利用 EcoRⅠ、MunⅠ兼容末端，并避免破坏标记基因 |

## 随机训练

四个活动均支持基础和标准两档随机题。随机题不是简单替换文字，而是通过领域约束生成完整的 DNA、限制酶位点、目的基因、PCR 模板和候选引物。

随机出题流程包括：

1. 根据题型、难度和字符串种子生成候选题。
2. 使用真实酶切、连接或 PCR 算法求解候选题。
3. 校验位点数量、片段兼容性、功能区保留情况和答案唯一性。
4. 仅向学生展示通过校验的题目。

同一种子会生成完全相同的题目。随机模式会把题型、难度和种子写入页面地址，教师可以复制当前地址，让其他设备复现同一道题。

```text
?mode=random&type=pcr-selection&difficulty=standard&seed=BIO-CLASS-01
```

## 快速开始

### 教师直接使用 Windows 安装包

开发者执行 `npm run desktop:build` 后，会在以下目录生成 64 位 Windows 安装程序：

```text
src-tauri/target/release/bundle/nsis/基因工程课堂实验_0.1.0_x64-setup.exe
```

将该文件复制到教师电脑并双击安装即可。安装程序具有以下特点：

- 按当前用户安装，不需要管理员权限。
- 安装器优先使用系统已有的 Microsoft Edge WebView2 Runtime。
- 若电脑缺少 WebView2，安装器会联网静默补装；已有运行时则不会重复安装。
- 应用每次启动都会再次检测 WebView2，可用性异常时会显示中文提示并安全退出。
- 安装完成后可从开始菜单启动，不需要另行安装 Node.js、npm 或 Rust。
- 题目生成、学生操作与结果判定均在本机完成，不需要服务器。

当前安装包约 2 MB。首次安装成功后，课堂使用不需要联网；对于完全不能联网且缺少 WebView2 的旧电脑，应提前单独安装 WebView2 Runtime，或另行构建包含运行时的完整离线包。

当前安装程序尚未进行商业代码签名。Windows 可能显示“未知发布者”或 Microsoft Defender SmartScreen 提示；正式面向校外分发前，建议申请代码签名证书。

### 源码运行环境

- Node.js 22.13.0 或更高版本
- npm
- Windows、macOS 或 Linux 上的现代浏览器

### 获取项目

```bash
git clone https://github.com/shenshan222/gene-engineering-classroom-simulator.git
cd gene-engineering-classroom-simulator
npm install
```

### 启动开发服务器

```bash
npm run dev
```

终端会显示本地访问地址，通常为：

```text
http://localhost:3000
```

如果 Windows PowerShell 阻止执行 `npm.ps1`，可以使用：

```powershell
npm.cmd run dev
```

## 课堂使用建议

1. 教师打开项目后，先选择固定学案或随机训练模式。
2. 通过顶部活动栏选择活动 1～4。
3. 随机模式下设置难度和种子，或点击“下一题”。
4. 学生在画布中拖动 DNA，选择限制酶、连接酶或 PCR 引物完成任务。
5. 根据即时反馈修正操作；完成后可查看随机题解析。
6. 需要全班完成同一道随机题时，复制页面地址或种子进行分享。

日常课堂优先使用 Windows 安装版；源码运行方式主要用于开发、调试和网页版部署。

## 技术实现

- React 19
- TypeScript 5
- Vite 8
- Vinext
- Tauri 2
- Rust
- Vitest
- Cloudflare Vite Plugin

项目保留两条互不干扰的构建链：Vinext 用于网页开发与后续在线部署，静态 Vite 入口用于 Tauri 桌面应用。Tauri 将静态资源封装进 Windows WebView2 容器，应用运行时不启动本地 HTTP 服务器。

核心领域逻辑与界面组件分离：

- 序列层负责互补、反向互补、GC 含量和序列搜索。
- 限制酶层负责识别位点、切割偏移和黏性末端计算。
- 连接层负责片段翻转、末端兼容性和重组产物装配。
- PCR 层负责引物结合位置和扩增产物枚举。
- 随机题层负责确定性随机数、题目生成、独立求解和校验。
- 状态层负责画布操作、撤销、重做、重置和完成判定。

## 项目结构

```text
gene-engineering-classroom-simulator/
├── app/                         # 页面入口与全局样式
├── index.html                   # Tauri 静态前端入口
├── src/
│   ├── components/              # DNA、工具栏、画布和活动组件
│   ├── content/                 # 学案任务与限制酶数据
│   ├── domain/                  # 酶切、连接、PCR和随机题算法
│   │   └── random/              # 随机生成、求解和校验
│   ├── hooks/                   # 拖动与指针交互
│   ├── state/                   # 活动状态机和随机会话
│   └── desktop-main.tsx         # Tauri 静态 React 入口
├── src-tauri/                   # Tauri/Rust 桌面应用和安装器配置
├── tests/                       # 单元测试、回归测试和属性测试
├── public/                      # 静态资源
├── package.json
├── vite.config.ts               # Vinext 网页构建配置
└── vite.desktop.config.ts       # Tauri 静态前端构建配置
```

## 可用命令

| 命令 | 作用 |
| --- | --- |
| `npm run dev` | 启动本地开发服务器 |
| `npm run desktop:web:dev` | 单独启动桌面端静态前端开发服务器 |
| `npm run desktop:dev` | 以 Tauri 开发模式启动 Windows 应用 |
| `npm run desktop:web:build` | 生成桌面端静态前端资源 |
| `npm run desktop:build` | 生成自动检测并按需补装 WebView2 的 Windows NSIS 安装包 |
| `npm run typecheck` | 执行 TypeScript 类型检查 |
| `npm run lint` | 执行 ESLint 检查 |
| `npm run test` | 运行全部 Vitest 测试 |
| `npm run test:watch` | 以监听模式运行测试 |
| `npm run build` | 生成生产构建 |
| `npm run check` | 依次执行类型检查、测试和构建 |

### 构建 Windows 安装包

除 Node.js 与 npm 外，首次构建还需要：

- Rust stable MSVC 工具链。
- Microsoft Visual Studio 2022 Build Tools 的“使用 C++ 的桌面开发”组件。
- 构建阶段可访问 crates.io 和 GitHub Releases。

在 64 位 Windows 中执行：

```powershell
npm install
npm run desktop:build
```

首次构建需要下载 Rust 依赖和 NSIS，耗时较长。当前生成的安装包约 2 MB；后续构建会复用本机缓存。目标电脑仅在缺少 WebView2 时需要在安装过程中联网。

## 测试与质量保证

当前测试覆盖：

- DNA 序列规范化、互补和反向互补。
- 线性及环状限制酶位点扫描。
- 单次和多次酶切后的片段生成。
- 黏性末端、平末端和突出链方向判断。
- 片段正反方向插入与双接头连接。
- PCR 引物结合与扩增产物计算。
- 四个固定活动的完整操作路径。
- 四类随机题的真实完成路径。
- 8000 个随机种子的批量属性校验。
- 随机题 URL 和本地偏好恢复。

当前测试状态：12 个测试文件、59 项测试全部通过。

提交代码前建议运行：

```bash
npm run typecheck
npm run lint
npm run test
npm run build
```

## 后续计划

- 通过 GitHub Releases 发布经过人工验证的 Windows 安装包。
- 为公开发布版本配置 Windows 代码签名。
- 部署公开在线演示版本。
- 增加课堂局域网启动模式。
- 补充正式的教师使用说明和课堂截图。
- 在真实高中生物课堂中收集可用性反馈。
- 根据教学需求扩展经人工核验的限制酶库。

## 参与贡献

欢迎通过 Issue 提交以下内容：

- 生物学概念或序列计算错误。
- 无解、歧义或难度不合理的随机题种子。
- 课堂交互与触屏操作问题。
- 新的教学活动、限制酶或题目设计建议。

提交代码前，请确保类型检查、lint、测试和生产构建均通过。

## 许可证

本项目采用 [MIT License](LICENSE) 开源。你可以使用、复制、修改和分发本项目，但需要保留原始版权声明和许可证文本。
