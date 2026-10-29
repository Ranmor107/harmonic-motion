# Readable ink, recoverable failures and trustworthy diagnostics

Status: Active
Date: 2026-10-23
Source baseline: `b44427e`

## Goal and sequencing

用户选定下一轮迭代：1) 独立修复 A03 水墨重复音消失；2) A06/A08 存储与音频失败恢复；3) A10 诊断与测试曲库隔离。按此顺序验收、分别记录修复，保持小步交付。完成后更新后续待办，不把未选的审计项自动算作已修复。

## Scope / ownership

- A03：visual/presentation 的重复音 anchor 分组；仅改 inkPresentation 与 ink 回归。
- A06：state/persistence 的打开连接和事务终态；App 显示持久临时状态及刷新重试。保留数据库 version/key/格式和坏记录写入保护。
- A08：playback/controller、AudioEngine/Tone 适配器的失败通知与暂停/声音清理；App 初始化错误、加载重试和 seek 错误接线。Scene 的异常边界覆盖模型准备，失败后可显式重试。
- A10：benchmark 入口、R3F/Ink 独立计数与采样、明确 renderer/mode/区间；App 可选禁用持久化，测试曲目绝不读写正式曲库。

不涉及：A04/A05/A07/A09/A11–A13、App 大拆分、新音色/风格/功能、MIDI/分析/geometry/choreography、数据库迁移、多窗口冲突策略、依赖升级、用户 midi/DOCX。

## Contracts and decisions

1. 重复音按乐谱顺序限定局部聚合次数，超限建立新 anchor；不按播放帧移动落点，seek 仍为绝对时间纯求值。
2. open error/blocked、transaction error/abort 明确 reject；晚 success 关闭，versionchange 关闭旧连接并允许之后显式重开。无盲目重试/清库；同步异常也拒绝 Promise。
3. 音频失败至少暂停唯一歌曲时钟、销毁当前及预排声音，并通知 UI。补适配器异步错误回调；旧 unlock/load 的完成或失败不得影响新操作。load/retry 成功前不允许播放，错误页可见且可重试。
4. `App({persistenceEnabled=true})` 增加开发诊断装配开关；false 时不读写 IndexedDB、不挂 pagehide 保存，正常入口默认行为不变。
5. 指标标注实际 renderer、具体模式、采样起止及绘制间隔；R3F 在渲染后采样，Ink 仅真实 draw 计数。暂停无新样本返回 pending/null，模式切换清理旧指标。绘制间隔不是 GPU 耗时，也不直接承诺帧率提升。
6. NormalizedScore、WorldModel、PerformancePlan、歌曲时间源不变；新错误通知属于既有服务协调契约，不引入第二套时钟。无架构语义重写，不另建 ADR。

## Expected files

`src/visual/presentation/inkPresentation.ts`、`src/state/persistence.ts`、`src/playback/controller.ts`、`src/audio/AudioEngine.ts`、`src/audio/ToneAudioEngine.ts`、`src/ui/App.tsx`、`src/render/Scene.tsx`、`src/render/RenderDiagnostics.tsx`、`src/render/InkStreamRenderer.tsx`、小型诊断纯 helper；相关 ink/persistence/audio/playback/performance tests、`tests/browser/benchmark.tsx` 及必要隔离恢复测试页；审计、README、当前能力/限制、模块/测试手册、路线图、验证记录与计划索引只更新变化事实。

## Validation / completion

- [ ] A03 先失败回归：30秒主/辅连续同音、休止、有限聚合与随机seek；定向 ink suite。
- [ ] A06 先失败回归：complete/error/abort/blocked/versionchange、晚 success、显式重开，原库不清空。
- [ ] A08 回归：unlock/seek/load/首次及后续 pump 失败，残留声音清理，时钟暂停，晚异步不重启或打断新曲；初始化重试可操作。
- [ ] A10 回归：采样身份/区间/来源切换；五种模式浏览器取样；诊断不访问正式存储。
- [ ] 集成后一次 test/lint/build；浏览器仅覆盖新增失败恢复与重复音/五模式诊断，不扩展无关验证矩阵。
- [ ] 更新审计状态与剩余项、记录真实局限，检查显式提交范围，保护用户文件；达到门槛后归档。
