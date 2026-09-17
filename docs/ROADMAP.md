# Roadmap

Purpose: 保留已提出方向、状态和待验证设计，不将探索写成开发承诺。
Authority: 未来方向与工作状态的主要记录；现状只看 [CURRENT_STATE](CURRENT_STATE.md)。
Update when: 方向被选择、明确排期、开始实施、完成验证、延期或被替代。
Last verified: 2026-09-17；依据当前源码、已知限制与用户提出的候选方向；没有产品功能排期。

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

| 项目 | 状态 | 证据 / 边界 |
| --- | --- | --- |
| Engine Foundation | Completed | 产品基线 `db67599`；[当前状态](CURRENT_STATE.md)、[验证记录](VERIFICATION.md) |
| Repository Knowledge System | Completed | Markdown 导航、ownership、路由、验证映射及计划模板已建立；[本轮检查](VERIFICATION.md#repository-os-baseline)；不包含功能开发 |
| 当前产品功能开发 | 无 Active 项 | 没有在本轮启动下一项产品需求 |

## Next · Candidates

| 方向 | 状态 | 拟解决的问题 / 下一步验证 | 路由 |
| --- | --- | --- | --- |
| Zoom / pan、Fit World、Overview | Completed | Iteration 02；不修改 world/plan/playback | [C05](CHANGE_IMPACT_MATRIX.md#c05-camera) |
| Follow view、fit current active region | Candidate | 保持音乐世界不变，定义跟随目标/时间输入 | [C05/C06](CHANGE_IMPACT_MATRIX.md#c06-visibility) |
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

**“主 Performer 从左向右移动，周围音符出现、演奏、消失”暂不决定架构。**

| 选项 | 实际改变什么 | 需要验证 |
| --- | --- | --- |
| A. Constellation 内的 presentation / camera / visibility mode | 保持世界坐标和计划，改变观看与出现/消失规则 | 既有轨迹是否能表达期待的观看体验；是否仅需要显示变换 |
| B. 新 Flow / Ribbon GeometryStrategy | 重新定义节点空间关系，编舞消费新世界 | 是否明确要求几何关系改变；旧 planner 是否可复用；新策略可否满足到达约束 |

二者看起来相近，但责任层不同。先问清楚用户需要的音乐/空间语义，不能先以“左到右”把时间硬编码成全产品 X 轴，也不能把新的真实空间组织伪装成无影响的相机改动。

**Temporary satellite note objects** 同样有待分辨：只伴随命中事件的装饰属于 effects/render；若独立承担音符、轨迹或 split/merge，则属于 performance/choreography 契约。参见 [R09–R11](CHANGE_IMPACT_MATRIX.md#near-term-routing)。

选定候选后，在 [plans](plans/index.md) 建立必要的实施边界；只有真正的架构决策才进入 [decisions](decisions/index.md)。本页不预先替未来方案作决定。
