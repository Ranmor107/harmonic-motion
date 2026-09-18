# Musical Identity, Relation Language & Multi-Score Experience

Purpose: 第三轮产品迭代的范围、实施与验证记录。
Authority: 本轮实施计划；架构边界见 ADR-0001。
Update when: 范围、验证或完成状态改变。
Last verified: 2026-09-18。

Status: Active
Source baseline: `5b67149`；已有未跟踪 `midi/` 为用户素材，不修改或提交。
Related request: 用户第三轮完整需求，2026-09-18。
Related ADR: [Stream presentation boundary](../../decisions/ADR-0001-musical-presentation.md)

## Problem and goal

现有舞台被两侧 UI 挤占，球形包围盒取景过远；Stream 是水平线与散点，无法表达主线和伴随乐句；单曲状态每次导入均替换。目标是较大的音乐舞台、独立品牌、收起式控制抽屉、可解释的音乐关系、沿音乐主线运行的 Stream，以及可复用编译结果的会话曲库。

## Scope and contracts

- Primary: visual/presentation、render、application UI/state。
- Adjacent: domain/visual 新增 salience/relation/stream 配置；不修改 score/world/performance 契约。
- ScoreSession 缓存 filename、id、seed、CompiledScore；标题/时长/轨道/音符/和弦/tempo 从缓存 score 读取，避免重复元数据。
- 保持 I1–I10：绝对 songTime、确定性/seek、显示和编译分离；视图/形态切换不重编译；音频始终播放完整 score。
- Non-goals: 真正旋律提取、乐句分析、云曲库、音色替换、新 GeometryStrategy 或 planner；不改用户 MIDI。

## Implementation

1. 集中品牌与引语配置。候选 Cantivela、Sonavel、Melora、Notelume、Arcolune、Resonara、Velacanto、Lyravelle、Aurevia、Cadenzae；暂用 Cantivela，不声称商标可用。
2. 纯展示模型：在可配置短时间窗内按力度/时长/音区/同轨连续性/音程选择 salient note；按轨道及间隔把其余音符组织为短组。这些是可解释启发式，不声称真实旋律/乐句提取。
3. Constellation 保留节点，显示金色主关系、弱化序列、蓝灰声部、和弦成员与弧线；按窗口/预算过滤。
4. Stream 由同一展示模型产生 ribbon/helix 主线、支持分支与持续音符；主角、trail、生命周期全部按 songTime 求值。稳定水平前移，Y/Z 保留音乐轮廓。
5. 改为窄作品铭牌、大画面、左下引语、右抽屉，保留缩放/平移/取景；拟合投影包围盒。多选导入、切换、移除、轻量上/下一曲；切换停止并归零，保留显示偏好。

## Expected files

- src/branding/config.ts、ui/App.tsx、ui/styles.css、index.html/public mark：品牌与交互。
- src/state/store.ts：会话缓存；tests/session.test.ts：切换/移除/缓存/偏好。
- src/domain/visual.ts、visual/presentation/*：配置、关系/主线/生命周期；tests/visual.test.ts 与新增 musical-presentation.test.ts。
- src/render/{Scene,WorldRenderer,StreamRenderer,CameraRig}.tsx、visual/camera/staticCamera.ts：展示消费与取景。
- docs 的 CURRENT_STATE、KNOWN_LIMITATIONS、VERIFICATION、README、模块地图/测试映射中实际改变的段落；决策与计划索引。

## Risks and validation

稠密曲预算、长音生命周期、主线两端/单音、切曲异步音频、相机交互与跟随冲突是重点。纯函数回归覆盖 tie-break、连续性权重、音乐输入改变形状、主角抵达、逆向 seek、和弦、长音、预算；store 测缓存引用及偏好；全量 test/lint/build；浏览器实测默认布局、抽屉键盘、两视图/形态、zoom/pan/fit、播放/seek、多文件/错误导入/切回/删除与中等窗口。真实声卡音质不以 mock 冒充。

## Completion criteria

- [x] 上述用户可见目标实现，公共边界核对。
- [x] 全量检查通过，浏览器证据记录。
- [x] 文档事实更新，diff 范围检查，用户素材保留。
- [ ] 独立 Git 提交，计划完成后归档。

## Execution evidence

- [验证记录](../../VERIFICATION.md#iteration-03)：49 项全量测试、lint、strict TypeScript/生产构建通过；fixture 类型错误修正后定向 10 项复验通过。
- 浏览器观察覆盖多尺寸、关系层级、Ribbon/Helix、720 音符、多选导入、错误导入、切歌/删除/显示偏好、播放切视图和往返 seek。
- 实测发现 size 对象随 UI 刷新重建导致相机重复取景，改为 width/height 依赖；实际 wheel/drag 截图确认操作保持。密集主线改用短时间窗选择，补交错起音测试。
- 扩展预期文件包括 PerformerRenderer/defaultCosmic：仅调整主角大小与绘制优先级，使其在关系和活动音符上保持可辨。
- 选音、短组和 Stream 路径只在 visual/presentation；正式 score/world/plan、MIDI、音频和音乐时钟未改动。
- 用户 MIDI SHA256 与起点一致，不暂存；截图只在被忽略的 artifacts 中。命名未进行商标检索。
- 剩余视觉限制：密集关系重叠、部分曲目的 Helix 正面投影偏平；未进行真人试听和性能基准。限制不冒充已验证能力。
- 用户追加要求：完成本地提交后上传 GitHub。当前无 remote，使用已认证账号创建私有 harmonic-motion 仓库；上传结果在最终交付核实。
