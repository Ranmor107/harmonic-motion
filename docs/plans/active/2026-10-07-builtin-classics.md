# Built-in classical scores

Status: Implemented · local verified · GitHub delivery pending
Date: 2026-10-07
Source baseline: `d48df9b`

## Problem and goal

用户希望无需寻找或导入文件即可欣赏经典曲目，并将允许公开分发的 MIDI 随 GitHub 仓库保存。本地 `midi/` 仅作选曲参考；作品年代不能证明具体转录文件的授权。

首批使用 Mutopia 明确标注 Public Domain 的三个版本：巴赫 BWV846《C大调前奏曲》、莫扎特 KV331 第三乐章《土耳其进行曲》、贝多芬 WoO59《致爱丽丝》。保留官方 MIDI 原始字节，登记具体来源、转录者、版次和许可，不将旧 Public Domain 标识改写成 CC0 或作全球无争议保证。

用户随后要求尽可能加入本地其他曲目：增加有明确许可的 BWV772《二部创意曲第一号》（CC BY-SA 3.0）和《D大调卡农》总谱（CC BY 4.0），共五首，分别署名并链接许可。两个现代曲目未获得允许公开分发的证据，不打包进仓库；非盈利不是公开传播的通用豁免。

## Scope and ownership

Primary: demo/content 的本地资源及清单；state 的默认曲库合并。
Adjacent: App 初始化和曲目来源标签；用户说明和模块文档。

非目标：改 MIDI 解析/分析、geometry/choreography、playback/audio、视觉或相机；重构 App、增加云同步或资源管理框架；上传用户现有 `midi/` 或 DOCX。

## Implementation decisions

1. MIDI 放在 `src/demo/assets/`，由 Vite 打包成本地资源；`src/demo/library.ts` 用既有 `parseMidi` 加载，仅覆写显示标题，不改音符/轨道/速度。
2. `restoreSessions(records, activeId, builtinEntries=[])` 先验证保存记录、统计恢复数量并确定活动曲，再补齐缺失内置曲。保存的内置 score/seed 优先，不重复追加；坏记录仍拒绝，默认补回不套用失败记录的位置。
3. App 并行读取本机存储与内置资源，分别处理失败；两者结束后一次恢复，再加载音频。内置曲继续使用既有 IndexedDB schema 与保存路径。
4. 内置曲长期可用，注册的默认曲不能删除；界面明确标注“内置经典”，移除按钮仅供用户曲使用。默认 Quick Study 与首次引导保留。
5. 来源文档单独说明具体文件许可，应用代码不借此变更许可；不使用第三方演奏录音。

## Expected files / contracts

- `src/demo/library.ts`、`src/demo/assets/*.mid`、`src/demo/assets/SOURCES.md`。
- `src/state/store.ts` 的可选 defaults 参数；`src/ui/App.tsx` 初始化与标签。
- `tests/builtin-library.test.ts`；README、CURRENT_STATE、CODEBASE_OPERATING_MODEL、TEST_MATRIX、开发者应用状态、VERIFICATION 和计划索引。
- NormalizedScore、WorldModel、PerformancePlan、音频/歌曲时钟、数据库格式均不变。

## Validation and completion

- [x] 五份实际资源解析成功；来源/许可和原字节 SHA256 记录完整。
- [x] 空库 defaults 不算已恢复记录；保存的 seed/score 优先；坏记录原值保留且活动曲回退；用户导入/删除仍正常。
- [x] 一次全量 test / lint / build；只增加本任务必要回归。
- [x] 隔离浏览器检查曲库选择、播放/暂停、刷新恢复，不扩展重复视觉矩阵。
- [ ] 文档同步、归档计划、显式暂存本轮路径。
- [ ] 提交并推送 GitHub，核对远端提交。

## Execution evidence

2026-10-07：三份 Public Domain + 一份 CC BY-SA 3.0 + 一份 CC BY 4.0 MIDI 的原文件下载/解析通过；卡农使用官方 ZIP 的 `canon_per_3_violini_e_basso.mid`，保留4轨合奏。两个现代曲目没有公开分发许可证据，不打包。曲库提供来源/许可链接，README 说明视频使用的署名和 ShareAlike 条件。

14文件/124 tests、lint/build 一次通过；新增6项必要回归。隔离生产 preview 验证五曲选择、卡农播放、重新打开及刷新25.176秒暂停恢复、水墨切换保持时间；未见 console error。实际截图和边界见 [验证记录](../../VERIFICATION.md#builtin-classics-2026-10-07)。未重复全量检查或扩展长曲/音频/视觉矩阵。
