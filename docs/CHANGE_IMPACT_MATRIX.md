# Change Impact Matrix

Purpose: 将用户需求路由到负责模块、最小源码范围、验证与文档更新。
Authority: 任务路由的主要记录；实际符号和依赖见 [模块地图](CODEBASE_OPERATING_MODEL.md)。
Update when: 模块边界、路由或已验证的责任归属变化。
Last verified: 2026-09-17；产品基线 `db67599`。近期方向均为 future routing，不是已实现功能。

表中 I1–I10 按 [ARCHITECTURE 十项 invariants](ARCHITECTURE.md#architecture-invariants) 的编号引用。
验证代号 T-* 的完整命令、覆盖与全量条件仅在 [TEST_MATRIX](TEST_MATRIX.md#targeted-validation) 维护。
Secondary 是有证据才展开的邻域；不是默认要修改的清单。

## 常见任务路由

| Change type | Primary modules / 起点 | Secondary：何时展开 | Normally untouched | Invariants | Required validation | Documentation update trigger |
| --- | --- | --- | --- | --- | --- | --- |
| <a id="c01-ui"></a>C01 UI / layout：按钮、字体、标题、艺术化控制区 | [ui](CODEBASE_OPERATING_MODEL.md#ui)：App、styles、Icons；品牌才看 public/mark.svg | 新状态才看 state；场景内视觉才看 visual/render | midi、analysis、geometry、choreography、audio、clock | I1/I8：布局不能改音乐或 compiled | T-UI | 用户操作变更→README；能力变化→CURRENT_STATE；纯排版通常无稳定文档要改 |
| <a id="c02-theme"></a>C02 Visual Theme：颜色、材质、lighting | [visual](CODEBASE_OPERATING_MODEL.md#visual)：defaultCosmic、defaultPreset | 字段无解释能力时看对应 renderer；新字段看 domain/visual；选择器才看 UI/state | MIDI、analysis、geometry、choreography、audio、clock | I5/I6/I8/I10 | T-VISUAL；灯光注意 D-01 | 新主题→CURRENT_STATE/ROADMAP；入口改变→模块地图；契约改变才更新 ARCHITECTURE |
| <a id="c03-effects"></a>C03 Effects：粒子、trail、hit、pulse/bloom | defaultEffects；[EffectsRenderer](../src/render/EffectsRenderer.tsx)；trail 在 [PerformerRenderer](../src/render/PerformerRenderer.tsx) | 新效果能力涉及 domain/visual 与 Scene 装配；后处理依赖需独立评估 | MIDI、geometry、planner、audio | I2/I3/I6/I8 | T-VISUAL；新增纯求值函数补定向测试 | 效果能力/契约/覆盖变化才更新对应文档；调数值不需改架构 |
| <a id="c04-environment"></a>C04 Environment/background | defaultEnvironment、[EnvironmentRenderer](../src/render/EnvironmentRenderer.tsx)、Scene 的背景容器 | 新 image/video/shader 联合类型才看 domain/visual；用户切换才看 UI/state | score、WorldModel、planner、audio、clock | I5/I8/I10 | T-VISUAL | 新环境支持→CURRENT_STATE；资源/输入边界变化→KNOWN_LIMITATIONS；契约→ADR/架构 |
| <a id="c05-camera"></a>C05 Camera/navigation：zoom、pan、orbit、follow、fit | [staticCamera](../src/visual/camera/staticCamera.ts)、[CameraRig](../src/render/CameraRig.tsx) | 交互控制→UI/局部 view state；动态目标→播放快照/plan 只读消费；新配置→domain/visual | midi、analysis、geometry、planner、audio；通常 clock 也不变 | I3/I8；相机不能移动真实节点 | T-CAMERA | 新导航能力→CURRENT_STATE/ROADMAP；相机契约→模块地图/ARCHITECTURE/ADR |
| <a id="c06-visibility"></a>C06 Visibility / Active Window / Current Trajectory Only | [render](CODEBASE_OPERATING_MODEL.md#render)：WorldRenderer、PerformerRenderer、EffectsRenderer；从现有 playback time/plan 派生显示状态 | 模式参数→visual 配置；选择控件→UI/state；确需新音乐语义再看 domain | 默认 world generator、WorldModel、score、audio、clock | I3/I5/I8：隐藏不删音乐节点，不重新编译 | T-VISIBILITY | 显示能力→CURRENT_STATE；可读性证据→KNOWN_LIMITATIONS；新契约才改架构 |
| <a id="c07-geometry"></a>C07 Geometry Strategy：Constellation、Spiral、Flow 等 | [music-geometry](CODEBASE_OPERATING_MODEL.md#music-geometry) 的接口与策略；store 装配 | 只有新 WorldModel 语义/可抵达目标改变才看 domain/world、planner；选择 UI 另算 | VisualTheme、EffectProfile、AudioEngine、PlaybackClock | I1/I2/I5/I9；沿用 planner 时每起音一个节点 | T-GEOMETRY；新增策略有自己的断言 | 成品策略→CURRENT_STATE/ROADMAP；新文件入口→模块地图；改接口→ARCHITECTURE/ADR/路由/测试映射 |
| <a id="c08-choreography"></a>C08 Choreography：轨迹、routing、多 Performer、split/merge | [choreography](CODEBASE_OPERATING_MODEL.md#choreography)、domain/performance | 新曲线/事件语义才扩展 render 消费者；替换 planner 时看 compile；多目标可能涉及 geometry 契约 | 默认 MIDI、theme、音色、clock | I1/I2/I3/I6 | T-CHOREOGRAPHY；跨契约 T-GLOBAL | 新计划语义→ARCHITECTURE/ADR；能力→CURRENT_STATE；ownership/覆盖变更→对应地图 |
| <a id="c09-appearance"></a>C09 Performer appearance：形状、材质、视觉主角 | performerStyle、[PerformerRenderer](../src/render/PerformerRenderer.tsx) | 新 shape→domain/visual；相机视觉聚焦→C05；装饰卫星→C03 | planner、trajectory、domain/performance、midi、audio | I6/I8：外观和运动分开 | T-VISUAL | 新外观能力→CURRENT_STATE；纯配色/大小通常不改架构 |
| <a id="c10-midi"></a>C10 MIDI parsing / normalization / future input | [midi](CODEBASE_OPERATING_MODEL.md#midi)、domain/score | groupOnsets→analysis + geometry；pedal 等新表达→audio；MusicXML 是新输入适配器候选，先确认数据表达 | 默认 Renderer、Theme、Camera | I4；时间转换还涉及 I1/I3 | T-MIDI；变更时序还跑 T-GLOBAL | 支持输入/限额→CURRENT_STATE/KNOWN_LIMITATIONS；score 契约→ARCHITECTURE/ADR |
| <a id="c11-audio"></a>C11 Audio：samples、SoundFont、scheduler、polyphony、latency | [audio](CODEBASE_OPERATING_MODEL.md#audio) | 改时间映射→playback；更换适配器/now 注入→App；新表达输入→score/midi | WorldModel、geometry、theme、renderer | I1/I3/I7 | T-AUDIO；真实声音必须试听，不用 mock 替代 | 音频能力/限制→CURRENT_STATE/KNOWN_LIMITATIONS；时间模型改变→ADR/ARCHITECTURE |
| <a id="c12-playback"></a>C12 Playback：seek、pause、loop、scrub、clock | [playback](CODEBASE_OPERATING_MODEL.md#playback) | 调度协同→audio；控件/状态显示→App；快照类型消费者→render/types | 默认 geometry、theme、MIDI parser、planner | I1/I2/I3/I7 | T-PLAYBACK；时间模型改变 T-GLOBAL | 状态/时间契约→ARCHITECTURE/ADR；能力和覆盖→CURRENT_STATE/TEST_MATRIX |
| <a id="c13-domain"></a>C13 Domain / shared contract | 目标 domain 文件，或 utils 的共享语义 | 用符号搜索找所有真实 producer/consumer；不能只改类型后压制编译错误 | 未使用该契约的模块 | 按具体契约检查 I1–I10 | T-GLOBAL，先 plan；语义改变考虑 ADR | ARCHITECTURE/模块地图；只有路由/覆盖也变了才更新矩阵 |

## 相机与可见性路由的当前事实

- 已有“根据全世界 bounds 自动静态取景”；没有用户可操作的 Fit all/overview 开关。
- CameraRig 的执行方式是 layout effect + `getState(0, ...)`，不是按歌曲时间更新。Follow 需先定义目标和更新路径，不能只写一个新配置就声称完成。
- WorldRenderer 每帧更新全部节点并显示所有连接；没有 Active Window。
- 节点间直线是 WorldModel 的连接，不等于 PerformancePlan 的 Bézier。Current Trajectory Only 应显示已有 plan 的当前段，不在 Renderer 里重新规划轨迹。

<a id="near-term-routing"></a>
## 已讨论方向的 future routing

全部是 **Proposed**，此表不批准实现，也不替代 [ROADMAP](ROADMAP.md) 的状态。

| ID / Direction | 最可能变更类型 | 路由与最小边界 / 待验证点 |
| --- | --- | --- |
| R01 Artistic UI redesign | UI / visual change | C01；先改 styles、标题和控制区；不改引擎 |
| R02 Zoom / pan navigation | camera change + renderer capability | C05；交互 view state 与音乐 world 分开；需要控件才扩 UI/state |
| R03 Follow camera | camera change + renderer capability；可能 visual domain contract | C05；先明确跟随哪个 Performer、time/target 如何传入；不改他的轨迹 |
| R04 Fit current active region | camera change + playback-derived display | C05 + C06；从当前时间窗的既有节点算临时显示 bounds，不覆盖 world.bounds |
| R05 Overview mode | configuration + camera/display capability | C05/C06；已有静态整体取景可复用，但模式切换 UI 尚无 |
| R06 Active Window mode | visual change + renderer capability | C06；只过滤绘制集合/样式；保留完整 score/world/plan |
| R07 Current Trajectory Only mode | renderer capability | C06；定位并采样既有 segment；不产生新计划 |
| R08 Main Performer visual focus | visual/configuration；也可能 camera | C09，必要时 C05；改变大小/对比度不应改 routing |
| R09 Temporary satellite note particles | effects/renderer capability | C03/C09；纯装饰读 hit/time；若每个对象有独立演奏职责与轨迹，则升级 C08 并先 plan |
| R10 Note objects appear → perform → disappear | visibility / effects；是否 choreography 待确认 | C06/C03；显示生命期可由 note/event duration 派生；独立表演角色需新契约 |
| R11 Left-to-right stream presentation | **Design decision to validate** | A：保持 Constellation 的 camera/presentation/visibility；B：新增 Flow/Ribbon GeometryStrategy。先确认是否要求世界坐标/连接真正改变，不能混用或预选 B |
| R12 Alternative Geometry Strategy | geometry change | C07；保持旧 WorldModel/plan 契约时不动 audio/clock/visual |
| R13 Alternative Visual Themes | configuration；可能 renderer capability | C02；已有材质/形状够用则仅配置；新视觉能力先明确 Renderer 缺口 |
| R14 Alternative Effects | configuration；可能 renderer capability/domain visual contract | C03；生命周期仍由绝对时间计算 |
| R15 Alternative Environment | configuration；新媒体类型需 renderer/domain visual contract | C04；默认不重编译世界 |

## 两个可执行的导航示例

**Add zoom/pan**：先读 C05 → 模块地图 visual/render → T-CAMERA。搜索 `CameraRig` / `CameraController` / `StaticCamera`；先打开 CameraRig、staticCamera、domain/visual。只有交互接线需要时打开 Scene/App。MIDI、geometry、planner、audio 默认不读不改。若只增加 view state，不更新 ARCHITECTURE；若新增 camera public contract，先 plan。

**Add a GeometryStrategy**：先读 C07 → 模块地图 music-geometry/compilation/state → T-GEOMETRY。搜索 `GeometryStrategy` / `generateWorld` / `compileScore` / `strategy`；新增策略文件并在应用组合处接入。先证明 WorldModel 仍被现有 planner 接受，增加真实几何断言。Audio/PlaybackClock/VisualTheme 默认不读不改。只有契约无法表达需求，才按工作流扩大范围。
