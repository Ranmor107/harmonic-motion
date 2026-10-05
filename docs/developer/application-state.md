# 应用、状态与本机保存

Purpose: 说明 App 的组合职责、状态变迁、缓存引用、IndexedDB 格式和浏览器交互。
Authority: 当前实现手册；不承诺审计中尚未实现的容错、同步或镜头保存能力。
Update when: store actions、保存格式、初始化顺序或 UI 生命周期改变。
Last verified: 2026-10-05；源码基线 `e15cad5`。

## 入口和职责

[main.tsx](../../src/main.tsx) 在 StrictMode 下挂载 [App](../../src/ui/App.tsx)，加载普通和水墨两套 CSS。[store.ts](../../src/state/store.ts) 导出模块级 `useStudio = createStudioStore()`；创建时以 seed=107 编译 Quick Study，建立 `score-0`。App 构造一组 PlaybackClock、ToneAudioEngine、PlaybackController，并将音频 clock 快照传给 Scene。

App 当前同时承载初始化、导入、曲库、播放、持久化、快捷键、全屏、主题和镜头偏好。483 行是本次建议拆分的首要文件，但本轮未移动代码。职责和更新问题见审计 A11。

## Zustand 缓存和动作

`ScoreSession = {id, filename, seed, compiled}`。编译结果只保存在内存；IndexedDB 保存的是 score/seed，重开时重新编译。顶层 `compiled/seed` 镜像当前 session，select/remove/regenerate 必须保持它们一致。

| Action | 当前状态变化 | 编译 / 时间 / 声音 |
| --- | --- | --- |
| `addScores(entries)` / `setScore(score)` | 加到库中，选中本批第一首；单调生成 score-N ID | 新曲编译；store 自身不控制播放，App 在导入成功前 stop |
| `restoreSessions(records,activeId)` | 加回 demo，逐条尝试编译、跳过失败/重复 ID，选活动曲或 demo；返回恢复数量 | 启动时执行，不恢复 playing；部分失败的保留缺口见 A01 |
| `selectSession(id)` | 选择已缓存 session，复用 compiled 引用 | 不重新编译；App 的 score 依赖触发音频 load |
| `removeSession(id)` | 删除并选择相邻/保留当前；最后一项时回 demo | App 删除活动曲前 stop；不删除磁盘 MIDI 文件 |
| `regenerate()` | seed+1，当前 session 和镜像换新 compiled | score 本身保留引用；生成新 world/plan，不表示新音频文件 |
| `setPreset / setViewMode / setVisibilityMode` | 只替换展示字段 | 保持 compiled/world/plan 严格引用 |
| `setStreamStyleId / setInkMode` | 相同值不再次 set；只改展示偏好 | 不重载音频、不重置播放 |

store 不保存 DOM、Synth、GPU 对象或时钟。UI 的停止动作与 store action 需要配对使用；直接在工具中调用 selectSession 不会自动执行 `stopForSwitch`。

## 初始化、保存和错误状态流

```mermaid
sequenceDiagram
  participant App
  participant DB as IndexedDB
  participant Store as Studio store
  participant PC as PlaybackController
  App->>DB: loadSavedState()
  DB-->>App: sessions + preferences
  App->>Store: restoreSessions + display preferences
  App->>App: readReady=true / storageReady=true
  App->>PC: load(active score)
  App->>PC: seek(saved position)（若有）
  App->>App: ready=true
  App->>DB: saveSessions(非 demo)
  App->>DB: savePreferences / 每3秒检查 / pagehide
```

读取失败会标记存储不可用，`finally` 仍设 readReady，允许只在内存使用；注意未结束的 IDB Promise 进不了 finally。load 首次失败的 ready/错误 UI 缺口也尚未修复，见 A06/A08。

恢复时位置超出曲尾回到 0，否则 seek 到该处并保持暂停；不会自动解锁发声。当前活动曲无法恢复时回退 demo，但旧 position 仍可能被应用；这是 A07 的一致性问题，不是预期保证。

`currentPreferences` 从 clock 读取最新歌曲秒数；每 3 秒检查与上次保存位置差是否 ≥1 秒，页面 pagehide 另触发保存。偏好变更也会通过 effect 保存；异步 pagehide 不保证页面结束前完成。存储失败禁用后续保存并提示本次仅为会话状态，页面没有独立存储重试流程。

## 保存协议

[persistence.ts](../../src/state/persistence.ts)：database=`harmonic-motion`，version=1，object store=`saved-state`。

| Key | 值 |
| --- | --- |
| `sessions` | SavedSession[]：id、filename、seed、score；不存 demo、不存 compiled/GPU/音频 |
| `preferences` | version:1、activeSessionId、position、viewMode、visibilityMode、effectsEnabled、volume、muted、followViews、可选 melodyTracks/streamStyleId/inkMode |

`normalizeStreamStyle(unknown)` 回退 original，`normalizeInkMode(unknown)` 回退 drops，兼容旧偏好。melodyTracks 在 App 恢复时再与实际曲库/轨道核对。真实相机坐标/缩放、通用 preset registry、播放中状态均不保存。

当前校验是部分运行时字段检查，不能信任历史库一定满足 NormalizedScore；没有迁移版本表、失败记录隔离、整库导出或跨窗口协调。不要通过修改 TypeScript interface 就认为已经完成存储格式升级。A01/A06/A07 包含建议与验收。

origin（协议+主机+端口）和浏览器 profile 共同决定存储范围。5173 开发、4173 preview、5174 launcher 不共享同一 origin；127.0.0.1 与 localhost 也不同。独立窗口的专用 profile 与日常浏览器分开。用户曲库“消失”首先核对这些信息，不要清库。

## 导入与交互

`onLoad` 顺序读取各 File、限制大小、调用 parseMidi；每个解析失败记录文件名和原因，成功项批量交给 addScores；importRevision 防止过时导入覆盖较新的意图。编译失败会在外层显示错误；当前 addScores 的 map 是一批全编译后才 set，不能声称任意编译错误下也有逐条事务提交。

`switchScore/deleteScore/stopForSwitch` 维护活动曲与播放的一致性。`togglePlayback/seekBy/replayRecent/toggleMute/toggleFullscreen` 为 UI 动作入口；键盘忽略输入控件、修饰键、文本组合与重复按键，避免抢占编辑。

| UI / 配置文件 | 责任 |
| --- | --- |
| `App.tsx` / `StreamStyleButtons` | 设置面板、导入、曲库、transport、Original/水墨按钮、错误提示 |
| [Icons.tsx](../../src/ui/Icons.tsx) | 固定 union 名称到 SVG 图标；不含播放器状态 |
| [styles.css](../../src/ui/styles.css) | 原版布局、控件、响应式和舞台容器 |
| [ink.css](../../src/ui/ink.css) | 水墨册页、纸面、文字/印章/布局与对应控制样式 |
| [branding/config.ts](../../src/branding/config.ts) | 名称、描述、引语及候选名；品牌不是音乐算法配置 |

选择水墨会将 View 设为 stream；切往其他 View 仍保留 StreamStyle 偏好，effectivePreset 只在 Stream 生效。Ink 不暴露 3D zoom/pan，不能把隐藏相机当作纸面相机。

## 测试与扩展约束

[session.test.ts](../../tests/session.test.ts) 验证 store 动作和引用；[ink-stream.test.ts](../../tests/ink-stream.test.ts) 覆盖风格/投影；[playback.test.ts](../../tests/playback.test.ts) 覆盖动作时间契约。它们不是 React App + 真实 IndexedDB 的集成测试。

新增保存字段要定义缺省、未知值回退、旧数据和迁移；新增 UI 动作先明确所有者，不复制一份 clock 或 compiled；拆 App 前补 restore/load/save/dispose 的次数与顺序验证，特别覆盖 StrictMode 的 effect 清理/重建。不要为了拆文件顺手重设计曲库和产品操作。
