# Complex music: readability, depth and rendering budgets

Purpose: 本轮复杂作品打磨的实施范围、测量与验收。
Authority: 局部实施计划；沿用 ADR-0001，核心契约不变。
Update when: 实施、测量或验收状态变化。
Last verified: 2026-09-21。

Status: Completed
Source baseline: `b189533`。用户未跟踪 `midi/` 保留，不读取/改写/提交为测试素材。

## Scope and sequence

1. 基线：程序生成 100 / 700 / 2000 / 5000 notes，测 compile、展示准备、随机 seek、模型序列化大小；开发浏览器测实际帧间隔和绘制资源。
2. P1：visual/presentation 生成关系优先级、声部一致曲线路由、空间密度索引、按时间强调、预算和 zoom LOD；render 只更新已选择的节点/边/和弦扇形。
3. P2（按用户后续确认调整）：Stream/Ribbon 使用原 Helix 投影和正面镜头；新 Ensemble 独立展示相对稳定的声部弧区、音符关系和克制的平移/旋转/缩放。取消本轮未交付的斜向 Helix 分支。生命周期和舞台只由绝对歌曲时间决定。
4. P3：按基线定位替换全量扫描/排序，压紧实例和 drawRange，限制每帧对象/缓冲区；检查删除/切曲资源释放与 bundle 来源。
5. 定向测试、全量 test/lint/build（build 内含 typecheck）、浏览器 demo/700/2000 全视图检查、文档与交付。

Primary owner: visual/render/camera。Expected files: presentation/*.ts、WorldRenderer/StreamRenderer/CameraRig/Scene/EffectsRenderer、visual/camera、必要 presentation 配置与 domain/visual 类型、tests 与独立 benchmarks 入口。Adjacent: App/state 仅在真实生命周期问题或验证接线需要时展开。

Non-goals: UI redesign、新 preset、输入格式、依赖升级、AI、新 GeometryStrategy、MIDI normalize、analysis、正式 geometry/choreography、PlaybackClock、audio scheduler、时间/和弦/seek 语义。

## Contracts and tradeoffs

I1–I10 保持：world/plan/score 完整且引用不变；LOD 只选择绘制集合。内部展示索引可以扩展，不引入引擎级契约或 ADR。简单可复现路由优先于 graph framework；相机绝对时间求值优先于逐帧积分。局部预算允许弱化辅助细节，但保留主要关系和整体结构。

## Validation and completion

- [x] 记录优化前后实测基线，不把 JSON 字节数当作堆内存或编造 FPS。
- [x] 关系确定性、层级、局部密度/LOD、世界与计划不变；Ribbon seek/伴随生命周期/相机构图及 Ensemble 代表选音测试。
- [x] 大谱 compile/seek、切视图不重载音频、会话切换与资源边界检查。
- [x] 浏览器 demo/700/2000 的 Overview/Focus/Path/Ribbon/Ensemble 与 seek、camera 视觉复核。
- [x] test/lint/build、diff、文档链接与用户素材范围通过；提交并归档计划，上传 GitHub。

## Evidence / decisions

初始源码证据：WorldRenderer 每帧遍历全 world.nodes，filter/sort 全关系，隐藏实例仍占容量；StreamRenderer 每帧遍历全部 phrases；两者清零整段未用线缓冲而不设 drawRange。先测量，再在这些局部路径增量优化。

用户中途调整：Ribbon 改用本轮之前的 Helix 主线投影与正面镜头；未交付的旧 Helix 分支不继续保留，改为独立 Ensemble 视图。Constellation 与性能工作保持原范围。调用的 grill-me 本地入口只转发到不可用的 grilling 技能，已如实告知并使用直接问答。

后续设计问答已确认：允许移动/旋转/缩放，以音符及音乐结构为主角，不复制 Lanota 判定盘/玩法。声部区域相对稳定；快速密集作品允许省略部分音符的绘制。实施为 Ensemble 独立视图，Stream 保留正面 Ribbon。新增纯展示模型与 renderer，domain/visual 增加 viewMode、去除旧 shape 分支；App 仅增加选择与相关说明，不改 UI 布局/播放生命周期。音频及完整 score/world/plan 不变。稠密时间桶优先保留显著音、低/高音轮廓，帧预算为声部分配代表；不声称每个音符或和弦成员均可见，也不声称自动识别真实旋律/音乐学声部。

### Interim evidence (not final acceptance)

- 已实现关系分级/时窗强调/声部深度路由/和弦连续扇形、邻接与空间密度索引、固定实例容量和 drawRange；Overview 全曲 ghost 轮廓，Focus/Path 局部节点选择。
- Stream 增加音符块结束时间索引、可见 phrase 反查、预计算伴随路径和主线窄带面；绝对时间求值保持。
- 优化前 Node 原始基线保存在忽略目录 `artifacts/complex-music/before.json`；改进中快照为 `after.json`。100/700/2000/5000 notes 的 world JSON 字节：41945/310377/895622/2254588；plan JSON 字节：52108/390249/1124446/2827599，前后完全相同。它们不是实际堆内存。
- 11:01 Node 快照：compile 1.24/1.82/5.83/12.80 ms；局部 Focus 选择+关系层级 P95 0.201/0.182/0.195/0.129 ms；同轮全谱旧扫描 0.071/0.106/0.281/0.418 ms。小谱新增层级有额外开销，不能宣称所有规模更快。初始第一次准备包含冷启动，非严谨微基准统计。
- 浏览器开发环境 1280×720：demo/700/2000 的 Overview、Focus、Path、Ribbon、初版 Helix 已截帧检查。2000 播放中切到 Helix：31.24s→32.15s，音频 load 计数保持3。2000 seek input 到第二个 rAF 14.2ms；不等同声卡延迟。
- 120帧窗口观测：2000 Overview 中位/P95 7.9/8.4ms，11 draw calls，476实例，11 geometry，CPU typed buffers 311136 bytes；Focus 7.8/8.4ms，215实例；播放中初版 Helix 7.7/8.5ms，8 draw calls，142实例，8 geometry，458352 buffer bytes。开发环境短采样，不保证其他设备FPS。Chromium粗略全页heap约81–103MB，含工具/开发模块，不可当模型或GPU内存。
- Bundle sourcemap 原始来源字符量（非压缩占比）：Three 2.12M，R3F 0.66M，React DOM 0.55M，standardized-audio-context 0.47M，Tone 0.41M。3D首屏必需，暂不为消除warning强行拆包。
- 用户调整后的 Ribbon 已迁移至原 Helix 主线与正面镜头；Ensemble 在 700/2000 及高速 2000 合成曲目中完成视觉复核。700 浏览器样本为 5 draw calls、100 个实例；高速 2000 为 5 draw calls、约 100 个实例，连续 120 帧中位约 6.1ms（开发环境，不代表 FPS 承诺）。播放中 Ensemble→Stream→Constellation→Ensemble 的进度连续，audio load 计数保持不变。
- 最终 Node 快照（v24.18.0/win32）：100/700/2000/5000 的 compile 1.19/2.13/4.83/6.93ms，Ensemble 准备 0.39/0.37/0.93/2.02ms，Ensemble seek P95 0.135/0.105/0.212/0.103ms；world/plan JSON 字节与前次完全一致。完整 test 74 项通过，lint/build 通过；计划已归档并随实现提交上传。
