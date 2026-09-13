/**
 * 埋点SDK全局类型定义
 */

import { AnalyticsSDK } from './index'

declare global {
  interface Window {
    /**
     * 全局埋点SDK实例
     */
    analytics?: AnalyticsSDK

    /**
     * 埋点SDK配置（可选）
     */
    analyticsConfig?: {
      reportUrl: string
      appId: string
      userId?: string
      debug?: boolean
    }
  }
}

export {}
