# 验证记录

Purpose: 保留带日期、baseline 和适用边界的实际检查证据。
Authority: 已发生验证的记录；不能作为未来提交自动通过的保证。
Update when: 新一轮检查产生结果，或旧证据被确认需更正。
Last verified: 2026-09-20；最新证据见 MIDI text encoding compatibility，早期记录保留其日期和适用边界。

日期：2026-09-17。环境：Windows、Node.js 24.18.0、Codex 内置 Chromium 浏览器，1280 × 720。

以下 Foundation 自动检查与浏览器记录来自产品基线 `db67599` 的建立过程。本轮 documentation-only 任务没有重跑浏览器、试听或演奏用户 MIDI；新增证据在文末。

## 自动检查

- `npm run test`：31 项测试，覆盖音乐数据、确定性、端点、seek、播放协调和音频调度。音频适配器测试使用 Tone mock 验证参数、独立声部与取消操作，不等同于声卡输出测试。
- `npm run lint`：ESLint，零警告阈值，包括核心模块依赖约束。
- `npm run build`：strict TypeScript + Vite 生产构建。

生产主包约 1.38 MB（gzip 373 KB），Vite 给出超过 500 KB 的体积提示。当前所有功能在本地一次加载；后续面向公网交付时可拆分音频与 3D 依赖。

## 浏览器交互

| 检查 | 观察 |
| --- | --- |
| 默认加载 | 显示原创短句、8 节点、连接、1 Performer、seed 107 |
| Play | 音频解锁成功，状态变为 Performing，时间增长，和弦标签随歌曲变化 |
| Restart → Pause | 进度回到开头，暂停后时间冻结 |
| 暂停 seek 到 5.4s | 标签恢复 C4 · E4 · G4，Performer、节点和命中光环显示在对应位置 |
| Effects off | 反馈关闭，时间保持 5.4s |
| Regenerate | seed 107 → 108，时间仍为 5.4s，乐谱不变 |
| 双轨变速 MIDI 导入 | 24 notes、12 chord nodes、2 voices，加载后归零，并可播放/暂停 |
| 无效 MIDI 导入 | 显示明确格式错误，原乐谱、世界和暂停进度保持 |
| 浏览器错误 | 以上流程未发现 console error |
| 生产构建预览 | 在独立 preview 服务加载成功；从 5.4s 和弦延音处 Play / Pause 成功，未发现 console error |

浏览器曾记录 Three.js 关于内部 THREE.Clock 的弃用警告（来自渲染库），不参与项目音乐时钟。截图人工检查确认 3D Canvas 正常绘制；无 WebGL 的浏览器会显示降级提示。

## 仍需人工确认

音频接口和调度已通过代码测试和浏览器启动检查；本次没有采集声卡输出或真人听音，不将这些检查视作音质、听感或端到端音画延迟测量。复杂真实曲目、超密集 MIDI 与后台长期播放尚未作为性能基准测试。

<a id="repository-os-baseline"></a>
## Repository Operating System baseline · 2026-09-17

产品起点：`db67599`。本轮完整审阅 40 个 src 文件、4 个测试文件、三份原有文档及 package/build/lint 配置；没有审阅第三方依赖全集。仅为核实 MeshBasicMaterial 的光照行为定向读取其安装源码说明。

| 检查 | 本轮结果 |
| --- | --- |
| `npm run test` | PASS，4 文件 / 31 测试 |
| `npm run lint` | PASS，零 ESLint 警告 |
| `npm run build` | PASS，strict TypeScript + Vite；既有 bundle-size warning 保留 |
| 生产资源 | JS 1,375.62 kB，gzip 372.59 kB；CSS 5.87 kB，gzip 1.96 kB |

build 只重新生成被忽略的 dist/与 TypeScript 缓存；没有修改构建配置或依赖。命令用法和缺失覆盖见 [TEST_MATRIX](TEST_MATRIX.md)，本轮识别的差异见 [KNOWN_LIMITATIONS](KNOWN_LIMITATIONS.md#documentation-drift)。

### 文档验收

- 18 份 Markdown 文档（新增 15、更新 3）均有 freshness metadata；根 AGENTS 为 106 行。
- 本地链接及锚点检查通过；zoom/pan、InkTheme、新 GeometryStrategy 的导航能到达真实模块、源码与验证入口。
- 定向命令 `npm run test -- tests/engine.test.ts -t "Independent extension points"` 已实际运行：3 项通过、12 项按过滤条件跳过；完整 31 项基线结果见上表。
- Git 差异及暂存文件逐项检查，只包含 Markdown；相对产品基线没有源码、测试、依赖或配置变更。用户已有的 `midi/` 未提交文件保留在此次变更之外。
- 已记录视觉配置的实现差异和 seek 文案澄清；没有为解决差异修改产品代码，也没有编造历史 plan/ADR。

<a id="iteration-02"></a>
## Iteration 02 · Visual Readability and Performance Narrative

日期：2026-09-17。产品起点：`769bc55`。

| 检查 | 结果 |
| --- | --- |
| `npm run test` | PASS，5 文件 / 38 测试；新增 7 项 presentation/camera/store 回归 |
| `npm run lint` | PASS，零 ESLint 警告 |
| `npm run build` | PASS；JS 1,400.14 kB（gzip 379.59 kB），CSS 8.79 kB（gzip 2.79 kB）；既有 >500 kB warning 保留 |
| 浏览器 console | 无 error；只有既有 Three.js Clock deprecated warning |

浏览器检查了内置 10 音符 demo，以及临时程序生成的 4 轨/720 音符/约 14.5 秒 MIDI（132 BPM；不写入仓库）。实际观察：

- UI 作品信息、实时音符/声部、timeline、view/visibility/fit/effects 控件在 675 px 宽窗口仍可读。
- Constellation 的 Overview/Focus/Current Path 可切换；密集曲目中 Focus 最多强调 96 节点，Current Path 最多 36 节点，当前路径保持清楚。
- Stream 在 demo 和密集曲目中只显示局部绝对时间窗口；和弦时显示多个卫星，pitch 上下分布，主 Performer 保持突出。
- 暂停后 seek 到 5.2 秒恢复 demo 的 C4/E4/G4 和弦；播放中切换 view 保留歌曲时间，未重新加载 MIDI。
- 对 Canvas 执行 wheel、drag 与 Fit World；world/plan/playback 不由相机交互修改。自动测试另验证 compiled/world/plan 引用严格不变。

未测量 FPS、GPU 时间、真实声卡输出或端到端音画延迟；720 音符截图证明局部化策略可用，不是性能承诺。

<a id="iteration-03"></a>
## Iteration 03 · Musical Identity, Relation Language & Multi-Score Experience

日期：2026-09-18。产品起点：`5b67149`。Windows / 内置 Chromium；开发服务上的实际 WebGL 交互，生产构建另行检查。

| 检查 | 结果 |
| --- | --- |
| `npm run test` | PASS，7 文件 / 49 测试（14:46）；含显著性、音乐输入派生主线、随机 seek、生命周期、关系、取景、会话引用缓存等回归 |
| `npm run lint` | PASS，零 ESLint 警告 |
| `npm run build` | PASS（14:47）；strict TypeScript + Vite；JS 1,412.69 kB / gzip 383.38 kB，CSS 10.70 kB / gzip 3.24 kB |
| 定向复验 | 测试 fixture 补齐必须的 name/instrument 后，musical-presentation 10 项通过；修正仅涉及测试数据 |
| 浏览器 console | 无 error；已有 Three.js Clock 弃用提示和构建 >500 kB 提示仍保留 |

过程中 build 曾指出新增测试 fixture 缺少必需字段；Vitest 转译通过不代表 strict TypeScript 通过。补齐 fixture 后重新构建和定向测试通过，没有忽略该错误或降低类型约束。

### 实际浏览器结果

- 默认舞台、Cantivela SVG 字标、作品铭牌、可靠曲目统计、引语和默认关闭的控制抽屉均正常显示。1280 × 720、900 × 740、640 × 760 已观察；窄屏控制抽屉可滚动。
- 抽屉打开后焦点移入，Escape 关闭后返回 View 按钮；关闭时内容 inert。初次焦点检查暴露 CSS visibility 的时序问题，已移除该冲突并复验。reduced-motion 样式已检查，未做操作系统偏好切换的端到端测试。
- Constellation 显示主关系、序列、声部及和弦局部成员。720 音符样本中 Focus / Current Path 减少显示内容，但稠密交叠仍存在，不声称已解决所有谱面的可读性。
- Stream 的 Ribbon / Helix 在 demo、双轨变速样本和 4 轨 / 720 音符临时样本上观察；主角沿主线运动，伴随组与长音有绝对时间生命周期。初次逐起音选主线导致密集金色折返，改为短时间窗显著性选择并加入交错起音回归。
- 相机 wheel / drag 前后截图确认缩放和平移真正生效，等待界面更新后保持，Fit 恢复。定位到 R3F size 对象更新触发重复取景，依赖改为 width/height 后修复。**Iteration 02 的“执行 wheel/drag”只证明发出了操作，不能证明导航保持有效；以本轮结果更正该证据边界。**
- Stream 暂停 3 秒处 Fit stage 没有跳回开头；跟随与手动浏览可切换。播放中切换视图时间由 3.04 秒继续到 3.98 秒；暂停后时间冻结。
- 多选导入双轨变速样本和密集样本，曲库增加至三首；双轨样本显示 24 notes / 12 chords / 2 tracks / 80–120 BPM。播放中切曲停止并归零；删除非当前曲不改变当前曲，删除当前曲回退到剩余曲。
- Helix、Effects off 等显示偏好切回和删除后保持。缓存复用的严格引用相等由 session 测试证明；仅凭 UI 切回不推断缓存是否命中。
- 无效 MIDI 在暂停 4.037 秒处导入失败后保留原曲、显示和进度，并显示错误；多文件导入允许成功项保留。用户自带 MIDI 没有打开、修改或纳入验证素材。
- 同一 songTime 往返 seek 的两幅截图对比：音乐舞台像素一致；整图有 1,454 像素差异，局限于右下音符标签的颜色过渡区域（1184,512–1280,592），最大通道差 13。因此不宣称整帧逐像素一致。

本地截图：`artifacts/iteration-03/stream-helix.png`；该目录按现有规则忽略，不作为 Git 中永久可用的证据附件。测试 fixture 可复用；720 音符文件只保留在临时目录。

### 适用边界

显著性是可配置启发式，不是真实旋律提取；伴随短组也不是音乐学乐句识别。未采集真实声卡输出、试听音质、测量音画延迟/FPS/GPU 时间或 20,000 音符压力。浏览器检查使用开发服务，未把本轮生产构建通过写成生产浏览器复测。已知后续项见 [KNOWN_LIMITATIONS](KNOWN_LIMITATIONS.md)。

交付范围检查：21 份 Markdown / 278 处本地链接与锚点检查通过，`git diff --check` 及暂存差异检查通过。实现提交 `a8f5319` 的 35 个文件已复核；用户 `midi/` 仍为未跟踪素材且 SHA256 未变化。计划登记该提交后归档，GitHub 上传另行核实。

<a id="midi-text-encoding-2026-09-20"></a>
## MIDI text encoding compatibility · 2026-09-20

日期：2026-09-20。产品起点：`08633e7`。先完整撤销未提交的 Iteration 04 UI/preset 修改，再只修复 MIDI 文本规范化、回归测试和必要文档。

| 检查 | 结果 |
| --- | --- |
| 定向测试 | PASS，`tests/midi.test.ts` 1 文件 / 8 测试；新增 GB18030 标题/轨道名与 ASCII 标题回归 |
| `npm run test` | PASS，7 文件 / 51 测试 |
| `npm run lint` | PASS，零 ESLint 警告 |
| `npm run build` | PASS；JS 1,413.54 kB / gzip 383.67 kB，CSS 10.70 kB / gzip 3.24 kB；既有 >500 kB 提示保留 |
| 浏览器 console | 无 error |

实际文件 `帕赫贝尔D大调卡农.mid` 的标题元事件字节为 `C5 C1 BA D5 B1 B4 B6 FB 44 B4 F3 B5 F7 BF A8 C5 A9`；依赖原始输出为 `ÅÁºÕ±´¶ûD´óµ÷¿¨Å©`，GB18030 严格解码与正常文件名共同确认标题为“帕赫贝尔D大调卡农”。浏览器只读导入后可见标题精确匹配，原乱码未出现，并显示 05:02、1 track、1,956 notes、617 chords。没有启动音频播放，因此本次证据不涉及听感或端到端音画延迟。

用户 `midi/` 保持未跟踪，不进入提交；修复不改写文件，不触碰 UI、视觉、geometry、choreography、playback 或 audio。
