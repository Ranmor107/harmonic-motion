# Audit step 1 · Saved-score recovery and sparse-song memory

Purpose: 修复审计 A01/A02 的两个 P1 问题，保持改动可复现、可检查和可回退。
Authority: 本轮有限实施计划；音乐契约以 ARCHITECTURE 为准。
Update when: 范围、实现、验证、提交或完成状态变化。
Last verified: 2026-10-06；核对受影响源码、调用方和测试。

Status: Completed · implemented and uploaded
Implementation commit: `f9e2900`；审计/手册基线提交 `5ee4bda` 一并上传。
Source baseline: `5ee4bda`（上一轮审计/手册已单独提交）；产品源码仍为 `e15cad5`。用户未跟踪的 midi/、产品计划 DOCX 保留。
Related request / roadmap item: 用户要求参考成熟 GitHub 仓库形式，先进行一步修复并上传；对应 [审计路线第1步](../../../CODEBASE_AUDIT.md#逐步修复与重构路线)。
Related ADR: none；不改变权威时间、音乐世界或编舞语义。

## Problem / user-visible goal

- A01：IndexedDB 记录被浅过滤后当作合法 score 使用；缺 metadata 等数据可进入应用；部分恢复后自动保存会覆盖原始失败记录。
- A02：Ensemble 每秒一个 energy 元素，37 字节的稀疏长曲也能造成巨型数组；Scene 对所有 View 无条件准备这个模型。
- 目标：坏记录不进入音乐/绘制链，成功曲目仍能使用，原库不被残缺恢复结果覆盖；长静默曲的 energy 内存随起音桶数量增长。

## Scope and ownership

Primary: [state / UI](../../CODEBASE_OPERATING_MODEL.md#state) 的保存信任边界与恢复写入开关；[visual / render](../../CODEBASE_OPERATING_MODEL.md#visual) 的 Ensemble 准备和按需创建。

Adjacent: midi/normalize 需要拒绝有限起音+有限时长溢出为 Infinity 的数据；复用当前数值规则，不改有效 MIDI 的时间/音高/和弦语义。保存 validator 需要核对 note/track/chord 一致性与当前 domain 字段。

非目标：A03–A13、App 大拆分、IDB abort/升级/多窗口协调、新风格/功能、依赖升级、CI/发布流程改造、云同步或曲库编辑器。新恢复结果为应用内部 API，不建立通用校验框架。

## Decisions and tradeoffs

1. 读取保存曲库时保留 unknown 原值；store 在编译前验证完整记录，返回 `{restored,rejected}`，不凭 TypeScript 标注信任磁盘数据。
2. 有任一失败或非预期容器格式时，本次会话禁用曲库与偏好的自动写入，保留原数据库；成功曲目、播放和导入仍可用。持续提示本次改动仅在内存，并提供刷新重试/已有 MIDI 导入入口。选择保守停止写入，避免本轮新增损坏记录合并和修复编辑器。
3. 只在保存的活动曲成功恢复时应用 position，避免把坏曲目的时间套到 demo。
4. Ensemble energy 用 Map 存储有事件的秒桶，保留峰值归一化、相邻秒平滑插值和运动幅度。Scene 仅在 Ensemble/Ink 实际使用时准备对应模型。
5. 有效文件不加任意“最长几小时”限制；拒绝非有限 note end/duration，稀疏结构消除按时长分配。

## Expected files / public contracts

| 文件 | 变更 |
| --- | --- |
| src/state/sessionValidation.ts（新增） | 专用 saved session/score 的 unknown 校验，无依赖新增 |
| src/state/persistence.ts | 读取 sessions 原值；数据库名/版本/key/写入格式不变 |
| src/state/store.ts | 编译前验证；restoreSessions 输入 unknown，返回恢复/拒绝数量；保持缓存引用 |
| src/ui/App.tsx | 部分恢复阻止写入、持续提示和重试；位置只匹配已恢复曲目 |
| src/midi/normalize.ts | 有限 note end 校验 |
| src/visual/presentation/ensemblePresentation.ts | energy number[] → Map<number,number>；消费函数同步更新 |
| src/render/Scene.tsx | 按 View/style 准备非通用模型，不重挂载 Canvas 或调用 audio |
| tests/session.test.ts、tests/persistence.test.ts（新增）、tests/midi.test.ts、tests/ensemble-presentation.test.ts | 非法/部分恢复、原库保存边界、极长稀疏 MIDI、数值一致性 |
| 审计、模块/测试手册、当前状态、验证记录、计划索引、docs/assets/audit-step-1-recovery.jpg | 更新真实行为与证据，保留审计原始复现；截图仅含自建测试曲目 |

数据存储 v1 和 score/world/plan 格式不变；新增恢复结果和 energy 类型是已有调用方可明确迁移的内部契约，先有本计划，不需要音乐语义 ADR。

## Validation plan

1. 先补失败用例：缺 metadata、非有限/错误时长、乱序或坏 note、重复 ID、轨道/chord 不一致、未知容器/版本、好坏混合记录；现有正常库成功恢复。
2. 用隔离的 IDB mock 验证读取不偷偷丢记录；store 结果能阻止 App 写入；浏览器用独立端口/profile 验证坏记录原值保持、提示/重试与正常保存恢复。
3. 37 字节 Type 0 PPQ=1 稀疏 MIDI、长休止/长音/空谱；Map size 有界，正常 energy response 与旧数值一致；随机 seek 仍确定。
4. 定向 session/persistence/midi/ensemble tests；最终全量 test/lint/build、Markdown 链接/锚点与 diff 检查。
5. 浏览器三 View/两种 Ink 往返、播放/暂停/seek/刷新，确认界面与权威时间正常，音频 load 不因 View 改变。真实声卡与跨设备帧率不以此声称通过。

采用 [Dexie 贡献指南](https://github.com/dexie/Dexie.js/blob/master/CONTRIBUTING.md) 的 bug 复现测试与提交前检查方式，以及 [R3F 贡献指南](https://github.com/pmndrs/react-three-fiber/blob/master/CONTRIBUTING.md) 的语义提交。沿用本仓库的 npm/plan/docs 体系，不引入参考项目的包管理器或发布基础设施。

## Completion criteria

- [x] A01/A02 的最小复现进入正式测试并通过。
- [x] 成功记录可使用、失败记录原值不被写回覆盖、错误清楚且可重试。
- [x] 稀疏长曲无按 duration 分配；正常运动/seek/切换契约保持。
- [x] 全量检查、隔离浏览器验证、文档链接/diff 有证据。
- [x] 文档、审计状态已更新；提交范围核对后归档，保护用户素材。
- [x] 上传 GitHub 并核对远端提交。

## Execution notes

2026-10-06：先核对范围、提交上一轮审计文档 `5ee4bda`；远端 main=`e15cad5`，用户现有 GitHub 登录在允许联网的环境可用，无需重新授权。尚未将本计划检查项记为完成。

2026-10-06 本机验证：新增回归先失败，再通过修复；复核补充 sparse note 数组空洞用例，修复同一信任边界。最终 13 文件/118 tests、lint/build 通过；构建 JS 1458.98 kB / gzip399.53kB，保留大 chunk warning。42 份 Markdown / 567 条本地链接及锚点可达；57 个 TS/TSX、181 条本地 import（96 条纯类型），无运行时环；diff 检查通过。精确覆盖与局限见 [验证记录](../../VERIFICATION.md#audit-step-1-2026-10-06)。

浏览器使用独立5175 origin和自建记录：好坏混合/null容器，两键原值保留；正常曲、临时 MIDI 导入、持续提示/刷新；健康库 8.083 秒/Ensemble 恢复暂停；三 View/两 Ink保持暂停位置，极长曲实际进入各视图；未见 console error。既有音乐算法、audio/playback、启动器、依赖/配置及用户素材不在提交范围；midi 只增加已说明的有限 note end 检查。

交付：`f9e2900` 已推送至 Ranmor107/harmonic-motion main，GitHub 接受 `e15cad5..f9e2900`，包含前次审计/手册提交 `5ee4bda`。显式暂存28个路径，无用户 MIDI/DOCX。依仓库规定归档此计划并更新导航；用户要求减少不必要的验证，完成既有必要检查后不再扩展或重复全量测试。
