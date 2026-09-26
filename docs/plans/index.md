# Implementation Plans

Purpose: 以任务为边界保存中型/跨模块工作的范围、理由、验证和完成标准。
Authority: 实施上下文及其生命周期；长期事实归档后回到各 canonical 文档。
Update when: plan 新建、范围或状态改变、完成归档。
Last verified: 2026-09-26；登记 First Experience 实施计划。

## 使用时机

小型局部修改可只给简短范围说明。中型/跨模块改动、public contract 改动或跨三个及以上责任层时使用 plan；判断方法见 [工作流](../DEVELOPMENT_WORKFLOW.md#3-minimal-change-and-expansion-threshold)。
plan 是实施边界，不是永久架构规范。真正的架构决策另用 [ADR](../decisions/index.md)，二者互相链接，避免复制全部推理。

## 创建和归档

1. 从 [PLAN_TEMPLATE](PLAN_TEMPLATE.md) 创建 `active/YYYY-MM-DD-short-topic.md`，写明 source baseline。
2. 明确 Problem、goal、primary/adjacent scope、non-goals、expected files、contracts、tests、completion criteria。
3. 记录执行中发现的范围变化和证据；plan 本身不能自动授权新增工作。
4. 达到全部完成标准后补验证/提交引用，将原文件移入 `completed/`，更新下表及相关链接。
5. 未完成或被阻塞的计划留在 active，清楚写状态与下一步；不假装完成。被取消的计划归档时明确 Cancelled，不记作 Completed。

只在方向实际选定后建 plan，不为每个 roadmap 候选建立空壳文件。active 下的 README 是目录说明，不是活跃任务。

## Plan registry

| Plan | Status | Path | Evidence / next step |
| --- | --- | --- | --- |
| First Experience: Quick Study and clear first entry | Completed | [completed plan](completed/2026-09-26-first-experience.md) | `c80b6c5`；[验证证据](../VERIFICATION.md#first-experience-2026-09-26)。本轮实现完成，Milestone A 仍需外部用户验证 |
| Windows one-click launcher and process cleanup | Completed | [completed plan](completed/2026-09-22-one-click-launcher.md) | `start-harmonic-motion.cmd` + PowerShell lifecycle cleanup；[验证证据](../VERIFICATION.md#one-click-launcher-2026-09-22) |
| Radial Stage: inner-to-outer depth emergence | Completed | [completed plan](completed/2026-09-21-radial-depth-emergence.md) | Hidden→Emerging→Approaching→Active→Fading、内外纵深与弧形展开已实现；实现提交 `1f1c891`；[验证证据](../VERIFICATION.md#radial-depth-emergence-2026-09-21) |
| Complex music: readability, depth and rendering budgets | Completed | [completed plan](completed/2026-09-20-complex-music.md) | 关系/预算、Ribbon 与独立 Ensemble 已实现；实现提交 `2e05838`；[验证证据](../VERIFICATION.md#complex-music-2026-09-21) |
| MIDI text encoding compatibility | Completed | [completed plan](completed/2026-09-20-midi-text-encoding.md) | `d4d012e`；[验证证据](../VERIFICATION.md#midi-text-encoding-2026-09-20) |
| Iteration 03 - Musical Identity, Relation Language & Multi-Score Experience | Completed | [completed plan](completed/iteration-03-musical-identity.md) | `a8f5319`；[验证证据](../VERIFICATION.md#iteration-03) |
| Iteration 02 - Visual Readability and Performance Narrative | Completed | [completed plan](completed/iteration-02-visual-readability.md) | [验证证据](../VERIFICATION.md#iteration-02) |

与 [ROADMAP](../ROADMAP.md) 关联时，只有真实计划才写 Planned/Active；模板和候选清单不算计划。
