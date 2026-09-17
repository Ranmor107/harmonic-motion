# Title

Purpose: 单个中型或跨模块任务的实施边界；复制后替换本说明。
Authority: Task-specific reasoning；不替代 ARCHITECTURE 或 ADR。
Update when: 范围、方案、验证或完成状态改变。
Last verified: 模板于 2026-09-17 核对；新计划填写实际核对日期。

Status: Proposed / Active / Blocked / Completed / Cancelled（选择一项）
Source baseline: `<commit and relevant working-tree context>`
Related request / roadmap item: `<link or concise description>`
Related ADR: `<link if needed; otherwise none>`

## Problem

<具体问题、触发条件、当前证据；不要把设想写成已确认缺陷。>

## User-visible goal

<用户完成后能做什么；可观察的验收目标。>

## Current behavior

<当前行为、对应源文件/符号与验证证据。>

## Desired behavior

<预期行为；不包括相邻愿望清单。>

## Primary module

<主要 owner；链接 CODEBASE_OPERATING_MODEL 的对应小节。>

## Adjacent modules

<需扩大阅读/修改的每个邻域及证据；不能仅写“可能全部”。>

## Explicit non-goals

<本任务不包含的能力、重构、依赖更新。>

## Architecture invariants

<涉及的 invariant 编号、保持方式；若要改变，链接 Proposed ADR。>

## Expected files

| File / symbol | Reason | Type of change |
| --- | --- | --- |
| `<path>` | `<why>` | `<config / behavior / contract / test / doc>` |

## Public contracts affected

<明确 none 或写出旧/新输入输出、迁移影响；是否必须更新 ARCHITECTURE。>

## Implementation approach

<最小步骤、可复用旧契约、为何无需更大改动；必要时列替代方案。>

## Risks

<正确性、确定性、seek、性能、范围扩展风险；未知项标 Unverified。>

## Test plan

<链接 TEST_MATRIX；现有定向命令、新回归断言、人工检查及全量触发条件。>

## Documentation updates

<只列事实会改变的 canonical 文档及原因；不默认全量更新。>

## Completion criteria

- [ ] 用户可见目标和本计划的边界达到。
- [ ] 受影响契约与 invariants 已核对。
- [ ] 定向/必要全量检查通过，或明确记录未完成事项。
- [ ] 人工验证有证据，不以 mock 结果代替。
- [ ] Diff 仅含授权范围；用户既有文件保留。
- [ ] 受影响文档更新；登记验证和提交引用后归档。

## Execution notes and completion evidence

<日期、范围变化、检查结果、commit；不得把尚未运行的命令标成通过。>
