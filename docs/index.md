# Repository Knowledge Index

Purpose: 从任务找到最小必要文档、源码和验证入口。
Authority: 知识导航及各类事实的归属表，不重述各文档正文。
Update when: 文档增加、移动，或知识归属变化。
Last verified: 2026-10-05；补开发手册与审计导航，核对本地链接；不表示历史功能重新验收。

默认路径：**[AGENTS](../AGENTS.md) → 本页 → 任务路由 → 对应模块 → 符号搜索 → 目标源码/测试**。
日常任务不需要读完本表所有文档。

| Document | Purpose / Authority | When to read | When to update |
| --- | --- | --- | --- |
| [README](../README.md) | 用户启动和操作入口 | 首次运行、解释操作 | 启动方式或用户操作改变 |
| [developer/index](developer/index.md) | 当前核心模块的开发手册：图、API、状态、配置、FAQ、扩展 | 新开发者入门、深入对应模块 | 当前 API、配置、流程或排错方法变化 |
| [CODEBASE_AUDIT](../CODEBASE_AUDIT.md) | 2026-10-05 全仓问题证据、严重程度和分步重构建议 | 排查已知缺陷、规划技术修复 | 问题复现、修复状态和证据变化；不自动改变产品排期 |
| [ARCHITECTURE](ARCHITECTURE.md) | 稳定契约、架构原则的主要记录 | 引擎语义、跨层契约、invariant 受影响 | 已落实的架构事实改变；候选设计先写 ADR |
| [CURRENT_STATE](CURRENT_STATE.md) | 当前实现能力的主要记录 | 判断已做/部分/未做 | 功能支持状态改变 |
| [CODEBASE_OPERATING_MODEL](CODEBASE_OPERATING_MODEL.md) | 模块归属、入口、依赖的主要记录 | 找负责修改的文件和邻接模块 | 文件入口、ownership、依赖或公共符号变化 |
| [CHANGE_IMPACT_MATRIX](CHANGE_IMPACT_MATRIX.md) | 任务分类与影响范围的主要记录 | 每轮分类，处理外观/运动等歧义 | 路由或模块边界变更 |
| [TEST_MATRIX](TEST_MATRIX.md) | 验证映射与覆盖缺口的主要记录 | 选定向检查、确定人工验收 | 测试、命令、覆盖面或检查要求改变 |
| [DEVELOPMENT_WORKFLOW](DEVELOPMENT_WORKFLOW.md) | 开发与文档维护协议 | 拟定范围、判断扩大阅读/建 plan 时机 | 工作协议改变 |
| [KNOWN_LIMITATIONS](KNOWN_LIMITATIONS.md) | 限制、未证实风险、Documentation Drift 的主要记录 | 评估限制或发现文档与代码不一致 | 新证据、问题解决、限制改变 |
| [ROADMAP](ROADMAP.md) | 候选方向、优先顺序和状态的主要记录 | 选择下一任务、讨论产品方向 | 明确排期、开工、完成、延期或改变候选 |
| [VERIFICATION](VERIFICATION.md) | 有日期的实际验证结果；不是永久通过保证 | 查看某次检查的证据及其适用范围 | 新一轮验证产生证据；保留旧记录来源 |
| [decisions/index](decisions/index.md) / [ADR template](decisions/ADR_TEMPLATE.md) | 架构决策过程与状态 | 核心契约、时间模型、ownership 要变更 | 真正决策提出、接受或被替代 |
| [plans/index](plans/index.md) / [plan template](plans/PLAN_TEMPLATE.md) | 一次性实施范围和理由 | 中型、跨模块任务或 ≥3 层变更 | 实施推进、范围变化、完成归档 |

## 快速入口

- “增加 zoom/pan”：先读 [C05](CHANGE_IMPACT_MATRIX.md#c05-camera)，再定位 [visual](CODEBASE_OPERATING_MODEL.md#visual) 与 [render](CODEBASE_OPERATING_MODEL.md#render)。
- “增加 InkTheme”：先读 [C02](CHANGE_IMPACT_MATRIX.md#c02-theme)；MIDI 不在默认范围。
- “增加 SpiralGeometryStrategy”：先读 [C07](CHANGE_IMPACT_MATRIX.md#c07-geometry)；Audio 不在默认范围。
- “只显示当前轨迹/当前时间附近节点”：先读 [C06](CHANGE_IMPACT_MATRIX.md#c06-visibility)，不要先修改 WorldModel。
- “主 Performer 从左向右穿过临时音符”：先读 [R11 的展示路由](CHANGE_IMPACT_MATRIX.md#near-term-routing) 与 [ADR-0001](decisions/ADR-0001-musical-presentation.md)，不能仅凭视觉描述选择几何方案。

源码与文档不一致时，代码是已发生行为的证据，ARCHITECTURE 仍是契约的主要记录。
在 [Documentation Drift](KNOWN_LIMITATIONS.md#documentation-drift) 并列记录双方，再决定未来修改；不要悄悄让其中一方覆盖另一方。
