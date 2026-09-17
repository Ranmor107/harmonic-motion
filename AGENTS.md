# Project Harmonic Motion · Repository Navigation

Purpose: 为未来修改定位责任模块和最小阅读范围。
Authority: 仓库工作协议；架构事实以链接的规范文档为准。
Update when: 导航入口、变更协议或关键约束变化。
Last verified: 2026-09-17；产品基线 `db67599`。

Project Harmonic Motion is a modular score-to-world engine.

**Score → World → Choreography → Performance**

## 先导航，再读代码

普通任务默认执行：

1. 读本文件和 [docs/index.md](docs/index.md)。
2. 在 [CHANGE_IMPACT_MATRIX](docs/CHANGE_IMPACT_MATRIX.md) 找到任务类型。
3. 读 [CODEBASE_OPERATING_MODEL](docs/CODEBASE_OPERATING_MODEL.md) 的对应模块。
4. 搜索相关符号、import、调用方和测试，再打开必要源码。
5. 说明最小改动范围、相邻影响、非目标及验证方法。
6. 局部实现，定向验证，只更新事实发生变化的文档。

不要默认通读仓库，不要仅因上下文不足就重新设计架构。
本知识体系已完成一次源码审阅；未来应按任务逐步展开。
对过期路径或事实，先检查当前代码，不把文档当成实现证明。

## Canonical documents

| 知识 | 唯一主要入口 |
| --- | --- |
| 文档导航、阅读和更新时机 | [docs/index.md](docs/index.md) |
| 稳定架构和 invariants | [ARCHITECTURE](docs/ARCHITECTURE.md) |
| 当前实现状态 | [CURRENT_STATE](docs/CURRENT_STATE.md) |
| 模块归属、入口与依赖 | [CODEBASE_OPERATING_MODEL](docs/CODEBASE_OPERATING_MODEL.md) |
| 任务路由与影响范围 | [CHANGE_IMPACT_MATRIX](docs/CHANGE_IMPACT_MATRIX.md) |
| 检查命令和覆盖缺口 | [TEST_MATRIX](docs/TEST_MATRIX.md) |
| 工作步骤和文档维护 | [DEVELOPMENT_WORKFLOW](docs/DEVELOPMENT_WORKFLOW.md) |
| 已知限制、Documentation Drift | [KNOWN_LIMITATIONS](docs/KNOWN_LIMITATIONS.md) |
| 候选方向与状态 | [ROADMAP](docs/ROADMAP.md) |
| 已发生的验证证据 | [VERIFICATION](docs/VERIFICATION.md) |
| 真正的架构决策 | [decisions/index.md](docs/decisions/index.md) |
| 一次性实施上下文 | [plans/index.md](docs/plans/index.md)、[active](docs/plans/active/README.md) |

## Change protocol

编码前明确：owner、primary/adjacent scope、non-goals、expected files、
public contracts、涉及的 invariants、targeted validation。
现有契约足够时，优先最小且完整的局部改动。
UI、外观、显示窗口和相机需求不自动授权修改音乐世界。
Performer 外观属于 visual/render；抵达轨迹属于 choreography。
隐藏节点通常是显示派生状态，不删除 WorldModel 节点。

只有出现下列证据，才扩大阅读范围：

- 必需契约跨模块边界或 public interface 必须改变。
- 文档与代码相矛盾，或责任归属不清。
- 测试暴露意外耦合、集成失败。
- 任务可能改变 architecture invariant。

扩展时沿实际调用或数据关系一次检查一个相邻模块，记录原因。
若要改 public contract，先写 plan；架构语义改变时另写 ADR。
若需同时修改三个或更多责任层，先复查分类及旧契约能否复用。
仍需跨层修改时先建实施计划，必要时建 ADR，再进入实现。
这是规划门槛，不是每次都向用户索要批准的门槛。
遇到无法合理判定的重大产品方向冲突，再向用户澄清。

## Minimal change / No rewrite

**Prefer the smallest coherent change.**
**Existing working architecture should be extended before it is replaced.**

不要为一个按钮重构 state，为 zoom 重写 geometry，为背景修改 WorldModel，
为粒子重新设计编舞，或以“更优雅”为理由整理无关源码。
重写必须有至少一项证据：

- 现有契约确实无法表达需求。
- 已测量的性能问题或已确认的正确性问题。
- 有证据的不可维护耦合，或获认可的架构方案。

这些证据只触发方案评估，不自动授权超出用户范围的重写。

## Protect invariants

检查 [ARCHITECTURE 的十项原则](docs/ARCHITECTURE.md#architecture-invariants)：
Timeline-first、deterministic、seekable；MIDI/render、geometry/visual、
choreography/appearance、audio/render 解耦；视觉切换保持 WorldModel；
GeometryStrategy 和 VisualPreset 可替换。
不受影响时不要展开核心架构；受影响时必须显式记录。
已发现的实现差异见 [Documentation Drift](docs/KNOWN_LIMITATIONS.md#documentation-drift)。

## Validation and documentation

使用 [TEST_MATRIX](docs/TEST_MATRIX.md) 的真实 package scripts。
UI/视觉无自动截图测试；类型检查和纯函数测试不能证明画面正确。
音频 mock 不能证明真人听感或声卡延迟。
跨模块/契约改动执行 test、lint、build；局部改动按矩阵定向验证。
已有失败应记录，不顺手修复任务外代码。
仅文档任务检查链接、路由及 diff；不修改源码、测试、依赖或配置。
保留用户已有未提交文件；只暂存本轮明确负责的路径。

**Update only documents whose truth changed.**
小改动不必建立 plan；中型/跨模块任务按 [plans](docs/plans/index.md) 记录。
plan 完成后从 active 移到 completed，不能只因停止工作标成完成。
ADR 不用于普通样式调整，也不补造历史决策。
未证实事实标 Unverified；候选设计标 Proposed，不能冒充当前能力。
维护本根 AGENTS 即可；无需创建大量 nested AGENTS。
