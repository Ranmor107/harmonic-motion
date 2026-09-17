# Development Workflow

Purpose: 让普通迭代局部完成，让真正的架构变化先形成明确方案。
Authority: 开发步骤、范围扩展门槛及文档维护协议的主要记录。
Update when: 工作协议、计划门槛或知识维护方式改变。
Last verified: 2026-09-17；按当前仓库入口和 package scripts 核对。

```text
Request → Task classification → Impact analysis → Scoped reading
        → Change plan → Implementation → Targeted validation → Documentation update
```

## 1. Task classification

先回答：**What layer owns this behavior?**

从 [AGENTS](../AGENTS.md) 和 [文档导航](index.md) 进入 [Impact Matrix](CHANGE_IMPACT_MATRIX.md)。
区分 UI、theme、effects、environment、camera、visibility、geometry、choreography、playback、audio、MIDI、domain。
主角外观不等于主角轨迹；camera 移动不等于 world 改变；节点消失不等于音乐事件被删除。
如果需求有影响 ownership 的歧义，先指出选择与结果；普通实现选择自行处理，重大未定产品方向才提问。

## 2. Impact analysis and scoped reading

先检查 `git status --short`，识别并保护用户既有修改。然后只读：

1. 对应的任务路由行。
2. 对应的 [模块地图](CODEBASE_OPERATING_MODEL.md) 小节与 [测试映射](TEST_MATRIX.md)。
3. 符号搜索命中的目标源码、直接调用方及相关测试。
4. 只有契约/invariant 受影响时，读 [ARCHITECTURE](ARCHITECTURE.md) 的相关部分。

使用 `rg` 搜索符号、imports/references、测试 suite。源文件同在 App 内，不意味着一次 UI 修改需要改其中的全部职责。
`node_modules`、构建产物、用户素材不是默认审阅范围；只有定位库行为等具体证据需要时定向读取。

编码前给出简短范围记录，至少含：

| 项目 | 必须说清楚 |
| --- | --- |
| Primary scope | 谁拥有行为；预计修改哪些文件/符号 |
| Adjacent scope | 哪个调用或契约可能受影响，为什么 |
| Explicit non-goals | 本次不解决哪些相邻产品需求 |
| Architecture invariants | 受影响项；或者说明既有契约足够 |
| Public interfaces | 是否改变输入输出、状态语义、事件、数据形状 |
| Expected files | 明确路径；探索后变化要说明原因 |
| Validation plan | 使用哪些已存在测试，缺口如何人工确认 |

## 3. Minimal change and expansion threshold

**Prefer the smallest coherent change.**

现有 public contract 足够时继续使用。禁止为了按钮重构 store、为了 zoom 重写 geometry、为了背景修改 WorldModel、为了粒子重设计编舞，或为了单个效果重写整个 renderer。
不要顺手格式化、清理旧死代码、升级依赖或重构相邻模块。

扩大阅读仅由证据触发：跨边界必需契约、接口变化、文档矛盾、未知 ownership、意外耦合、集成失败、invariant 风险。
先沿一条直接调用/数据边扩大一圈；记录新发现，再决定是否继续。不要把“以后可能有用”作为全仓重读理由。

**同时修改三个或更多核心责任层时，暂停直接编码**，先确认：

1. 是否分类错了，把 presentation 当成 geometry？
2. 旧契约能否继续表达目标？
3. 局部 adapter/strategy 是否比改原边界更合适？
4. 确有架构变化还是只是多个文件？

按责任层计数，不按文件数：domain、MIDI、analysis、geometry、choreography、playback、audio、visual/render、application（state/UI）。visual 下几个配置文件不是几个核心层；domain type 的修改仍属于契约审查。
若确需跨层，则先建 [implementation plan](plans/PLAN_TEMPLATE.md)；时间权威、世界语义、公共模型或 ownership 改变再建 [ADR](decisions/ADR_TEMPLATE.md)。
public contract 变更即使不足三层，也先有 plan；只是函数内部实现变化不自动算架构决策。
方案记录是继续工作的前置步骤，不是无条件向用户索要批准。不得用 plan 或 ADR 自行扩大授权。

## 4. No rewrite rule

**Existing working architecture should be extended before it is replaced.**

重写至少需要一个可指向证据的理由：现有架构不能表达已请求行为、测量过的性能问题、已确认正确性问题、不可维护耦合证据、或已有获认可的架构方案。
这些条件只让“评估替换”合理，不证明替换一定是最小方案；plan 必须列增量方案及取舍。
不能把个人偏好或“我能写得更优雅”当证据。

## 5. Plan, implement, validate

- 小型局部改动可用简短范围说明，不必新增文件。
- 中型/跨模块产品任务使用 [plans 系统](plans/index.md)；本次仓库知识盘点属于文档任务，不新增产品实施计划。
- 真正架构决策使用 [decisions 系统](decisions/index.md)，不虚构既往 ADR。
- 修 bug 先建立最小复现/回归断言；实现只改与目标有关部分。
- 根据 [TEST_MATRIX](TEST_MATRIX.md) 执行定向检查；跨契约执行全量 test/lint/build。
- 检查通过后，不无理由重复全量测试；新改动、失败或未解决疑点才追加检查。
- 测试失败时分清原有 baseline 与本轮回归。记录超出范围的问题，不顺手修复。
- UI/渲染需浏览器验证；真实音频质量需试听/测量。没有证据的结果标 Unverified。

## 6. Documentation update rules

**Update only documents whose truth changed.**

| 变化 | 最小文档更新集合 / 触发条件 |
| --- | --- |
| 只换 theme 色值、按钮间距 | 通常不改长期架构文档；有保存检查记录的需要才追加 VERIFICATION |
| 新增用户操作 | README 的操作说明；能力变化时更新 CURRENT_STATE |
| 新增真实 GeometryStrategy、主题或环境 | CURRENT_STATE；ROADMAP 仅更新对应项；有新入口时更新模块地图 |
| 修改 GeometryStrategy/WorldModel/PerformancePlan 语义 | ARCHITECTURE + ADR；模块地图、Impact Matrix、TEST_MATRIX 仅修改受影响映射 |
| 新增定向测试或验证命令 | TEST_MATRIX；实际运行证据单独记 VERIFICATION |
| 解决已知限制 | KNOWN_LIMITATIONS 记解决证据；能力/路线状态确实改变时再更新其文档 |
| 发现 documentation != code | 在 KNOWN_LIMITATIONS 的 Documentation Drift 并列记原文/代码/判断/待确认项；不偷偷修源码或改写历史 |
| 实施完成 | plan 补证据并归档 completed；ROADMAP 的有关项更新；不是批量更新所有 md |

如果一个普通局部修改总要改八份文档，先检查是否复制了同一事实。各知识的唯一主要归属见 [index](index.md)；其他文档链接引用，允许简短概述但不复制长列表、限额和验收结果。

每份长期文档维护 `Purpose / Authority / Update when / Last verified`。只有实际重新核实了该文档的相关事实，才刷新 Last verified；补链接不代表整份内容重新验证。
测试数量与包体积在 VERIFICATION 作为日期快照维护，不散落到导航文件当长期常量。

## 7. 完成、Git 与交付

1. 检查 diff 是否只涉及预计文件，说明新增范围原因。
2. 运行 `git diff --check`、`git diff --name-only`、`git status --short`；已暂存内容同时检查 `--cached`。
3. 文档任务新增文件也要检查；只看 diff 会漏掉未跟踪文件。已有用户素材不暂存、不删除。
4. 提交时显式列本轮路径，不使用不加判断的 `git add .`。提交后用 `git show --stat` 和本次提交的 changed paths 复核；clean diff 不能替代提交范围检查。
5. plan 达到全部 completion criteria 才从 active 移到 completed 并更新索引。未完成不归档；不靠删除失败记录制造完成。
6. 最终报告说明改了什么、为何、验证及限制。文档任务明确确认没有产品源码变化。

不默认增加 nested AGENTS。只有大型子模块出现独立规则/验证/依赖边界时，另行提出有依据的建议。
