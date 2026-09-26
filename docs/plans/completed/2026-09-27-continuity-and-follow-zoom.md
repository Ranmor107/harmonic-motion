# Continuity foundation and follow-camera zoom

Purpose: 本轮回访体验与跟随镜头缩放的实施边界和证据。
Authority: 本轮实施计划；优先级见 [ROADMAP](../../ROADMAP.md)。
Update when: 范围、方案、验证或完成状态变化。
Last verified: 2026-09-27；实现与验证记录完成。

Status: Completed
Source baseline: `c8e2475`；用户未跟踪的 `midi/` 与产品计划 `.docx` 保持原样。
Related request / roadmap item: Milestone C · Continuity；用户明确要求跟随时仍可缩放镜头。
Related ADR: none；不改变音乐世界、时间权威或公共音乐模型。

## Problem

曲库、视图、音量和播放位置目前只在页面内存中；刷新或关闭后一切回到默认。Windows 一键启动器还会删除每次使用的临时浏览器 profile，使普通浏览器持久化无法跨启动保留。`CameraRig` 把 OrbitControls 的每次交互开始都当作手动导航退出跟随，因此滚轮缩放会关闭 Follow。

## User-visible goal

同一设备重新打开后保留已导入曲目、最近选择、视图与声音偏好，并回到上次时间位置，默认暂停且不自动发声。跟随 Constellation 或 Stream 时，滚轮/触控板缩放改变镜头距离，后续仍跟随音乐；平移可退出跟随。

## Current behavior

`createStudioStore` 只持有内存里的 `ScoreSession[]`；`App` 每次创建新的 controller 与 UI 状态；启动器为独立窗口创建临时 profile，退出时删除。`CameraRig` 的 OrbitControls `onStart={onNavigate}` 将缩放和平移混为一类。

## Desired behavior

浏览器本地保存规范化乐谱与必要会话元数据，恢复时重新编译世界/计划，不保存运行时 Three/Tone 对象。位置在当前曲目恢复为 Paused，直到用户按 Play 才发声。删除曲目同步删除保存副本。独立窗口使用稳定的应用专用浏览器 profile，但关闭后仍回收自己启动的浏览器和 Vite 进程。

## Primary module

[State / application composition](../../CODEBASE_OPERATING_MODEL.md#state)：曲库恢复与本地持久化；[Camera/render](../../CODEBASE_OPERATING_MODEL.md#render)：区分缩放和平移对 Follow 的影响。

## Adjacent modules

`App` 需要等待异步恢复、保存低频播放位置并装配偏好；Windows 启动脚本必须保留应用专用 profile，否则持久化目标无法成立。`Scene` 只继续传递现有 follow/onNavigate 契约。PlaybackController 仅用现有 `load/seek`，不改 clock。

## Explicit non-goals

不做账号/云同步、文件系统服务端、自动播放、曲目跨浏览器迁移、音乐分析/轨道选择、多主题 selector、音色再设计或视频导出。当前只有一个成品 preset，不新增预设；仅保存可表达的视图、效果和声音偏好。不开启手动旋转或改编舞。

## Architecture invariants

保持 I1/I3/I5/I7/I8：PlaybackClock 仍是唯一歌曲时间；保存的是原始规范化乐谱和少量偏好，恢复时调用既有 compile；视觉/相机状态不写入 WorldModel 或 PerformancePlan；音频不随视觉交互重载。恢复暂停是 UI/clock 装配行为，不新增第二时钟。

## Expected files

| File / symbol | Reason | Type of change |
| --- | --- | --- |
| `src/state/store.ts`、`src/state/persistence.ts` | 曲库恢复和本地保存 | behavior / app contract |
| `src/ui/App.tsx` | 异步恢复、偏好/位置保存、隐私说明 | behavior / UI |
| `src/render/CameraRig.tsx` | 缩放保持跟随、平移退出 | behavior |
| `scripts/start-harmonic-motion.ps1` | 关闭进程但保留专用浏览器数据 | launcher behavior |
| `tests/session.test.ts`、相机相关测试 | 恢复/删除与导航回归 | test |
| `README.md`、`docs/CURRENT_STATE.md`、`docs/ROADMAP.md`、`docs/KNOWN_LIMITATIONS.md`、`docs/VERIFICATION.md`、计划索引 | 能力、限制与证据 | doc |

## Public contracts affected

应用状态增加从持久化乐谱恢复会话的 action；不改 `NormalizedScore`、`WorldModel`、`PerformancePlan`、`AudioEngine`、PlaybackClock 或 CameraController 公共模型。持久化记录有本地版本号；旧/不可用记录回退内置曲，提示用户保存状态不可用。

## Implementation approach

1. 使用浏览器 IndexedDB 保存导入曲目与少量状态；恢复规范化 score 后由既有 `compileScore` 重建缓存。播放位置低频保存，避免反复写整份曲库；刷新时不会自动播放。
2. 一键启动器改为稳定的应用专用 profile，仅结束自身进程。它和普通浏览器各自使用自己的本地数据，不宣称跨浏览器共享。单纯写 localStorage/IndexedDB 却继续删除临时 profile 无法满足目标；新增本地 HTTP 写文件服务则扩大攻击面和部署复杂度，本轮不用。
3. CameraRig 在用户导致 target 平移时退出 Follow；仅距离变化时保留 Follow，继续以同一 playback snapshot 更新跟随目标。Fit/Reset 保持显式复位语义。

## Risks

浏览器本地存储可能被用户清站点数据、隐私模式或配额限制清除；写入失败必须可见，不能承诺永久保存。多曲重复编译有启动成本；先记录实际表现再决定是否优化。浏览器 profile 与端口绑定，同一启动入口保持默认端口；修改端口会形成不同 origin。窗口强制关闭时 pagehide 写入不保证完成，因此位置需在播放中定期保存。跟随缩放需实际浏览器滚轮验证；纯测试不能证明镜头画面。

## Test plan

按 [TEST_MATRIX](../../TEST_MATRIX.md) 跑 T-STATE/T-CAMERA 定向，再跑 `npm run test`、`npm run lint`、`npm run build`。回归覆盖恢复多曲与选中 ID、删除持久项、异常存储回退、上次位置暂停、不自动播放。浏览器检查导入 fixture、刷新恢复、曲目删除后刷新、40% 音量/静音及 View 保留；播放中 Follow 滚轮缩放后仍 On，平移后 Off；检查 390 宽布局。启动器测试关闭独立窗口后进程退出且应用 profile 保留，第二次启动数据恢复。

## Documentation updates

README 说明本机保存、删除语义与启动器保留数据；CURRENT_STATE/KNOWN_LIMITATIONS 写真实支持边界；ROADMAP/计划索引写状态；VERIFICATION 记本轮命令和浏览器/启动器观察。只有契约路由改变才更新模块地图或测试矩阵。

## Completion criteria

- [x] 多曲、最近曲、View/声音偏好及上次位置在本机浏览器刷新后恢复，默认暂停；删除可清除保存副本。
- [x] 跟随缩放保持 Follow 和倍率，平移退出；视图切换、seek、播放继续正常。
- [x] 一键启动关闭后进程停止、专用浏览器资料保留；隐私说明与失败反馈准确。
- [x] 定向及全量检查通过；浏览器和启动器实际验证有记录，外部 Edge 二次打开后的页面内容未能自动核对。
- [x] 用户原有文件未修改或提交；文档与证据更新，完成后归档。

## Execution notes and completion evidence

2026-09-27：按产品路线图选择 Continuity，并加入用户本轮明确提出的跟随镜头缩放修复。内置浏览器导入测试谱及用户授权的卡农 MIDI；中文标题、曲库/偏好/暂停位置恢复、删除后不复活、Stream/Constellation 缩放跟随和拖动退出均已验证。一键启动器两次启动/关闭均回收进程并保留专用 profile；外部 Edge 页面内容未能自动读取，见 [本轮验证](../../VERIFICATION.md#continuity-follow-zoom-2026-09-27)。全量 78 测试、lint、build 通过。用户 MIDI 与产品计划文档未修改或提交。
