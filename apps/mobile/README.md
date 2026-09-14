# @hanacg/mobile

iOS / Android 的 React Native 工作区占位。当前尚未选定 Expo、Native 构建方案，也未安装 React Native runtime。

下一阶段复用 `@hanacg/domain`、`@hanacg/api-client`、`@hanacg/feature-core`、`@hanacg/design-tokens`，为存储和网络提供 Native adapter。`@hanacg/ui` 的 `react-native` 条件入口目前仅导出组件契约；Native 组件需要独立实现，不能把 DOM 组件导入移动端。

本目录目前没有可执行的移动端启动命令。
