# First Experience: Quick Study and clear first entry

Purpose: 本轮首次体验的实施边界和验证记录。
Authority: 本轮实施计划；产品方向以用户提供的《Harmonic Motion 产品迭代计划》为准。
Update when: 范围、方案或验证状态改变。
Last verified: 2026-09-26。

Status: Active
Source baseline: `835459a`；用户未跟踪的 `midi/` 和产品路线图 `.docx` 保留、不修改或提交。
Related roadmap item: Milestone A · First Experience。
Related ADR: none；本轮不改变架构契约。

## Problem / Why now

当前默认作品仅约 10.5 秒，旋律、和弦、伴奏加入不足以形成一段完整聆听体验。首屏只提供通用播放按钮和底栏导入，高级 View 抽屉却是显眼入口。路线图的首要问题是陌生用户能否迅速进入并理解音乐；在此之前扩展音色、持久化或视觉模式都难以验证产品价值。

## User-visible goal / desired experience

零文件打开后，用户看到明确的“Listen to a study”和“Open my MIDI”选择；一次点击开始一段约 20–40 秒的原创 Quick Study，能听出旋律、伴奏加入及和声变化；非侵入式说明让用户大致知道视觉焦点和三种 View 各看什么。

## Current behavior

`src/demo/score.ts` 的默认短句 10.5 秒；`src/state/store.ts` 只内置它；`src/ui/App.tsx` 的首屏是作品信息、舞台、通用底栏，导入按钮在右下角，View 意义仅有零散提示。用户数据仅当次会话有效。

## Primary product capability / likely affected areas

首次进入与内置内容。主要修改 `src/demo/score.ts`、`src/ui/App.tsx`、`src/ui/styles.css`；`src/state/store.ts` 只将默认示例换为 Quick Study。定向测试覆盖作品结构、默认会话和必要的交互状态。

## Adjacent areas

`docs/CURRENT_STATE.md`、`docs/ROADMAP.md`、`docs/KNOWN_LIMITATIONS.md`、`docs/VERIFICATION.md` 和计划索引只更新发生变化的事实。不修改输入解析、音乐分析、WorldModel、PerformancePlan、音频引擎、播放时钟、视觉投影或摄像机。

## Explicit non-goals

不增加三首 Full Studies，不引入版权不明的 MIDI 或第三方资源；不做新音色、音量/静音、持久化、全屏、视频、新主题或新舞台。第一轮只验证一个完整首次体验；Full Studies 留给后续内容筛选。

## Architecture invariants / public contracts

保持 timeline-first、确定性与 seek、MIDI/Renderer、Geometry/Visual、Audio/Renderer 分离。只通过现有 `normalizeScore`、会话与播放接口接入原创内容；score/world/plan 的公共契约不变，点击播放不重新编译。

## Implementation approach / alternatives considered

1. 用代码编写可明确分发的原创三声部短曲，并复用现有归一化与编译；保留旧示例函数供既有引擎回归使用。
2. 在首屏作品区域放两个明确动作；调用现有播放与文件选择流程。让首屏入口在用户进入音乐后退为轻量入口，避免遮挡舞台。
3. 增加一块可关闭的简短视觉说明，并在 View 控件旁用一句话标注用途，不创建 onboarding 框架。

考虑过打包外部 MIDI 和多首完整作品；许可、质量与音频现状未验证，超出本轮目标。考虑过首次弹窗；会延迟“一次点击听到音乐”，因此不用。

## Risks

三轨同时起音可能让声部显示竞争，需要验证舞台和音符焦点。默认音色仍为 sine Synth，音质可能限制继续聆听；此问题明确留给 Milestone B。首次体验能否被陌生用户理解需外部真人观察，开发者自测不能代替。

## Automated test plan

按 [TEST_MATRIX](../../TEST_MATRIX.md) 运行 Demo/Session 定向测试，再运行真实存在的 `npm run test`、`npm run lint`、`npm run build`。验证时长、声部加入、和弦变化、默认会话引用与既有切歌行为；无需虚构单独 typecheck 命令，build 含 `tsc -b`。

## Manual verification plan

浏览器首次打开：观察 10 秒内是否容易找到首次播放和导入；点击 study，检查实际开始、结束、seek、切换 Constellation/Stream/Ensemble、说明关闭、窄屏布局与导入入口。音频是否真正可听须人工试听；自动化只能验证调度。

## User validation plan

Needs external user validation：给 5–8 名未参与项目的人直接打开页面、不解释，记录开始播放用时、能否找到导入、能否指出视觉焦点、是否看完 Quick Study、是否愿意继续听。当前仅能做开发者浏览器检查，不把它记为真人用户测试。

## Documentation updates

更新当前默认内容和首屏事实、Roadmap Milestone A 状态、验证证据、计划索引；产品路线图方向未变化，不修改用户提供的 `.docx`。

## Completion criteria

- [ ] 原创 Quick Study、明确入口及非侵入式解释形成一条可用的首次体验链。
- [ ] score/world/plan 和播放/音频契约保持不变，切 View、seek、导入仍工作。
- [ ] 定向与全量 test/lint/build 通过；浏览器多尺寸与实际交互已检查。
- [ ] 记录尚需真人验证的内容，不以开发者判断冒充产品验收。
- [ ] 仅修改本轮必要文件，保留用户未跟踪素材；更新事实文档并归档。

## Execution notes and completion evidence

2026-09-26：选择 Milestone A；开始实施。完成证据待验证后填写。
