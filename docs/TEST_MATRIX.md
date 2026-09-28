# Test Matrix

Purpose: 按改动选择真实存在的检查，区分纯函数、mock 与浏览器证据。
Authority: 验证映射与覆盖缺口的主要记录；实际运行结果见 [VERIFICATION](VERIFICATION.md)。
Update when: scripts、测试文件/suite、覆盖范围或验证要求改变。
Last verified: 2026-09-28；增加 Ink Stream 的时间、切换、资源与旧偏好检查。

所有命令在仓库根目录运行。`npm run test` 是 `vitest run`，额外文件和 `-t` 参数通过 `--` 传入。
现有 scripts 没有独立 typecheck、coverage、E2E 或截图命令；需要类型检查时使用 `npm run build`（内含 `tsc -b`）。不要写不存在的 `npm run typecheck` / `test:render`。

<a id="targeted-validation"></a>
## 定向检查

| ID / Module or behavior | Relevant tests / 实际覆盖 | Required targeted command | When global test is required | Manual verification |
| --- | --- | --- | --- | --- |
| T-MIDI · parser/normalization/analysis | [midi.test.ts](../tests/midi.test.ts)：tempo、跨轨、空白、channel/instrument、短琶音、错误输入、基础 analysis | `npm run test -- tests/midi.test.ts` | score 字段/时间单位/起音分组跨层改变时 T-GLOBAL；groupOnsets 改动至少追加 engine | 用测试 fixture 导入、错误文件保留原曲；新增格式另准备可核实素材 |
| T-GEOMETRY · geometry / seed / world | [engine.test.ts](../tests/engine.test.ts)：`Music Geometry Engine`；另读 `Independent extension points` | `npm run test -- tests/engine.test.ts` | WorldModel、compile 输出或共享 utils 改变时 T-GLOBAL | 同 seed 同世界；变 seed 后音乐时序不变；bounds/连接可读性 |
| T-CHOREOGRAPHY · curves / plan / seek | [engine.test.ts](../tests/engine.test.ts)：`Choreography and random access`，空谱/单节点在另一 suite | `npm run test -- tests/engine.test.ts` | PerformancePlan/curve/event 联合类型改变时 T-GLOBAL | 起音端点、前跳后跳、暂停冻结、首尾状态 |
| T-PLAYBACK · clock / coordination | [playback.test.ts](../tests/playback.test.ts)：clock + coordination、最近片段回退后播放/暂停状态及音频不重载；[audio.test.ts](../tests/audio.test.ts) 检查联动 | `npm run test -- tests/playback.test.ts tests/audio.test.ts` | 时间源、状态集合、seek/loop 语义跨层改变时 T-GLOBAL | Play/Pause/Restart、播放中与暂停中 seek、最近 10 秒重听、结束重播、音频解锁 |
| T-AUDIO · scheduler / voice management | playback 的 `Audio event scheduling` + audio 的 `Tone audio adapter`；audio mock 还检查合成参数、主增益及音量/静音跨 seek/pause/load 的保持 | `npm run test -- tests/playback.test.ts tests/audio.test.ts` | AudioEngine 接口、clock/sourceTimeFor 或 score 表达变化时 T-GLOBAL | 浏览器调整音量/静音并检查时间；真人试听同音重叠、和弦、seek 延音、暂停后无残留；明确设备与浏览器 |
| T-VISUAL · theme/presentation/effects/appearance | [visual.test.ts](../tests/visual.test.ts) 测窗口/预算；[musical-presentation.test.ts](../tests/musical-presentation.test.ts) 测显著性、指定轨道与 Auto 回退、短组、长音、随机 seek、和弦、投影 fit；[dense-presentation.test.ts](../tests/dense-presentation.test.ts) 测密集段焦点预算及背景保留；[ensemble-presentation.test.ts](../tests/ensemble-presentation.test.ts) 测声部弧区、密集选音、预算与绝对时间运动；engine 测 compiled 不变 | `npm run test -- tests/visual.test.ts tests/musical-presentation.test.ts tests/dense-presentation.test.ts tests/ensemble-presentation.test.ts tests/engine.test.ts`；`npm run lint`；`npm run build` | 引入计划/世界新语义时 T-GLOBAL；普通配色不要求全量核心测试 | 修改前后截图、可读性、seek/暂停、view 切换不改变播放/音乐；轨道焦点需检查三视图及背景声部 |
| T-CAMERA · navigation/follow/fit | musical-presentation 测宽/窄视口投影角点，visual 测 home state；真实 pointer/follow 仍需浏览器 | `npm run test -- tests/visual.test.ts tests/musical-presentation.test.ts`；`npm run lint`；`npm run build` | 相机之外的核心 contract 改变时 T-GLOBAL | zoom/pan/fit、view 切换和中等窗口；比对 world/plan/playback 保持不变 |
| T-VISIBILITY · focus/path/stream | visual 测窗口分类；musical-presentation 测显示预算、生命周期/和弦/seek；engine 测 evaluator | `npm run test -- tests/visual.test.ts tests/musical-presentation.test.ts tests/engine.test.ts`；`npm run lint`；`npm run build` | 修改事件、世界或轨迹数据语义时 T-GLOBAL | 时间0/末尾、前后seek、pause、overview/focus/path/stream；密集测试曲 |
| T-UI · layout/title/buttons | 无 UI 自动测试；动作相关时使用对应核心 suite | `npm run lint`；`npm run build`；行为变化追加所属模块的 targeted test | UI 接线改变跨模块控制流时 T-GLOBAL | 控件、焦点、错误提示、标题长度、常用窗口尺寸；全屏按钮/F 与 Escape、Space/←/→/R、滑杆焦点与非交互区域、390px transport；纯布局不冒充引擎变更 |
| T-STATE · score/session/seed/preset composition | [session.test.ts](../tests/session.test.ts)：缓存引用、切曲偏好、删除、seed、保存记录恢复后重新编译并延续唯一 ID、加载归零与 late unlock；engine 的 `Independent extension points` | `npm run test -- tests/session.test.ts tests/engine.test.ts` | compiled/score 生命周期或模块装配改变时 T-GLOBAL | 导入归零、刷新后曲库/选中曲/偏好/暂停位置及逐曲轨道焦点恢复，删除后不复活；regenerate 保持进度、preset 不重编译 |
| T-DEMO · procedural example | [quick-study.test.ts](../tests/quick-study.test.ts) 验证默认曲目时长、分层加入、和弦变化与默认会话；engine/playback 使用旧短句的具体音符和时刻 | `npm run test -- tests/quick-study.test.ts tests/engine.test.ts tests/playback.test.ts` | 若 normalize/契约也改则 T-GLOBAL | 开页默认世界、标题/数量描述与实际一致；第一次点击播放、导入入口及说明的浏览器检查 |
| T-INK · Stream style/UI | [ink-stream.test.ts](../tests/ink-stream.test.ts)：相同 compiled/world/plan 和 camera/presentation 引用、效果偏好、局部生命周期与密集预算、随机 seek、version 1 风格回退、资源缓存/失败重试 | `npm run test -- tests/ink-stream.test.ts tests/visual.test.ts tests/session.test.ts tests/engine.test.ts`；lint / build | 新视觉类型与 UI/state 接线需 T-GLOBAL | 同时刻对照、镜头/播放连续、View 往返、刷新、Effects Off、键盘、390px/全屏、长曲和 20 次切换；音频 load 及资源释放需实际观察，单测不替代浏览器 |
| T-GLOBAL · cross-module / domain / shared semantics | 全部现有测试 + 静态约束 + 生产编译 | `npm run test`；`npm run lint`；`npm run build` | public contract、≥3 责任层或无法局部隔离的集成变化必做 | 按受影响行为补浏览器 smoke；全量单测不能替代它 |
| T-DOC · documentation only | Markdown 路径、符号、命令、metadata 与 diff；无专门文档测试脚本 | `git diff --check`；`git diff --name-only`；若已暂存再加 `git diff --cached --check` / `--name-only`；`git status --short` | 需要确认 baseline 或文档引用检查结果时可运行 T-GLOBAL；不为文档修产品失败 | 路由演练：zoom、InkTheme、Spiral；相对链接和 anchors 可达；用户已有文件保持不变 |

定向 suite 过滤适合诊断；最终检查不得因 `-t` 排除同文件内相关边界用例。新增测试时不要为了维持历史数量跳过或弱化断言。

## 现有测试不能证明的事情

- Vitest 运行在 Node，未安装浏览器组件/截图测试框架。纯 presentation/camera 测试不能自动证明 Canvas 外观、pointer 交互或排版质量。
- audio mock 验证调用、合成配置、主增益、独立声部及取消；不产生真实声卡信号，也不测音色或输出延迟。
- geometry 的替换测试把现有 constellation 结果包装为另一个 strategy ID，并没有实现/测量另一种真实空间布局。新增策略需要自己的位置、连接、bounds 和可抵达性断言。
- seek 一致性测试比较同一个纯求值器在直接与逐次调用后的结果，证明不积累状态；不等同于真实逐帧音画同步测试。
- 已有相机投影 fit 数学测试；尚无 pointer/React/WebGL 自动测试、64 声部溢出压力、20,000 音符性能、真实 MIDI corpus 或可访问性自动测试。
- `lint` 的 import 禁令不是完整架构依赖图；不能把 lint 通过理解为全部 invariants 自动成立。

<a id="manual-smoke"></a>
## Browser smoke：按影响选择

1. 默认 demo：世界/节点/连接/Performer 可见，无异常；不只看 DOM fallback 文本判断 WebGL 成败。
2. Play → Pause → Restart：时间与当前位置一致；暂停无新音符。
3. 播放中和暂停中前后 seek，尤其和弦和延音；首节点之前与结束时刻也检查。
4. Regenerate：seed 改变，score/timing/当前进度保留；视觉 preset 变化保留 world/plan。
5. 导入 [tempo-and-voices.mid](../tests/fixtures/tempo-and-voices.mid)，验证双轨与变速；导入 [invalid.mid](../tests/fixtures/invalid.mid)，验证错误提示与原曲保留。
6. 检查修改涉及的画面/相机/显示模式以及浏览器 console；需要证明听感时进行真人试听或实际音频输出测量。
7. 多选导入、切曲停止归零、删除当前/非当前曲目、最后一曲回退；模式/形态/效果/跟随偏好保留。缓存引用复用由 session 单测证明，界面切回本身不能证明没重编译。
8. pointer 操作前后截帧，等待一次 UI 更新后确认缩放/平移仍保持；Fit 恢复。不能把“发出了 wheel/drag”当成结果已生效。抽屉 Escape/焦点返回、不同宽度与 reduced-motion 样式另做人工检查。
9. Continuity：导入至少两曲、调整 View/音量并 seek，刷新或重新打开后核对标题/曲目数/偏好/暂停位置；删除测试曲后再刷新，确认记录消失。一键启动器另检查关闭窗口后服务端口释放且专用 profile 保留。
10. 轨道焦点：三轨示例在 Auto 与指定轨间切换，检查三视图主次关系、其他轨仍在、播放中切换后时间继续；切曲再返回和刷新后恢复逐曲选择。无效旧选择回退 Auto。
11. 长时间观看：3–5 分钟曲目播放、最近 10 秒重听、首尾 seek、Space/←/→/R、全屏 F/Escape、抽屉与滑杆焦点、后台与窗口变化；记录实际时长、浏览器错误及窄屏控制密度，不把短时交互当连续稳定性证明。

本清单是未来验证方法，不表示本轮全部重跑。已有浏览器结果的日期和范围见 [VERIFICATION](VERIFICATION.md)。
