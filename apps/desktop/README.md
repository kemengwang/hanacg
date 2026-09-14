# @hanacg/desktop

Electron 客户端的工作区占位。当前发现里程碑只交付 Web renderer，尚未安装 Electron 或建立原生打包流程。

下一阶段在本目录实现 main/preload，并加载 `@hanacg/web` 的构建产物。优先复用 `@hanacg/ui` 的 Web 入口；业务不能直接依赖 Electron。窗口、文件等能力通过 `@hanacg/platform` adapter 暴露，启用 contextIsolation、关闭 nodeIntegration，并校验 IPC 参数、导航目标及外部 URL。

本目录目前没有可执行的桌面启动命令。
