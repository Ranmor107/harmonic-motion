# Project Harmonic Motion

**Music Geometry Engine — a score-to-world generative engine.**

The score is compiling a world.

本项目是可运行的 Engine Foundation：本地 MIDI / 内置原创乐谱 → 音乐语义 → 确定性音乐空间 → 编舞 → 合成音频与 3D 演奏。没有后端、账号、数据上传或物理引擎。

## 启动

推荐 Node.js 24 LTS（开发验证使用 24.18.0）。在项目目录运行：

```sh
npm install
npm run dev
```

打开终端显示的本地地址。默认加载 10 个音符、8 个起音节点的原创 C 大调短句。浏览器要求第一次点击 **Play** 后才启用音频。

已安装过依赖的干净检出可用 `npm ci` 严格按锁文件恢复。

## 使用

| 操作 | 行为 |
| --- | --- |
| Play / Pause | 启动或冻结统一音乐时间，暂停立即停止声音 |
| Restart | 从头重新演奏 |
| 时间滑杆 | 播放或暂停时均可跳转，重算轨迹、节点和效果；播放中恢复仍在延续的音符 |
| Load MIDI | 在浏览器本地读取 `.mid` / `.midi`，成功后加载新世界并归零；错误文件保留原乐谱 |
| Regenerate | seed 加一，重新生成世界和轨迹，保持乐谱、音乐时序与当前播放进度 |
| Effects on/off | 只切换视觉反馈，不重新编译世界或演奏计划 |

可导入 `tests/fixtures/tempo-and-voices.mid` 体验双轨、重叠音符和速度变化。该文件为程序生成的测试素材，不包含商业作品。

## 验证

```sh
npm run test
npm run lint
npm run build
```

31 个 Vitest 测试覆盖 MIDI 时间转换、跨轨和弦、seed、轨迹端点、序列化、随机访问、播放状态、音频事件调度、同音重叠、视觉配置独立性和策略替换。

`npm run preview` 可预览生产构建。浏览器交互验收记录见 [docs/VERIFICATION.md](docs/VERIFICATION.md)。

## 架构

三个中心数据模型：`NormalizedScore`、`WorldModel`、`PerformancePlan`。它们均为可序列化纯数据。核心代码不依赖 React、Three.js 或 Tone.js。

```text
src/domain                 数据契约
src/midi                   MIDI 解析与标准化
src/engine/music-analysis  基础音乐分析
src/engine/music-geometry  可替换空间策略与生成器
src/engine/choreography    确定性 Bézier 编舞与时间求值
src/playback               单一权威时钟与播放协调
src/audio                  可替换音频接口与 Tone 合成器
src/visual                 主题、效果、环境、相机、预设
src/render                 只消费世界、计划、播放快照和视觉配置
src/state                  应用组合和 Zustand 状态
src/ui                     场景容器与播放控制
src/demo                   原创程序化乐谱
```

完整约束、时间语义和扩展方式见 [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)。

## 当前边界

- V1 提供一种 Constellation 几何策略、一名 Performer、Cosmic 预设和静态相机。和弦表示为保留所有 note IDs 的起音节点。声部仍保存在轨道与世界层中。
- MIDI Type 0/1 的 PPQ 时间与 tempo map 受支持；Type 2 独立序列、SMPTE 时间明确拒绝。
- 和弦检测是跨轨“同时起音分组”，不是调性/和声识别。极短琶音不自动量化。
- 音符时长和力度参与演奏。音色统一为 Tone sine Synth；乐器编号保留，但尚未解释踏板、弯音、CC 或打击乐音色。
- 跳到延音中间会以剩余时长重新起音，不重建先前振荡器相位或包络历史。音画共用 AudioContext 时间，但不承诺声卡输出延迟校准。
- 最多导入 10 MB、20,000 音符；音频最多 64 个并发声部（含释放尾音），超出时略过新的声部。视觉同时显示最近 64 次瞬态反馈，音乐事件本身完整保留。
- 后台浏览器可能节流定时器：恢复时按权威时钟重新定位，跳过已经结束的音符，不保证后台连续完整演奏。
- 自动化验证了音频调度参数及浏览器启动无错误；最终听感和声卡延迟仍需要真人试听。
- 未实现采样钢琴、复杂编辑器、视频导出、AI、云端服务或游戏评分。

运行时不请求字体、音色样本或外部 API；安装依赖后可以离线使用。
