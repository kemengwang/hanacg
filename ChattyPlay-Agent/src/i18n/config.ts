import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import zh from './locales/zh'
import en from './locales/en'
import { detectLanguageFromIP } from '../utils/checkIp'

// 从 localStorage 获取保存的语言设置
const savedLanguage = localStorage.getItem('language')

// 如果有保存的语言设置，直接使用；否则使用默认 'zh'，稍后通过 IP 检测更新
const initialLanguage = savedLanguage || 'zh'

// 初始化 i18n
i18n
  .use(LanguageDetector) // 自动检测用户语言
  .use(initReactI18next) // 绑定 react-i18next
  .init({
    resources: {
      zh: {
        translation: zh.translation
      },
      en: {
        translation: en.translation
      }
    },
    lng: initialLanguage, // 初始语言
    fallbackLng: 'zh', // 回退语言
    interpolation: {
      escapeValue: false // React 已经防止 XSS
    },
    detection: {
      // 优先使用 localStorage，其次使用我们自定义的 IP 检测
      order: ['localStorage'],
      caches: ['localStorage']
    }
  })

// 如果没有保存的语言设置，异步检测 IP 归属地并更新语言
if (!savedLanguage) {
  detectLanguageFromIP().then((detectedLanguage) => {
    // 只在检测到的语言与当前不同时才更新
    if (detectedLanguage !== i18n.language) {
      i18n.changeLanguage(detectedLanguage)
      localStorage.setItem('language', detectedLanguage)
      console.log('Language detected from IP location:', detectedLanguage)
    }
  })
}

export default i18n
