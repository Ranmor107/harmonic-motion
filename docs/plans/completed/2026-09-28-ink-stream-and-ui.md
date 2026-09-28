# Ink Stream preset, coordinated UI and style buttons

Purpose: 为水墨 Stream 舞台、配套界面与原版/水墨切换建立可执行的有限实施计划。
Authority: 本任务的设计与实施边界；当前能力仍以 CURRENT_STATE 和源码为准。
Update when: 用户调整视觉方向、切换规则、实施范围或验证证据。
Last verified: 2026-09-28；实现、自动检查与浏览器验证已完成，边界见完成记录。

Status: Completed
Source baseline: `f9f6b7b`；用户未跟踪的 `midi/` 与产品计划 `.docx` 保持原样。
Related request / roadmap item: 用户明确选择先规划水墨 Stream，并要求一套配套 UI，可通过按钮切换；见 [ROADMAP](../../ROADMAP.md)。
Related ADR: 延续 [ADR-0001](../../decisions/ADR-0001-musical-presentation.md) 的纯展示原则；不改变音乐时间、世界或编舞语义，无需新增架构决策。

## Problem

用户希望尝试“音乐在水墨画卷上展开”的完整审美方向。现有深色舞台、球形音符和几何主角能够表达音乐，但不能通过单纯调色呈现纸面、笔触、晕染和配套浅色界面。

这是用户主动选择的视觉探索，不是已证实的可用性缺陷，也不代表更多主题会提高留存。本轮通过一套新风格与现有原版对照，验证音乐是否依然清楚、观看是否舒适。

规划时只授权形成计划；2026-09-28 用户“按照计划进行设计”已授权实施以下完整交付。

## User-visible goal

在 Stream 中提供两个明确按钮 `Original` / `Ink`（原版 / 水墨）。选择后，舞台、页头、作品信息、Controls、曲库和播放栏作为一套外观同步变化；操作位置与品牌身份保持一致。

水墨版呈现暖灰纸面、边缘淡景、连续笔势、墨点音符、少量叶形伴奏与有限余韵。用户仍能辨认主旋律、其他声部、和弦、起音和长音。

## Current behavior

- `VisualPreset` 已组合 theme / effects / environment / camera / presentation；`setPreset` 不重新编译 score/world/plan。
- `StreamRenderer` 固定绘制球形音符、Ribbon 面及关系线、几何主角、命中圆环和球状尾迹。原版线形已于 `f9f6b7b` 恢复，作为本计划的保留基线。
- `EnvironmentConfig` 只有 solid / gradient；渐变可带 seeded 星点，尚无图片/纸纹背景配置。
- `Scene` 按 `preset.presentation` 引用派生展示模型，按 `preset.camera` 派生相机配置；无意义地更换这些引用会造成额外更新。
- UI 使用深色 CSS 变量，并存在固定色值、暗角和遮罩；舞台换色不会自动得到完整浅色界面。
- `SavedPreferences` 已保存曲库选择、位置、视图、效果、音量、跟随及轨道选择，未保存 Stream 风格。

## Desired behavior

### 1. 风格切换与作用范围

| 场景 | 约定行为 |
| --- | --- |
| 首次使用或旧偏好没有风格字段 | 默认 Original，不改变现有首次体验 |
| Stream → Ink | 舞台和配套 UI 一起切换；播放中继续、暂停时保持暂停 |
| Stream → Original | 恢复原版舞台与界面，包括本轮前的 Ribbon 线形；允许保留新增切换入口 |
| 同一风格再次点击 | 无操作，不重复分配资源或触发 fit/load |
| 离开 Stream | 使用该视图现有原版舞台与 UI；不将水墨强套到 Constellation / Ensemble |
| 返回 Stream | 恢复最后一次选择的 Stream 风格 |
| 切换曲目 | 延用 Stream 风格；切曲的归零行为继续由既有流程负责 |
| 刷新/再次打开 | 恢复 Stream 风格及既有偏好；依照现有规则恢复到暂停，不自动发声 |

风格切换保持当前歌曲时间、播放状态、音量/静音、轨道焦点、Effects 开关、跟随状态、手动缩放和平移。保留同一 Canvas/CameraRig 的运行实例，不用重新挂载整幅场景或调用 Fit 来实现换肤。

风格 ID 只保存一份；由“当前 View + Stream 风格偏好”派生舞台与 UI 的有效外观，避免 UI 和场景各有一份可能失步的主题状态。

### 2. 水墨舞台设计

| 层次 | 设计 | 可读性约束 |
| --- | --- | --- |
| 纸面 | 暖灰宣纸、低频纹理；优先静止底图 | 不用亮白底，不让纸纹穿透小字影响识别 |
| 远景 | 画面边缘极淡山形/竹影，中央留白 | 图像服务于音乐布局；首版不做巨幅滚动山水和复杂卷轴动画 |
| 主旋律 | 清晰深墨音点与连续笔势 | 沿用当前音符位置和曲线走向，改变笔触材质，不再重试线形算法 |
| 辅助声部 | 较淡墨点、短笔触，少量叶形笔触组成音群 | 叶形附着于既有音符位置/关系，不做随机飘落与翻飞 |
| 和弦 | 同时落下的清楚墨心，周围形成局部淡墨关系 | 每个音仍可辨认，不让多个扩散团合成大片黑块 |
| 主角 | 一个小而清晰的运笔墨心，后接短笔锋 | 与静止音符区分，尺寸和尾迹克制，不叠加醒目旋转几何体 |
| 起音/余韵 | 发声时先有明确墨心，再让边缘渗开、渐淡 | 起音时刻不因晕染延迟；扩散半径、浓度和存在时长有上限 |
| 长音 | 保留时长方向的笔触，释放后退墨 | 不把长音仅表现为一次短暂爆墨 |

效果采用绝对歌曲时间与稳定 note ID 求值。可以用少量纹理/图集和参数化材质表现渗透；不做逐帧累积的真实流体模拟，不保存整曲越积越黑的画布。

音乐结构出现与变化是主要运动。首版沿用正面 Stream 镜头、跟随和缩放行为，不另外增加镜头摆动或景深后处理。

### 3. 配套 UI 与按钮布局

桌面布局草图（结构说明，非最终视觉稿）：

```text
Cantivela · Music in space       Style [Original] [Ink]    状态    Controls
┌──────────────────────────────────────────────────────────────────────┐
│ 作品名称/时长/轨道           大面积留白的水墨 Stream 舞台              │
│                               音符、笔势与声部关系                    │
│ 现有引语                                          当前音乐信息       │
└──────────────────────────────────────────────────────────────────────┘
播放/切曲       当前时间 ─────── 进度 ─────── 总时长      重听/音量/导入
```

- Stream 下桌面页头显示紧邻的两个按钮，文字为 Original / Ink；按钮标签始终不变，以选中填充/边框及 `aria-pressed` 表达状态。Tab 可到达，Enter/Space 可切换。
- 在窄屏将同一组按钮放入 Controls 的 View 之后；页头不挤压品牌和 Controls。离开 Stream 后隐藏专属风格入口；View 说明明确水墨属于 Stream。
- 水墨外观覆盖页头、品牌线稿颜色、作品卡、当前音乐信息、Controls/曲库、transport、进度条、按钮状态、错误提示和焦点框。同步处理场景暗角与左侧遮罩，避免浅色舞台套在旧黑框中。
- 保留 Cantivela 字标、已有文案、同一组 SVG 图标和操作层级。标题可用系统宋体/衬线回退；按钮、小字和时间使用清晰的系统字体，不引入远程字体依赖。
- 控件用稳定的细边框与少量朱色强调，装饰集中在舞台；不把纸纹、印章、毛笔图标铺满每个控件。
- Effects Off 或 reduced motion 时保留基本音符、关系和生命周期，停用辅助晕染/尾迹/背景装饰运动；可读性不依赖特效开关。

候选色板（实施时需在真实纹理、hover/disabled/focus 状态下复核）：

| 用途 | 候选值 | 说明 |
| --- | --- | --- |
| 纸面 | `#F1EBDD` | 暖灰米色，避免纯白大面积亮度 |
| 面板 | `#E8E1D2` | 与纸面轻微分层 |
| 正文/主墨 | `#26352F` | 稍带青色的深墨 |
| 次要文字 | `#5C655F` | 保持信息可读，不追求过浅 |
| 选中/强调 | `#9C4538` | 克制朱色 |
| 分隔线 | `#B7B0A1` | 仅用于非文字的弱分隔，不独自承担焦点/选中识别 |

纯色计算：正文、次要文字、强调色对纸面分别约 10.82 / 5.07 / 5.32:1，对面板分别约 9.88 / 4.63 / 4.86:1。它们是规划色值的静态对比度，不代表整套 UI 已通过视觉或无障碍验收。

### 4. 资源加载和退路

- 纸纹、淡景和少量笔触图集随应用提供本地资源；先复用纹理与批量绘制，不为每个音符建立独立图片请求或材质。
- 首次选择 Ink 时，如资源尚未就绪，保留当前完整外观与播放，按钮提供简短准备状态；资源就绪后同一次状态更新切换舞台和 UI。
- 快速往返点击时以最后一次选择为准；过期资源加载结果不得把 Original 强行切回 Ink。
- 加载失败保留现有可用外观，提供简短重试提示；不暂停音频、不清空曲库。已成功加载的资源可复用，切换中的临时对象正确释放。

## Primary module

[visual / render](../../CODEBASE_OPERATING_MODEL.md#visual)：新增水墨 preset 及实际绘制能力；C02/C03/C04/C09。UI 样式和按钮属于 C01，见 [影响矩阵](../../CHANGE_IMPACT_MATRIX.md)。

## Adjacent modules

- UI：舞台与外围界面必须同步，已有深色常量需要局部令牌化；不重排全部页面或更名品牌。
- state / persistence：增加 Stream 风格 ID 与其保存/恢复，兼容现有 version 1 偏好，缺失或无效 ID 回退 Original，不丢弃其余偏好。
- domain/visual：仅为水墨外观与图像背景补实际需要的判别类型/参数；类型不携带 React、Three 实例或音乐调度能力。
- camera 只核对 props 与引用稳定性，默认无源码改动；若验证暴露风格切换意外重置取景，先修正组合层传值。

## Explicit non-goals

- 本轮不实现星空第二新主题，不改圆盘/Constellation 的美术语言，也不增加新的 View。
- 不改变显著性选音、轨道聚焦算法、音符位置、Ribbon 曲线、显示预算或正式编舞。
- 不修改 MIDI、analysis、geometry、choreography、playback、audio 的核心行为。
- 不做流体求解、全屏后处理链、无限墨迹积累、主题编辑器、任意图片上传或在线素材库。
- 不加入截图、状态快照、视频导出、用户账户或外部服务；录制只是已有画面的检查场景。

## Architecture invariants

遵守 [十项原则](../../ARCHITECTURE.md#architecture-invariants)，重点验证 I1/I2/I3/I4/I5/I6/I7/I8/I10：

- 同一权威歌曲时间驱动所有笔触与余韵；直接 seek 到某时刻与自然播放到该时刻得到相同的显示状态。
- 切换保持 CompiledScore / WorldModel / PerformancePlan 的严格引用，不调用 compile/regenerate，不重新加载音频。
- 原版与水墨复用同一 presentation 和 camera 配置引用；切换不重建音乐展示模型，不触发 fit，不重置 zoom/pan/follow。
- 只读取完整 score 的派生音乐数据；不因水墨效果减少或删除发声音符。

## Expected files

以下为实施阶段预计文件；本次规划仅新增本计划并更新 ROADMAP / plan index。

| File / symbol | Reason | Type of change |
| --- | --- | --- |
| `src/domain/visual.ts` | 水墨绘制与背景资源的最小数据配置 | additive visual contract |
| `src/visual/presets/`、`themes/`、`effects/`、`environments/` | 一套水墨 preset、色值/参数及确定性效果求值；复用原版 presentation/camera | config / visual behavior |
| `src/render/StreamRenderer.tsx` | 水墨音符、笔触、主角与余韵；保留 Original 绘制路径 | render |
| `src/render/EnvironmentRenderer.tsx`、`Scene.tsx` | 纸面/淡景背景、有效外观装配、引用与资源生命周期 | render integration |
| 新增少量本地水墨资源（最终目录在实施时选定） | 纸纹、淡景、笔触图集；记录用途与来源 | assets |
| `src/ui/App.tsx`、`styles.css` | 原版/水墨按钮与整套 UI、状态反馈、响应式/键盘行为 | UI |
| `src/state/store.ts`、`persistence.ts` | 单一风格偏好与旧数据兼容 | state / persisted preference |
| `tests/visual.test.ts`、`session.test.ts`；必要时单独的水墨效果测试 | 确定性、预算、切换不重编译、偏好回退 | regression tests |
| 受影响的 README / CURRENT_STATE / TEST_MATRIX / VERIFICATION / 模块地图 | 在实现后记录真实能力、操作、入口和检查证据 | docs |

## Public contracts affected

视觉数据配置和保存的偏好会有向后兼容的增量。风格 ID 是简单枚举/已知 registry key；UI 颜色使用 CSS 变量，由同一有效风格驱动，不复制一套独立主题状态系统。

保留旧 solid/gradient 和现有 DefaultPreset。新增背景分支时同步更新 Scene 的背景求值与 renderer，不能把新类型误当 gradient。旧偏好无需清库或重导 MIDI；新增可选字段的缺省和非法值都应有局部回退。

score/world/plan、PlaybackClock 与 AudioEngine 接口保持原样。此计划覆盖增量视觉契约；若以后改成需要历史积累的模拟或改变时间语义，必须另行评估，不能作为本计划的顺手扩展。

## Implementation approach

1. **对照基线与视觉样段**：在同曲同时间记录 Original 的画面与性能；选用 Quick Study、多轨样本及用户已授权卡农的代表片段，覆盖单音、和弦、长音和快速段。制作水墨背景/笔触与配套 UI 样段，检查音符层级。
2. **最小风格入口**：加入单一风格偏好、有效 preset 求值、原版/水墨按钮和旧偏好恢复；保持 presentation/camera 引用与 Effects 设置。先证明切换不影响时间、模型和取景。
3. **完整水墨外观**：接入纸面、淡景、墨点/叶形、主笔势、主角与有限晕染，并完成页面所有区域的配套样式。复用音符位置和曲线采样，不重写展示模型。
4. **集中验收与收敛**：浏览器验证密集段、主题往返、加载/失败、暂停/seek、长曲、窄屏和全屏；只针对暴露的问题修正。通过后更新实际文档、提交和归档，保留用户素材。

以上步骤是同一个有限交付，不把星空或更多 View 的适配混入本轮。

## Risks

- **墨迹糊成一团**：限制透明层重叠、半径、浓度和余韵；主旋律墨心始终清楚，优先缩减装饰复杂度。
- **背景夺走焦点**：中央留白，远景压低对比；UI 信息区使用干净底色，不依赖一张任意画作恰好留下空间。
- **位置/播放意外重置**：检查 preset 派生引用、Canvas key、加载 effect 依赖；不要用重挂载来清理特效。
- **资源加载/快速切换**：最后一次意图优先，原版是完整回退路径；首次加载和热切换分别记录。
- **性能/资源累积**：沿用现有音符显示预算（当前上限 120）；效果额外对象按可见音符数设置有限上限。GPU 纹理资源不能随播放时长持续增长。
- **浅色界面疲劳或文字不清**：暖灰底与实测对比度并用，检查中文长标题、弱文字、选择/禁用/错误/焦点状态。
- **录制后表现变化**：低频纸纹、克制细线和晕染；实际压缩视频未检查前标为 Unverified，不用浏览器截图代替。

## Test plan

按 [TEST_MATRIX](../../TEST_MATRIX.md) 的 T-VISUAL / T-STATE / T-UI / T-GLOBAL 执行。以下均为后续实施要求，不是本次规划已运行的检查。

**自动检查与代码核对：**

- 新增有行为意义的断言：同 ID/时间效果一致；直接 seek 与按时间采样一致；出现/起音/长音/淡出边界正确；效果数量有限。
- Original/Ink 及往返 View 保持同一 compiled/world/plan；共享 presentation/camera；已关闭的 Effects 不被换肤重新打开。
- 风格偏好保存恢复，旧记录缺字段与未知 ID 只回退该字段；其余曲库/偏好保留。
- 检查音频加载 effect、controller 与 Canvas 的依赖/挂载路径。若需要计数证明，使用测试期观察记录；纯 store 测试和浏览器时间连续不能单独证明音频 load 次数。
- 定向 `npm run test -- tests/visual.test.ts tests/session.test.ts tests/engine.test.ts`，新增效果测试存在后纳入。最后运行完整 `npm run test`、`npm run lint`、`npm run build`。

**浏览器与视觉：**

| 检查 | 通过条件 |
| --- | --- |
| 同时刻 Original / Ink 截图 | 明显不同且完整的舞台/UI；水墨无旧暗框、错色图标或看不清的文字 |
| 音乐可读性 | 主旋律、伴奏、和弦、长音可区分；快速段无大片墨团遮住音符；不靠随机叶子运动制造热闹 |
| 暂停、播放、seek、主题切换 | 暂停画面稳定，播放连续；前后 seek 重建对应笔触；不重置缩放/跟随/轨道焦点 |
| View 往返与刷新 | Ink → Ensemble/Constellation 显示原版；返回 Stream 恢复 Ink；刷新恢复偏好和暂停位置 |
| Effects / reduced motion | 关闭装饰后仍能看清结构；切换主题不擅自恢复已关闭效果 |
| UI 与窗口 | 桌面、390px 窄屏、全屏；切换入口可发现、键盘可用、抽屉可滚动，原有控件不挤出屏幕 |
| 连续与往返 | 至少一首 3–5 分钟作品；预热后往返切换 20 次，资源数量趋于稳定，不随次数持续增长；console 无新增错误 |
| 性能对照 | 同浏览器/设备/视口/曲目时段，记录现有 `?benchmark` 的 frame median/P95、draw calls、实例、geometry/texture 数。目标为热状态 median/P95 相对 Original 不恶化超过约 20%；若超出先缩减水墨效果，未达标需记录取舍，不能声称通用帧率保证 |
| 录制观察 | 若现有外部录制工作流可用，检查一段实际压缩样片的纸纹、细线和拖尾；否则清楚标为待验证，不在本轮加入录制功能 |

## Documentation updates

规划阶段只更新本计划、[计划索引](../index.md) 和 ROADMAP，状态为 Planned；不把方案写入 Implemented。

实施后按真实变化更新操作说明、当前能力、相关模块入口、测试映射与实际证据；Default 的保留边界和旧偏好兼容需要写清。全部完成标准通过后再移入 completed。架构与 ADR 仅在稳定契约事实确实改变时更新，不为美术样式另造架构。

## Completion criteria

- [x] Stream 中 Original / Ink 按钮可用，舞台与整套 UI 同步切换，响应式和键盘检查通过。
- [x] 水墨呈现纸面、笔触、明确墨心与有限晕染，主次声部和长音在代表片段可读。
- [x] Original 的现有线形和舞台保留；其他 View 的舞台正常，返回 Stream 恢复风格选择。
- [x] 切换保持世界/计划、音频、播放状态/时间、取景、轨道焦点和效果偏好。
- [x] 时间求值确定、可 seek；旧偏好兼容、资源加载失败和快速切换有实际检查。
- [x] test / lint / build 及浏览器、长曲、性能对照有真实证据；未做的录制/真人舒适度评价明确标注。
- [x] 差异只在授权范围，用户素材保留；文档与提交记录完整，完成后归档。

## Execution notes and completion evidence

2026-09-28 完成：独立 Ink renderer、参数化批量笔触、本地纸面淡景、整套浅色 UI、响应式 Original / Ink 按钮与 version 1 可选风格偏好已接通。原版 StreamRenderer blob 完全保留；相机/展示配置共用引用，Canvas/CameraRig 与歌曲加载 effect 不重新挂载。test 12 文件 / 89 项、lint、build 通过。

内置浏览器检查 Quick Study、卡农及八轨土耳其进行曲，覆盖 dense / chord / sustain、关闭装饰、键盘、390px、全屏、三视图往返、刷新恢复、至少 3 分钟连续水墨演奏及 20 次换肤；加载延迟/失败/取消/重试通过测试期故障注入验收，最终代码已删除注入和观察日志。缩放姿态及平移后画面保持；暂停两次截图相同。最新刷新恢复卡农、Ink、126.009 秒暂停、Auto、40% 音量、Effects On、Follow On 和静音 Off，浏览器无新增 error。

1280×720、土耳其进行曲 179.2 秒热样本：Original median/P95 为 6.0/12.0ms，Ink 为 5.6/12.9ms；draw calls 8→4，geometries 7→4，GPU textures 都为 0。P95 增加 7.5%，本次达成约 20% 的目标；墨迹 CPU 缓冲约增加 0.81MB，固定预算而非随时间累积。后台约 1000ms 的节流样本排除，不能据此保证跨设备 FPS。真实压缩录制、声卡质量及真人长期舒适度仍未验证；未更改系统 reduced motion 设置。

完整检查与限制见 [VERIFICATION](../../VERIFICATION.md#ink-stream-2026-09-28)。本地截图/指标在忽略的 `artifacts/ink-stream/`；只读使用的用户 MIDI 与 `.docx` 保持未跟踪，未进入提交。以下规划记录保留为历史，不代表当前未实现。

完成文档检查：本轮 10 份 Markdown 的 256 条本地链接及锚点均可解析，`git diff --check` 通过。计划已移至 completed 并更新 registry/ROADMAP；产品源码、测试和本地 SVG 以本轮专用路径暂存，用户素材排除。

2026-09-28 实施开工：沿用本计划边界，新增独立 InkStreamRenderer 保留原版 StreamRenderer 的完整绘制路径；本地 SVG 提供静态纸面/淡景，参数化批量笔触提供墨心、叶形与有限晕染，不引入外部依赖。共享 camera/presentation 引用、同一 Canvas 和 CameraRig；单一 Stream 风格偏好驱动 UI 与舞台。执行定向与全量检查、浏览器视觉和资源验收后归档。

2026-09-28：核对 `f9f6b7b` 的视觉配置、Stream/Scene、state/persistence、UI、RenderDiagnostics 和仓库工作协议；形成上述方案。只计算候选纯色对比度，未制作视觉资源、未修改产品源码、未运行产品 test/lint/build 或浏览器验收。上述完成项全部保留未勾选。

规划文档检查：本轮 3 份 Markdown 的 61 条本地链接及其锚点通过核对，`git diff --check` 通过；产品源码、测试、public 资源及依赖文件均无差异。
