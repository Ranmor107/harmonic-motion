# Listening Quality: default piano-like synthesis and sound controls

Purpose: 本轮听感基础能力的范围、取舍与验证记录。
Authority: 本轮实施计划；产品优先级见 [ROADMAP](../../ROADMAP.md)。
Update when: 范围、验证或完成状态改变。
Last verified: 2026-09-27；补充用户音色反馈和切曲控制验证。

Status: Active
Source baseline: `34f55a0`；未跟踪的用户 `midi/` 与产品计划 `.docx` 均不修改、不提交。
Related request / roadmap item: Milestone B · Listening Quality。
Related ADR: none；不改变时间或音乐世界契约。

## Problem / Why now

First Experience 已有约 31 秒 Quick Study 和明确播放入口，但所有音符仍用统一 sine Synth，作品导入后没有可见的音量和静音控制。声音的功能正确性不足以证明用户愿意听完；这比先增加持久化或视觉效果更直接阻碍当前体验。

## User-visible goal / desired experience

默认发声更接近柔和的键盘/钢琴短促起音与自然衰减；用户随时能调节音量、一键静音/恢复。暂停、seek、切歌、重播后控制值保持在本次会话内，视觉与歌曲时间不中断。

## Current behavior

`ToneAudioEngine` 每个音符使用 sine oscillator，输出在每次 seek 时创建 Limiter 并在 pause/seek 时销毁。`App` 只保存 PlaybackController，没有声音控制入口；库接口 `AudioEngine` 只有生命周期方法。

## Primary product capability / likely affected areas

主责任层是 [audio](../../CODEBASE_OPERATING_MODEL.md#audio)：在既有 Tone 适配器内调整默认合成参数、增加持续主增益及静音方法。相邻 [UI](../../CODEBASE_OPERATING_MODEL.md#ui) 只装配同一音频实例与控制按钮/滑杆；`AudioEngine`、PlaybackController、clock 和 score 契约均保持原样。

## Explicit non-goals

不宣称还原真实钢琴采样，不引入外部 SoundFont/CDN/音频资产，不支持完整 GM 乐器库、轨道混音、踏板/CC、reverb 参数、持久音量偏好或视频录制。不修改 MIDI、geometry、choreography、visual/render 或播放时间模型。

## Architecture invariants / public contracts

保持 I1/I3/I7：唯一歌曲时间仍由 PlaybackClock 管理，Audio 只消费 NormalizedScore 与当前时间；音量是音频输出参数，不改变 score/world/plan 或渲染。`AudioEngine` 公共接口不变；`ToneAudioEngine` 增加局部控制方法供现有 App 装配使用，无迁移要求或 ADR。

## Expected files

| File / symbol | Reason | Type of change |
| --- | --- | --- |
| `src/audio/ToneAudioEngine.ts` | 默认合成音色、持续主增益、音量/静音 | behavior |
| `src/ui/App.tsx`、`src/ui/styles.css`、必要时 `src/ui/Icons.tsx` | 简洁且可访问的声音控制 | behavior / layout |
| `tests/audio.test.ts` | 音色参数、增益、静音和 seek/pause 生命周期回归 | test |
| `README.md`、`docs/CURRENT_STATE.md`、`docs/ROADMAP.md`、`docs/KNOWN_LIMITATIONS.md`、`docs/VERIFICATION.md`、计划索引 | 只更新改变的能力、限制和证据 | doc |

## Implementation approach / alternatives considered

1. 保留每音符 Synth 与现有调度；用 Tone 自定义谐波和更像琴键的短起音、低 sustain、自然衰减取代纯 sine。
2. 在 Limiter 后放持续 master gain；pause/seek 只清理临时声部和 Limiter，最终 dispose 才销毁 master。静音用短增益渐变，避免直接切断造成噪声。
3. UI 持有与 controller 共享的音频实例：底栏一键 Mute，控制抽屉提供 Volume 滑杆。控制状态只在 App 会话内，不建立偏好系统。

考虑过加载第三方钢琴样本：真实感可能更高，但当前没有完成许可、体积、离线和首屏成本验证；本轮先用已有依赖形成可验证的听感基础。考虑过修改 `AudioEngine`/PlaybackController 接口：现有 App 已装配具体 Tone 适配器，扩大公共契约没有必要。

## Risks

合成音无法完全模拟击弦、踏板和共鸣，特别是熟悉的钢琴作品；不能把“piano-like”说成真实钢琴。和弦叠加可能触发 Limiter，快速音符和 seek 可能有可听残留；需浏览器检查并由真人试听。浏览器/设备输出无法从 mock 证明。主增益节点必须在切歌、pause/seek 后保持控制值并在 dispose 时释放。

## Automated test plan

先运行 `npm run test -- tests/audio.test.ts tests/playback.test.ts`；再按 [TEST_MATRIX](../../TEST_MATRIX.md) 运行 `npm run test`、`npm run lint`、`npm run build`（build 含 TypeScript）。断言自定义合成配置、0–100% 音量边界、Mute/Unmute、seek/pause/切曲后增益保持、最终 dispose 清理；不把 Tone mock 当成音质测试。

## Manual / audio verification plan

浏览器检查：默认曲首次播放、音量拖动、静音/恢复、暂停/继续、前后 seek、结束重播、切换视图和曲目后控制值与时间。试听清单：长音、低音、快速高音、重复音、大和弦与密集段，留意刺耳、模糊、爆音、音量突变和残留。若当前环境不能直接获取真实声卡听感，明确记为 Needs human listening validation，而不声称已听过。

## User validation plan

让至少一名实际听众在自己的设备试听 Quick Study 和一段熟悉的、可合法使用的 MIDI，对比改动前后是否愿意继续听两分钟；记录设备、浏览器、音量和具体不适段落。此判断不由自动测试代替。

## Documentation updates

更新真实音频/UI 状态、Roadmap B 状态、已知未支持的采样/控制器边界、验证证据与 README 操作说明；产品计划 `.docx` 方向未变，不编辑它。

## Completion criteria

- [x] 默认合成配置、Volume/Mute 在同一播放实例上工作；mock 与默认曲浏览器交互核对时间和视图切换连续性，真实音色质量另列待验证。
- [ ] pause、seek、结束/重播和切曲不会丢失控制值或留下旧声部；默认曲浏览器和 seek/pause/load mock 已检查，切曲与真实声卡输出待验证。
- [x] 定向与全量 test/lint/build 通过；浏览器交互与可用的音频验证记录准确。
- [x] 无外部未核实依赖，用户素材未修改或暂存，相关事实文档更新。
- [x] 无法获得的真人听感明确标记，不将整个 Milestone B 误标为已完成。

## Execution notes and completion evidence

2026-09-26：从 `34f55a0` 实施默认谐波合成、持久 master gain、Volume/Mute UI；定向 11 测试、全量 77 测试、lint 和含类型检查的 build 均通过。详细数值见 [验证记录](../../VERIFICATION.md#listening-quality-2026-09-26)。浏览器控制连接初次失败；重启本地服务后恢复，默认曲的播放、静音、音量、seek、暂停、重播、视图切换与 390×844 布局已检查。文件选择器在本轮自动化中未打开，切曲仍需验证；本环境也无真人声卡试听证据。Plan 保持 Active。下一步：用仓库测试 MIDI 核对切曲，再由实际听众试听 Quick Study 和熟悉的合法 MIDI，记录设备、浏览器与具体问题段落。

2026-09-27：用户明确反馈“音色我觉得现在的都可以接受”，因此继续下一轮 Continuity。新增切换不同乐谱后的主增益/旧声部 mock 回归，浏览器导入测试谱和用户授权的卡农 MIDI，并往返切曲确认 Volume 40% 不重置。没有声卡信号采集或设备/浏览器试听参数记录，完成标准中的真实输出仍保持待验证，不把主观接受扩写为客观音质认证。
