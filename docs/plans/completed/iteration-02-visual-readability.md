# Iteration 02 - Visual Readability and Performance Narrative

Purpose: 约束第二轮 UI、相机、可见性与 Stream presentation 的实现范围。
Authority: 本轮实施上下文；不替代 ARCHITECTURE 或产品长期文档。
Update when: 实际范围、实现方案、验证结果或完成状态变化。
Last verified: 2026-09-17；基于提交 `769bc55`、定向源码与测试审阅。

Status: Completed
Source baseline: `769bc55`；用户已有未跟踪 `midi/` 不在本轮范围。
Related roadmap: Readability、Performer Narrative、Artistic UI。
Related ADR: none；本轮沿用既有 WorldModel、PerformancePlan 与时间契约。

## Problem

现有界面具有完整播放能力，但产品身份较弱；相机只做静态整体取景，全部节点与连接长期同时出现。复杂乐谱难以看清当前音乐，也缺少一个稳定的视觉叙事主角。

## User-visible goal

界面形成克制的音乐艺术展览气质；用户可缩放、平移和恢复全景，可在 Overview、Focus、Current Path 间切换，并可在保留 Constellation 的同时切换到局部时间窗驱动的 Stream presentation。

## Current behavior

`App` 显示基本曲名、当前和弦与播放控件；`CameraRig` 只在 layout 时应用 `StaticCamera.getState(0)`；`WorldRenderer` 每帧更新并显示全部节点和静态连接；单 Performer 沿既有 PerformancePlan 运行。

## Desired behavior

- UI 以排版、留白、谱线节奏和原创节点 motif 建立身份，并展示可由现有 score 可靠获得的作品数据。
- 相机支持受限 zoom/pan、Fit World；交互不改变播放、world 或 plan。
- Constellation 的三种 visibility mode 只改变视觉解释，Current Path 强调当前/相邻轨迹。
- Stream 从 score/world/plan/playback 派生局部卫星音符、主 Performer 和生命周期；所有结果由绝对 songTime 纯计算，可 seek、暂停和重放。
- View/visibility 切换保留相同 compiled 引用，不触发音频重新加载。

## Primary modules

`src/visual/` 拥有 presentation/camera 配置与纯求值；`src/render/` 消费求值结果；`src/ui/` 提供艺术界面和克制控件。

## Adjacent modules

- `src/domain/visual.ts`：扩展视觉展示配置，不改变 score/world/performance 契约。
- `src/state/store.ts`：持有 view/visibility 选择，继续复用同一个 compiled。
- `tests/`：验证纯求值、切换不变性、时间随机访问和相机 fit。

## Explicit non-goals

不修改 MIDI/normalization、MusicAnalysis、GeometryStrategy、Choreography 规划、PlaybackClock、AudioEngine/调度、音符和弦语义；不增加 GeometryStrategy、多 Performer、phrase/section/key 分析、移动端重设计、ECS/worker/spatial index 或依赖。

## Architecture invariants

保持 I1–I10。presentation 只读 score/world/plan 和绝对 songTime；不累积 frame state、不改 compiled；Constellation 与 Stream 共享相同 WorldModel/PerformancePlan；音频 effect 仍只依赖 score。

## Expected files

| File / symbol | Reason | Type of change |
| --- | --- | --- |
| `src/domain/visual.ts` | view、visibility、window、camera 配置类型 | visual contract extension |
| `src/visual/presentation/*` | visibility/stream 的确定性纯求值 | new visual behavior |
| `src/visual/camera/staticCamera.ts` | 可测试 fit state 与导航限制 | camera config |
| `src/render/CameraRig.tsx` | zoom/pan/fit 交互 | renderer capability |
| `src/render/WorldRenderer.tsx` | visibility emphasis 与隐藏预算 | visual interpretation |
| `src/render/PerformerRenderer.tsx` | 主角层级 | appearance |
| `src/render/TrajectoryRenderer.tsx` | 当前路径强调 | renderer capability |
| `src/render/StreamRenderer.tsx` | 局部时间窗与卫星音符 | presentation renderer |
| `src/render/Scene.tsx` | 模式装配 | composition |
| `src/state/store.ts` | 单一 view/visibility ownership | state |
| `src/ui/App.tsx`, `styles.css`, `Icons.tsx` | 信息、控件、品牌与响应式层级 | UI |
| `tests/visual.test.ts`, `tests/engine.test.ts` | 纯求值与 compiled 引用不变 | tests |
| 受影响文档 | 用户操作、现状、模块/测试/限制/路线和验证 | docs |

## Public contracts affected

只扩展 visual presentation/camera 类型与 Scene props。NormalizedScore、WorldModel、PerformancePlan、GeometryStrategy、PlaybackClock、AudioEngine 均不改变。无需 ADR 或修改 ARCHITECTURE。

## Implementation approach

1. 建立集中式 `PresentationConfig` 与无 React/Three 依赖的纯求值函数。
2. store 保存选择项；setter 只替换选择字段，不触碰 compiled/preset。
3. Renderer 按模式过滤昂贵对象并强调当前轨迹；Stream 使用固定容量 instancing，绝对时间重建可见卫星。
4. CameraRig 复用静态 fit 算法作为 home view，以受限 controls 支持 zoom/pan；fit token 触发重置。
5. UI 使用“暗色演奏手稿”方向：谱线结构、作品信息、节点 motif、轻量分段控件，场景保持主角。

## Risks

- Three imperative instance count/matrix 必须在隐藏/空窗口时正确清零。
- Orbit controls 与外层 UI 指针事件可能冲突，需浏览器验证。
- 当前 WorldModel 的和弦合并节点不能直接给出和弦内各音高；Stream 从 score 的 node.noteIds 恢复多个卫星，不能改 chord timing。
- 700+ 节点的可读性可通过局部实例数改善，但本轮没有正式 GPU benchmark。

## Test plan

- 新纯函数测试：Overview/Focus/Path 分类、Stream chord satellites、相同输入确定性、随机 seek 恢复、窗口外隐藏。
- store 测试：view/visibility 切换保持 `compiled` 和其中 world/plan 的严格引用相等。
- camera fit 测试：有效 state 和确定性；交互只能浏览器检查，不读取播放状态。
- 运行定向 visual/engine tests，再运行 `npm run test`、`npm run lint`、`npm run build`。

## Visual Verification

- Scene A：内置 demo，检查 UI 层级、zoom/pan/fit、三种 visibility、Constellation/Stream、播放中切换、seek/pause。
- Scene B：使用程序生成的 700+ node score，仅作为本地验证数据，不新增产品输入；检查 Focus/Path/Stream 的局部内容与实例预算。
- 对常用桌面和中等窗口截图，检查层级、留白、字体、焦点与 console；不把 DOM 存在当作 WebGL 成功。

## Completion criteria

- [x] 两种 view 与三种 visibility 可用，切换不重编译或重载音频。
- [x] Stream 主角和卫星由绝对时间求值，和弦可显示多个卫星。
- [x] zoom/pan/fit 不修改 world、plan 或 playback。
- [x] UI 信息全部来自现有可靠数据，未伪造 key/section。
- [x] 定向、全量 test/lint/build 通过，浏览器两场景有证据。
- [x] 受影响文档按事实更新，plan 记录证据后归档。
- [x] diff 不包含禁止模块或用户 `midi/`。

## Execution notes and completion evidence

2026-09-17：按计划完成。实现范围与预期一致；未修改 MIDI、analysis、geometry、choreography、playback 或 audio。Focus/Path 在 720 音符视觉检查后增加 96/36 节点预算，Stream 预算调整为 120；这是 presentation 配置内的可读性修正。

验证：定向 visual + engine 21 项通过；最终全量 5 文件/38 测试、lint、build 通过。浏览器覆盖 demo 和临时 720 音符 MIDI、seek/pause、播放中 view 切换、wheel/drag/fit；console 无 error，保留既有 Three Clock warning。详细证据见 [VERIFICATION](../../VERIFICATION.md#iteration-02)。
