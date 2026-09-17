# Codebase Operating Model

Purpose: 按真实模块定位 ownership、输入输出、公共入口与最小修改邻域。
Authority: 模块归属的主要记录；契约语义以 [ARCHITECTURE](ARCHITECTURE.md) 为准。
Update when: 入口、依赖、公共符号、模块职责或测试归属发生变化。
Last verified: 2026-09-17；审阅 `db67599` 的全部 40 个 src 文件、4 个测试文件和工程配置。

下面“允许/禁止”是维护边界，不声称全由工具强制。实际 lint 仅对 domain/engine/playback 禁止列出的框架、视觉模块导入及 `Math.random`；不覆盖全部跨层规则，也没有禁止全局 DOM API。具体见 [eslint.config.js](../eslint.config.js)。

测试命令、全量检查条件统一见 [TEST_MATRIX](TEST_MATRIX.md)，任务到模块的选择见 [CHANGE_IMPACT_MATRIX](CHANGE_IMPACT_MATRIX.md)。本文件不复制完整类型定义。

<a id="domain"></a>
## Domain

- **Primary paths / entry points**：[score.ts](../src/domain/score.ts)、[analysis.ts](../src/domain/analysis.ts)、[world.ts](../src/domain/world.ts)、[performance.ts](../src/domain/performance.ts)、[visual.ts](../src/domain/visual.ts)。
- **Responsibility / owns**：跨层可序列化数据契约；visual.ts 也属于纯类型定义，不放 Three 对象或默认样式。
- **Consumes → produces**：基础 TS 类型、其他 domain 类型 → 乐谱、分析、世界、计划、视觉配置的静态契约；无运行时生成器。
- **Public contracts / symbols**：`NormalizedScore`、`MusicAnalysis`、`WorldModel`、`Vec3`、`PerformancePlan`、`PerformerPlan`、`TrajectoryCurveDefinition`、`PerformanceEvent`、`VisualPreset`、`CameraController`。
- **Allowed dependencies**：domain 内 type import。**Forbidden / undesirable**：React、Three、Tone、DOM、应用 store、解析器或具体 renderer。
- **Related tests**：[engine.test.ts](../tests/engine.test.ts)、[midi.test.ts](../tests/midi.test.ts)、[playback.test.ts](../tests/playback.test.ts)、[audio.test.ts](../tests/audio.test.ts) 间接验证；无独立 schema 校验套件。
- **Safe local changes**：注释/澄清类型描述；字段或联合类型变更是 public contract 变更，不视为无影响小改动。
- **Adjacent scope**：搜索该类型所有 producer/consumer；从真实引用扩大，不默认读取全部核心。
- **Must NOT decide**：生成算法、调度策略、渲染对象或 UI 行为。

<a id="midi"></a>
## MIDI

- **Primary paths / entry points**：[parser.ts](../src/midi/parser.ts) `parseMidi`、[normalize.ts](../src/midi/normalize.ts) `normalizeMidi` / `normalizeScore`。
- **Responsibility / owns**：二进制入口、输入限制和错误；将可靠秒制数据及稳定 IDs 规范化。
- **Consumes → produces**：ArrayBuffer/Uint8Array → `@tonejs/midi.Midi` → `NormalizedScore`；`ScoreInput` 也支持程序化 demo。
- **Public contracts / symbols**：`parseMidi(data, filename?)`、`ScoreInput`、`MIDI_LIMITS`；保留跨轨共享时间轴和起始空白。
- **Allowed dependencies**：`@tonejs/midi`、domain、utils，以及现有 music-analysis 的 `detectChords` 纯函数。**Forbidden / undesirable**：Three、render、theme、camera、Tone 音频合成或 UI。
- **Related tests**：[midi.test.ts](../tests/midi.test.ts) 的 `MIDI normalization`；修改起音语义还涉及 [engine.test.ts](../tests/engine.test.ts)。
- **Safe local changes**：在既有 score 契约内修正解析错误提示、兼容输入或验证边界。
- **Adjacent scope**：新增 pedal/输入格式需先分析 domain/score 和 audio；限制提示同时在 App 做文件体积预检。
- **Must NOT decide**：节点位置、颜色、轨迹、相机；UI 导入操作由 App 负责。

<a id="music-analysis"></a>
## Music analysis

- **Primary paths / entry points**：[analyzer.ts](../src/engine/music-analysis/analyzer.ts) `analyzeScore`；[chords.ts](../src/engine/music-analysis/chords.ts) `groupOnsets` / `detectChords`。
- **Responsibility / owns**：基础音乐描述及同时起音分组的唯一共享算法。
- **Consumes → produces**：score / 已按起音排序的 notes → `MusicAnalysis`、`NoteEvent[][]` 或 `ChordEvent[]`。
- **Public contracts / symbols**：`ONSET_EPSILON`、pitchRange、noteDensity、intervals、trackGroups；分析输出本身是数据。
- **Allowed dependencies**：domain、纯 utils。**Forbidden / undesirable**：UI、render、视觉配置、Tone、对外部状态的读写。
- **Related tests**：[midi.test.ts](../tests/midi.test.ts) 包含分析与短琶音测试；[engine.test.ts](../tests/engine.test.ts) 覆盖分组下游。
- **Safe local changes**：修正现有分析字段的计算，增加对应纯数据测试；先检查字段是否真被消费。
- **Adjacent scope**：`chords.ts` 同时被 normalize 和 constellation 调用。分组容差修改会影响节点数、note IDs 归组及计划事件。
- **Must NOT decide**：颜色、空间实体、抵达路径、演奏效果。
- **现状提醒**：constellation 使用 analysis 的 pitchRange/trackGroups；它自己从相邻起音计算空间音程，未直接消费 analysis.intervals/noteDensity/chords。

<a id="music-geometry"></a>
## Music geometry

- **Primary paths / entry points**：[GeometryStrategy.ts](../src/engine/music-geometry/GeometryStrategy.ts)、[generator.ts](../src/engine/music-geometry/generator.ts)、[strategies/constellation.ts](../src/engine/music-geometry/strategies/constellation.ts)。
- **Responsibility / owns**：音乐语义到空间节点、层、连接和 bounds 的映射；seed 控制生成差异。
- **Consumes → produces**：`NormalizedScore` + `GeometryContext { analysis, seed }` + strategy → `WorldModel`；`generateWorld` 先运行 analyzeScore，返回 analysis/world。
- **Public contracts / symbols**：`GeometryStrategy.generate`、`generateWorld`、`ConstellationGeometryStrategy`；`SPACE` 和 `boundsOf` 为该实现私有细节。
- **Allowed dependencies**：domain、music-analysis 纯函数、utils。**Forbidden / undesirable**：theme/effects/camera、renderer、audio、playback/React。
- **Related tests**：[engine.test.ts](../tests/engine.test.ts) 的 `Music Geometry Engine`、`Independent extension points`。
- **Safe local changes**：保持 WorldModel 语义的策略实现/参数，或新增独立策略。
- **Adjacent scope**：strategy 装配在 [store.ts](../src/state/store.ts)；pipeline 在 [compile.ts](../src/engine/compile.ts)；节点契约变更再检查 choreography。
- **Must NOT decide**：材质、背景、粒子数、音频、相机或 Performer 外观。通常不动 audio/clock/theme。
- **现状提醒**：bounds 包含原点；每起音一个可抵达节点；单个和弦可引用多个 layerIds。

<a id="compilation"></a>
## Compilation composition

- **Primary path / entry point**：[src/engine/compile.ts](../src/engine/compile.ts) `compileScore`。
- **Responsibility / owns**：连接既有生成与编舞，不重新实现音乐分析或视觉解释。
- **Consumes → produces**：score + strategy + seed → `CompiledScore { score, analysis, world, plan }`。
- **Public contracts / symbols**：`compileScore`、`CompiledScore`；score 保留输入引用。
- **Allowed dependencies**：domain、geometry generator、planner。**Forbidden / undesirable**：UI、store、Tone、视觉 preset。
- **Related tests**：[engine.test.ts](../tests/engine.test.ts)；store 的独立性用例也经过此入口。
- **Safe local changes**：不改变输出契约的装配修正；新策略通常无需改此函数。
- **Adjacent scope**：只有 pipeline 的输入/输出或 planner 可替换机制改变，才涉及 state/domain。
- **Must NOT decide**：用户选择项、默认风格、播放开始/停止。

<a id="choreography"></a>
## Choreography

- **Primary paths / entry points**：[planner.ts](../src/engine/choreography/planner.ts)、[trajectory.ts](../src/engine/choreography/trajectory.ts)、[evaluator.ts](../src/engine/choreography/evaluator.ts)。
- **Responsibility / owns**：编译按时抵达的参数化轨迹；由绝对时间查询位置、节点状态和事件窗口。
- **Consumes → produces**：world + score → `PerformancePlan`；curve/performer/node/plan + time → Vec3/状态/事件子集。
- **Public contracts / symbols**：`planPerformance`、`evaluateTrajectory`、`evaluateSegment`、`evaluatePerformer`、`evaluateNode`、`eventsInWindow`。
- **Allowed dependencies**：domain、utils。**Forbidden / undesirable**：Three、Tone、DOM、theme、粒子或球体尺寸。
- **Related tests**：[engine.test.ts](../tests/engine.test.ts) 的 `Choreography and random access`；空谱/单节点用例在 `Music Geometry Engine`。
- **Safe local changes**：同一 curve 契约内调整控制点；保持端点、时间和可重复性。
- **Adjacent scope**：multi-performer/split/merge 涉及 domain/performance 和 compile；新增 curve 联合类型涉及 evaluator 消费方。Renderer 使用纯 evaluator 不等于它生成编舞。
- **Must NOT decide**：Performer 外观、材质、相机、播放时钟、声音何时由碰撞触发。

<a id="playback"></a>
## Playback

- **Primary paths / entry points**：[clock.ts](../src/playback/clock.ts) `PlaybackClock`；[controller.ts](../src/playback/controller.ts) `PlaybackController`。
- **Responsibility / owns**：唯一歌曲时间映射及用户动作与音频接口的协调。
- **Consumes → produces**：注入的 now、duration、用户命令、AudioEngine 接口 → `PlaybackState` / source timestamps / 音频控制调用。
- **Public contracts / symbols**：`PlaybackStatus`、`PlaybackState`、clock 的 play/pause/stop/restart/seek/getState/getCurrentTime/setDuration/sourceTimeFor；controller 的 load/play/pause/stop/restart/seek/dispose。
- **Allowed dependencies**：domain、utils；controller 仅 type-import AudioEngine。**Forbidden / undesirable**：Tone 具体实现、React、Three、视觉配置、第二套累计音乐时间。
- **Related tests**：[playback.test.ts](../tests/playback.test.ts) 的 clock/coordination；[audio.test.ts](../tests/audio.test.ts) 的真实 controller + mock Tone。
- **Safe local changes**：已定义状态和接口内的时序修正，配可复现测试。
- **Adjacent scope**：loop/新状态/速度倍率可能影响 audio/sourceTimeFor、UI 和播放快照，先 plan。
- **Must NOT decide**：世界坐标、Bézier 控制点、声部音色或特效。
- **现状提醒**：`clock.restart` 与 `controller.restart` 层级不同；UI 应走 controller 才会同步音频。

<a id="audio"></a>
## Audio

- **Primary paths / entry points**：[AudioEngine.ts](../src/audio/AudioEngine.ts)、[ToneAudioEngine.ts](../src/audio/ToneAudioEngine.ts)、[scheduler.ts](../src/audio/scheduler.ts)。
- **Responsibility / owns**：音频解锁、音符调度、独立声部复用/销毁与输出；scheduler 仅是事件游标。
- **Consumes → produces**：NormalizedScore + clock → Web Audio 声音；notes + time → `ScheduledNote[]`。
- **Public contracts / symbols**：`AudioEngine`、`ToneAudioEngine`、`audioNow`、`NoteScheduler.reset/takeUntil`、`ScheduledNote`。
- **Allowed dependencies**：Tone、score 类型、clock、utils、定时器。**Forbidden / undesirable**：renderer、visual preset、WorldModel、自己推进歌曲时间。
- **Related tests**：[playback.test.ts](../tests/playback.test.ts) 的 `Audio event scheduling`；[audio.test.ts](../tests/audio.test.ts)。
- **Safe local changes**：相同 AudioEngine/clock 契约下换音色适配器、修正声部分配或调度。
- **Adjacent scope**：更换音频后端需检查 `App` 中构造与 `audioNow` 注入；pedal 先确认 score 表达；改主时间源涉及 playback。
- **Must NOT decide**：世界结构、Performer 轨迹、视觉事件。默认不改 geometry。
- **现状提醒**：`play()` 只解锁 Tone；controller 启动 clock 后调用 `seek()` 才开始 pump。只直接调用 audio.play 不代表会演奏。

<a id="visual"></a>
## Visual configuration and camera

- **Primary paths / entry points**：[themes/defaultCosmic.ts](../src/visual/themes/defaultCosmic.ts)、[effects/defaultEffects.ts](../src/visual/effects/defaultEffects.ts)、[environments/defaultEnvironment.ts](../src/visual/environments/defaultEnvironment.ts)、[camera/staticCamera.ts](../src/visual/camera/staticCamera.ts)、[presets/defaultPreset.ts](../src/visual/presets/defaultPreset.ts)。
- **Responsibility / owns**：视觉配置及纯 CameraController；组合 preset，独立于乐谱编译。
- **Consumes → produces**：domain/visual 类型、相机 bounds/aspect/config → VisualTheme/EffectProfile/EnvironmentConfig/VisualPreset/CameraState。
- **Public contracts / symbols**：`DefaultCosmicTheme`、`DefaultEffects`、`DefaultEnvironment`、`DefaultCamera`、`StaticCamera`、`DefaultPreset`；类型定义在 domain/visual。
- **Allowed dependencies**：domain、其他 visual 配置、纯 utils（如确有需要）。**Forbidden / undesirable**：MIDI 解析、修改 score/world/plan、音频调度、生成轨迹。
- **Related tests**：[engine.test.ts](../tests/engine.test.ts) 的 `Independent extension points` 仅证明编译数据引用稳定；无相机或渲染单测。
- **Safe local changes**：既有字段内换色/调参/组合 preset；确认对应字段已被 Renderer 解释。
- **Adjacent scope**：新材质/形状/环境/效果能力需 render；动态相机需 CameraRig 的时间/目标输入；选择器才涉及 UI/state。
- **Must NOT decide**：音乐语义和节点坐标。约束与能力差异见 [D-01](KNOWN_LIMITATIONS.md#d01-visual-config)。

<a id="render"></a>
## Render

- **Primary paths / entry points**：[Scene.tsx](../src/render/Scene.tsx)、[WorldRenderer.tsx](../src/render/WorldRenderer.tsx)、[PerformerRenderer.tsx](../src/render/PerformerRenderer.tsx)、[EffectsRenderer.tsx](../src/render/EffectsRenderer.tsx)、[EnvironmentRenderer.tsx](../src/render/EnvironmentRenderer.tsx)、[CameraRig.tsx](../src/render/CameraRig.tsx)、[types.ts](../src/render/types.ts)。
- **Responsibility / owns**：R3F/Three 对象生命周期、由音乐数据推导的视觉状态、画面取景执行与错误降级。
- **Consumes → produces**：world + plan + `PlaybackSnapshot` + preset + 独立传入的 CameraController → canvas/3D 场景；快照是 `RefObject<PlaybackState>`。
- **Public contracts / symbols**：Scene props、各 renderer props、PlaybackSnapshot；通过纯 evaluator 获取位置与时间窗口。
- **Allowed dependencies**：React、R3F、drei、Three、domain、纯 choreography evaluator/trajectory、utils；只读取 playback 类型。**Forbidden / undesirable**：raw MIDI、parse/analyze/generate/plan 调用、Tone、改变 WorldModel。
- **Related tests**：没有组件/截图/WebGL 自动测试；[engine.test.ts](../tests/engine.test.ts) 只覆盖被调用的纯函数和 preset 独立性；需浏览器 smoke。
- **Safe local changes**：材质解释、显示层过滤、既有参数的效果表现；保持绝对时间求值。
- **Adjacent scope**：显示模式先看 visual 类型；交互操作再看 App；新增计划语义才需 domain/performance，不能从视觉需求直接倒推重写 planner。
- **Must NOT decide**：音符时序、几何生成或编舞路线。
- **关键连接**：Scene 接收的 `cameraController` 与 preset.camera 配置是两个入口；CameraRig 当前调用 `getState(0, ...)`。连接线直接连节点，并非绘制 Bézier 曲线；trail 才采样已有 Performer 路径。

<a id="state"></a>
## State / application composition

- **Primary path / entry points**：[src/state/store.ts](../src/state/store.ts) `createStudioStore` / `useStudio`。
- **Responsibility / owns**：compiled、seed、strategy、preset 及应用级默认值。
- **Consumes → produces**：demo/导入 score、compileScore、默认策略/preset → Zustand 应用状态和 actions。
- **Public contracts / symbols**：`setScore`、`regenerate`、`setPreset`；`StudioState` 为文件内接口，没有 setStrategy action。
- **Allowed dependencies**：Zustand、domain、compile、策略、demo、visual 默认值。**Forbidden / undesirable**：把歌曲时钟/每帧对象移入 store、解析二进制或控制 Tone 声部。
- **Related tests**：[engine.test.ts](../tests/engine.test.ts) 的 preset 引用不变与 regenerate 用例。
- **Safe local changes**：应用组合或新增局部选择状态；不要为了一个 UI 控件重构 store。
- **Adjacent scope**：策略选择 action 涉及 UI；setScore 生命周期由 App 的 score effect 接到 controller。
- **Must NOT decide**：曲线计算、时钟算法、材质解释。视觉变化只更新 preset，不触发 compileScore。

<a id="ui"></a>
## UI and bootstrap

- **Primary paths / entry points**：[src/main.tsx](../src/main.tsx)、[App.tsx](../src/ui/App.tsx)、[styles.css](../src/ui/styles.css)、[Icons.tsx](../src/ui/Icons.tsx)；品牌资产 [mark.svg](../public/mark.svg)，页面壳 [index.html](../index.html)。
- **Responsibility / owns**：用户输入、布局/文案、错误/忙碌状态、服务装配、播放快照桥接。
- **Consumes → produces**：用户文件/按钮、store、controller、Scene → DOM/UI 与用户命令；rAF 读取时钟并写快照，约 32ms 更新文本状态。
- **Public contracts / symbols**：`App`、`Icon`；内部 `onLoad`、`togglePlayback`、`toggleEffects` 是主要定位符号。
- **Allowed dependencies**：React、state、midi、playback、audio、visual camera、render、utils。**Forbidden / undesirable**：重新实现解析/生成/编舞/时钟；这层可装配多模块，不代表每次改布局都要修改它们。
- **Related tests**：没有 UI 自动测试；需 [TEST_MATRIX 的浏览器清单](TEST_MATRIX.md#manual-smoke)。
- **Safe local changes**：styles、标题、按钮布局、文案；尽量不触碰同文件中的 controller 生命周期。
- **Adjacent scope**：新选择器到 state；控制行为到 controller；新增显示模式到 visual/render。
- **Must NOT decide**：节点位置、起音时间、轨迹控制点。音高读数表示最近事件，不是完整的同时发声声部清单。

<a id="demo"></a>
## Demo

- **Primary path / entry point**：[src/demo/score.ts](../src/demo/score.ts) `createDemoScore`。
- **Responsibility / owns**：默认原创程序化乐句。
- **Consumes → produces**：显式 notes/time/duration/velocity → normalizeScore → NormalizedScore。
- **Public contracts / symbols**：`createDemoScore()`；无二进制素材依赖。
- **Allowed dependencies**：midi 的纯 normalizeScore。**Forbidden / undesirable**：Tone、Three、store、商业曲目或网络资源。
- **Related tests**：[engine.test.ts](../tests/engine.test.ts)、[playback.test.ts](../tests/playback.test.ts) 直接使用 demo 并包含具体时刻/数量断言。
- **Safe local changes**：明确要求时调整示例内容；须同步依赖该示例的断言，不能用改 demo 掩盖算法错误。
- **Adjacent scope**：App 的 demo 描述和固定 notes/chord 文案；默认注入点在 store。
- **Must NOT decide**：几何或视觉风格、播放规则。

<a id="utils"></a>
## Shared pure utilities

- **Primary path / entry points**：[src/utils/math.ts](../src/utils/math.ts)。
- **Responsibility / owns**：纯数学、确定性 PRNG、排序数组二分边界。
- **Consumes → produces**：numbers/Vec3/有序数组 → 数值、向量、随机数闭包或索引。
- **Public contracts / symbols**：`clamp`、`lerp`、`mixVec`、`seededRandom`、`upperBound`（首个严格大于 time 的元素索引）。
- **Allowed dependencies**：domain 的 Vec3 type。**Forbidden / undesirable**：框架、全局随机性、音乐/视觉策略。
- **Related tests**：PRNG/轨迹在 engine；upperBound 被 playback/audio/evaluator 间接覆盖。
- **Safe local changes**：有明确必要性且保持签名与边界语义的纯函数修正。
- **Adjacent scope**：此处消费者跨多个层；修改边界/PRNG 输出可能改变所有世界和调度，需全量检查。
- **Must NOT decide**：默认主题、起音分组、时钟状态。

<a id="tests"></a>
## Tests and validation assets

- **Primary paths / entry points**：[midi.test.ts](../tests/midi.test.ts)、[engine.test.ts](../tests/engine.test.ts)、[playback.test.ts](../tests/playback.test.ts)、[audio.test.ts](../tests/audio.test.ts)；[fixtures](../tests/fixtures/)。
- **Responsibility / owns**：可执行回归证据和程序化 MIDI 测试素材；不定义产品行为的第二份实现。
- **Consumes → produces**：真实模块、fixture、假时钟/mock Tone → Vitest 断言结果。
- **Public contracts / symbols**：测试 suite 名称和 fixture 语义；精确命令由 [TEST_MATRIX](TEST_MATRIX.md) 管理。
- **Allowed dependencies**：Vitest、待测模块、MIDI fixture 构造工具。**Forbidden / undesirable**：联网、用户私人 MIDI 作为默认fixture、把 mock 结果宣称为真实音频/浏览器结果。
- **Related tests**：本模块即四份测试；发现规则为 [vite.config.ts](../vite.config.ts) 的 `tests/**/*.test.ts`，运行环境 Node。
- **Safe local changes**：需求相关的行为断言、最小可复现回归用例；不改断言来掩盖失败。
- **Adjacent scope**：新增浏览器/音频集成框架会涉及依赖和配置，应单独计划；文档任务不创建它们。
- **Must NOT decide**：未获请求的产品扩展或人为扩大支持范围。

## 定向搜索起点

```sh
rg -n 'CameraRig|CameraController|getState\(0' src/render src/visual src/domain/visual.ts
rg -n 'GeometryStrategy|compileScore|strategy' src/engine src/state tests/engine.test.ts
rg -n 'setPreset|compiled|regenerate' src/state src/ui/App.tsx tests/engine.test.ts
```

这些是导航示例，不要求每轮全部运行。文件目录采用当前扁平 render 布局；不存在 `src/render/effects/` 或 `src/render/camera/` 子目录。
