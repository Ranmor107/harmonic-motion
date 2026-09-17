# Test Matrix

Purpose: 按改动选择真实存在的检查，区分纯函数、mock 与浏览器证据。
Authority: 验证映射与覆盖缺口的主要记录；实际运行结果见 [VERIFICATION](VERIFICATION.md)。
Update when: scripts、测试文件/suite、覆盖范围或验证要求改变。
Last verified: 2026-09-17；检查 [package.json](../package.json)、[vite.config.ts](../vite.config.ts) 和全部测试源码。

所有命令在仓库根目录运行。`npm run test` 是 `vitest run`，额外文件和 `-t` 参数通过 `--` 传入。
现有 scripts 没有独立 typecheck、coverage、E2E 或截图命令；需要类型检查时使用 `npm run build`（内含 `tsc -b`）。不要写不存在的 `npm run typecheck` / `test:render`。

<a id="targeted-validation"></a>
## 定向检查

| ID / Module or behavior | Relevant tests / 实际覆盖 | Required targeted command | When global test is required | Manual verification |
| --- | --- | --- | --- | --- |
| T-MIDI · parser/normalization/analysis | [midi.test.ts](../tests/midi.test.ts)：tempo、跨轨、空白、channel/instrument、短琶音、错误输入、基础 analysis | `npm run test -- tests/midi.test.ts` | score 字段/时间单位/起音分组跨层改变时 T-GLOBAL；groupOnsets 改动至少追加 engine | 用测试 fixture 导入、错误文件保留原曲；新增格式另准备可核实素材 |
| T-GEOMETRY · geometry / seed / world | [engine.test.ts](../tests/engine.test.ts)：`Music Geometry Engine`；另读 `Independent extension points` | `npm run test -- tests/engine.test.ts` | WorldModel、compile 输出或共享 utils 改变时 T-GLOBAL | 同 seed 同世界；变 seed 后音乐时序不变；bounds/连接可读性 |
| T-CHOREOGRAPHY · curves / plan / seek | [engine.test.ts](../tests/engine.test.ts)：`Choreography and random access`，空谱/单节点在另一 suite | `npm run test -- tests/engine.test.ts` | PerformancePlan/curve/event 联合类型改变时 T-GLOBAL | 起音端点、前跳后跳、暂停冻结、首尾状态 |
| T-PLAYBACK · clock / coordination | [playback.test.ts](../tests/playback.test.ts)：clock + coordination；[audio.test.ts](../tests/audio.test.ts) 检查联动 | `npm run test -- tests/playback.test.ts tests/audio.test.ts` | 时间源、状态集合、seek/loop 语义跨层改变时 T-GLOBAL | Play/Pause/Restart、播放中与暂停中 seek、结束重播、音频解锁 |
| T-AUDIO · scheduler / voice management | playback 的 `Audio event scheduling` + audio 的 `Tone audio adapter` | `npm run test -- tests/playback.test.ts tests/audio.test.ts` | AudioEngine 接口、clock/sourceTimeFor 或 score 表达变化时 T-GLOBAL | 真人试听；同音重叠、和弦、seek 延音、暂停后无残留；明确设备与浏览器 |
| T-VISUAL · theme/presentation/effects/appearance | [visual.test.ts](../tests/visual.test.ts) 测纯时间 presentation、预算、stream chord/seek/camera fit；engine 测 compiled 不变 | `npm run test -- tests/visual.test.ts tests/engine.test.ts`；`npm run lint`；`npm run build` | 引入计划/世界新语义时 T-GLOBAL；普通配色不要求全量核心测试 | 修改前后截图、可读性、seek/暂停、view 切换不改变播放/音乐 |
| T-CAMERA · navigation/follow/fit | visual 测 home state 确定性和导航限制；真实 pointer 仍需浏览器 | `npm run test -- tests/visual.test.ts`；`npm run lint`；`npm run build` | 相机之外的核心 contract 改变时 T-GLOBAL | zoom/pan/fit、view 切换和中等窗口；比对 world/plan/playback 保持不变 |
| T-VISIBILITY · focus/path/stream | visual 测窗口分类、显示预算、卫星生命周期/和弦/seek；engine 测 evaluator | `npm run test -- tests/visual.test.ts tests/engine.test.ts`；`npm run lint`；`npm run build` | 修改事件、世界或轨迹数据语义时 T-GLOBAL | 时间0/末尾、前后seek、pause、overview/focus/path/stream；密集测试曲 |
| T-UI · layout/title/buttons | 无 UI 自动测试；动作相关时使用对应核心 suite | `npm run lint`；`npm run build`；行为变化追加所属模块的 targeted test | UI 接线改变跨模块控制流时 T-GLOBAL | 控件、焦点、错误提示、标题长度、常用窗口尺寸；纯布局不冒充引擎变更 |
| T-STATE · score/seed/preset composition | engine 的 `Independent extension points` | `npm run test -- tests/engine.test.ts -t "Independent extension points"` | compiled/score 生命周期或模块装配改变时 T-GLOBAL | 导入归零、regenerate 保持进度、preset 不重编译 |
| T-DEMO · procedural example | engine/playback 使用 demo 的具体音符和时刻 | `npm run test -- tests/engine.test.ts tests/playback.test.ts` | 若 normalize/契约也改则 T-GLOBAL | 开页默认世界、标题/数量描述与实际一致 |
| T-GLOBAL · cross-module / domain / shared semantics | 全部现有测试 + 静态约束 + 生产编译 | `npm run test`；`npm run lint`；`npm run build` | public contract、≥3 责任层或无法局部隔离的集成变化必做 | 按受影响行为补浏览器 smoke；全量单测不能替代它 |
| T-DOC · documentation only | Markdown 路径、符号、命令、metadata 与 diff；无专门文档测试脚本 | `git diff --check`；`git diff --name-only`；若已暂存再加 `git diff --cached --check` / `--name-only`；`git status --short` | 需要确认 baseline 或文档引用检查结果时可运行 T-GLOBAL；不为文档修产品失败 | 路由演练：zoom、InkTheme、Spiral；相对链接和 anchors 可达；用户已有文件保持不变 |

定向 suite 过滤适合诊断；最终检查不得因 `-t` 排除同文件内相关边界用例。新增测试时不要为了维持历史数量跳过或弱化断言。

## 现有测试不能证明的事情

- Vitest 运行在 Node，未安装浏览器组件/截图测试框架。纯 presentation/camera 测试不能自动证明 Canvas 外观、pointer 交互或排版质量。
- audio mock 验证调用、独立声部及取消；不产生真实声卡信号，也不测输出延迟。
- geometry 的替换测试把现有 constellation 结果包装为另一个 strategy ID，并没有实现/测量另一种真实空间布局。新增策略需要自己的位置、连接、bounds 和可抵达性断言。
- seek 一致性测试比较同一个纯求值器在直接与逐次调用后的结果，证明不积累状态；不等同于真实逐帧音画同步测试。
- 未有专用相机数学、64 声部溢出/复用压力、20,000 音符性能、真实 MIDI corpus 或可访问性自动测试。
- `lint` 的 import 禁令不是完整架构依赖图；不能把 lint 通过理解为全部 invariants 自动成立。

<a id="manual-smoke"></a>
## Browser smoke：按影响选择

1. 默认 demo：世界/节点/连接/Performer 可见，无异常；不只看 DOM fallback 文本判断 WebGL 成败。
2. Play → Pause → Restart：时间与当前位置一致；暂停无新音符。
3. 播放中和暂停中前后 seek，尤其和弦和延音；首节点之前与结束时刻也检查。
4. Regenerate：seed 改变，score/timing/当前进度保留；视觉 preset 变化保留 world/plan。
5. 导入 [tempo-and-voices.mid](../tests/fixtures/tempo-and-voices.mid)，验证双轨与变速；导入 [invalid.mid](../tests/fixtures/invalid.mid)，验证错误提示与原曲保留。
6. 检查修改涉及的画面/相机/显示模式以及浏览器 console；需要证明听感时进行真人试听或实际音频输出测量。

本清单是未来验证方法，不表示本轮全部重跑。已有浏览器结果的日期和范围见 [VERIFICATION](VERIFICATION.md)。
