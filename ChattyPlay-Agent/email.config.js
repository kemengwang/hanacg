/**
 * EmailJS 配置文件
 *
 * 使用说明：
 * 1. 访问 https://www.emailjs.com/ 注册账号
 * 2. 添加邮件服务（Email Service），支持：
 *    - Gmail
 *    - Outlook
 *    - Yahoo Mail
 *    - 或任何支持 SMTP 的邮件服务
 * 3. 创建邮件模板（Email Template）
 * 4. 获取以下配置信息并填入：
 *    - SERVICE_ID: 服务 ID
 *    - TEMPLATE_ID: 模板 ID
 *    - PUBLIC_KEY: 公钥
 *
 * 邮件模板示例：
 * 主题：ChattyPlay - 实时金价
 * 内容：
 * {{email}} 您好，
 * {{to_email}} 您好，
 *
 * 黄金价格实时通知：
 *
 * 国内金价：{{domestic_price}}
 * 国际金价：{{international_price}}
 * 当前时间：{{current_time}}
 *
 * --
 * ChattyPlay - 黄金价格实时监控
 */

export const emailConfig = {
  // EmailJS 公钥（必填）
  PUBLIC_KEY: import.meta.env.VITE_EMAILJS_PUBLIC_KEY || 'YOUR_PUBLIC_KEY_HERE',

  // EmailJS 服务 ID（必填）
  SERVICE_ID: import.meta.env.VITE_EMAILJS_SERVICE_ID || 'YOUR_SERVICE_ID_HERE',

  // EmailJS 模板 ID（必填）
  TEMPLATE_ID: import.meta.env.VITE_EMAILJS_TEMPLATE_ID || 'YOUR_TEMPLATE_ID_HERE',

  // 发件人信息（可选）
  fromName: import.meta.env.VITE_EMAILJS_FROM_NAME || 'ChattyPlay',
  fromEmail: import.meta.env.VITE_EMAILJS_FROM_EMAIL || '891523233@qq.com',
}

export default emailConfig
