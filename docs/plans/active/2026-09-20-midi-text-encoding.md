# MIDI text encoding compatibility

Purpose: 记录 MIDI 标题乱码修复的范围、证据与验收。
Authority: 本次局部 bug 修复计划；长期输入边界仍以 CURRENT_STATE / KNOWN_LIMITATIONS 为准。
Update when: 修复范围、验证结果或完成状态变化。
Last verified: 2026-09-20。

Status: Active
Source baseline: `08633e7`；已按用户要求放弃并完整撤销未提交的 Iteration 04 UI/preset 修改。用户 `midi/` 仅作为只读复现输入，不提交。
Related request: 导入 `帕赫贝尔D大调卡农.mid` 后歌曲标题乱码。
Related ADR: none；不改变架构边界。

## Problem and evidence

该文件的标题元事件原始字节为 `C5 C1 BA D5 B1 B4 B6 FB 44 B4 F3 B5 F7 BF A8 C5 A9`。GB18030 解码为“帕赫贝尔D大调卡农”，`@tonejs/midi` 当前将每个字节直接映射为字符，产出 `ÅÁºÕ±´¶ûD´óµ÷¿¨Å©`。文件名本身正常。

## Scope

- Primary: `src/midi/normalize.ts` 的 MIDI 文本规范化。
- Test: `tests/midi.test.ts` 用程序生成的等价字节复现，不依赖或提交用户 MIDI。
- Docs: 只更新计划、验证证据及确实变化的输入兼容说明。
- Non-goals: UI/字体/视觉 preset、MIDI 文件改写、音乐时序、geometry、choreography、playback、audio、依赖升级。

## Contract and approach

ASCII MIDI 标题行为不变。对单字节形式的非 ASCII 元数据，尝试标准 UTF-8 / GB18030 / Big5 / Shift_JIS 严格解码；以去扩展名文件名作消歧证据。找到与文件名一致的解码时用于标题及轨道名；UTF-8 可直接采用；无法可靠判定且原文本高度疑似乱码时回退到正常文件名。原始 MIDI 不变，NormalizedScore 的时间、音符和 ID 不变。

保持 I1–I4：仅修正展示元数据字符串，不改变时间源、确定性、seek 或 MIDI 音乐数据。

## Validation

- 新回归：GB18030 标题字节复现并得到正确中文；轨道名同步解码；ASCII 内部标题仍优先于文件名；音符数据不变。
- 定向 `tests/midi.test.ts`，然后完整 test/lint/build。
- 浏览器实际导入用户卡农文件，确认标题、曲目统计和播放入口；不以单测替代。
- 检查 diff 只含本计划、MIDI normalize/test 与必要事实文档；用户素材 hash 不变。

## Completion criteria

- [x] 实际卡农文件标题正常，普通 ASCII 标题无回归。
- [x] test/lint/build 与浏览器验证通过。
- [x] 无 UI 或核心音乐逻辑改动；用户 MIDI 未修改、未提交。
- [ ] 记录验证与提交引用后归档。

## Evidence

- `tests/midi.test.ts` 定向测试：PASS，1 文件 / 8 测试。
- `npm run test`：PASS，7 文件 / 51 测试。
- `npm run lint`：PASS。
- `npm run build`：PASS；保留既有 bundle-size 提示。
- 内置 Chromium 实际导入用户卡农文件：标题为“帕赫贝尔D大调卡农”，无原乱码、无 console error；05:02 / 1 track / 1,956 notes / 617 chords。
- 提交引用：待提交。
