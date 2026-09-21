# Radial Stage: inner-to-outer depth emergence

Purpose: 将 Ensemble/Radial Stage 从稳定圆周音符升级为“舞台内部深处向外涌现”的音乐展示。
Authority: 局部实施计划；沿用 ADR-0001 与上一轮复杂音乐显示契约。
Last verified: 2026-09-21。

Status: Active
Source baseline: `5f29b5b`。用户未跟踪 `midi/` 保留，不读取、改写或提交。

## Scope

1. 在 `ensemblePresentation` 中加入确定性的 Hidden → Emerging → Approaching/Unfolding → Active/Resonating → Fading 生命周期、内外半径、深度层、弧形展开与主线/和弦/伴奏的结构参数。
2. 在 `EnsembleRenderer` 中消费统一的绝对 songTime 求值，使用 scale、opacity、z-depth、遮挡排序、局部弧线和有限 glow 表达由内向外的涌现；舞台运动保持低幅且不成为注意中心。
3. 在 Ensemble camera/stage bounds 中保留正面可读构图，允许轻微 stage tilt，但不增加固定判定圈、命中线、评分或输入玩法。
4. 增加纯函数测试、密集曲目性能记录和浏览器视觉检查；切换 view 不触碰 WorldModel、PerformancePlan、audio load 或播放进度。

## Contracts and non-goals

- 保持 timeline-first、deterministic、seekable、same authoritative song time。
- 完整 score/world/plan、事件和音频不删除；密集曲目只减少显示代表。
- 不修改 MIDI、geometry、choreography、playback、clock、audio scheduler、App 播放生命周期。
- 不实现音游判定逻辑；外层只是音乐结构的完成位置，不是判定圈。
- 不把轨道直接宣称为音乐学声部；稳定区域是可解释的显示分组。

## Validation

- [x] 阶段边界、内外半径、深度/缩放/透明度与 seek 回放具有确定性。
- [x] 主线、和弦、supporting strands 分别有结构化的展开断言；不靠随机漂浮或所有路径指向中心。
- [x] WorldModel、PerformancePlan、score 引用和音频 load 计数保持不变。
- [x] `npm test`、`npm run lint`、`npm run build` 通过；性能快照覆盖 100/700/2000/5000。
- [x] 浏览器验证默认 demo、700、2000、高速密集曲目：内部涌现、主线可追踪、和弦成组展开、舞台运动克制、无 console error。
- [ ] 完成后移入 `docs/plans/completed/`，更新 CURRENT_STATE、KNOWN_LIMITATIONS、VERIFICATION 和计划索引，提交并推送。

## Evidence

- `ensembleNoteState` uses absolute note age and a continuous 0→1 emergence progress. The pre-event path starts at a stable inner radius and negative z depth, then bends toward the track's outer arc. Active notes add a bounded resonance pulse; fading notes drift slightly outward and backward.
- `EnsembleRenderer` draws the emergence filament, curved supporting strands, long-note arc traces and local chord contours in shared typed buffers. No judgement ring or fixed hit line was added.
- Browser development checks at 1280×720: 700 notes at the initial depth window and at 7 seconds; 2000 notes at 31 seconds; no console errors. The benchmark reported five draw calls and 103 instances for the 700-note snapshot.
- Node snapshot `artifacts/complex-music/radial-depth.json` (v24.18.0/win32) records Ensemble preparation 0.85/1.53/2.08/4.50 ms and seek P95 0.156/0.110/0.184/0.092 ms for 100/700/2000/5000 notes. These are local development measurements, not a cross-device frame-rate promise.
