# 埋点SDK使用文档

## 简介

这是一个轻量级的前端埋点SDK，使用GIF图片方式发送数据，具有以下特点：

- 🚀 轻量级，无依赖
- 📊 支持批量上报
- 🎯 自动收集页面浏览和设备信息
- 🛡️ 自动捕获JavaScript错误
- 🔐 设备指纹识别
- 📱 完美支持单页应用(SPA)

## 安装配置

### 1. 基本配置

在项目入口文件（如 `main.tsx`）中引入并初始化：

```typescript
import { initAnalytics } from "./sdk/analytics";

// 初始化SDK
const analytics = initAnalytics({
  reportUrl: "https://your-analytics-api.com/collect.gif", // 上报地址
  appId: "your-app-id", // 应用ID
  userId: "user-123", // 可选：用户ID
  debug: true, // 可选：开启调试模式
  autoTrack: true, // 可选：自动追踪页面浏览
  collectDevice: true, // 可选：收集设备信息
  batchConfig: {
    enabled: true, // 启用批量上报
    maxSize: 10, // 批量最大数量
    timeout: 5000, // 批量上报超时时间(ms)
  },
});
```

### 2. 在应用中使用

```typescript
import { getAnalytics } from "./sdk/analytics";

// 获取SDK实例
const analytics = getAnalytics();

// 追踪自定义事件
analytics?.track("custom_event", {
  param1: "value1",
  param2: "value2",
});

// 追踪按钮点击
analytics?.trackClick("submit_button", {
  page: "homepage",
  section: "hero",
});

// 追踪表单提交
analytics?.trackSubmit("login_form", {
  success: true,
});

// 追踪用户行为
analytics?.trackAction("scroll", "product_list", {
  depth: 50,
});

// 设置用户ID
analytics?.setUserId("user-456");

// 设置用户属性
analytics?.setUserProperties({
  name: "John Doe",
  email: "john@example.com",
  plan: "premium",
});

// 追踪错误
try {
  // 可能出错的代码
} catch (error) {
  analytics?.trackError(error, {
    context: "user_login",
  });
}
```

## API文档

### 配置选项 (AnalyticsConfig)

| 参数          | 类型    | 必填 | 说明                           |
| ------------- | ------- | ---- | ------------------------------ |
| reportUrl     | string  | 是   | 数据上报地址                   |
| appId         | string  | 是   | 应用唯一标识                   |
| userId        | string  | 否   | 用户ID                         |
| debug         | boolean | 否   | 是否开启调试模式，默认false    |
| autoTrack     | boolean | 否   | 是否自动追踪页面浏览，默认true |
| collectDevice | boolean | 否   | 是否收集设备信息，默认true     |
| batchConfig   | object  | 否   | 批量上报配置                   |

### 主要方法

#### init()

初始化SDK，自动收集页面信息和设置监听器。

#### track(event, properties)

追踪自定义事件。

**参数：**

- `event` (string): 事件名称
- `properties` (object): 事件属性

**示例：**

```typescript
analytics.track("purchase", {
  product_id: "123",
  amount: 99.99,
  currency: "USD",
});
```

#### trackPageView()

追踪页面浏览事件，通常自动调用。

#### trackAction(action, target, properties)

追踪用户行为。

**参数：**

- `action` (string): 行为类型（如click、scroll等）
- `target` (string): 行为目标
- `properties` (object): 额外属性

#### trackClick(buttonName, properties)

追踪按钮点击事件。

#### trackSubmit(formName, properties)

追踪表单提交事件。

#### trackError(error, context)

追踪错误信息。

#### setUserId(userId)

设置用户ID。

#### setUserProperties(properties)

设置用户属性。

#### destroy()

销毁SDK实例，清理资源。

## 数据格式

### 单个事件数据结构

```typescript
{
  event: string,           // 事件名称
  properties: object,      // 事件属性
  timestamp: number,       // 时间戳
  url: string,            // 页面URL
  title: string,          // 页面标题
  userId: string,         // 用户ID
  sessionId: string,      // 会话ID
  device: {               // 设备信息
    userAgent: string,
    platform: string,
    language: string,
    screen: string,
    timezone: string,
    fingerprint: string
  }
}
```

### 预设事件类型

| 事件名称        | 触发时机          | 属性                       |
| --------------- | ----------------- | -------------------------- |
| page_view       | 页面加载/路由变化 | referrer, path, search     |
| user_action     | 用户操作          | action, target             |
| button_click    | 按钮点击          | button_name                |
| form_submit     | 表单提交          | form_name                  |
| error           | JavaScript错误    | error_message, error_stack |
| user_properties | 用户属性设置      | 用户自定义属性             |

## 服务端接收

### Node.js示例

```javascript
const express = require("express");
const app = express();

app.get("/collect.gif", (req, res) => {
  try {
    // 获取数据
    const data = req.query.data;
    const decodedData = Buffer.from(data, "base64").toString();
    const eventData = JSON.parse(decodedData);

    // 处理数据
    console.log("Received analytics data:", eventData);

    // 保存到数据库或发送到其他服务
    // saveToDatabase(eventData);

    // 返回1x1透明GIF
    const gif = Buffer.from(
      "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
      "base64",
    );
    res.setHeader("Content-Type", "image/gif");
    res.setHeader("Content-Length", gif.length);
    res.send(gif);
  } catch (error) {
    console.error("Error processing analytics data:", error);
    res.status(400).send("Bad Request");
  }
});

app.listen(3000, () => {
  console.log("Analytics server running on port 3000");
});
```

## 注意事项

1. **CORS配置**：确保上报地址配置了正确的CORS策略
2. **数据大小**：由于URL长度限制，单个事件数据不宜过大
3. **隐私保护**：遵循相关隐私法规，不收集敏感信息
4. **性能影响**：批量上报和GIF图片方式对性能影响很小
5. **错误处理**：SDK内置错误处理，不会影响主业务逻辑

## TypeScript支持

本SDK完全使用TypeScript编写，提供完整的类型定义：

```typescript
import { AnalyticsSDK, AnalyticsConfig, EventData } from "./sdk/analytics";

// 完整的类型支持
const config: AnalyticsConfig = {
  reportUrl: "https://example.com/collect.gif",
  appId: "my-app",
};

const sdk: AnalyticsSDK = initAnalytics(config);
```
