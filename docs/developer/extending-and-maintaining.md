# 开发规范与扩展指南

Purpose: 给核心模块扩展和后续重构提供有限、可验证的实施步骤。
Authority: 对现有 AGENTS / DEVELOPMENT_WORKFLOW 的操作补充，不创建新的审批或架构规则。
Update when: 扩展接口、测试要求、文档归属或仓库工作流程变化。
Last verified: 2026-10-05；源码基线 `e15cad5`。

## 每轮工作流程

1. 按 [AGENTS](../../AGENTS.md)、[知识索引](../index.md)、[影响矩阵](../CHANGE_IMPACT_MATRIX.md) 找主模块，记录需求、非目标、假设和验收条件。
2. 中型/跨层行为修改按 [DEVELOPMENT_WORKFLOW](../DEVELOPMENT_WORKFLOW.md) 建 plan；改变稳定公共契约时写 ADR。纯文档梳理不需要伪造一个产品功能 plan。
3. 先复现再修复。以最少文件解决问题，不重排相邻代码，不更改用户素材；新的失败输入变成回归测试。
4. 运行有意义的定向检查，再运行要求的全量 test/lint/build；视觉、音频、存储和启动器各用对应验证方式，不相互冒充。
5. 更新拥有该事实的文档和有日期的 VERIFICATION，核对 diff、链接、未跟踪素材与提交范围；是否推送按本轮用户授权执行。

全仓审计已完成，不意味着未来每次都要重读全部仓库，也不意味着用户授权了审计提出的所有改造。优先顺序参见 [审计路线](../../CODEBASE_AUDIT.md#逐步修复与重构路线)。

## 不可破坏的约束

- 一个 authoritative songTime；不使用 performance.now/Date.now/帧累计作为另一个歌曲时钟。
- 同一输入和 seed 的结果确定；seek 能直接计算，不依赖此前是否播放。
- domain/engine/playback 不导入 React、Three、Tone、render/visual/state；按现有 lint 范围执行，新增边界仍须代码审查。
- theme/effects/camera/View 变化保持 score/world/plan 引用，不重载音频，不重置播放。
- 几何定义音乐空间，编舞定义抵达；renderer 的裁剪/抽样不删除音乐模型或音频事件。
- 可解释展示启发式不命名为未经验证的“真实旋律提取”“情绪识别”或“声部分离”。

使用现有 TypeScript 风格和 type-only import；不引入 `any` 去绕过磁盘/用户输入校验。non-null assertion 需要有可说明的不变量，不能替代外部边界验证。不要为了将来可能用到而暴露每个内部常量。

## 扩展配方

### 新输入格式

主模块 midi 或新的输入适配目录；输出仍为 NormalizedScore。先定义秒数、ID、排序、轨道、元数据和同刻分组，复用 normalizeScore 的音符规则；明确不支持的表达信息，合法拒绝而不伪造。加入 tempo/长音/空谱/坏数据测试。只要 score 契约不变，不改 renderer/audio；真正新增控制器/踏板数据需先扩展 domain 并说明消费方。

### 新正式几何策略

实现 [GeometryStrategy](../../src/engine/music-geometry/GeometryStrategy.ts)，由组合层传给 compileScore；只输出普通 WorldModel。若仍用当前单 Performer planner，保持同一时刻一个可抵达目标。验证 seeded 确定性、有限 bounds、layer/note IDs 完整、抵达时刻与轨迹端点。多 Performer/同刻多目标不是换美术配置，应先设计编舞契约。

### 新主题或 Stream 外观

先检查现有 VisualTheme/EffectProfile/EnvironmentConfig 能否表达，确认对应 renderer 真正读取字段；能用配置就不加抽象。新 preset 复用 camera/presentation 等未变引用，UI 只保存一个风格 ID，effective preset 由 View+偏好派生。若新增纸面/节点表现，限定在 visual/render/UI，沿用歌曲时间和 note IDs。

验证同曲同秒的主线/和弦/伴奏、低密度/快曲、effects Off、reduced motion、暂停/逆向 seek、窄屏、快速切换；计数确认 compile/load 不因换肤增加。相机配置引用变化可能触发 fit，必须检查实际缩放/平移是否保留。

### 新展示模式

先写纯 presentation 模型，定义坐标、生命周期、预算、长音和稳定 tie-break，再写 renderer。评估是正式音乐语义还是 display-only；通常新美术舞台不需要改 WorldModel。新增 ViewMode 时同步 store、SavedPreferences 的兼容校验、UI、Scene、camera/follow、tests 与文档；不能只增加一个按钮后让旧保存值报错。

生命周期进度必须明确语义：空间展开、发声、消散不应共享一个含义不断变化的字段（见 A05）。动态几何明确 bounds/culling 策略；资源有对称建立/清理；GPU buffer 预算是上限，不替代 CPU 查询预算。

### 新音频适配器或音色

实现 [AudioEngine](../../src/audio/AudioEngine.ts)，遵守 load/play/seek/pause/dispose 和 clock 的 source time。音色参数变化优先限定 ToneAudioEngine；若是异步采样器，明确加载失败、取消、过期 load 和资源释放，不让 visual 处理声音。

用 mock 检查并发/长音/同音重叠/超预算/失败回退；需要说明真实听感时进行声卡或人工试听，不能只用波形 API 返回成功作结论。统一合成器无需为尚未要求的 General MIDI 扩展通用注册体系。

### 新相机行为

纯 fit 计算放 visual/camera，交互放 CameraRig。保持实际 songTime 只读、方向有效、取景可测试；平移/缩放不改 plan。明确 follow 与用户操作优先级，防止每次 React repaint 重新 fit。Ink 是独立二维纸面，需要新的明确需求才加入 zoom/pan，不能默认复用隐藏的 3D 控件。

### 新保存字段或格式

把 DB 原始值视为 unknown；为旧版本、缺失、未知 enum、超范围和部分损坏定义行为。迁移成功前保留原记录；失败不自动覆盖残缺库；position 必须与 activeSessionId 对应。新窗口/页面的写入策略需要明确，测试用隔离 origin/profile。当前 A01/A06/A07 是优先补齐的缺口，不在其上增加更多脆弱字段。

## 重构边界

先修正确性，再拆职责，再测性能。App 建议先提取播放桥接和保存恢复，再拆面板/transport；不要同时更换 store、路由、CSS 框架和播放器。每次提取对比 load/dispose/save 次数和引用，避免文件更短却副作用更多。

重复哈希可提取纯小函数；重复实例绘制不必统一成巨型 renderer 基类。旧导出先查生产/测试引用与契约，再删；保留有消费者的 fixture/dev 模块。性能改进必须给出同输入/环境前后数据，不能凭算法名或 GPU 对象数量保证帧率。

## 验证矩阵

| 改动 | 最小验证重点 |
| --- | --- |
| MIDI / 正式引擎 | 坏输入、确定性、单音/和弦/空边界、端点、排序、不变性 |
| playback/audio | 人工时钟、异步竞争、seek 持续音、清理、失败终态；声音声明需试听 |
| presentation/render/camera | 纯函数/预算 + 浏览器画面、生命周期边界、seek、手动导航、资源 |
| state/persistence/UI | store 引用 + 应用生命周期/真实或模拟 IDB 事务、旧数据、多窗口、错误恢复 |
| launcher | 实际 CMD 入口、准备失败、端口冲突、专用窗口关闭后子进程与端口释放；不杀无关进程 |
| 文档 | 源码符号核对、本地链接/锚点、metadata、git diff --check、源码未越界 |

## 文档维护

`ARCHITECTURE` 保存稳定契约；`CODEBASE_OPERATING_MODEL` 保存 ownership/入口；本手册解释当前 API/流程；`CURRENT_STATE` 保存已实现能力；`KNOWN_LIMITATIONS` 保存限制/漂移；`CODEBASE_AUDIT` 保存本次问题证据及修复状态；`ROADMAP` 保存候选优先级；`VERIFICATION` 只追加实际检查。

长效文档保留 Purpose/Authority/Update when/Last verified。改变字段或行为时更新对应章节，而不是复制第二份完整说明；历史 plan/verification 不改写成新的通过记录。文档与源码不一致时并列记录证据、指向当前事实，不能靠修改规范偷偷合理化 bug。
