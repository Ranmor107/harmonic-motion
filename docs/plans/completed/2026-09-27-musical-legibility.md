# Musical legibility: choose a part to follow

Purpose: 界定本轮轨道焦点与手动主线选择的实现和验收。
Authority: 本轮实施计划；产品优先级见 [ROADMAP](../../ROADMAP.md)。
Update when: 范围、方案、验证或完成状态变化。
Last verified: 2026-09-27。

Status: Completed · implementation locally verified; user review precedes any GitHub upload.
Source baseline: `07a4f38`；用户未跟踪的 `midi/` 与产品计划 `.docx` 保持原样。本轮只本地提交，不上传 GitHub，等待用户验收。
Related request / roadmap item: Musical Understanding / 产品计划 Musical Legibility；用户授权按计划开始迭代。
Related ADR: [ADR-0001](../../decisions/ADR-0001-musical-presentation.md)；沿用只读展示投影，不改变核心契约。

## Problem

当前 Auto 显著性算法在所有轨道中选出主线；复杂 MIDI 中用户无法指定想追踪的声部，也无法让三种视图持续突出同一轨道。自动判断的歧义会表现为主线跳轨，用户难以将听到的旋律与画面对应。

## User-visible goal

在已有视图中可选择 Auto 或某条有音符的 MIDI 轨道。指定轨道后，该轨的音符和关系路径成为视觉焦点，其他轨道仍可见为上下文；Stream 主线沿指定轨道展开。切换视图、seek、暂停/继续、切歌与重新打开后，当前曲目的选择保持一致。

## Current behavior

`selectSalientNotes` 总在整首 score.notes 中选音；`Scene` 对所有视图生成同一展示模型；三个 renderer 不接收轨道焦点。`App` 的本机偏好不保存逐曲轨道选择。

## Desired behavior

选择只修改 presentation、renderer 对比和 App 的逐曲偏好。单轨或无可选轨时 Auto 行为有效；损坏/过时的保存选择回退 Auto。正式 `WorldModel`、`PerformancePlan`、音频和歌曲时间不因焦点变化而重新生成或重载。

## Primary module

[Visual presentation / render](../../CODEBASE_OPERATING_MODEL.md#visual)：选定轨道派生主线，三种视图突出该轨并保留背景关系。

## Adjacent modules

[UI / application composition](../../CODEBASE_OPERATING_MODEL.md#ui)：选择器、舞台标签及按曲目保存的本机偏好。现有 `SavedPreferences` 可加可选字段兼容旧记录；不修改 ScoreSession/compiled 生命周期。

## Explicit non-goals

不做真实旋律识别、声部分离、乐句/调性/和声标签、新舞台或主题、轨道音量混音、播放跳过其他轨道、自动相机重新编排。用户看到的是 MIDI 源轨道，不声称它一定等于音乐学意义上的声部或旋律。

## Architecture invariants

保持 I1/I3/I5/I7/I8：PlaybackClock 是唯一歌曲时间；WorldModel/PerformancePlan 引用与语义不变；presentation 是可确定、可 seek 的 score 派生数据；视觉选择不重载音频或删除音符。无新 ADR。

## Expected files

| File / symbol | Reason | Type of change |
| --- | --- | --- |
| `src/visual/presentation/musicalPresentation.ts`、`renderBudget.ts` | 指定轨道的主线及密集段焦点预算 | presentation behavior |
| `src/render/Scene.tsx`、三个 view renderer | 传递焦点并调整主次层级 | render behavior |
| `src/ui/App.tsx`、`styles.css`、`src/state/persistence.ts` | 选择入口、当前焦点说明、逐曲本机偏好 | UI / persistence |
| 相关 presentation/session 测试 | Auto 回归、指定轨道、密集预算、过时选择 | tests |
| README、CURRENT_STATE、ROADMAP、TEST_MATRIX、VERIFICATION、计划索引 | 操作、状态与证据 | docs |

## Public contracts affected

`createMusicalPresentation` 增加可选轨道 ID；Scene/renderer props 传递只读焦点 ID；`SavedPreferences` 增加可选逐曲选择映射，旧版记录继续有效。不改 domain score/world/plan、AudioEngine、PlaybackClock 或编译接口。

## Implementation approach

1. 保留 Auto 原路径；指定有效轨道时只在该轨音符中计算显著主线。无效或空轨回退 Auto。其他轨道仍进入展示模型作为伴随织体。
2. Constellation 在显示预算中预留一部分给选中轨，节点/关系按归属调整亮度；Stream 和 Ensemble 让选中轨更清晰，其他轨维持低对比。沿用现有节点和短组数据。
3. App 放一个简洁的 Auto/轨道选择控件，并在舞台标明当前焦点；按 session ID 保存选择，删除曲目时清除映射。沿用现有本机偏好写入。

## Risks

MIDI 轨道不总对应独立声部，轨名也可能重复；按序号加名称标识，不宣称自动语义识别。跨轨和弦共用 WorldModel 节点，Constellation 中混合节点需明确可同时属于焦点与背景。长曲及密集段不能让焦点预算压掉全部上下文。选择改变 Stream 的纯显示路线与取景，但不改变正式 performer 轨迹；浏览器检查 seek/切换时的画面稳定性。

## Test plan

先写 `selectSalientNotes`/presentation 和显示预算的指定轨道测试，确认原 Auto 回归及无效轨回退。按 [TEST_MATRIX](../../TEST_MATRIX.md) 跑 T-VISUAL/T-STATE，再全量 `npm run test`、`npm run lint`、`npm run build`。浏览器用 Quick Study 和用户已授权的多轨 MIDI 检查三视图、Auto↔轨道选择、seek/播放、切曲与刷新；核对标题/焦点、同一时间与音量、WebGL 画面和错误日志。用户文件只读导入，不提交。

## Documentation updates

README 说明选择语义；CURRENT_STATE/ROADMAP 更新能力与候选状态；TEST_MATRIX 记录新断言；VERIFICATION 只记实际检查。完成标准达成后计划归档；用户验收前不推送 GitHub。

## Completion criteria

- [x] Auto、指定轨道与无效选择均有确定行为，三视图保留选中轨和背景关系。
- [x] 逐曲选择在切换、seek、刷新后保持；音频、正式 world/plan 和时间不受影响。
- [x] 定向及全量检查通过；浏览器视觉与交互有实际证据。
- [x] 用户未跟踪文件保留，文档更新；本地提交可供验收，未推送 GitHub。

## Execution notes and completion evidence

2026-09-27：根据当前 `07a4f38` 的展示模型和本机偏好实现确定最小范围，先建立测试，再实现。

2026-09-27：先写指定轨道主线与密集预算用例，观察到预期失败后实现。`npm run test` 11 文件 / 80 测试、`npm run lint`、`npm run build` 与 `git diff --check` 全通过。内置浏览器在 1280×720 实看三视图的 Bass 聚焦及背景声部；390×844 检查选择器；12 秒 seek、播放中切焦点、切曲、刷新均通过，浏览器 error 日志为空。完整边界见 [本轮验证](../../VERIFICATION.md#musical-legibility-2026-09-27)。用户自带 `midi/` 和产品计划文档未改动、未进入提交；GitHub 未上传。真正的旋律/声部识别与真人可读性验收仍是后续问题。

实现与主要文档本地提交：`7383b9f`。本计划的提交引用随后单独登记；没有推送远端。
