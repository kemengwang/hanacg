# AGENTS.md

## 仓库身份与产品目标

- 当前仓库根目录就是 Hana ACG 主项目，不是准备仓库；不得再把主应用嵌套到另一个顶层项目目录。
- Hana ACG 是以前端为主导的动漫视频播放平台。
- 目标客户端为 Web、macOS、Windows、iOS 和 Android。
- 产品与领域设计以 `AniBaka/` 为主要参考；`ChattyPlay-Agent/` 仅作为 Web 工程的次要参考。

## 已确定的客户端架构

- Web 使用 React + TypeScript。
- macOS 与 Windows 使用 Electron，复用 Web renderer 和 UI。
- iOS 与 Android 使用 React Native；可以用 Expo 管理项目，但在能力需要时必须允许原生模块与原生构建。
- 不得把尚未讨论的状态管理、路由、播放器、测试、构建或发布库描述为已经定案。

## 复用与平台边界

- 最大化可维护的代码复用，但不得为了表面统一而强迫 Web 与 Native 使用同一个渲染实现。
- 领域模型、来源规则引擎、API 客户端、业务/feature 状态与 hooks、播放器契约、平台契约、设计令牌、图标和通用资源应位于共享 packages。
- 播放器、存储、网络、文件系统与系统能力必须通过明确的接口和 adapter 分层；不要把平台条件判断散落在业务代码中。
- UI 对外提供一致的组件契约和设计语言，例如统一的 `@hanacg/ui` API。存在 DOM/Native 差异时，使用 `.web.tsx`、`.native.tsx` 或等价的平台入口实现。
- Web 与 Electron 共用 Web 组件实现；iOS 与 Android 共用 React Native 组件实现。共享组件 API 不等于共享 renderer。
- Web 方案保持 frontend-first。只有 CORS、受限请求头、Cookie、HTML 解析等浏览器约束确实阻断功能时，才增加范围最小的后端或薄代理。
- Electron 特权能力必须通过 main/preload 的安全边界暴露，renderer 不得直接获得不受约束的 Node.js、文件系统或系统权限。

建议在根目录下使用 `apps/web`、`apps/desktop`、`apps/mobile`，并按职责建立 `packages/domain`、`packages/source-engine`、`packages/api-client`、`packages/feature-core`、`packages/player-contract`、`packages/platform`、`packages/design-tokens`，以及 `packages/ui-web`/`packages/ui-native` 或具有等价平台入口的 UI package。实际脚手架建立后可以调整命名，但必须保留上述职责与依赖边界。

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
- 可复用逻辑优先进入共享 packages；平台差异通过显式接口、adapter 和平台入口表达。
- TypeScript 的跨 package、平台能力和外部数据边界必须有明确类型，不用隐式约定穿透边界。
- 对共享核心、来源匹配/规则执行、播放器状态等高价值逻辑添加与风险相称的测试；不要在脚手架尚未确定前发明庞大的工具与流程政策。
- 架构、平台范围或第一版产品边界发生变化时，同步更新 `README.md` 与本文件。
