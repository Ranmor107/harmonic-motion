# Cantivela · Project Harmonic Motion

Purpose: 项目说明、启动及用户操作入口。
Authority: 快速使用指南；现状、架构和维护规范分别链接到 canonical 文档。
Update when: 启动方式、用户操作或导航入口变化。
Last verified: 2026-09-28；补充长时间观看控制。

**Music Geometry Engine — a score-to-world generative engine.**

The score is compiling a world.

暂定产品名 Cantivela；工程代号与核心引擎名称保持不变。品牌候选、字标文本与引语统一配置在 [branding/config](src/branding/config.ts)。

本项目是可运行的音乐空间应用：本地 MIDI / 内置原创乐谱 → 音乐语义 → 确定性音乐空间 → 编舞 → 合成音频与 3D 演奏。没有后端、账号、数据上传或物理引擎。

## 启动

Windows 用户可直接双击仓库根目录的 `start-harmonic-motion.cmd`。它会启动本地服务并打开一个独立的 Harmonic Motion 浏览器窗口；关闭这个独立窗口后，启动器会自动停止自己启动的浏览器和 Vite 进程，并保留应用专用浏览器资料供下次恢复曲库。普通浏览器标签页不属于这个关闭信号，其曲库也与独立窗口分开保存。

推荐 Node.js 24 LTS（开发验证使用 24.18.0）。在项目目录运行：

```sh
npm install
npm run dev
```

打开终端显示的本地地址。默认展示约 31 秒的原创 Quick Study；点击 **Listen to a study** 开始，或点 **Open my MIDI** 选择自己的文件。浏览器要求首次点击播放后才启用音频。

已安装过依赖的干净检出可用 `npm ci` 严格按锁文件恢复。

## 使用

| 操作 | 行为 |
| --- | --- |
| Listen to a study / Open my MIDI | 首次进入时直接试听内置原创短曲，或打开本地 MIDI 文件选择器；视觉说明可关闭并重新打开 |
| Play / Pause | 启动或冻结统一音乐时间，暂停立即停止声音 |
| Mute / Unmute | 底栏一键静音或恢复；静音期间仍保持歌曲时间 |
| Controls → Sound → Volume | 调整音量；暂停、跳转、切曲或重新打开后保留 |
| Restart | 从头重新演奏 |
| Replay last 10 seconds | 从当前位置回退 10 秒；播放中继续播放，暂停或结束时从回退位置开始播放 |
| 时间滑杆 | 播放或暂停时均可跳转，对既有轨迹求位置，恢复节点和效果状态；播放中恢复仍在延续的音符 |
| Add MIDI / Library + Add | 一次选择多份 `.mid` / `.midi`；本地解析与编译后加入曲库，并保存在当前浏览器。批次中有效文件正常加入，错误文件逐个提示；全部失败时保留原曲和时间 |
| Library / 上一曲 / 下一曲 | 切换停止并归零；会话内复用缓存 score/world/plan，保留视图、效果和跟随偏好。移除曲目会删除本地保存副本；移除最后一曲时回到内置示例 |
| Controls | 打开右侧控制抽屉；默认关闭，Escape 关闭并返回入口焦点 |
| Regenerate | seed 加一，重新生成世界和轨迹，保持乐谱、音乐时序与当前播放进度 |
| Effects on/off | 只切换视觉反馈，不重新编译世界或演奏计划 |
| Constellation / Stream / Ensemble | 在空间关系、正面 Stream 的 Helix 细曲线与伴随音群、稳定声部弧区之间切换；保持音乐时间与正式编译结果。Ensemble 在密集段减少绘制代表，但不删除音频或乐谱 |
| Controls → Part focus | Auto lead 沿用自动显著性主线；也可指定一条有音符的 MIDI 轨道，使它在三种视图中更突出，Stream 主线随之改变。其他轨道仍可见、仍发声；选择按曲目保存在当前浏览器。MIDI 轨道不一定等于独立声部或真正旋律 |
| Overview / Focus / Current path | 显示全世界、时间相关局部或最精简当前路径；Stream 自带局部时间窗 |
| 滚轮 / 拖拽 | 在 3D 场景内受限缩放和平移，不中断播放 |
| Fit world / Fit stage / Reset | 按投影范围恢复取景；Stream 在当前演奏位置取景 |
| Controls → Camera → Fullscreen | 将整个演奏界面切换为全屏；再次点击或按 Escape 退出 |
| Follow performer | Constellation 跟随现有 Performer；Stream 稳定水平前移；Ensemble 保持舞台稳定。跟随时可用滚轮调整倍率；手动平移会关闭跟随，可重新开启 |

在舞台或页面空白处按 Space 播放/暂停、←/→ 前后跳转 5 秒、R 重听最近 10 秒、F 切换全屏。按钮、输入框、选择框保持原生键盘操作；聚焦时间滑杆时 ←/→ 仍按 5 秒跳转。窄屏时间轴隐藏刻度标签，时间位置和总时长仍可见。

导入曲目、最近选择、逐曲轨道焦点、视图、效果、音量及上次时间位置保存在当前浏览器的本机存储中；再次打开时恢复为暂停，不自动播放。音频和 MIDI 不上传。清除站点数据、使用隐私模式或更换浏览器会失去该浏览器内的曲库；保存失败时界面会提示。

主线在 0.22 秒短窗内按力度、时长、音区和连续性选择显著音，属于可配置展示启发式，不是真正旋律提取。其余音符按轨道、休止间隔和长度上限组成短组；不改变音频或正式编舞。完整边界见 [ADR-0001](docs/decisions/ADR-0001-musical-presentation.md)。

可导入 `tests/fixtures/tempo-and-voices.mid` 体验双轨、重叠音符和速度变化。该文件为程序生成的测试素材，不包含商业作品。

## 验证

```sh
npm run test
npm run lint
npm run build
```

定向测试与覆盖边界见 [TEST_MATRIX](docs/TEST_MATRIX.md)；最近实际结果见 [VERIFICATION](docs/VERIFICATION.md#long-session-comfort-2026-09-27)。

`npm run preview` 可预览生产构建。浏览器交互验收记录见 [docs/VERIFICATION.md](docs/VERIFICATION.md)。

## 架构

三个中心数据模型：`NormalizedScore`、`WorldModel`、`PerformancePlan`。它们均为可序列化纯数据。核心代码不依赖 React、Three.js 或 Tone.js。

完整约束、时间语义和扩展方式见 [ARCHITECTURE](docs/ARCHITECTURE.md)，源码路径和责任边界见 [CODEBASE_OPERATING_MODEL](docs/CODEBASE_OPERATING_MODEL.md)。

## 仓库导航与当前边界

开发从 [AGENTS.md](AGENTS.md) → [docs/index.md](docs/index.md) 开始，按需求定位模块，不默认通读或重写仓库。

- [CURRENT_STATE](docs/CURRENT_STATE.md)：Implemented / Partially implemented / Not implemented。
- [KNOWN_LIMITATIONS](docs/KNOWN_LIMITATIONS.md)：输入/声部限制、seek 听感、性能未知项及 Documentation Drift。
- [ROADMAP](docs/ROADMAP.md)：候选方向与状态，不代表已承诺的功能。
- [DEVELOPMENT_WORKFLOW](docs/DEVELOPMENT_WORKFLOW.md)：局部修改、范围扩展门槛、计划和文档维护。

运行时不请求字体、音色样本或外部 API；安装依赖后可以离线使用。
