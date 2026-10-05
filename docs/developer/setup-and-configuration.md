# 启动、配置与验证命令

Purpose: 提供可执行的本地开发/构建路径及真实配置位置。
Authority: 当前仓库的开发运行说明；用户操作以 README 为入口。
Update when: package scripts、依赖/工具链、启动器、端口或调试入口改变。
Last verified: 2026-10-05；Windows、Node 24.18.0、npm 11.16.0；test/lint/build 已执行，启动器本轮仅源码复核。

## 环境与安装

所有命令在仓库根目录执行。项目是 Vite + React 的本地单页应用，无需账号、API key、数据库服务或 `.env`。当前没有配置文件式主题编辑器，下面的视觉/声音值是源码常量。

```powershell
Set-Location 'D:\small-programs\harmonic-motion'
node --version
npm --version
npm ci
npm run dev
```

路径只是当前 checkout 的示例；克隆到其他位置用实际路径。`npm ci` 按 lock 安装，首次需要获取依赖；不要在纯审计/文档任务中顺手升级 lock。Node 24 是已验证环境，不等于对所有旧版本的兼容承诺。锁文件 v3 当前有 265 个 package entries（包含根）；实际版本以 lock 为准。

主要依赖角色：React 19 + Zustand 5（界面/状态），Three 0.186 + R3F 9 + drei 10（3D），Tone 15（声音），@tonejs/midi 2（解析），Vite 8 + TypeScript 6 + Vitest 5 + ESLint 10（工具链）。审计没有安装或升级依赖，也未作漏洞扫描。

## 命令与端口

| 方式 / 命令 | 用途与停止方式 |
| --- | --- |
| `npm run dev` | Vite 开发，host 127.0.0.1，默认 5173；以终端实际地址为准；Ctrl+C 停止，关标签页不停止 |
| `npm run build` | `tsc -b && vite build`，输出忽略的 dist；不是部署 |
| `npm run preview` | 预览已有 dist，默认 4173；先 build；Ctrl+C 停止 |
| `npm run test` | Vitest 一次性运行 tests/**/*.test.ts，node 环境 |
| `npm run test:watch` | 持续测试；使用后自行退出 |
| `npm run lint` | ESLint，全仓配置内零 warning 门槛 |
| `start-harmonic-motion.cmd` | Windows 固定入口，调用 PS 启动器，默认 5174，专用 Edge/Chrome 应用窗口；关专用窗口清理其启动的服务 |

一键启动仍使用开发服务，需要先安装依赖；不是带运行时的安装包。启动器 [scripts/start-harmonic-motion.ps1](../../scripts/start-harmonic-motion.ps1) 先检查端口，启动子进程并检查 HTTP，寻找 Edge/Chrome，建立 `%LOCALAPPDATA%\HarmonicMotion\Profiles\<browser>`，监听专用窗口结束并清理自有进程树。不会把普通开发标签页的关闭当作关服务信号。

维护启动器时可执行其现有 smoke 模式：

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\start-harmonic-motion.ps1 -NoBrowser
```

`-NoBrowser` 是“等待服务可达后立刻清理”的检查，**不是长期后台服务**。`-Port 5175` 可指定 1024–65535 的空闲端口，但换端口会换 IndexedDB origin。本轮没有重跑固定入口/关窗测试；历史证据在 [启动计划](../plans/completed/2026-09-22-one-click-launcher.md)。

## 配置位置

| 位置 | 控制内容 / 默认值 |
| --- | --- |
| [package.json](../../package.json)、[package-lock.json](../../package-lock.json) | scripts、依赖范围、锁定版本 |
| [vite.config.ts](../../vite.config.ts) | React 插件；测试 node 环境和 include；无额外后端代理 |
| [tsconfig.json](../../tsconfig.json) | strict、noUncheckedIndexedAccess、noUnusedLocals/Parameters、noFallthrough、Bundler resolution、noEmit；检查 src/tests/vite config |
| [eslint.config.js](../../eslint.config.js) | hooks 规则；domain/engine/playback 禁止框架/visual/render/state 导入与 Math.random；不是完整架构环检测器 |
| [parser.ts](../../src/midi/parser.ts) `MIDI_LIMITS` | 10 MiB、20,000 notes；不含有效时长/总曲库容量上限 |
| [store.ts](../../src/state/store.ts) | seed 107、默认 constellation/overview/original/drops、唯一正式几何策略 |
| [defaultPresentation.ts](../../src/visual/presentation/defaultPresentation.ts) | 显著性/关系/可见性/Stream 参数；见视觉手册 |
| [renderBudget.ts](../../src/visual/presentation/renderBudget.ts)、Ensemble/Ink presentation | 实例/mark 数量上限与时间窗；不同模式各自拥有预算 |
| [defaultPreset.ts](../../src/visual/presets/defaultPreset.ts) | theme/effects/environment/camera/presentation 的组合 |
| [ToneAudioEngine.ts](../../src/audio/ToneAudioEngine.ts) | horizon 0.2s、25ms timer、64 声部、音色参数、默认 volume 0.8 |
| [persistence.ts](../../src/state/persistence.ts) | IndexedDB 名/版本/键和偏好兼容；不是云配置 |
| [branding/config.ts](../../src/branding/config.ts)、CSS | 产品文案、布局、普通/水墨视觉；不修改音乐数据 |

这些常量不应该全部暴露为 UI 设置。只有用户确实需要调节、且语义/边界清楚时才新增控件和保存字段。

## 测试选择与基线

修改前先查 [TEST_MATRIX](../TEST_MATRIX.md)。常用定向命令：

```sh
npm run test -- tests/midi.test.ts tests/engine.test.ts
npm run test -- tests/playback.test.ts tests/audio.test.ts
npm run test -- tests/session.test.ts tests/ink-stream.test.ts
npm run test -- tests/visual.test.ts tests/musical-presentation.test.ts tests/ensemble-presentation.test.ts tests/dense-presentation.test.ts
```

完整检查依次执行 test、lint、build。本次实际结果和包体积见 [2026-10-05 验证记录](../VERIFICATION.md#codebase-audit-2026-10-05)，它是日期快照，不是预设性能门槛。

测试环境是 node，没有 DOM、真实 IndexedDB、GPU 或声卡。当前没有自动浏览器测试 runner，也没有 CI workflow。不要把 `npm test` 通过写成“浏览器视觉/音频全部验收”。

## 性能诊断和隔离

- 正式开发入口加 `?benchmark` 会在 R3F canvas 的 `dataset.renderMetrics` 暴露最多 120 帧的采样和 renderer 统计；生产环境不挂载此组件。
- `/benchmarks.html?benchmark` 提供 100/700/2000/5000 及 fast2000 合成曲。**用独立端口和干净浏览器 profile**，因为该页当前会使用 App 的正式持久化；不要在用户正在使用的 origin 下制造测试曲库。
- 当前这套指标只属于 R3F，不能代表独立 Ink canvas；独立 benchmark 还缺 ink.css。详见审计 A10，修复前不以此比较新 Ink GPU 性能。
- [performance.test.ts](../../tests/performance.test.ts) 的可选 `HM_BENCHMARK` 会记录 CPU 诊断到忽略的 artifacts；它不是固定时间阈值的性能门禁。运行时使用临时环境变量，不提交本机结果为通用性能结论。

### 工程产物与版本控制

`node_modules/`、`dist/`、`artifacts/`、tsbuildinfo、log 被忽略；不要手工修改生成产物充当修复。用户 MIDI/DOCX 不是测试 fixture，也未获准随意上传；`git add` 使用明确文件路径。Markdown 文档链接用相对路径以便 GitHub 和本地仓库均可导航。

Git `dubious ownership` 是本地仓库所有者保护，与公开/私有无关。确认路径可信后，可只对单次命令使用 `git -c safe.directory=D:/small-programs/harmonic-motion ...`；不要设置通配符全局信任。认证问题在用户终端处理，不把 token 写进仓库、文档或日志。
