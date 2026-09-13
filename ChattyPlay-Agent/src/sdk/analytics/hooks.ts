/**
 * 埋点SDK React Hooks
 */

import { useEffect, useCallback, useRef } from 'react'
import { getAnalytics } from './index'

/**
 * 使用埋点SDK的Hook
 */
export function useAnalytics() {
  const analytics = getAnalytics()

  // 追踪页面浏览
  const trackPageView = useCallback(() => {
    analytics?.trackPageView()
  }, [analytics])

  // 追踪自定义事件
  const track = useCallback((event: string, properties?: Record<string, any>) => {
    analytics?.track(event, properties)
  }, [analytics])

  // 追踪按钮点击
  const trackClick = useCallback((buttonName: string, properties?: Record<string, any>) => {
    analytics?.trackClick(buttonName, properties)
  }, [analytics])

  // 追踪表单提交
  const trackSubmit = useCallback((formName: string, properties?: Record<string, any>) => {
    analytics?.trackSubmit(formName, properties)
  }, [analytics])

  // 追踪用户行为
  const trackAction = useCallback((action: string, target: string, properties?: Record<string, any>) => {
    analytics?.trackAction(action, target, properties)
  }, [analytics])

  // 追踪错误
  const trackError = useCallback((error: Error | string, context?: Record<string, any>) => {
    analytics?.trackError(error, context)
  }, [analytics])

  return {
    trackPageView,
    track,
    trackClick,
    trackSubmit,
    trackAction,
    trackError,
    analytics
  }
}

/**
 * 页面浏览追踪Hook
 */
export function usePageTracking(enabled: boolean = true) {
  useEffect(() => {
    if (enabled) {
      const analytics = getAnalytics()
      analytics?.trackPageView()
    }
  }, [enabled])
}

/**
 * 事件追踪Hook
 */
export function useEventTracking(eventName: string, properties?: Record<string, any>, dependencies: any[] = []) {
  useEffect(() => {
    const analytics = getAnalytics()
    analytics?.track(eventName, properties)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, dependencies)
}

/**
 * 点击追踪Hook
 */
export function useClickTracking(elementRef: React.RefObject<HTMLElement>, eventName: string, properties?: Record<string, any>) {
  useEffect(() => {
    const element = elementRef.current
    if (!element) return

    const handleClick = () => {
      const analytics = getAnalytics()
      analytics?.trackClick(eventName, properties)
    }

    element.addEventListener('click', handleClick)

    return () => {
      element.removeEventListener('click', handleClick)
    }
  }, [elementRef, eventName, properties])
}

/**
 * 可见性追踪Hook
 */
export function useVisibilityTracking(elementRef: React.RefObject<HTMLElement>, eventName: string, properties?: Record<string, any>) {
  const hasTracked = useRef(false)

  useEffect(() => {
    const element = elementRef.current
    if (!element) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !hasTracked.current) {
            const analytics = getAnalytics()
            analytics?.track(eventName, {
              ...properties,
              visible: true
            })
            hasTracked.current = true
          }
        })
      },
      { threshold: 0.5 }
    )

    observer.observe(element)

    return () => {
      observer.disconnect()
    }
  }, [elementRef, eventName, properties])
}

/**
 * 表单追踪Hook
 */
export function useFormTracking(formName: string, onSuccess?: (data: any) => void, onError?: (error: any) => void) {
  const analytics = getAnalytics()

  const trackSubmit = useCallback((data: any) => {
    analytics?.trackSubmit(formName, {
      success: true,
      ...data
    })
    onSuccess?.(data)
  }, [analytics, formName, onSuccess])

  const trackError = useCallback((error: any) => {
    analytics?.trackError(error, {
      context: formName
    })
    onError?.(error)
  }, [analytics, formName, onError])

  return {
    trackSubmit,
    trackError
  }
}

/**
 * 滚动追踪Hook
 */
export function useScrollTracking(threshold: number = 50, eventName: string = 'scroll_depth') {
  const trackedDepths = useRef<Set<number>>(new Set())

  useEffect(() => {
    const handleScroll = () => {
      const scrollHeight = document.documentElement.scrollHeight - window.innerHeight
      const scrollPercentage = (window.scrollY / scrollHeight) * 100

      const depth = Math.floor(scrollPercentage / threshold) * threshold

      if (depth > 0 && depth <= 100 && !trackedDepths.current.has(depth)) {
        trackedDepths.current.add(depth)

        const analytics = getAnalytics()
        analytics?.track(eventName, {
          depth: `${depth}%`,
          scroll_depth: depth
        })
      }
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [threshold, eventName])
}

/**
 * 停留时间追踪Hook
 */
export function useDurationTracking(pageName: string, reportInterval: number = 30000) {
  useEffect(() => {
    const startTime = Date.now()
    const analytics = getAnalytics()

    // 定时上报停留时间
    const interval = setInterval(() => {
      const duration = Date.now() - startTime
      analytics?.track('duration', {
        page: pageName,
        duration_ms: duration,
        duration_seconds: Math.floor(duration / 1000)
      })
    }, reportInterval)

    // 页面卸载时上报总停留时间
    const handleBeforeUnload = () => {
      const duration = Date.now() - startTime
      analytics?.track('page_duration', {
        page: pageName,
        duration_ms: duration,
        duration_seconds: Math.floor(duration / 1000)
      })
    }

    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      clearInterval(interval)
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [pageName, reportInterval])
}
