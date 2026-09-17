# Project Harmonic Motion

Purpose: 项目说明、启动及用户操作入口。
Authority: 快速使用指南；现状、架构和维护规范分别链接到 canonical 文档。
Update when: 启动方式、用户操作或导航入口变化。
Last verified: 2026-09-17；Iteration 02 完成后。

**Music Geometry Engine — a score-to-world generative engine.**

The score is compiling a world.

本项目是可运行的 Engine Foundation：本地 MIDI / 内置原创乐谱 → 音乐语义 → 确定性音乐空间 → 编舞 → 合成音频与 3D 演奏。没有后端、账号、数据上传或物理引擎。

## 启动

推荐 Node.js 24 LTS（开发验证使用 24.18.0）。在项目目录运行：

```sh
npm install
npm run dev
```

打开终端显示的本地地址。默认加载原创 C 大调短句。浏览器要求第一次点击 **Play** 后才启用音频。

已安装过依赖的干净检出可用 `npm ci` 严格按锁文件恢复。

## 使用

| 操作 | 行为 |
| --- | --- |
| Play / Pause | 启动或冻结统一音乐时间，暂停立即停止声音 |
| Restart | 从头重新演奏 |
| 时间滑杆 | 播放或暂停时均可跳转，对既有轨迹求位置，恢复节点和效果状态；播放中恢复仍在延续的音符 |
| Load MIDI | 在浏览器本地读取 `.mid` / `.midi`，成功后加载新世界并归零；错误文件保留原乐谱 |
| Regenerate | seed 加一，重新生成世界和轨迹，保持乐谱、音乐时序与当前播放进度 |
| Effects on/off | 只切换视觉反馈，不重新编译世界或演奏计划 |
| Constellation / Stream | 在完整音乐世界与局部时间流展示间切换；保持乐谱、世界、演奏计划、播放时间和音频 |
| Overview / Focus / Current path | 显示全世界、时间相关局部或最精简当前路径；Stream 自带局部时间窗 |
| 滚轮 / 拖拽 | 在 3D 场景内受限缩放和平移，不中断播放 |
| Fit world | 恢复当前 presentation 的合理整体取景 |

可导入 `tests/fixtures/tempo-and-voices.mid` 体验双轨、重叠音符和速度变化。该文件为程序生成的测试素材，不包含商业作品。

## 验证

```sh
npm run test
npm run lint
npm run build
```

定向测试与覆盖边界见 [TEST_MATRIX](docs/TEST_MATRIX.md)；最近实际结果见 [VERIFICATION](docs/VERIFICATION.md#repository-os-baseline)。

`npm run preview` 可预览生产构建。浏览器交互验收记录见 [docs/VERIFICATION.md](docs/VERIFICATION.md)。

## 架构

三个中心数据模型：`NormalizedScore`、`WorldModel`、`PerformancePlan`。它们均为可序列化纯数据。核心代码不依赖 React、Three.js 或 Tone.js。

完整约束、时间语义和扩展方式见 [ARCHITECTURE](docs/ARCHITECTURE.md)，源码路径和责任边界见 [CODEBASE_OPERATING_MODEL](docs/CODEBASE_OPERATING_MODEL.md)。

## 仓库导航与当前边界

开发从 [AGENTS.md](AGENTS.md) → [docs/index.md](docs/index.md) 开始，按需求定位模块，不默认通读或重写仓库。

- [CURRENT_STATE](docs/CURRENT_STATE.md)：Implemented / Partially implemented / Not implemented。
- [KNOWN_LIMITATIONS](docs/KNOWN_LIMITATIONS.md)：输入/声部限制、seek 听感、性能未知项及 Documentation Drift。
- [ROADMAP](docs/ROADMAP.md)：候选方向与状态，不代表已承诺的功能。
- [DEVELOPMENT_WORKFLOW](docs/DEVELOPMENT_WORKFLOW.md)：局部修改、范围扩展门槛、计划和文档维护。

运行时不请求字体、音色样本或外部 API；安装依赖后可以离线使用。
