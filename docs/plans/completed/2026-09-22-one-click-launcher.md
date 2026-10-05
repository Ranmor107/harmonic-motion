# One-click local launcher and owned-process cleanup

Purpose: 为本地 Windows 用户提供可双击的一键启动入口，并明确关闭入口窗口后的进程回收边界。
Authority: 本轮实施上下文；不改变音乐引擎或浏览器内运行时契约。
Update when: 启动方式、清理策略、验证证据或完成状态改变。
Last verified: 2026-09-22；基于 `12cb5b7`，工作区仅保留用户未跟踪的 `midi/`。

Status: Completed
Source baseline: `12cb5b7`；`git status --short --branch` 仅显示用户未跟踪的 `midi/`
Related request / roadmap item: 用户要求“弄一个一键启动的程序，同时关闭网页时自动清除进程”。
Related ADR: none

## Problem

当前 README 只说明在终端运行 `npm run dev`，用户需要手动启动服务和浏览器，也没有明确的进程所有权与关闭清理流程。

## User-visible goal

用户双击一个启动文件后，项目自动启动本地 Vite 服务并打开独立浏览器应用窗口；关闭该独立窗口后，启动器停止自己启动的服务进程并删除临时浏览器配置目录。

## Current behavior

启动入口是 README 中的 `npm run dev`。仓库没有 Windows 启动脚本，也没有自动清理 Vite 子进程的机制。

## Desired behavior

增加一个 `.cmd` 双击入口和一个 PowerShell 实现：使用固定本地端口，等待服务可访问，优先启动 Edge/Chrome 的独立 `--app` 窗口；启动器等待该窗口退出，然后回收自己拥有的进程树和临时 profile。端口被其他进程占用时安全退出，不终止外部进程。

## Primary module

仓库工具入口与开发流程（启动脚本、README、计划/验证文档）。

## Adjacent modules

- Vite development server：只通过现有 `npm run dev` 启动，不改 Vite 配置。
- Windows shell：`.cmd` 仅转发到 PowerShell；进程树回收属于启动器边界。
- Browser app window：使用临时 profile，避免复用普通浏览器进程导致关闭信号不可靠。

## Explicit non-goals

- 不修改 MIDI、WorldModel、PerformancePlan、playback、audio、visual 或核心渲染代码。
- 不新增依赖，不改变 npm scripts、端口默认值或构建配置。
- 不终止用户已有的开发服务器、普通浏览器窗口或其他同端口进程。

## Architecture invariants

应用运行时数据与音乐时钟保持不变；启动器只负责本地宿主进程，不进入浏览器应用状态，因此不影响 timeline-first、deterministic、seekable 及视觉切换契约。

## Expected files

| File / symbol | Reason | Type of change |
| --- | --- | --- |
| `start-harmonic-motion.cmd` | 双击入口 | tool entry |
| `scripts/start-harmonic-motion.ps1` | 启动、等待、浏览器生命周期与清理 | tool behavior |
| `README.md` | 记录一键启动和关闭边界 | documentation |
| `docs/plans/index.md` | 登记本轮 plan | documentation |
| `docs/VERIFICATION.md` | 记录实际验证证据 | documentation |

## Public contracts affected

无应用公共 API 变更。新增的是 Windows 本地开发入口；关闭清理只对该入口自己创建的 Vite 进程和临时 profile 生效。

## Implementation approach

1. 用 `.cmd` 以 `ExecutionPolicy Bypass` 调用同目录 PowerShell 脚本。
2. PowerShell 检查固定端口未被占用，启动现有 `npm run dev -- --port <port>`，轮询 HTTP 直到可访问。
3. 查找 Edge/Chrome，创建临时 profile，以 `--app` 启动独立窗口并等待 profile lockfile 消失。
4. `try/finally` 中使用 `taskkill /T`、监听端口 PID 和 `Stop-Process` 回收启动的服务进程并删除临时 profile；异常也走清理。
5. 文档说明独立窗口是关闭信号，运行脚本级测试与全量 test/lint/build，再做真实双击/窗口关闭验证。

## Risks

- 浏览器未安装时只能启动服务并报出清晰错误；不修改用户浏览器。
- `--app` 窗口关闭是可观测生命周期；普通浏览器标签页关闭不属于本启动器的清理信号。
- Windows 进程树行为依赖 `taskkill`；需在本机确认端口释放和临时目录删除。

## Test plan

- PowerShell 语法检查与 `-NoBrowser` 受控路径，确认服务会启动并在退出时释放。
- 实际启动脚本，确认独立浏览器应用窗口可打开本地页面；关闭窗口后确认 Vite 进程退出、端口释放、临时 profile 删除。
- 按 [TEST_MATRIX](../../TEST_MATRIX.md) 运行 `npm run test`、`npm run lint`、`npm run build`。
- `git diff --check` 并确认用户 `midi/` 未被暂存。

## Documentation updates

更新 README 的启动入口、关闭行为；更新计划登记和验证记录。架构、CURRENT_STATE、ROADMAP 的事实不变，无需修改。

## Completion criteria

- [x] 双击入口可启动本地项目与独立浏览器窗口。
- [x] 关闭独立窗口后，启动器拥有的服务进程树和临时 profile 被回收。
- [x] 外部占用端口时不误杀外部进程。
- [x] 定向启动验证和 test/lint/build 通过。
- [x] Diff 仅含授权范围；用户 `midi/` 保留。
- [x] README、验证登记更新，计划登记并提交上传。

## Execution notes and completion evidence

2026-09-22：新增 `start-harmonic-motion.cmd` 和 `scripts/start-harmonic-motion.ps1`。PowerShell 语法、`-NoBrowser`、真实 Edge/profile 生命周期、端口释放、临时目录清理、占用端口保护、`npm run test`（74）、`npm run lint`、`npm run build` 与 `git diff --check` 已通过。外部 Edge UI 未由 CUA 枚举，已在验证文档中标明边界。实现提交为 `202f0d4`，已成功推送到 GitHub `origin/main`；入口文件名随后改为 ASCII 以兼容 `cmd.exe`。
