# Current State

Purpose: 区分当前可用能力、部分接通的扩展点与未实现方向。
Authority: 当前实现状态的主要记录；架构理由见 [ARCHITECTURE](ARCHITECTURE.md)。
Update when: 用户能力、实现覆盖或运行方式改变。
Last verified: 2026-09-20；补充实际 MIDI 的旧编码标题兼容边界。

## Implemented

| 领域 | 当前实际能力 | 代码证据 |
| --- | --- | --- |
| 输入 | 本地 Standard MIDI Type 0/1、PPQ、共享 tempo map；保留轨道/channel/instrument；UTF-8 标题直接读取，旧编码标题仅在文件名可验证时解码或回退 | [parser](../src/midi/parser.ts) `parseMidi`；[normalize](../src/midi/normalize.ts) |
| 乐谱 | 秒制音符、稳定 IDs、独立 duration/velocity、跨轨同时起音组 | [score domain](../src/domain/score.ts)；[chords](../src/engine/music-analysis/chords.ts) |
| 分析 | 音域、平均密度、各轨相邻音程、和弦引用和轨道分组；不产生视觉 | [analyzer](../src/engine/music-analysis/analyzer.ts) |
| 几何 | Constellation；seed 决定可复现位置；顺序/声部连接与 bounds | [constellation](../src/engine/music-geometry/strategies/constellation.ts) |
| 编舞 | 非空乐谱生成一名 ensemble Performer；相邻起音 cubic Bézier；note-hit/chord-hit | [planner](../src/engine/choreography/planner.ts) |
| 随机访问 | 绝对歌曲时间求位置、节点状态和瞬态事件；段查找为二分 | [evaluator](../src/engine/choreography/evaluator.ts)、[trajectory](../src/engine/choreography/trajectory.ts) |
| 播放 | play/pause/stop/restart/seek；ended 重播；启动异步 revision 防护 | [clock](../src/playback/clock.ts)、[controller](../src/playback/controller.ts) |
| 音频 | Tone sine Synth 独立声部、lookahead、held-note seek 恢复、limiter | [ToneAudioEngine](../src/audio/ToneAudioEngine.ts)、[scheduler](../src/audio/scheduler.ts) |
| 视觉 | Constellation 主关系/顺序/声部曲线与和弦辐射结构；Overview/Focus/Current Path；Stream 使用正面 Ribbon 主线与伴随组；独立 Ensemble 使用稳定声部弧区、和弦/声部联系、长音与绝对时间生命周期。密集段只减少绘制代表，不删乐谱 | [musicalPresentation](../src/visual/presentation/musicalPresentation.ts)、[ensemblePresentation](../src/visual/presentation/ensemblePresentation.ts)、[Scene](../src/render/Scene.tsx) |
| 环境 | solid 或 gradient；gradient 可带 seeded 星点；默认渐变星点 | [EnvironmentRenderer](../src/render/EnvironmentRenderer.tsx) |
| 相机 | 投影包围盒取景、wheel zoom、pointer pan、fit/reset 与 Performer follow；Ribbon 正面水平前移；Ensemble 使用正面稳定舞台 | [staticCamera](../src/visual/camera/staticCamera.ts)、[CameraRig](../src/render/CameraRig.tsx) |
| 应用状态 | 多 MIDI 会话曲库缓存 CompiledScore/seed；切曲复用引用、停止归零；显示偏好独立，regenerate 只更新当前曲目 | [store](../src/state/store.ts) |
| UI | Cantivela 暂定品牌、原创 SVG 字标、窄铭牌、大舞台、可配置引语；默认关闭的 View 抽屉和会话曲库、轻量 transport | [App](../src/ui/App.tsx) |
| Demo | 原创 C 大调短句：10 音符、8 起音节点、1 和弦组、10.5 秒，默认 seed 107 | [demo](../src/demo/score.ts)、[store](../src/state/store.ts) |

UI 由 `App` 装配音频、播放和相机；Zustand 不拥有歌曲时钟。Regenerate 保留 score 引用，因此不会触发仅依赖 score 的音频重载 effect。时间滑杆对既有曲线求值，不重新规划曲线。

## Partially implemented / contract only

| 扩展点 | 已有部分 | 尚未接通部分 |
| --- | --- | --- |
| 多 Performer | plan 为数组，Scene 遍历数组 | planner 只生成一个；无声部路由或 split/merge |
| 可替换策略 | `compileScore` 接收策略；store 有 strategy 字段 | 没有 setStrategy action 或策略选择 UI；只提供一种真实策略 |
| 可替换预设 | `setPreset`、效果开关、独立视觉类型 | 没有多预设选择 UI；只有一个成品 preset |
| CameraController | 纯投影 fit controller；CameraRig 用统一 playback snapshot 执行 follow | 不是通用镜头编排器；没有自动 fit active region |
| 节点类型 | domain 包含 anchor/rest | 当前策略不产生，planner 只接收 note/chord |
| 音色信息 | 保存 channel/instrument | 未按乐器选择音色；不解释 pedal、pitch bend、CC |
| 视觉配置 | 颜色、大小、反馈生命周期等已配置化 | 仍有渲染器固定参数及语义差异，见 [D-01](KNOWN_LIMITATIONS.md#d01-visual-config) |
| 减弱动态偏好 | 挂载时检查偏好并关闭三种效果；CSS 去掉按钮与抽屉 transition | 没有监听偏好后续变化；不停止核心音乐运动 |

## Not implemented

独立 Flow GeometryStrategy、其他主题/效果/环境成品、MusicXML/live MIDI/音频转谱、phrase/motif/section 分析、多 Performer 编舞、采样钢琴/SoundFont、视频导出、编辑器、后端/账号/云端服务、玩法评分。

这些方向的状态与设计问题只在 [ROADMAP](ROADMAP.md) 维护；类型预留不等于功能已经存在。

## 验证及性能特征

- 当前检查结果和包体积只在 [VERIFICATION](VERIFICATION.md#iteration-03) 维护；如何选择测试见 [TEST_MATRIX](TEST_MATRIX.md)。
- 从代码可确认：节点为 instanced mesh；Focus/Path 节点预算 96/36，关系线预算 180；Stream 局部音符预算 120，Ensemble 预算 96 并按声部轮询，优先保留进行中/主线/音高轮廓。显示限制不删除 score/world/plan 数据。隐藏节点及关系仍参与 CPU 过滤。
- 显著性短窗默认 0.22 秒；短组按 track、起音间隔与数量上限构建。这是展示启发式，不是真实旋律/乐句分析。曲库元数据从缓存 score 读取，避免重复存储；刷新即清空。
- 这些是实现特征，不是性能测量。复杂 MIDI 可读性、密集节点遮挡程度、最高稳定帧率和端到端音画延迟均未建立基准。
- 限额、输入边界及已知不确定性集中见 [KNOWN_LIMITATIONS](KNOWN_LIMITATIONS.md)。
