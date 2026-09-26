# Roadmap

Purpose: 保留已提出方向、状态和待验证设计，不将探索写成开发承诺。
Authority: 未来方向与工作状态的主要记录；现状只看 [CURRENT_STATE](CURRENT_STATE.md)。
Update when: 方向被选择、明确排期、开始实施、完成验证、延期或被替代。
Last verified: 2026-09-26；按产品迭代计划选择 First Experience，记录本轮实现与待外部验证。

## 状态约定

| Status | 意义 |
| --- | --- |
| Exploration | 方向/责任边界尚待验证 |
| Candidate | 适合考虑的候选，未排期、未批准实施 |
| Planned | 有明确任务范围、完成标准及链接的 plan；不等于已实现 |
| Active | 已开始本轮授权工作，保留相应实施上下文 |
| Completed | 目标及验收完成，有实现或验证证据 |
| Deferred | 明确暂缓，仍保留原因和重新评估条件 |

没有计划文件或明确选择时，不把 Candidate 自动晋升 Planned。模板存在不等于已有实施计划。

## Now

### Product milestones

用户提供的《Harmonic Motion 产品迭代计划》以用户问题而非功能数量排序：First Experience → Listening Quality → Continuity → Musical Understanding → Long-session Comfort → Capture & Share。本表只记录当前证据；详细方向仍以该产品计划为准。

| 目标 | 状态 | 当前证据 / 剩余问题 |
| --- | --- | --- |
| A · First Experience | Partially completed · Needs external user validation | [本轮计划](plans/completed/2026-09-26-first-experience.md)：原创约 31 秒 Quick Study、首屏试听/导入入口、可关闭视觉解释与 View 用途已实现；开发者浏览器验证通过。尚无陌生用户的首次使用观察，也未筛选 Full Studies |
| B · Listening Quality | Candidate | 仍为统一 sine Synth，无音量/静音；需真实听感验证后实施 |
| C · Continuity | Candidate | 曲库、进度和偏好只在当前页面内存保留；刷新后不能恢复 |
| D · Musical Understanding | Candidate | 已有基本视图解释和启发式主线；未有手动 track/voice 高亮与旋律轨选择 |
| E · Long-session Comfort | Candidate | 尚无长曲舒适度与稳定性系统验证 |
| F · Capture & Share | Deferred | 先证明首次进入、听感和回访体验 |

本轮从 Planned → Active → 实现完成并待外部用户验证；不将整个 Milestone A 标记为 Completed。后续重评优先级时以真人观察和当前用户问题为依据。

| 项目 | 状态 | 证据 / 边界 |
| --- | --- | --- |
| Engine Foundation | Completed | 产品基线 `db67599`；[当前状态](CURRENT_STATE.md)、[验证记录](VERIFICATION.md) |
| Repository Knowledge System | Completed | Markdown 导航、ownership、路由、验证映射及计划模板已建立；[本轮检查](VERIFICATION.md#repository-os-baseline)；不包含功能开发 |
| Musical Identity, Relation Language & Multi-Score Experience | Completed | [Iteration 03 plan](plans/completed/iteration-03-musical-identity.md)；`a8f5319`；[验证证据](VERIFICATION.md#iteration-03) |

## Next · Candidates

| 方向 | 状态 | 拟解决的问题 / 下一步验证 | 路由 |
| --- | --- | --- | --- |
| Zoom / pan、Fit World、Overview | Completed | Iteration 02；不修改 world/plan/playback | [C05](CHANGE_IMPACT_MATRIX.md#c05-camera) |
| Follow view | Completed | Iteration 03；Constellation 跟随正式主角，Stream 仅平稳前移；手动导航退出跟随 | [C05](CHANGE_IMPACT_MATRIX.md#c05-camera) |
| Fit current active region | Candidate | 定义局部取景范围和与手动导航的关系 | [C05/C06](CHANGE_IMPACT_MATRIX.md#c06-visibility) |
| Focus / Current Path / trajectory emphasis | Completed | Iteration 02；配置时间窗和显示预算，不删 WorldModel 节点 | [C06](CHANGE_IMPACT_MATRIX.md#c06-visibility) |
| 主 Performer 视觉焦点与 Stream satellites | Completed | Iteration 02 presentation；仍是一名 choreography Performer | [C09](CHANGE_IMPACT_MATRIX.md#c09-appearance) |
| Artistic UI：作品信息、实时音乐、时间线、motif、层级 | Completed | Iteration 02；只使用现有可靠 score/playback 数据 | [C01](CHANGE_IMPACT_MATRIX.md#c01-ui) |
| 新主题、效果、环境、相机样式 | Candidate | 先区分可配置字段和缺少的 Renderer 能力；参考 D-01 | [C02–C05](CHANGE_IMPACT_MATRIX.md#c02-theme) |

## Later

| 方向 | 状态 | 进入实施前需要的证据 |
| --- | --- | --- |
| Flow / Spiral / Ribbon / Architectural 等真实策略 | Exploration | 明确空间语义；证明现有 WorldModel/单 Performer planner 是否适用 |
| phrase / motif / section / melody extraction / voice separation | Exploration | 数据定义、算法目标、可验证的音乐标注；分析结果保持数据化 |
| multi-performer / split / merge / voice-based choreography | Exploration | 独立演奏职责、同时抵达、事件和计划契约；先 plan/必要 ADR |
| 真实 MIDI corpus 与性能优化 | Candidate | 可使用的测试素材、规模、设备、帧率/编译耗时基准；先测量再优化 |
| Bundle splitting | Candidate | 有公网交付/首屏目标时衡量；当前警告见验证记录，不与本轮文档任务混合 |
| Video export / image sequence | Deferred | 当前优先证明播放与视觉语义；恢复讨论前明确音频同步和导出契约 |
| MusicXML/live MIDI/转录等其他输入 | Exploration | 具体用户场景、NormalizedScore 可表达性、验证样本 |

## Exploration · Design decision to validate

**Stream 展示方案已落实：使用独立纯展示投影，见 [ADR-0001](decisions/ADR-0001-musical-presentation.md)。** 以下保留两个方向的区别；真实 Flow GeometryStrategy 仍是独立探索，不能将当前 Ribbon/Helix 展示模式称作新几何引擎。

| 选项 | 实际改变什么 | 需要验证 |
| --- | --- | --- |
| A. Constellation 内的 presentation / camera / visibility mode | 保持世界坐标和计划，改变观看与出现/消失规则 | 既有轨迹是否能表达期待的观看体验；是否仅需要显示变换 |
| B. 新 Flow / Ribbon GeometryStrategy | 重新定义节点空间关系，编舞消费新世界 | 是否明确要求几何关系改变；旧 planner 是否可复用；新策略可否满足到达约束 |

二者看起来相近，但责任层不同。先问清楚用户需要的音乐/空间语义，不能先以“左到右”把时间硬编码成全产品 X 轴，也不能把新的真实空间组织伪装成无影响的相机改动。

**Temporary satellite note objects** 当前已作为纯显示对象实现。未来若独立承担演奏职责、轨迹或 split/merge，则属于 performance/choreography 契约。参见 [R09–R11](CHANGE_IMPACT_MATRIX.md#near-term-routing)。

选定候选后，在 [plans](plans/index.md) 建立必要的实施边界；只有真正的架构决策才进入 [decisions](decisions/index.md)。本页不预先替尚未选择的未来方案作决定。
