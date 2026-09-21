# ADR-0001: Score-derived musical presentation

Purpose: 明确 Stream 音乐主线的展示责任，避免与编舞计划混淆。
Authority: 此展示边界的架构决策。
Update when: 展示模型与正式编舞的责任变化。
Last verified: 2026-09-18。
Status: Accepted / Implemented in iteration 03.

## Context

用户要求同一 world/plan 可切换结构视图与 lead-line performance 视图，且主角必须沿音乐轮廓运行。旧 Stream 已直接消费 normalized score，但其水平位移不能满足要求；旧文档“Renderer 不需要乐谱”“visual 不生成轨迹”过于绝对。

## Decision

visual/presentation 增加纯、确定性、可缓存的展示模型：只读 NormalizedScore，按可配置显著性选音，并导出正面 Ribbon 主线、伴随短组及独立 Ensemble 的稳定声部弧区。由绝对 songTime 求值。Renderer 只消费它，不在帧循环中推断音乐结构。此路径是显示投影，不写回 WorldModel/PerformancePlan，不改变真实 note-hit、音符时间或音频调度。Constellation 仍使用正式 PerformancePlan 的主角轨迹；Ensemble 的密集绘制省略只影响显示。

application 的 ScoreSession 缓存正式 CompiledScore；展示模型按 score/config memoize。切换视图不重编译正式世界与计划。无需新增 GeometryStrategy、修改 planner 或引入第二个时钟。

## Consequences

两种视图中的屏幕位置可以不同，音乐时间一致。显著性不是旋律识别，短组不是乐句分析。将来若需要正式多 Performer 演奏职责或改变抵达目标，必须回到 choreography/world 边界，而不能扩展这个显示投影来偷偷调度音乐。
