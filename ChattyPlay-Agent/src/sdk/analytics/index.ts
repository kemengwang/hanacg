/**
 * 埋点SDK - Analytics SDK
 * 使用GIF图片方式发送埋点数据
 */

// 配置接口
interface AnalyticsConfig {
  // 上报地址
  reportUrl: string
  // 应用ID
  appId: string
  // 用户ID
  userId?: string
  // 是否开启调试模式
  debug?: boolean
  // 是否自动收集页面浏览
  autoTrack?: boolean
  // 是否收集设备信息
  collectDevice?: boolean
  // 批量上报配置
  batchConfig?: {
    enabled: boolean
    maxSize: number
    timeout: number
  }
}

// 事件数据接口
interface EventData {
  // 事件名称
  event: string
  // 事件属性
  properties?: Record<string, any>
  // 时间戳
  timestamp?: number
  // 页面URL
  url?: string
  // 页面标题
  title?: string
  // 用户ID
  userId?: string
  // 设备信息
  device?: DeviceInfo
  // 会话ID
  sessionId?: string
}

// 设备信息接口
interface DeviceInfo {
  userAgent: string
  platform: string
  language: string
  screen: string
  timezone: string
  fingerprint?: string
}

// 上报数据接口
interface ReportData extends EventData {
  appId: string
  sessionId: string
  device: DeviceInfo
}

class AnalyticsSDK {
  private config: AnalyticsConfig
  private sessionId: string
  private eventQueue: EventData[] = []
  private batchTimer: NodeJS.Timeout | null = null
  private isInitialized = false

  constructor(config: AnalyticsConfig) {
    this.config = {
      debug: false,
      autoTrack: true,
      collectDevice: true,
      batchConfig: {
        enabled: true,
        maxSize: 10,
        timeout: 5000
      },
      ...config
    }
    this.sessionId = this.generateSessionId()
  }

  /**
   * 初始化SDK
   */
  init(): void {
    if (this.isInitialized) {
      this.warn('SDK already initialized')
      return
    }

    this.log('Initializing Analytics SDK...')

    // 自动收集页面浏览
    if (this.config.autoTrack) {
      this.trackPageView()
      this.trackPageChanges()
    }

    // 设置错误监听
    this.setupErrorTracking()

    // 设置卸载监听
    this.setupUnloadTracking()

    this.isInitialized = true
    this.log('Analytics SDK initialized successfully')
  }

  /**
   * 追踪自定义事件
   */
  track(event: string, properties: Record<string, any> = {}): void {
    const eventData: EventData = {
      event,
      properties,
      timestamp: Date.now(),
      url: window.location.href,
      title: document.title,
      userId: this.config.userId,
      sessionId: this.sessionId
    }

    if (this.config.collectDevice) {
      eventData.device = this.getDeviceInfo()
    }

    this.log('Tracking event:', eventData)

    if (this.config.batchConfig?.enabled) {
      this.addToBatch(eventData)
    } else {
      this.sendEvent(eventData)
    }
  }

  /**
   * 追踪页面浏览
   */
  trackPageView(): void {
    this.track('page_view', {
      referrer: document.referrer,
      path: window.location.pathname,
      search: window.location.search
    })
  }

  /**
   * 追踪用户行为
   */
  trackAction(action: string, target: string, properties: Record<string, any> = {}): void {
    this.track('user_action', {
      action,
      target,
      ...properties
    })
  }

  /**
   * 追踪按钮点击
   */
  trackClick(buttonName: string, properties: Record<string, any> = {}): void {
    this.track('button_click', {
      button_name: buttonName,
      ...properties
    })
  }

  /**
   * 追踪表单提交
   */
  trackSubmit(formName: string, properties: Record<string, any> = {}): void {
    this.track('form_submit', {
      form_name: formName,
      ...properties
    })
  }

  /**
   * 追踪错误
   */
  trackError(error: Error | string, context: Record<string, any> = {}): void {
    const errorMessage = typeof error === 'string' ? error : error.message
    const errorStack = typeof error === 'string' ? '' : error.stack

    this.track('error', {
      error_message: errorMessage,
      error_stack: errorStack,
      ...context
    })
  }

  /**
   * 设置用户ID
   */
  setUserId(userId: string): void {
    this.config.userId = userId
    this.log('User ID set:', userId)
  }

  /**
   * 设置用户属性
   */
  setUserProperties(properties: Record<string, any>): void {
    this.track('user_properties', properties)
  }

  /**
   * 生成会话ID
   */
  private generateSessionId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`
  }

  /**
   * 获取设备信息
   */
  private getDeviceInfo(): DeviceInfo {
    const screen = `${window.screen.width}x${window.screen.height}`
    const fingerprint = this.generateFingerprint()

    return {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      language: navigator.language,
      screen,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      fingerprint
    }
  }

  /**
   * 生成设备指纹（简化版）
   */
  private generateFingerprint(): string {
    const components = [
      navigator.userAgent,
      navigator.language,
      screen.colorDepth,
      new Date().getTimezoneOffset(),
      !!window.sessionStorage,
      !!window.localStorage,
      navigator.platform
    ]

    const data = components.join('|')
    let hash = 0
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32bit integer
    }
    return Math.abs(hash).toString(16)
  }

  /**
   * 添加到批量队列
   */
  private addToBatch(eventData: EventData): void {
    this.eventQueue.push(eventData)

    if (this.eventQueue.length >= (this.config.batchConfig?.maxSize || 10)) {
      this.flushBatch()
    } else {
      this.startBatchTimer()
    }
  }

  /**
   * 开始批量定时器
   */
  private startBatchTimer(): void {
    if (this.batchTimer) {
      clearTimeout(this.batchTimer)
    }

    this.batchTimer = setTimeout(() => {
      this.flushBatch()
    }, this.config.batchConfig?.timeout || 5000)
  }

  /**
   * 刷新批量队列
   */
  private flushBatch(): void {
    if (this.eventQueue.length === 0) return

    const events = [...this.eventQueue]
    this.eventQueue = []

    if (this.batchTimer) {
      clearTimeout(this.batchTimer)
      this.batchTimer = null
    }

    this.sendBatch(events)
  }

  /**
   * 发送单个事件
   */
  private sendEvent(eventData: EventData): void {
    const reportData: ReportData = {
      ...eventData,
      appId: this.config.appId,
      sessionId: this.sessionId,
      device: eventData.device || this.getDeviceInfo()
    }

    this.sendViaGIF(reportData)
  }

  /**
   * 批量发送事件
   */
  private sendBatch(events: EventData[]): void {
    const reportData = {
      events,
      appId: this.config.appId,
      sessionId: this.sessionId,
      timestamp: Date.now()
    }

    this.sendViaGIF(reportData, true)
  }

  /**
   * 通过GIF图片发送数据
   */
  private sendViaGIF(data: any, isBatch = false): void {
    try {
      const params = new URLSearchParams()

      // 将数据编码并添加到URL参数
      const encodedData = this.btoa(JSON.stringify(data))
      params.append('data', encodedData)

      if (isBatch) {
        params.append('batch', '1')
      }

      const url = `${this.config.reportUrl}?${params.toString()}`

      // 创建Image对象发送请求
      const img = new Image()
      img.onload = () => this.log('Event sent successfully')
      img.onerror = (error) => this.warn('Failed to send event:', error)
      img.src = url

    } catch (error) {
      this.warn('Error sending event:', error)
    }
  }

  /**
   * Base64编码（兼容性处理）
   */
  private btoa(str: string): string {
    try {
      return window.btoa(unescape(encodeURIComponent(str)))
    } catch (e) {
      // 如果btoa失败，使用简单的编码
      return Buffer.from(str).toString('base64')
    }
  }

  /**
   * 监听页面变化
   */
  private trackPageChanges(): void {
    // 监听路由变化（针对单页应用）
    const originalPushState = history.pushState
    const originalReplaceState = history.replaceState

    history.pushState = (...args) => {
      originalPushState.apply(history, args)
      this.trackPageView()
    }

    history.replaceState = (...args) => {
      originalReplaceState.apply(history, args)
      this.trackPageView()
    }

    // 监听popstate事件
    window.addEventListener('popstate', () => {
      this.trackPageView()
    })

    // 监听hash变化
    window.addEventListener('hashchange', () => {
      this.trackPageView()
    })
  }

  /**
   * 设置错误追踪
   */
  private setupErrorTracking(): void {
    // 捕获JavaScript错误
    window.addEventListener('error', (event) => {
      this.trackError(event.message, {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        type: 'javascript_error'
      })
    })

    // 捕获未处理的Promise rejection
    window.addEventListener('unhandledrejection', (event) => {
      this.trackError(event.reason, {
        type: 'unhandled_rejection'
      })
    })

    // 捕获资源加载错误
    window.addEventListener('error', (event) => {
      if (event.target !== window) {
        this.trackError('Resource load error', {
          target: (event.target as HTMLElement).tagName,
          type: 'resource_error'
        })
      }
    }, true)
  }

  /**
   * 设置页面卸载追踪
   */
  private setupUnloadTracking(): void {
    // 页面卸载时发送剩余事件
    window.addEventListener('beforeunload', () => {
      if (this.eventQueue.length > 0) {
        // 使用sendBeacon确保数据发送
        this.flushBatch()
      }
    })

    // 页面隐藏时也发送
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && this.eventQueue.length > 0) {
        this.flushBatch()
      }
    })
  }

  /**
   * 日志输出
   */
  private log(...args: any[]): void {
    if (this.config.debug) {
      console.log('[Analytics SDK]', ...args)
    }
  }

  /**
   * 警告输出
   */
  private warn(...args: any[]): void {
    if (this.config.debug) {
      console.warn('[Analytics SDK]', ...args)
    }
  }

  /**
   * 销毁SDK
   */
  destroy(): void {
    this.log('Destroying Analytics SDK...')

    // 刷新剩余事件
    if (this.eventQueue.length > 0) {
      this.flushBatch()
    }

    // 清除定时器
    if (this.batchTimer) {
      clearTimeout(this.batchTimer)
      this.batchTimer = null
    }

    this.isInitialized = false
    this.log('Analytics SDK destroyed')
  }
}

// 导出单例模式
let analyticsInstance: AnalyticsSDK | null = null

export function initAnalytics(config: AnalyticsConfig): AnalyticsSDK {
  if (!analyticsInstance) {
    analyticsInstance = new AnalyticsSDK(config)
    analyticsInstance.init()
  }
  return analyticsInstance
}

export function getAnalytics(): AnalyticsSDK | null {
  return analyticsInstance
}

export { AnalyticsSDK }
export type { AnalyticsConfig, EventData }
