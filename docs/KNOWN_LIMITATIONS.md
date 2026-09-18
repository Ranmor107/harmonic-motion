# Known Limitations and Documentation Drift

Purpose: 记录已确认限制、尚未验证的风险及文档/代码差异，防止候选方案冒充事实。
Authority: 限制与 drift 的主要记录；验证证据见 [VERIFICATION](VERIFICATION.md)，候选状态见 [ROADMAP](ROADMAP.md)。
Update when: 新证据、支持边界、解决情况或待确认决策变化。
Last verified: 2026-09-18；Iteration 03 展示/相机/会话相关限制和浏览器观察。

Priority 只是当前建议，不等于排期。`unknown` 表示缺乏影响/频率证据；不将未测量风险统一升级为 high。

## Confirmed limitations and unverified risks

| ID / 状态 / Priority | 限制与证据 | Impact | Current workaround | Likely owner / Possible future direction |
| --- | --- | --- | --- | --- |
| L01 · Confirmed · unknown | [parser](../src/midi/parser.ts)：10 × 1024² 字节、20,000 notes；拒绝空谱、Type 2、SMPTE。不是完整 MIDI 格式兼容性认证 | 部分输入不能加载 | 导出 Type 0/1 PPQ、截取较短片段 | midi；按真实文件兼容性证据扩展，不能只放宽限额 |
| L02 · Confirmed · unknown | [normalize](../src/midi/normalize.ts) 只提取 notes/channel/instrument 与 tempos；[Tone adapter](../src/audio/ToneAudioEngine.ts) 统一 sine Synth | 原作乐器、踏板、弯音、CC、打击乐表现不还原 | 作为音符结构演示；需要忠实音色时另用原播放器对照 | midi/domain-score/audio；逐项定义表达和音色适配 |
| L03 · Confirmed · unknown | Tone adapter 64 声部上限含 release；无空闲声部则跳过新音符；[EffectsRenderer](../src/render/EffectsRenderer.tsx) 最多显示最近64次瞬态 | 极密集音乐可能少发声/少画反馈；音乐计划不丢事件 | 较疏的片段；不要据画面反馈数量判断谱面丢音 | audio / render 各自拥有预算；需压力测试后讨论策略 |
| L04 · Confirmed · unknown | [scheduler](../src/audio/scheduler.ts) seek 将仍持续音符按剩余 duration 重新起音；不重建相位/ADSR；后台 setInterval 可被节流 | seek 听感不等同于从头播放；后台连续性没有保证 | 前台播放；对照相邻音符与节奏，而非要求波形一致 | audio/playback；真实输出测量、明确恢复语义 |
| L05 · Confirmed · medium | [planner](../src/engine/choreography/planner.ts) 只有一名 ensemble Performer；每起音一个目标；同一时间多个目标报错 | 跨轨和弦共享一个抵达点，无独立声部叙事 | 使用已有 layerIds/noteIds 查看归属；不要伪装成多 Performer | choreography/domain-performance；多角色需先 plan |
| L06 · Partially resolved · unknown | 已有 zoom/pan/fit/reset/follow；Iteration 03 修复 size 对象导致取景反复重置的问题；没有 fit active region | 跟随可用，局部范围仍需手动取景 | 手动 pan/zoom 或 Fit | visual/camera + render；证据见本轮验证 |
| L07 · Partially resolved · unknown | Focus/Path/Stream 已提供局部视图和轨迹强调；隐藏实例 scale 为 0，WorldRenderer 仍逐帧遍历节点并筛选关系；Stream 过滤已准备好的短组 | 可读性改善，但极大曲目没有正式 GPU/内存基准 | Focus 96、Path 36、Stream 120 的配置预算；可关闭 effects | render/visual；先 profiling 再考虑更复杂索引/分块 |
| L08 · Browser-observed / performance unverified · unknown | 720 音符程序生成曲目在浏览器中可切换 Focus/Path/Stream 且视觉局部化；未采集 FPS、GPU 时间或长时稳定性 | 证明显示策略有效，不构成性能承诺 | 记录曲目规模、设备、帧率后再优化 | render；不能仅凭截图断言性能达标 |
| L09 · Confirmed / Unverified quality · unknown | 没有声卡信号采集或端到端延迟基准；mock 只验证调用 | 不能承诺听感、声卡输出延迟或精确音画延迟 | 真人试听并记录设备；不要以单测替代 | audio/playback；未来测量方案 |
| L10 · Confirmed · low | 生产包存在 Vite 体积警告，当前数值见 [本轮基线](VERIFICATION.md#repository-os-baseline) | 公网首次加载可能受网络影响；没有下载速度实测 | 当前本地使用；不影响构建通过 | 应用装配/交付；有交付目标再拆包，当前不改配置 |
| L11 · Confirmed coverage gap · unknown | 无自动 WebGL/UI/pointer 测试；已有纯投影相机测试、无真实第二策略几何回归；完整缺口见 [TEST_MATRIX](TEST_MATRIX.md) | 回归可能超出现有纯函数覆盖 | 定向浏览器检查，新行为增加真实断言 | tests 与相应 owner；不得宣称已有 E2E |
| L12 · Not implemented · unknown | MusicXML、video export、独立 Flow 等见 [CURRENT_STATE](CURRENT_STATE.md) | 这些需求目前不能通过现有 UI 完成 | 使用已支持输入和播放；不承诺临时导出方案 | 按 [ROADMAP](ROADMAP.md) 分别探索，不混成一项重写 |

## Documentation Drift

这里区分“架构希望成立的约束”和“当前代码实证”。现有 ARCHITECTURE 继续作为架构规范，不因记录例外而自动改动设计。

<a id="d01-visual-config"></a>
### D-01 · 视觉配置集中化的表述比实现更广（Open）

- **文档写了什么**：[ARCHITECTURE / Core abstractions](ARCHITECTURE.md#core-abstractions) 写“数值与颜色集中在 `src/visual/`”，并把外观/灯光归属 VisualTheme。按字面理解可能误以为所有美术参数均可配置。
- **代码实际是什么**：[PerformerRenderer](../src/render/PerformerRenderer.tsx) 固定自转系数 `0.4/0.6`；[Scene](../src/render/Scene.tsx) 固定主光位置；[EffectsRenderer](../src/render/EffectsRenderer.tsx) 固定 ring 内外径；[styles.css](../src/ui/styles.css) 有独立 UI 和图例色值。WorldRenderer 的 `upcomingOpacity/pastOpacity` 实际乘到实例颜色，不设置透明 alpha。主要 mesh 使用 MeshBasicMaterial；Scene 虽创建 theme 控制的灯光，这些材质不受灯光影响（已核对安装的 Three 材质源码说明）。
- **哪一方代表当前实现**：源码更准确地描述当前可调范围；“完全配置化”的宽泛解读尚未成立。核心几何与视觉仍解耦，不能把这些视觉内部固定值说成音乐架构失效。
- **需要未来确认**：UI 是否应随 VisualTheme 联动；自转/形状细节是否应暴露为配置；opacity 字段预期是亮度还是 alpha；是否真的要求灯光改变当前材质。应在相关视觉需求时确认，不在本轮改代码或预设未来答案。
- **处理**：ARCHITECTURE 保留原约束并添加此差异链接；具体实现遵循当前源码，新增主题先检查 Renderer 能力。

<a id="d02-seek-wording"></a>
### D-02 · README 的 seek 文案可能暗示重新生成轨迹（Clarified wording）

- **原文写了什么**：README 操作表曾写“重算轨迹、节点和效果”。
- **代码实际是什么**：[App](../src/ui/App.tsx) 调 controller.seek；[evaluator](../src/engine/choreography/evaluator.ts) 对既有 PerformancePlan 求位置，seek 路径不调用 compileScore/planPerformance。
- **判断**：原文可以理解为“重新求值”，但也可能误读成“重新规划”。当前行为以既有计划的绝对时间求值为准，与 ARCHITECTURE 一致。
- **处理及待确认**：本轮只将 README 明确为“对既有轨迹求位置，恢复节点和效果状态”。没有架构决策变化；若未来需求确实要求 seek 时重新规划，必须另行明确并进入 plan/ADR，不能沿用旧文案当授权。

## 尚未证明的事项

Iteration 03 已做浏览器回归，但未真人试听/采集声卡输出，未打开用户自带 MIDI 进行演奏，没有对其内容、许可或性能作判断。
现有工作树的非版本化素材是用户资料，不是已认证测试集。后续确需复现时由用户任务范围决定，不擅自提交进仓库。

## Iteration 03 的明确边界

- 显著性是短时间窗内的加权选择，可能错过真实主旋律或快速装饰音；只有展示主线被筛选，音频仍消费全部音符。支持组按轨道/间隔/长度划分，不是经音乐标注验证的乐句分析。
- Constellation 的稠密局部仍会交叉；Stream 的 120 音符预算优先保留 lead，密集伴声可能省略显示。Helix 的三维深度受正面稳定镜头压缩，不能保证每首曲目都有清晰螺旋轮廓。当前示例和 720 音符测试证明可交互，不代表通用美术质量或 FPS 基准。
- 曲库为会话内存缓存，刷新丢失；没有持久化、去重或总会话容量预算。单文件限额保持不变；大量文件累计内存未经压力测量。
- Stream 的效果开关控制 hit ring 与 trail；不提供 Constellation 的粒子散射。主题 halo 与核心音乐移动不是瞬态效果，关闭效果后仍显示。
- 迭代 02 的记录说“执行 wheel/drag”，不能据此推断画面保持了操作结果。迭代 03 实际发现了重复 fit，并以改变后稳定的画面复核修复；历史记录保留，解释以 [本轮证据](VERIFICATION.md#iteration-03) 为准。
