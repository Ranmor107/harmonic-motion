# Ink folio integration

Purpose: 将独立水墨研究的宣纸落墨与墨脉正式接入主站，并建立古韵观看界面。
Authority: 本轮实施范围；不改变音乐引擎契约。
Update when: 实施、验证、范围或状态改变。
Last verified: 2026-10-01。

Status: Completed · local verified
Source baseline: `8c96ed2`；既有未跟踪 `midi/` 与产品路线图 docx 为用户文件，不修改、不提交。
Related request: 用户提供《Harmonic_Motion_水墨古韵UI集成与视觉方向.docx》，明确授权正式集成与必要审美发挥。
Related ADR: 沿用 ADR-0001 的 presentation-only 边界，无新引擎语义。

## Problem and goal

现有 Ink 复用 Ribbon 引导曲线、运笔主角和山水底图，没有研究 Demo 的湿边、干湿寿命与真实停笔。需要将事件落墨、声部墨脉变成同一曲目的两种正式观看方式，呈现单一、宽阔的纸面。

## Scope and contracts

- Primary: visual/presentation 的纯水墨投影与有限历史、render 的批量水墨着色与生命周期、UI 的水墨布局。
- Adjacent: domain/visual 新增 `InkMode`；store/persistence 保存两种观看方式，旧偏好默认落墨。Scene/App 只接线现有 score 与 PlaybackSnapshot。
- 预计文件：`inkPresentation.ts`、`InkStreamRenderer.tsx`、`inkShaders.ts`、`inkStream.ts`、Scene/App、独立 ink CSS、domain/visual、state/store/persistence、定向测试与有事实变化的文档。
- 旧 Ink 渲染与背景装载只服务被替换的表达；删除被本轮替换后不再使用的 appearance/asset-loader 与山水资产，避免保留两套同名逻辑。
- 原版 Stream/Constellation/Ensemble 保持；保留独立 HTML Demo，不引入其研究入口、合成音频或第二时钟。
- 不修改 MIDI、normalize、compile、WorldModel、PerformancePlan、choreography、playback 或 audio。水墨切换不触发 load/compile/seek。

## Design and implementation

1. 纸面使用一段随 authoritative song time 向前展开的有限窗口；没有预先生成的引导线、未来墨迹或判定圈。声音结束后淡为纸面记忆，最终清除。绘制预算只影响展示。
2. 落墨以真实音符事件生成墨芯与独立向外渗透的湿边；时值决定湿润期，重复音在局部叠墨，和弦生成共同浅墨域。
3. 墨脉使用既有显著性/指定轨道主线，按同轨实际相邻起音、持续和休止生成笔势。支声部更细更干，低音更稳；明确相遇才作短关系笔触，和声用面表达。选主线仍是展示启发式。
4. 复用 Demo 的固定纸纹场与最大颜料混合，避免重叠印章累加成黑团；将全曲预计算与帧窗口分开，限制每帧音符与笔触数量。
5. 水墨界面采用册页构图：上方保留 Cantivela / Harmonic Motion，题签式曲名，中央单纸面，下方落墨/墨脉文字签与轻量播放控制。曲库与次级设置继续用抽屉。

### Tokens and signature

- 色彩：青绢纸 `#f3f4ed`、外页 `#e8ece4`、松烟 `#243b36`、淡墨 `#65776d`、旧金 `#9b8658`、印朱 `#985147`。
- 标题：本机宋体/楷体；正文：Microsoft YaHei / Segoe UI；时间：Consolas。
- 构图：`品牌与主题入口 → 曲名题签 / 大纸面 → 两种笔墨签 → 播放与时间轴`。
- 记忆点是一张由音乐不断写成的册页，静态朱印仅作品牌落款。已排除大山水贴图、研究台、多卡片、密集竖排装饰。

## Validation / completion criteria

- 纯函数：起音前不添墨、休止不造笔、时值/力度/重复音/和弦、支脉来自真实轨道、窗口/笔触预算、空谱/单音/长音、随机 seek 确定性。
- 状态：观看方式/主题切换保持 score/world/plan 引用、歌曲时间及音频 load 次数；旧保存数据兼容。
- 全量 test / lint / build，git diff --check；不将用户 MIDI 加入默认测试或提交。
- 浏览器：内置曲目与用户本地 MIDI、两种水墨/原版往返、播放/暂停/拖动/重播/切曲/导入、抽屉/键盘/窄屏、湿边与余墨视觉、控制台错误、实际截图。
- 人工审美与听感不由单测保证；性能只报告本机测量和具体样本。

## Progress

- 已完整读取需求文档与相关源码；旧音乐/播放契约足够，本轮无核心架构重写。
- 已完成纯纸面投影、两种水墨表现、固定纸纹场 shader、独立 WebGL2 画布、册页 UI 与模式偏好恢复。旧 Ink 专用资产/loader/appearance 因本轮替换而移除；无新增依赖。
- 视觉验证收紧了短音衔接和和声墨域；真实休止、大跳仍抬笔。长持续音在有限窗口中保留可见位置，不因起音已滚出而消失。
- 保留原版 R3F Canvas/CameraRig 实例，水墨期间停止其绘制；两种纸面模式复用自有画布。纸面独立自动取景，原版相机配置引用保持；原版布局尺寸变化仍可能触发原有 fit，不承诺跨风格逐像素镜头锁定。
- 最终全量 test / lint / build 通过；12 文件 / 90 测试。原版 StreamRenderer、MIDI、engine、playback 与 audio 没有源码改动。
- 浏览器完成用户 MIDI 导入、中文标题、播放/暂停/拖动/重听/重启、两种水墨与三视图往返、旧曲库恢复、主线和效果、全屏与 390px 窄屏检查。23.434 秒前进后返回的纸面截图完全一致；最终恢复为前奏曲 25 秒、墨脉、暂停。
- 截图与纯投影 CPU 样本保存在忽略的 `artifacts/ink-folio/`；详细证据和未验证边界见 [VERIFICATION](../../VERIFICATION.md#ink-folio-2026-10-01)。审美反馈、压缩录屏和真实音频/GPU 测量不冒充已验收。
- 实现完成后补写面向使用者的 README 与内置原创曲预览图，一并交付。用户 MIDI 和非版本化产品文档不暂存；既有独立研究 Demo 未修改。
- 最终 diff 范围与用户资产已复核；本轮文档链接可达。全仓链接检查发现一处既有启动器历史计划路径错误，已在验证记录披露，没有扩大范围修订。
