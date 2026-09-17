# Foundation 验证记录

日期：2026-09-17。环境：Windows、Node.js 24.18.0、Codex 内置 Chromium 浏览器，1280 × 720。

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
