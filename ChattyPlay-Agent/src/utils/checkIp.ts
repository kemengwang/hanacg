/**
 * 检测 IP 归属地并返回语言代码
 * @returns Promise<string> 返回 'zh' (中文) 或 'en' (英文)
 */
export const detectLanguageFromIP = async (): Promise<string> => {
  try {
    // 使用免费的 IP 地理位置查询 API
    const response = await fetch('https://ipapi.co/json/')
    const data = await response.json()

    // 如果是中国大陆，返回 'zh'，否则返回 'en'
    if (data.country_code === 'CN' || data.country === 'China') {
      return 'zh'
    }
    return 'en'
  } catch (error) {
    console.error('IP detection failed, using browser language:', error)
    // 如果 IP 检测失败，回退到浏览器语言检测
    const browserLang = navigator.language || navigator.languages?.[0] || 'zh'
    // 浏览器语言以 zh 开头（如 zh-CN, zh-TW）则使用中文，否则使用英文
    return browserLang.startsWith('zh') ? 'zh' : 'en'
  }
}
