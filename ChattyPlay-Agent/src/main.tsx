import React, { Component, ReactNode } from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import { initAnalytics } from './sdk/analytics'
import './assets/css/global.css'
import './index.css'
import 'antd/dist/reset.css'
import 'nprogress/nprogress.css'
import 'highlight.js/styles/github.css'
import './i18n/config'

// 初始化埋点SDK
const analytics = initAnalytics({
  reportUrl: import.meta.env.VITE_ANALYTICS_REPORT_URL,
  appId: 'chattyplay', // 应用ID
  debug: import.meta.env.DEV, // 开发环境开启调试
  autoTrack: true, // 自动追踪页面浏览
  collectDevice: true, // 收集设备信息
  batchConfig: {
    enabled: true,
    maxSize: 10,
    timeout: 5000
  }
})

// 全局访问埋点SDK
if (typeof window !== 'undefined') {
  (window as any).analytics = analytics
}

// 声明 Fundebug 全局变量类型
declare global {
  interface Window {
    fundebug: any
  }
}

const fundebug = typeof window !== 'undefined' ? window.fundebug : null

// ErrorBoundary 组件
interface ErrorBoundaryState {
  hasError: boolean
}

interface ErrorBoundaryProps {
  children: ReactNode
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false }
  }

  componentDidCatch(error: Error, errorInfo: any) {
    this.setState({ hasError: true })
    // 将 component 中的报错发送到 Fundebug
    if (fundebug) {
      fundebug.notifyError(error, {
        metaData: {
          info: errorInfo
        }
      })
    }
  }

  render() {
    if (this.state.hasError) {
      return null
    }
    return this.props.children
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
)
