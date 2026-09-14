# AGENTS.md

## 仓库身份与产品目标

- 当前仓库根目录就是 Hana ACG 主项目，不是准备仓库；不得再把主应用嵌套到另一个顶层项目目录。
- Hana ACG 是以前端为主导的动漫视频播放平台。
- 目标客户端为 Web、macOS、Windows、iOS 和 Android。
- 产品与领域设计以 `AniBaka/` 为主要参考；`ChattyPlay-Agent/` 仅作为 Web 工程的次要参考。

## 已确定的技术架构

- 使用 pnpm monorepo，工作区为 `apps/*` 与 `packages/*`；内部依赖使用 `workspace:*`。
- Web 使用 React + TypeScript + Vite；当前业务状态使用 React hooks，图标使用 Lucide。
- macOS 与 Windows 使用 Electron，复用 Web renderer 和 UI。
- iOS 与 Android 使用 React Native；可以用 Expo 管理项目，但在能力需要时必须允许原生模块与原生构建。
- 共享逻辑测试使用 Vitest，浏览器交互验证使用 Playwright，格式化使用 Prettier。
- 路由、全局状态库、播放器实现、Native 构建与各端发布方案尚未确定。新增选型应由实际功能需要驱动；不要把候选方案描述为已经落地，也不要仅为目录齐全引入依赖。
- 运行环境与依赖版本以根 `package.json`、各包 `package.json` 和 `pnpm-lock.yaml` 为准；当前要求 Node.js 22.12+，`packageManager` 固定 pnpm 10.30.3。

## 当前工程状态

- 当前可运行客户端为 `apps/web`，已实现发现、搜索、每日放送、高分列表、详情预览与本地追番。
- `apps/desktop` 与 `apps/mobile` 仅为工作区占位，未实现原生启动/打包。`source-engine` 与 `player-contract` 当前仅定义契约；不得描述为已接通播放。
- 详情预览不等于完整分集与播放功能；观看历史目前仅为空状态，不能把查看详情写成观看记录。
- `@hanacg/ui` 的 Web 实现与 Native 条件入口保持分离；Native 入口目前只导出契约。外部请求与本地存储由 `apps/web/src/platform.ts` 适配，共享业务不直接访问浏览器全局。

## 目录职责与依赖方向

以下为实际目录，不再创建平行主项目或另起一套同职责的包。

| 目录 | 职责与边界 |
| --- | --- |
| `apps/web` | Web 启动、页面组合、应用导航、浏览器 adapter 与依赖注入 |
| `apps/desktop` | 后续实现 Electron main/preload，复用 Web renderer |
| `apps/mobile` | 后续实现 React Native 启动、Native 页面组合与 adapter |
| `packages/domain` | 番剧领域模型、查询和组件数据契约、纯业务逻辑；不依赖 React、平台或服务实现 |
| `packages/platform` | 网络、存储、媒体资源等平台契约；不包含具体平台实现 |
| `packages/api-client` | 外部元数据请求、运行时校验与领域模型转换；依赖 domain/platform，不处理页面状态 |
| `packages/feature-core` | 可复用业务状态与 hooks，协调 repository 与存储契约；允许依赖 React，不依赖 DOM 或具体客户端 |
| `packages/source-engine` | 视频来源搜索、匹配、分集和地址解析的边界；当前仅为适配器契约，后续规则执行保持与平台宿主分离 |
| `packages/player-contract` | 播放器状态、命令、订阅与生命周期契约；不引入播放器 SDK |
| `packages/design-tokens` | 跨端颜色、尺寸、圆角等设计令牌，以及 Web CSS 变量；不依赖 UI 实现 |
| `packages/ui` | 公共组件契约与平台渲染入口；通过 props 接收数据和事件，不直接请求 API 或读取持久化存储 |

- `apps` 负责组合 UI、业务 hooks 与平台 adapter；`packages` 不得反向导入 `apps`，各客户端不得相互导入应用私有源码。
- 当前 `feature-core → api-client → domain/platform`，`ui → domain/design-tokens`，`player-contract → platform`；后续业务编排可以依赖来源与播放器契约，底层包不能反向依赖业务/UI。
- 跨包导入使用 `@hanacg/*` 的公开 `exports`，禁止通过相对路径或未导出的 `src/*` 穿透包边界；禁止循环依赖。使用某个包的依赖时，在自己的 manifest 中显式声明。
- 当前共享包直接导出 TypeScript 源码，由 Web 构建处理；尚未建立各包独立构建或 npm 发布流程。
- 页面按功能拆分组件和 hooks；复用 UI 放入 `packages/ui`，可复用业务放入 `packages/feature-core`，不要把后续搜索、详情、播放逻辑持续堆入 `App.tsx`。

## 跨平台复用与系统能力

- 最大化可维护的代码复用，但不得为了表面统一而强迫 Web 与 Native 使用同一个渲染实现。
- 领域模型、来源规则引擎、API 客户端、业务/feature 状态与 hooks、播放器契约、平台契约、设计令牌、图标和通用资源应位于共享 packages。
- 播放器、存储、网络、文件系统与系统能力必须通过明确的接口和 adapter 分层；不要把平台条件判断散落在业务代码中。
- UI 对外提供一致的组件契约和设计语言，例如统一的 `@hanacg/ui` API。存在 DOM/Native 差异时，使用 `.web.tsx`、`.native.tsx` 或等价的平台入口实现。
- Web 与 Electron 共用 Web 组件实现；iOS 与 Android 共用 React Native 组件实现。共享组件 API 不等于共享 renderer。
- Web 方案保持 frontend-first。只有 CORS、受限请求头、Cookie、HTML 解析等浏览器约束确实阻断功能时，才增加范围最小的后端或薄代理。
- Electron 特权能力必须通过 main/preload 的安全边界暴露，renderer 不得直接获得不受约束的 Node.js、文件系统或系统权限。

- adapter 实现共享契约，由应用层传入业务层；共享核心不得直接访问 `window`、`document`、`localStorage`、Electron 或 React Native 模块。Web UI 和 Web 专属样式可以使用 DOM。
- 根 TypeScript 配置目前包含 DOM 类型，因此类型检查通过本身不能证明共享包平台无关；审查时仍需检查实际导入与全局访问。

## 数据与来源边界

- Bangumi 提供番剧元数据，不代表存在可播放的视频来源。元数据 ID、第三方来源条目 ID、分集 ID 与媒体 URL 应分别建模，不能混用。
- 外部 JSON 作为 `unknown` 进入边界，先校验再转换为领域模型；不将第三方原始字段结构扩散到页面。
- 精选快照、在线结果和本地用户数据必须明确区分。离线时不得伪造每日放送、实时评分、播放来源或播放进度；现有回退规则见 `docs/design/discovery.md`。
- 搜索和页面切换应取消过期请求，避免较早响应覆盖较新结果；请求需有超时、加载、失败、空结果及可操作的恢复反馈。
- 本地持久化读取时校验版本与结构，处理损坏数据和存储不可用；格式变化时提供兼容读取或显式迁移。
- `VITE_*` 会进入客户端产物，只能存放公开配置，不可包含服务密钥。第三方图片与资料保留出处，素材记录维护在 `docs/design/artwork-sources.json`。

## 界面规范

- 新增或调整 UI 时使用仓库内 `frontend-design` 技能，遵循 `docs/design/discovery.md`，保持 Codex 客户端式的侧栏与内容区结构。
- 同时支持亮色、暗色与跟随系统；通用颜色、间距、圆角优先复用或补充 design-tokens，保持 TypeScript token 与 CSS 变量一致。
- Web/Electron 与 Native 保持一致的组件契约和设计语言，不强行复用 DOM 实现。
- 保留窄屏适配、键盘操作、可见焦点、弹窗焦点管理、减少动态效果偏好，以及加载/错误/空状态；不要用没有实际行为的控件伪装已完成能力。

## 产品范围

第一版聚焦：

- 发现/首页；
- 搜索；
- 番剧详情与分集；
- 多来源匹配；
- 播放与手动换源；
- 观看历史。

社区、一起看、Torrent、WebDAV 及其他重型功能延后。未经用户明确调整范围，不应让这些功能扩大第一版架构或交付面。

## 参考项目保护

- `AniBaka/`、`ChattyPlay-Agent/` 和本地忽略的 `AniCh-1.5.24/` 都是只读参考。
- 除非用户明确要求，不得修改、格式化、升级、生成文件到这些目录，也不得把它们当作 Hana ACG 应用代码继续开发。
- 对 AniBaka 的详细分析维护在 `docs/references/anibaka.md`；根 README 只保留入口级说明。

## 工程守则

- 保留用户已有修改，不做与当前任务无关的编辑。
- 使用 pnpm 安装、运行和更新依赖，维护单一 `pnpm-lock.yaml`；不混入 npm/yarn 锁文件。不手工修改生成的构建产物。
- TypeScript 的跨 package、平台能力和外部数据边界必须有明确类型，不用隐式约定穿透边界。
- 对共享核心、来源匹配/规则执行、播放器状态等高价值逻辑添加与风险相称的测试；避免仅重复实现细节的测试或无实际需求的大型流程。
- 架构、平台范围或第一版产品边界发生变化时，同步更新 `README.md` 与本文件。

## 开发与验证

| 命令 | 用途 |
| --- | --- |
| `pnpm dev` | 启动 Web 开发服务，默认 `http://127.0.0.1:5173` |
| `pnpm check` | 根 TypeScript 检查、共享逻辑测试、Web 生产构建 |
| `pnpm test:e2e` | 浏览器交互测试；当前配置使用 Google Chrome |
| `pnpm format:check` | 检查当前格式化范围；`pnpm format` 修正格式 |

- 按改动风险运行验证：共享逻辑/契约调整检查类型和相关单测；影响构建时运行构建；影响关键交互时运行相关 E2E。纯文档改动校对内容与差异即可。
- UI 改动检查亮色、暗色和窄屏的实际呈现；交互变化覆盖对应的正常、错误或空状态。
- 当前 E2E 使用受控的 Bangumi 响应，不代表第三方在线服务可用。报告时区分本地逻辑验证、浏览器交互验证与真实接口连通性。
- 根检查当前覆盖 Web 与共享包，不包括尚未实现的 Electron/React Native 构建；新增客户端后再补充对应验证范围。
- 所有批量搜索、格式化、测试和生成任务应限定在 Hana 自身目录，遵守参考项目只读规则。
