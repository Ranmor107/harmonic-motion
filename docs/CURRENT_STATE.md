# Current State

Purpose: 区分当前可用能力、部分接通的扩展点与未实现方向。
Authority: 当前实现状态的主要记录；架构理由见 [ARCHITECTURE](ARCHITECTURE.md)。
Update when: 用户能力、实现覆盖或运行方式改变。
Last verified: 2026-09-17；Iteration 02 实现、自动检查及浏览器视觉验收。

## Implemented

| 领域 | 当前实际能力 | 代码证据 |
| --- | --- | --- |
| 输入 | 本地 Standard MIDI Type 0/1、PPQ、共享 tempo map；保留轨道/channel/instrument | [parser](../src/midi/parser.ts) `parseMidi`；[normalize](../src/midi/normalize.ts) |
| 乐谱 | 秒制音符、稳定 IDs、独立 duration/velocity、跨轨同时起音组 | [score domain](../src/domain/score.ts)；[chords](../src/engine/music-analysis/chords.ts) |
| 分析 | 音域、平均密度、各轨相邻音程、和弦引用和轨道分组；不产生视觉 | [analyzer](../src/engine/music-analysis/analyzer.ts) |
| 几何 | Constellation；seed 决定可复现位置；顺序/声部连接与 bounds | [constellation](../src/engine/music-geometry/strategies/constellation.ts) |
| 编舞 | 非空乐谱生成一名 ensemble Performer；相邻起音 cubic Bézier；note-hit/chord-hit | [planner](../src/engine/choreography/planner.ts) |
| 随机访问 | 绝对歌曲时间求位置、节点状态和瞬态事件；段查找为二分 | [evaluator](../src/engine/choreography/evaluator.ts)、[trajectory](../src/engine/choreography/trajectory.ts) |
| 播放 | play/pause/stop/restart/seek；ended 重播；启动异步 revision 防护 | [clock](../src/playback/clock.ts)、[controller](../src/playback/controller.ts) |
| 音频 | Tone sine Synth 独立声部、lookahead、held-note seek 恢复、limiter | [ToneAudioEngine](../src/audio/ToneAudioEngine.ts)、[scheduler](../src/audio/scheduler.ts) |
| 视觉 | Default Cosmic；Constellation 与 Stream presentation；Overview/Focus/Current Path；主 Performer、轨迹强调和绝对时间卫星生命周期 | [defaultPreset](../src/visual/presets/defaultPreset.ts)、[presentation](../src/visual/presentation/evaluatePresentation.ts)、[Scene](../src/render/Scene.tsx) |
| 环境 | solid 或 gradient；gradient 可带 seeded 星点；默认渐变星点 | [EnvironmentRenderer](../src/render/EnvironmentRenderer.tsx) |
| 相机 | 按当前 presentation 自动取景；受限 wheel zoom、pointer pan 与 Fit World | [staticCamera](../src/visual/camera/staticCamera.ts)、[CameraRig](../src/render/CameraRig.tsx) |
| 应用状态 | 导入编译；seed 加一重编译；preset/view/visibility 切换保留 compiled 引用 | [store](../src/state/store.ts) |
| UI | 音乐作品信息、实时音符/声部、时间线、导入和 transport、view/visibility/fit/effects 控件 | [App](../src/ui/App.tsx) |
| Demo | 原创 C 大调短句：10 音符、8 起音节点、1 和弦组、10.5 秒，默认 seed 107 | [demo](../src/demo/score.ts)、[store](../src/state/store.ts) |

UI 由 `App` 装配音频、播放和相机；Zustand 不拥有歌曲时钟。Regenerate 保留 score 引用，因此不会触发仅依赖 score 的音频重载 effect。时间滑杆对既有曲线求值，不重新规划曲线。

## Partially implemented / contract only

| 扩展点 | 已有部分 | 尚未接通部分 |
| --- | --- | --- |
| 多 Performer | plan 为数组，Scene 遍历数组 | planner 只生成一个；无声部路由或 split/merge |
| 可替换策略 | `compileScore` 接收策略；store 有 strategy 字段 | 没有 setStrategy action 或策略选择 UI；只提供一种真实策略 |
| 可替换预设 | `setPreset`、效果开关、独立视觉类型 | 没有多预设选择 UI；只有一个成品 preset |
| CameraController | 静态 fit + OrbitControls 的 zoom/pan；Stream 使用正面局部取景 | `getState(time, context)` 仍以 0 获取 home state；没有 follow camera 或逐帧 controller |
| 节点类型 | domain 包含 anchor/rest | 当前策略不产生，planner 只接收 note/chord |
| 音色信息 | 保存 channel/instrument | 未按乐器选择音色；不解释 pedal、pitch bend、CC |
| 视觉配置 | 颜色、大小、反馈生命周期等已配置化 | 仍有渲染器固定参数及语义差异，见 [D-01](KNOWN_LIMITATIONS.md#d01-visual-config) |
| 减弱动态偏好 | 挂载时检查偏好并关闭三种效果；CSS 去掉按钮 transition | 没有监听偏好后续变化；不停止核心音乐运动 |

## Not implemented

Follow camera、独立 Flow GeometryStrategy、其他主题/效果/环境成品、MusicXML/live MIDI/音频转谱、phrase/motif/section 分析、多 Performer 编舞、采样钢琴/SoundFont、视频导出、编辑器、后端/账号/云端服务、玩法评分。

这些方向的状态与设计问题只在 [ROADMAP](ROADMAP.md) 维护；类型预留不等于功能已经存在。

## 验证及性能特征

- 当前检查结果和包体积只在 [VERIFICATION](VERIFICATION.md#repository-os-baseline) 维护；如何选择测试见 [TEST_MATRIX](TEST_MATRIX.md)。
- 从代码可确认：节点为 instanced mesh；Focus/Path 对强调节点设 96/36 的配置预算，Stream 最多 120 个局部卫星；隐藏节点仍参与轻量状态遍历，静态连接 geometry 仍保留但在局部模式降低或关闭显示。
- 这些是实现特征，不是性能测量。复杂 MIDI 可读性、密集节点遮挡程度、最高稳定帧率和端到端音画延迟均未建立基准。
- 限额、输入边界及已知不确定性集中见 [KNOWN_LIMITATIONS](KNOWN_LIMITATIONS.md)。
