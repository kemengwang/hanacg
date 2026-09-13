import React, { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { message, Modal, Input, Button, Spin } from 'antd'
import axios from 'axios'
import { marked } from 'marked'
import * as echarts from 'echarts'
import { formatPrice, formatChange, formatPercent, getPriceClass } from '@/utils/price'
import '@/assets/css/gold.scss'
import emailjs from '@emailjs/browser'
// @ts-ignore
import { emailConfig } from '../../email.config'

interface PriceData {
  international?: {
    price: number;
    change: number;
    changePercent: number;
    previousClose?: number;
    silverPrice?: number;
    source?: string;
  };
  domestic?: {
    price: number;
    change: number;
    changePercent: number;
    open?: number;
    high?: number;
    low?: number;
    volume?: number;
    source?: string;
  };
}

interface KlineData {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

const Gold: React.FC = () => {
  const { t } = useTranslation()
  const [priceData, setPriceData] = useState<PriceData>({})
  // @ts-ignore
  const [klineData, setKlineData] = useState<KlineData[]>([])
  // @ts-ignore
  const [currentPeriod, setCurrentPeriod] = useState<number>(30)
  const [currentTime, setCurrentTime] = useState<string>('')
  const klineChartRef = useRef<HTMLDivElement>(null)
  const chartInstanceRef = useRef<echarts.ECharts | null>(null)
  const priceUpdateIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const timeUpdateIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const [subscribeModalVisible, setSubscribeModalVisible] = useState(false)
  const [emailInput, setEmailInput] = useState('')
  const [subscribing, setSubscribing] = useState(false)
  const [loading, setLoading] = useState(true)
  const isFirstLoadRef = useRef(true)

  const API_BASE = import.meta.env.VITE_GOLD_API_BASE_URL || ''

  const updateTime = (): void => {
    const now = new Date()
    setCurrentTime(now.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }))
  }

  // 刷新所有数据
  const refreshAllData = (): void => {
    fetchPriceData()
    fetchKlineData(currentPeriod)
  }

  // 获取价格数据
  const fetchPriceData = async (): Promise<void> => {
    try {
      const response = await axios.get(`${API_BASE}/api/price/all`)
      setPriceData({
        international: response.data.international,
        domestic: response.data.domestic,
      })
    } catch (error) {
      console.error('获取价格数据失败:', error)
      message.error(t('gold.fetchPriceFailed'))
    } finally {
      // 只在第一次加载时关闭 loading
      if (isFirstLoadRef.current) {
        setLoading(false)
        isFirstLoadRef.current = false
      }
    }
  }

  // 获取K线数据
  const fetchKlineData = async (days: number = 30): Promise<void> => {
    try {
      const response = await axios.get(`${API_BASE}/api/chart/kline?days=${days}`)
      setKlineData(response.data.rawData)
      if (chartInstanceRef.current && response.data.chartOption) {
        chartInstanceRef.current.setOption(response.data.chartOption)
      }
    } catch (error) {
      console.error('获取K线数据失败:', error)
      message.error(t('gold.fetchChartFailed'))
    }
  }

  // 订阅金价
  const handleSubscribe = async (): Promise<void> => {
    // 邮箱格式验证
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailInput || !emailRegex.test(emailInput)) {
      message.error(t('gold.invalidEmail'))
      return
    }

    // 检查 EmailJS 配置
    if (emailConfig.PUBLIC_KEY === 'YOUR_PUBLIC_KEY_HERE' ||
        emailConfig.SERVICE_ID === 'YOUR_SERVICE_ID_HERE' ||
        emailConfig.TEMPLATE_ID === 'YOUR_TEMPLATE_ID_HERE') {
      message.error(t('gold.emailNotConfigured'))
      return
    }

    setSubscribing(true)
    try {
      // 初始化 EmailJS
      emailjs.init(emailConfig.PUBLIC_KEY)

      // 邮件参数
      const templateParams = {
        email: emailInput,
        to_email: emailInput,
        domestic_price: formatPrice(priceData.domestic?.price, 'CNY'),
        international_price: formatPrice(priceData.international?.price, 'USD'),
        current_time: currentTime,
        from_name: emailConfig.fromName,
      }

      // 发送邮件
      await emailjs.send(
        emailConfig.SERVICE_ID,
        emailConfig.TEMPLATE_ID,
        templateParams
      )

      message.success(t('gold.subscribeSuccess'))
      setSubscribeModalVisible(false)
      setEmailInput('')
    } catch (error) {
      console.error('订阅失败:', error)
      message.error(t('gold.subscribeFailed'))
    } finally {
      setSubscribing(false)
    }
  }

  const initChart = (): void => {
    // 初始化K线图
    if (klineChartRef.current) {
      chartInstanceRef.current = echarts.init(klineChartRef.current, 'dark')
    }
    window.addEventListener('resize', () => {
      chartInstanceRef.current?.resize()
    })
  }

  useEffect(() => {
    // 配置marked选项
    marked.setOptions({
      breaks: true,
      gfm: true,
    })

    // 初始化时间
    updateTime()
    timeUpdateIntervalRef.current = setInterval(updateTime, 1000)
    
    // 初始化图表
    initChart()
    
    // 获取初始数据
    fetchPriceData()
    fetchKlineData(currentPeriod)

    // 定时更新价格，每3秒更新一次
    priceUpdateIntervalRef.current = setInterval(fetchPriceData, 3000)

    // 清理函数
    return () => {
      if (priceUpdateIntervalRef.current) {
        clearInterval(priceUpdateIntervalRef.current)
      }
      if (timeUpdateIntervalRef.current) {
        clearInterval(timeUpdateIntervalRef.current)
      }
      
      // 销毁图表实例
      if (chartInstanceRef.current) {
        chartInstanceRef.current.dispose()
      }
      
      window.removeEventListener('resize', () => {
        chartInstanceRef.current?.resize()
      })
    }
  }, [currentPeriod])

  return (
    <div className="terminal-container">
      {/* Loading */}
      {loading && (
        <div className="loading-overlay">
          <Spin size="large" />
          <div className="loading-text">{t('gold.loading')}</div>
        </div>
      )}

      {/* 顶部导航栏 */}
      <header className="top-header">
        <div className="header-left">
          <div className="market-status">
            <span className="status-dot"></span>
            <span className='current-time'>{t('gold.realtimeQuote')}</span>
          </div>
        </div>
        <div className="header-center">
          <span className="current-time">{currentTime}</span>
        </div>
        <div className="header-right">
          <button className="refresh-btn" onClick={refreshAllData} title={t('gold.refresh')}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M1 4v6h6M23 20v-6h-6"/>
              <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"/>
            </svg>
          </button>
        </div>
      </header>

      {/* 主内容区域 */}
      <main className="main-content-new">
        {/* 价格 */}
        <section className="price-cards-row">
          {/* 国内黄金 */}
          <div className="price-card-new domestic">
            <div className="card-icon cn">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <rect x="3" y="3" width="18" height="18" rx="2" fill="none" stroke="currentColor" strokeWidth="2"/>
                <path d="M12 8v8M8 12h8" stroke="currentColor" strokeWidth="2"/>
              </svg>
            </div>
            <div className="card-info">
              <div className="card-label">{t('gold.domesticGold')}<span className="badge cn">CNY</span></div>
              <div className={`card-price ${getPriceClass(priceData.domestic?.changePercent)}`}>
                {formatPrice(priceData.domestic?.price, 'CNY')}
              </div>
              <div className={`card-change ${getPriceClass(priceData.domestic?.changePercent)}`}>
                {formatChange(priceData.domestic?.change)} ({formatPercent(priceData.domestic?.changePercent)})
              </div>
            </div>
            <div className="card-extra">
              <div className="extra-item">
                <span>{t('gold.open')}</span>
                <span>{priceData.domestic?.open?.toFixed(2) || '--'}</span>
              </div>
              <div className="extra-item">
                <span>{t('gold.high')}</span>
                <span className="up">{priceData.domestic?.high?.toFixed(2) || '--'}</span>
              </div>
              <div className="extra-item">
                <span>{t('gold.low')}</span>
                <span className="down">{priceData.domestic?.low?.toFixed(2) || '--'}</span>
              </div>
              <div className="extra-item">
                <span>{t('gold.volume')}</span>
                <span>{priceData.domestic?.volume || '--'}</span>
              </div>
            </div>
          </div>

          {/* 国际金价 */}
          <div className="price-card-new">
            <div className="card-icon intl">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="2"/>
                <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" fill="none" stroke="currentColor" strokeWidth="2"/>
              </svg>
            </div>
            <div className="card-info">
              <div className="card-label">{t('gold.internationalGold')}<span className="badge">SPOT</span></div>
              <div className={`card-price ${getPriceClass(priceData.international?.changePercent)}`}>
                {formatPrice(priceData.international?.price, 'USD')}
              </div>
              <div className={`card-change ${getPriceClass(priceData.international?.changePercent)}`}>
                {formatChange(priceData.international?.change)} ({formatPercent(priceData.international?.changePercent)})
              </div>
            </div>
            <div className="card-extra">
              <div className="extra-item">
                <span>{t('gold.prevClose')}</span>
                <span>{priceData.international?.previousClose?.toFixed(2) || '--'}</span>
              </div>
              <div className="extra-item">
                <span>{t('gold.silver')}</span>
                <span>{priceData.international?.silverPrice?.toFixed(2) || '--'}</span>
              </div>
            </div>
          </div>
        </section>

        {/* K线图区域 */}
        <section className="chart-section desktop-only">
          <div className="chart-header">
            <h3>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z"/>
              </svg>
              {t('gold.priceTrend')}
              <button
                className="subscribe-icon-btn"
                onClick={() => setSubscribeModalVisible(true)}
                title={t('gold.subscribeTooltip')}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M12 5v14M5 12h14"/>
                </svg>
              </button>
            </h3>
            <span className="chart-source">{t('gold.tradingviewWarning')}</span>
          </div>
          <div className="chart-container tradingview-container">
            <iframe
              src="https://s.tradingview.com/widgetembed/?frameElementId=tradingview_gold&symbol=OANDA%3AXAUUSD&interval=D&hidesidetoolbar=1&symboledit=0&saveimage=0&toolbarbg=1a1a24&studies=[]&theme=dark&style=1&timezone=Asia%2FShanghai&withdateranges=1&showpopupbutton=0&studies_overrides=%7B%7D&overrides=%7B%7D&enabled_features=[]&disabled_features=[]&locale=zh_CN"
              className="chart-iframe"
              frameBorder="0"
              scrolling="no"
              allowFullScreen
              title="TradingView Chart"
            ></iframe>
          </div>
        </section>
      </main>

      {/* 全屏水印 */}
      <div className="watermark-container">
        <div className="watermark-content">
          {Array.from({ length: 20 }).map((_, index) => (
            <div className="watermark-item" key={index}>
              <span>ChattyPlay</span>
              <span>P1Kaj1uu</span>
              <span>不见水星记</span>
            </div>
          ))}
        </div>
      </div>

      {/* 订阅弹窗 */}
      <Modal
        title={<div style={{ fontSize: '18px', fontWeight: 600 }}>{t('gold.subscribeTitle')}</div>}
        open={subscribeModalVisible}
        onCancel={() => {
          setSubscribeModalVisible(false)
          setEmailInput('')
        }}
        footer={[
          <Button key="cancel" onClick={() => {
            setSubscribeModalVisible(false)
            setEmailInput('')
          }}>
            {t('common.cancel')}
          </Button>,
          <Button
            key="submit"
            type="primary"
            loading={subscribing}
            onClick={handleSubscribe}
            style={{ backgroundColor: '#d4af37', borderColor: '#d4af37' }}
          >
            {t('gold.subscribe')}
          </Button>,
        ]}
      >
        <div style={{ padding: '20px 0' }}>
          <p style={{ marginBottom: '16px', color: '#666' }}>
            {t('gold.subscribeDescription')}
          </p>
          <Input
            placeholder={t('gold.emailPlaceholder')}
            value={emailInput}
            onChange={(e) => setEmailInput(e.target.value)}
            onPressEnter={handleSubscribe}
            size="large"
            type="email"
          />
        </div>
      </Modal>
    </div>
  )
}

export default Gold
