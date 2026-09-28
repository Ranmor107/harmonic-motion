# Long-session comfort: viewing controls and reliability

Purpose: 界定本轮长时间观看控制与实测范围。
Authority: 本轮实施计划；优先级见 [ROADMAP](../../ROADMAP.md)。
Update when: 范围、方案、验证或完成状态变化。
Last verified: 2026-09-28。

Status: Completed · local verified
Source baseline: `9763f48`；用户未跟踪的 `midi/` 与产品计划 `.docx` 保持原样。本轮完成后可直接推送 GitHub。
Related request / roadmap item: E · Long-session Comfort；用户授权继续开发并上传。2026-09-28 追加 Stream 的 Helix 细曲线恢复。
Related ADR: none；复用现有播放时间和浏览器全屏契约。

## Problem

当前可用鼠标播放、seek 与取景，但没有全屏入口、键盘播放/跳转和快速重听刚才一段的动作。长曲的连续观看、后台/窗口变化等场景尚无本轮实际验证；不能据此声称已有稳定性缺陷。

## User-visible goal

用户可以进入/退出全屏，以 Space 播放/暂停、方向键前后跳转 5 秒、R 重听最近 10 秒、F 切换全屏。按钮和快捷键共用现有播放协调器，且不会抢走输入框、滑杆、选择框或聚焦按钮的原生键盘操作。3–5 分钟曲目的画面和交互经浏览器实测。

## Current behavior

`App` 的 transport 只有 Play/Pause、Restart 和时间滑杆；`PlaybackController.seek()` 已保持当前播放/暂停语义并重排音频。`App` 的 Escape 只关闭 Controls 抽屉。`.studio` 已占满可视窗口；R3F 随容器尺寸变化取景。

## Desired behavior

全屏使用 `.studio` 的浏览器 Fullscreen API；Escape 明确调用退出以覆盖嵌入浏览器未自动处理的情况。相对 seek 与最近片段重听只调用现有 controller，不引入第二音乐时钟。按键仅在页面/舞台非交互区域生效，修饰键或按住重复不触发动作。最近片段在暂停或结束时从回退位置开始播放，在正在播放时回退后继续。

## Primary module

[UI / application composition](../../CODEBASE_OPERATING_MODEL.md#ui)：`App` 输入处理、transport、Controls 说明与样式；图标只增加实际使用的图形。

## Adjacent modules

[Playback](../../CODEBASE_OPERATING_MODEL.md#playback)：只读核对现有 `seek()`/`play()` 语义并用现有测试验证，不改 clock/controller/audio。浏览器 Fullscreen API 和 R3F resize 需要实际画面检查。

## Explicit non-goals

不做循环播放、第二时间源、自动相机编排、新视觉主题/模式、完整键盘映射配置、视频录制/导出或未测量的性能优化。Calm/Normal 只在实测证明过强刺激且有可复现问题时再单独评估，不预先加入。

## Architecture invariants

保持 I1/I3/I7/I8：`PlaybackClock` 仍是唯一歌曲时间，所有跳转由 controller 同步音频；快捷键、全屏不修改 score/world/plan，不重新加载音频；视图的确定性求值保持不变。

## Expected files

| File / symbol | Reason | Type of change |
| --- | --- | --- |
| `src/ui/App.tsx`、`Icons.tsx`、`styles.css` | 全屏、键盘动作、重听入口与狭窄布局 | UI behavior |
| `src/render/StreamRenderer.tsx` | 用户明确要求恢复 Helix 线条，去掉后加宽带面，保留已有细曲线 | render only |
| 相关 playback/UI 测试 | 对回退边界、播放/暂停和音频 seek 保持添加有意义的回归 | tests |
| README、CURRENT_STATE、ROADMAP、TEST_MATRIX、VERIFICATION、plan index | 操作、状态和实际证据 | docs |

## Public contracts affected

无 domain、controller、audio、world/plan 公共契约变化。`App` 仅新增本地 UI 状态及 DOM 事件；图标 `name` 联合增加实际使用项。

## Implementation approach

1. 先用现有 controller 测试补相对跳转/回退的播放与暂停断言；保持音频重排语义。
2. `App` 复用 `togglePlayback` 和 `controller.seek`，设置全屏按钮和键盘事件。排除编辑控件/聚焦按钮、修饰键和按键自动重复；提供快捷键提示。
3. 在长曲、密集片段和 390px 视口检查全屏、后台、resize、seek、快速暂停/继续与错误日志；只修实际发现的问题。

## Risks

浏览器可能限制全屏请求，必须从用户操作触发并显示失败信息。全局快捷键不能抢走时间滑杆或可访问的按钮操作。长曲性能受设备/浏览器影响；本轮只报告实测条件和观察，不作普适 FPS 或听感承诺。

## Test plan

按 [TEST_MATRIX](../../TEST_MATRIX.md) 执行 T-UI/T-PLAYBACK 和全量 `npm run test`、`npm run lint`、`npm run build`。浏览器检查 Quick Study 和用户已授权的长 MIDI，包含按钮/键盘同义、Seek 端点、全屏/退出、390px、后台/resize、播放连续性与 console。用户素材仅只读测试。

## Documentation updates

README 记录操作和快捷键；CURRENT_STATE/ROADMAP 更新能力与状态；TEST_MATRIX 新断言；VERIFICATION 只写实际结果。完成后归档计划并登记提交。未通过的外部体验项保持明确边界。

## Completion criteria

- [x] 全屏、快捷键、最近片段重听可用，控件焦点不被劫持。
- [x] 时间和音频在 seek/重听/全屏切换时一致，世界/计划不变；音频调用由 mock/代码验证，真实声卡同步未测量。
- [x] 自动检查和长曲浏览器验证通过，视觉舒适度问题有实际观察；真人疲劳评价仍待用户。
- [x] 文档与提交范围核对；用户素材保持原样，推送后确认远端提交。

## Execution notes and completion evidence

2026-09-27：从 `9763f48` 建立 UI 层最小实施边界；现有 controller 能直接支撑相对 seek 和重听，无需新播放契约。
浏览器实测发现内置浏览器全屏时 Escape 未自动退出，故增补显式退出；全屏按钮与 F 进入后状态一致，Escape 已复测退出。390px 时间轴刻度拥挤，窄屏只隐藏刻度标签，保留滑杆及两端时间。
2026-09-28：复核上次约 1:32 的空画面：测试起始偏好为 Follow Off，镜头固定而 Stream 结构继续前移；Fit stage 会开启 Follow，因此恢复。未发现跟随计算错误，不扩大到 camera 源码。新一轮在 Follow On 下从 0 开始整首 302 秒验证，并检查后台切换。

### User-directed scope addition · 2026-09-28

用户追加 Stream 线条还原；初次选择水平引导线后纠正为“Helix 的那种线”。最终以 `a8f5319` 的 Helix 细曲线为参照，只移除后加的 ribbon surface。当前 model 的主线位置已使用原 Helix 的 sin/cos 展开，已有线段材质和曲线采样即可复用。保留主线、伴随线、时长线、现有 musical presentation、音符生命周期、轨道焦点、Performer、命中反馈与拖尾，不恢复旧斜向镜头。

责任层追加 render，presentation/camera 只读核对；不变更公开契约、score/world/plan/audio。此项是用户明确的新范围，不是舒适度观察引出的推测性重构。完成后重跑全量 test/lint/build，截图核对 Helix 细曲线与播放/seek；共用的模式切换与窄屏控制已通过本轮验证。

本轮 11 文件 / 81 测试、lint、build 均通过；卡农从 0 连续播放 302 秒结束，后台返回与全屏/三视图期间进度连续。最后的 Helix 线条截图和 R 回放另行复测。完整证据见 [VERIFICATION](../../VERIFICATION.md#long-session-comfort-2026-09-27)。

实现提交 `09f21c5` 已按用户授权推送；2026-09-28 通过 GitHub API 确认远端 main、本地 HEAD 与 origin/main 均为 `09f21c586de1ae8aeb5e0c8cebd05b7f65fe5bda`。本轮控制与验证范围完成并归档，Milestone E 的真人疲劳/舒适度评价仍待外部反馈。
