# FAQ 与常见错误

Purpose: 将常见现象映射到当前入口、可安全验证步骤和已知边界。
Authority: 开发排错指南；具体缺陷状态以 CODEBASE_AUDIT / KNOWN_LIMITATIONS 为准。
Update when: 错误文案、恢复流程、启动或支持边界变化。
Last verified: 2026-10-05；源码与现存验证记录核对，本轮未重新做浏览器/声卡验证。

## 启动、导入与本机保存

| 现象 / 错误 | 先检查什么 | 对应入口 / 下一步 |
| --- | --- | --- |
| `npm` 不存在或依赖缺失 | Node/npm 是否安装、是否在项目根、是否执行 npm ci | [启动手册](setup-and-configuration.md)；不随机升级 package-lock |
| `Port ... is already in use` | 对应端口是否由本项目旧服务占用 | launcher 主动拒绝冲突；关闭自己启动的服务或显式用空闲端口，不批量杀全部 node |
| `Microsoft Edge or Google Chrome was not found` | launcher 可找到的浏览器安装位置 | 用普通 `npm run dev` 启动后手动打开，或修正合法浏览器路径 |
| `The dedicated browser profile is already in use` | 专用应用窗口是否已开 | 先正常关闭该窗口；不要删除 profile/lockfile 当作通用修复，里面有曲库 |
| 关普通标签页后服务还在 | 是否使用了 CMD 专用应用窗口 | 普通 dev/preview 由终端 Ctrl+C 停止；只有固定启动入口负责关窗清理 |
| MIDI 被拒绝 | MThd/Type 0或1/PPQ、大小 ≤10MiB、notes ≤20000、非空 | [parser](../../src/midi/parser.ts)；重新导出或缩短输入，保留失败文件用于授权后的复现 |
| `MIDI contains invalid note timing or pitch.` | note 数值是否有限、时长正数、起音非负、MIDI 整数0–127 | [normalizeScore](../../src/midi/normalize.ts)，不要把 NaN 继续传入 renderer |
| 中文标题乱码 | 文件名、原 MIDI title 字节及候选编码是否吻合 | 当前优先可验证编码/文件名回退；不要一律把正常文本再做一次错误编码转换 |
| 曲库似乎不见了 | 相同 protocol/host/port/profile？localhost 和127.0.0.1？5173/4173/5174？ | [保存协议](application-state.md)；先找回原 origin/profile，不清站点数据 |
| `Local saving is unavailable...` | IndexedDB 权限、隐私模式、配额、事务失败 | 当前仅内存工作；保留原 MIDI；用户库不可作为故障注入实验对象 |
| `Some saved scores could not be restored.` | 记录结构、旧版本和编译异常 | A01：存在覆盖失败记录风险；在复制/隔离数据后诊断，不用“刷新几次”或清库试错 |
| 一直停在 Restoring | 存储 Promise 是否结束、首次 load 是否拒绝 | A06/A08；检查异常与 promise 终态，目前不保证页面内可恢复 |

本机存储不是备份机制。原 MIDI 应由使用者保留；开发诊断若需要导出数据，应先明确文件范围，不能把浏览器内全部数据或凭据写入公开问题附件。

## 声音、时间和画面

| 现象 | 定位顺序 |
| --- | --- |
| 没声音 | 用户点击 Play 解锁 → 应用 mute/volume → 系统输出 → AudioContext 状态 → controller/scheduler；模型显示正确不证明音频已输出 |
| 声音不像原乐器 | 当前统一合成音，未还原 CC/踏板/弯音/真实音色；这是支持边界，不是换皮肤造成的音频 bug |
| 快曲少音 | 区分 audio 64 声部（含 release）和 display budget；检查 scheduler 超预算/后台节流，不能以显示数判断输入丢失 |
| seek 后持续音重起 | 当前恢复剩余时长，不重建原 ADSR/相位；应验证时值/位置，不要求音色波形逐样本相同 |
| 切 View 后归零或重新载入声音 | 检查 score/compiled 引用、App/Canvas key 和 load effect 依赖；正常换肤不该编译或重载 |
| 跟随时想放大 | 3D 跟随平移 camera/target，滚轮距离可保留；平移 target 会退出跟随；Ink 二维纸面没有此操作 |
| `WebGL is unavailable...` / 3D fallback | 浏览器图形加速、context 初始化错误；这是故障反馈，不能只凭 DOM 存在宣布绘制通过 |
| 水墨提示需要图形加速 | 需要 WebGL2；可用重试画面或切 Original；音频控制与纸面 context 分开 |
| 连续同音在落墨中消失 | 可复现 A03：anchor 无界继承；不需要通过改 MIDI 或更换音频规避 |
| 圆形舞台余韵路径突变 | A05：fading progress 被用于空间路径；检查阶段边界而非加随机粒子遮住问题 |
| Constellation seek 后轨迹不见 | 检查动态 geometry 包围球；A04；同时核对目标是否真的在镜头内 |
| 超小 MIDI 导入仍占用很多内存 | 检查 score.duration 与 Ensemble.energy；按时长分配风险 A02，不只看 note 数量 |
| benchmark 中 Ink 数据漂亮/不变化 | 当前读的可能是隐藏 R3F canvas 的旧值；A10；不能作为 Ink 帧率结论 |

## 开发者经常混淆的边界

**为什么 Stream 的坐标不是 WorldModel 的坐标？** 它是展示投影，音乐正式世界与演奏计划保留。其主角沿展示 lead 求值；Constellation 主角按 PerformancePlan 求值。不能因为都叫 performer 就合并两套语义。

**能否让音符碰撞后播放声音？** 不能在当前架构里这样做。声音由 score+clock 调度，视觉到达由同一时间解释；碰撞发声会破坏 seek、暂停和音画一致性。

**为什么调 theme.lighting 看不出变化？** 主要 mesh 使用 BasicMaterial，不受灯光影响；connectionStyle 等字段也无当前消费者。先核查材质和读取路径，见 [D-01](../KNOWN_LIMITATIONS.md#d01-visual-config) 与审计 A13。

**保存了 follow，为何没恢复缩放/平移？** 保存协议只有 followViews 等偏好，没有真实相机姿态；不要把未实现功能误报成持久化 bug。

**90 个测试都通过，为什么还有 bug？** 现有测试多为纯函数、store 和音频 mock。未覆盖的输入边界、IDB abort、React 初始化、GL 包围体与阶段交界仍可出错。审计列出的是补测方向，尚未修复。

**需要新增通用主题框架、Worker 或状态机库吗？** 先定位实际问题和成本。当前依赖分层清楚，重构优先补边界和提取 App 职责；只有基准或明确新契约证明需要时才增加基础设施。

## 提交可复现问题

记录基线 commit、运行入口/端口、浏览器/设备、View/style/Ink mode、歌曲秒数、操作序列、实际与预期、console 错误、可公开的最小输入。区分自然播放/直接 seek、冷启动/热切换、单窗口/多窗口。分享 MIDI 前确认许可，不默认上传用户素材；不要附 token、浏览器 profile 或全部真实曲库。

先在隔离输入/存储里复现，再修改拥有该行为的模块；验证受影响能力后再扩大检查。已记录问题参见 [CODEBASE_AUDIT](../../CODEBASE_AUDIT.md)，完整限制见 [KNOWN_LIMITATIONS](../KNOWN_LIMITATIONS.md)。
