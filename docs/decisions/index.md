# Architecture Decision Records

Purpose: 只保存真正架构选择的背景、替代方案、后果和迁移理由。
Authority: 决策过程及状态；已落实的稳定架构事实仍由 [ARCHITECTURE](../ARCHITECTURE.md) 维护。
Update when: 架构决策提出、接受、被替代，或迁移完成。
Last verified: 2026-09-17；新建模板，没有补写历史 ADR。

## 何时使用

考虑 ADR：改变核心 domain contract、权威时间模型、WorldModel 语义、GeometryStrategy 接口、PerformancePlan 结构、引擎边界、后端架构或渲染 ownership。
普通颜色、按钮、效果数值、现有策略实现内的小修改不写 ADR。实现步骤写 [plan](../plans/index.md)，不把 ADR 变成任务清单。

## 命名和状态

- 从 [ADR_TEMPLATE](ADR_TEMPLATE.md) 创建 `ADR-XXXX-short-title.md`，按登记序号递增。
- `Proposed`：待选择；不能当成已实现架构。
- `Accepted`：已在当前授权任务中明确作出选择，记录决策来源/日期；不自动意味着迁移完成。
- `Superseded`：保留原文并链接替代 ADR，不删除历史。
- 实施后只更新 ARCHITECTURE 中改变的事实，并链接 ADR；不复制整段决策论证。
- 需要用户确认的重大产品取舍，先明确问题；不能以写出 Accepted 来代替必要确认。

## Decision registry

| ID | Title | Status | Related plan |
| --- | --- | --- | --- |
| ADR-0001 | [Score-derived musical presentation](ADR-0001-musical-presentation.md) | Accepted / Implemented | [Iteration 03](../plans/active/iteration-03-musical-identity.md) |

不要为了“补齐历史”给 `db67599` 追造当时不存在的决策记录。
