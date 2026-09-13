/**
 * 埋点SDK使用示例
 */

import React, { useRef, useState } from 'react'
import { useAnalytics, usePageTracking, useClickTracking, useVisibilityTracking, useScrollTracking, useDurationTracking } from './hooks'

/**
 * 示例1: 基本使用
 */
export function BasicExample() {
  const { track, trackClick, trackSubmit, trackError } = useAnalytics()

  const handleButtonClick = () => {
    trackClick('example_button', {
      page: 'example',
      section: 'basic'
    })
    console.log('Button clicked - event tracked')
  }

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    trackSubmit('example_form', {
      field_count: 2
    })
    console.log('Form submitted - event tracked')
  }

  const handleCustomEvent = () => {
    track('custom_event', {
      custom_param: 'value',
      timestamp: Date.now()
    })
    console.log('Custom event tracked')
  }

  const handleError = () => {
    try {
      throw new Error('Example error')
    } catch (error) {
      // @ts-ignore
      trackError(error, {
        component: 'BasicExample',
        action: 'error_demo'
      })
      console.log('Error tracked')
    }
  }

  return (
    <div style={{ padding: '20px' }}>
      <h2>基本使用示例</h2>

      <div style={{ marginBottom: '10px' }}>
        <button onClick={handleButtonClick}>
          点击追踪按钮
        </button>
      </div>

      <form onSubmit={handleFormSubmit} style={{ marginBottom: '10px' }}>
        <input type="text" placeholder="输入内容" required />
        <button type="submit">提交表单</button>
      </form>

      <div style={{ marginBottom: '10px' }}>
        <button onClick={handleCustomEvent}>
          自定义事件
        </button>
      </div>

      <div>
        <button onClick={handleError}>
          错误追踪
        </button>
      </div>
    </div>
  )
}

/**
 * 示例2: 页面追踪
 */
export function PageTrackingExample() {
  // 自动追踪页面浏览
  usePageTracking(true)

  // 追踪页面停留时间
  useDurationTracking('page_tracking_example', 10000) // 每10秒上报一次

  return (
    <div style={{ padding: '20px' }}>
      <h2>页面追踪示例</h2>
      <p>此页面会自动追踪页面浏览和停留时间</p>
    </div>
  )
}

/**
 * 示例3: 元素点击追踪
 */
export function ClickTrackingExample() {
  const buttonRef = useRef<HTMLButtonElement>(null)
  const linkRef = useRef<HTMLAnchorElement>(null)

  // 追踪按钮点击
  useClickTracking(buttonRef, 'tracked_button', {
    component: 'ClickTrackingExample'
  })

  // 追踪链接点击
  useClickTracking(linkRef, 'tracked_link', {
    type: 'external_link'
  })

  return (
    <div style={{ padding: '20px' }}>
      <h2>元素点击追踪</h2>

      <button ref={buttonRef} style={{ marginRight: '10px' }}>
        自动追踪点击的按钮
      </button>

      <a ref={linkRef} href="#" onClick={(e) => e.preventDefault()}>
        自动追踪点击的链接
      </a>

      <p style={{ marginTop: '10px', color: '#666' }}>
        打开控制台查看追踪的事件
      </p>
    </div>
  )
}

/**
 * 示例4: 可见性追踪
 */
export function VisibilityTrackingExample() {
  const sectionRef = useRef<HTMLDivElement>(null)

  // 追踪元素可见性
  useVisibilityTracking(sectionRef, 'section_visible', {
    section_name: 'example_section'
  })

  return (
    <div style={{ padding: '20px' }}>
      <h2>可见性追踪</h2>

      <div style={{ height: '100vh', background: '#f0f0f0', marginBottom: '20px' }}>
        向下滚动查看追踪区域
      </div>

      <div
        ref={sectionRef}
        style={{
          padding: '40px',
          background: '#e6f7ff',
          border: '2px solid #1890ff',
          borderRadius: '8px'
        }}
      >
        <h3>追踪区域</h3>
        <p>当这个区域50%可见时，会触发追踪事件</p>
      </div>

      <div style={{ height: '100vh', marginTop: '20px', background: '#f0f0f0' }}>
        继续滚动测试
      </div>
    </div>
  )
}

/**
 * 示例5: 滚动深度追踪
 */
export function ScrollTrackingExample() {
  // 追踪滚动深度，每25%上报一次
  useScrollTracking(25, 'article_scroll')

  return (
    <div style={{ padding: '20px' }}>
      <h2>滚动深度追踪</h2>
      <p>向下滚动，每25%会触发一次追踪事件</p>

      <div style={{ marginTop: '20px' }}>
        {[...Array(20)].map((_, i) => (
          <p key={i} style={{ marginBottom: '10px', lineHeight: '1.6' }}>
            这是第 {i + 1} 段内容，用于测试滚动深度追踪。滚动页面时，SDK会自动追踪用户的滚动行为。
          </p>
        ))}
      </div>
    </div>
  )
}

/**
 * 示例6: 综合应用
 */
export function ComprehensiveExample() {
  const { track, trackClick, trackAction } = useAnalytics()
  const [inputValue, setInputValue] = useState('')
  const [clickCount, setClickCount] = useState(0)
  const heroRef = useRef<HTMLDivElement>(null)

  // 页面追踪
  usePageTracking(true)

  // Hero区域可见性追踪
  useVisibilityTracking(heroRef, 'hero_visible')

  // 滚动深度追踪
  useScrollTracking(20, 'landing_page_scroll')

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setInputValue(value)

    // 追踪输入行为
    trackAction('input', 'search_box', {
      value_length: value.length,
      has_content: value.length > 0
    })
  }

  const handleSearch = () => {
    trackClick('search_button', {
      search_term: inputValue,
      term_length: inputValue.length
    })
    console.log('搜索:', inputValue)
  }

  const handleIncrement = () => {
    const newCount = clickCount + 1
    setClickCount(newCount)

    track('counter_increment', {
      new_value: newCount,
      page: 'comprehensive_example'
    })
  }

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      {/* Hero区域 */}
      <div
        ref={heroRef}
        style={{
          padding: '60px 20px',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          borderRadius: '8px',
          marginBottom: '30px',
          textAlign: 'center'
        }}
      >
        <h1 style={{ margin: '0 0 10px 0' }}>埋点SDK综合示例</h1>
        <p style={{ margin: 0 }}>展示各种追踪功能的完整应用</p>
      </div>

      {/* 搜索区域 */}
      <div style={{ marginBottom: '30px' }}>
        <h3>搜索追踪</h3>
        <div style={{ display: 'flex', gap: '10px' }}>
          <input
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            placeholder="输入搜索内容..."
            style={{
              padding: '8px 12px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              flex: 1
            }}
          />
          <button
            onClick={handleSearch}
            style={{
              padding: '8px 16px',
              background: '#667eea',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            搜索
          </button>
        </div>
        <p style={{ color: '#666', fontSize: '14px', marginTop: '5px' }}>
          输入时会追踪输入行为
        </p>
      </div>

      {/* 计数器区域 */}
      <div style={{ marginBottom: '30px' }}>
        <h3>交互追踪</h3>
        <div style={{ textAlign: 'center', padding: '20px', background: '#f8f9fa', borderRadius: '8px' }}>
          <div style={{ fontSize: '48px', fontWeight: 'bold', color: '#667eea', marginBottom: '10px' }}>
            {clickCount}
          </div>
          <button
            onClick={handleIncrement}
            style={{
              padding: '10px 20px',
              background: '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '16px'
            }}
          >
            点击增加 (追踪每次点击)
          </button>
        </div>
      </div>

      {/* 内容区域 */}
      <div style={{ marginBottom: '30px' }}>
        <h3>内容区域</h3>
        {[...Array(10)].map((_, i) => (
          <div
            key={i}
            style={{
              padding: '15px',
              background: i % 2 === 0 ? '#f8f9fa' : 'white',
              borderRadius: '4px',
              marginBottom: '10px'
            }}
          >
            <h4>内容块 {i + 1}</h4>
            <p style={{ margin: '5px 0', color: '#666' }}>
              这是内容块 {i + 1}，用于测试滚动深度追踪。向下滚动查看更多内容。
            </p>
          </div>
        ))}
      </div>

      {/* 控制面板 */}
      <div style={{
        padding: '20px',
        background: '#fff3cd',
        border: '1px solid #ffc107',
        borderRadius: '4px'
      }}>
        <h4>追踪说明</h4>
        <ul style={{ margin: '10px 0', paddingLeft: '20px' }}>
          <li>页面加载时自动追踪页面浏览</li>
          <li>Hero区域可见时触发可见性追踪</li>
          <li>输入时追踪输入行为</li>
          <li>点击搜索按钮追踪点击事件</li>
          <li>每次增加计数器都追踪</li>
          <li>滚动时追踪滚动深度（每20%）</li>
          <li>页面停留时间定时上报</li>
        </ul>
        <p style={{ margin: '10px 0 0 0', fontSize: '14px', color: '#856404' }}>
          打开浏览器控制台查看详细的追踪日志（需要开启debug模式）
        </p>
      </div>
    </div>
  )
}

/**
 * 在App.tsx中集成示例
 */
export function AnalyticsIntegrationExample() {
  return (
    <div>
      <h1>埋点SDK集成示例</h1>

      {/* 选择要查看的示例 */}
      <div style={{ marginBottom: '20px' }}>
        <h3>选择示例:</h3>
        <nav style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <a href="#basic" style={{ color: '#667eea' }}>基本使用</a>
          <a href="#page" style={{ color: '#667eea' }}>页面追踪</a>
          <a href="#click" style={{ color: '#667eea' }}>点击追踪</a>
          <a href="#visibility" style={{ color: '#667eea' }}>可见性追踪</a>
          <a href="#scroll" style={{ color: '#667eea' }}>滚动追踪</a>
          <a href="#comprehensive" style={{ color: '#667eea' }}>综合示例</a>
        </nav>
      </div>

      <section id="basic">
        <BasicExample />
      </section>

      <hr style={{ margin: '40px 0' }} />

      <section id="page">
        <PageTrackingExample />
      </section>

      <hr style={{ margin: '40px 0' }} />

      <section id="click">
        <ClickTrackingExample />
      </section>

      <hr style={{ margin: '40px 0' }} />

      <section id="visibility">
        <VisibilityTrackingExample />
      </section>

      <hr style={{ margin: '40px 0' }} />

      <section id="scroll">
        <ScrollTrackingExample />
      </section>

      <hr style={{ margin: '40px 0' }} />

      <section id="comprehensive">
        <ComprehensiveExample />
      </section>
    </div>
  )
}
