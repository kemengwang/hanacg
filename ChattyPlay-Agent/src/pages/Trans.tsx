import React, { useState } from 'react'
import { Input, Button, Select, Card, Row, Col, message, Typography } from 'antd'
import {
  SwapOutlined,
  CopyOutlined,
  DownloadOutlined,
  SoundOutlined
} from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import styled from 'styled-components'
import MD5 from 'crypto-js/md5'

const { TextArea } = Input
const { Option } = Select
const { Title, Paragraph } = Typography

const PageContainer = styled.div`
  max-width: 900px;
  margin: 0 auto;
  padding: 40px 20px;
  min-height: calc(100vh - 200px);
`

const TranslatorCard = styled(Card)`
  border-radius: 16px;
  border: none;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  padding: 40px;

  @media (max-width: 768px) {
    padding: 24px;
  }
`

const LanguageSelector = styled.div`
  display: flex;
  gap: 12px;
  align-items: center;
  justify-content: center;
  margin: 24px 0;
`

const TextAreaWrapper = styled.div`
  .ant-input {
    border-radius: 12px;
    min-height: 200px;
    font-size: 1rem;
    line-height: 1.6;
  }
`

const ActionButtons = styled.div`
  display: flex;
  gap: 12px;
  justify-content: center;
  margin-top: 24px;

  .ant-btn {
    border-radius: 12px;
    padding: 10px 24px;
    font-size: 1rem;
  }
`

// 百度翻译API配置（从环境变量读取）
const BAIDU_APP_ID = import.meta.env.VITE_BAIDU_APP_ID || ''
const BAIDU_SECRET_KEY = import.meta.env.VITE_BAIDU_SECRET_KEY || ''

const Trans: React.FC = () => {
  const { t } = useTranslation()
  const [sourceText, setSourceText] = useState('')
  const [translatedText, setTranslatedText] = useState('')
  const [sourceLang, setSourceLang] = useState('zh')
  const [targetLang, setTargetLang] = useState('en')
  const [loading, setLoading] = useState(false)

  // 生成百度翻译API签名
  const generateSign = (query: string, salt: string): string => {
    const str = BAIDU_APP_ID + query + salt + BAIDU_SECRET_KEY
    return MD5(str).toString()
  }

  const languageOptions = [
    { value: 'zh', label: t('trans.languages.zh') },
    { value: 'en', label: t('trans.languages.en') },
    { value: 'jp', label: t('trans.languages.jp') },
    { value: 'kor', label: t('trans.languages.kor') },
    { value: 'fra', label: t('trans.languages.fra') },
    { value: 'de', label: t('trans.languages.de') },
    { value: 'spa', label: t('trans.languages.spa') },
    { value: 'ru', label: t('trans.languages.ru') }
  ]

  const handleTranslate = async () => {
    if (!sourceText.trim()) {
      message.warning(t('trans.noTextToTranslate'))
      return
    }

    setLoading(true)
    try {
      // 生成随机数
      const salt = Date.now().toString()
      // 生成签名
      const sign = generateSign(sourceText, salt)

      // 调用百度翻译API
      const response = await fetch(
        (`/api/translate?q=${encodeURIComponent(sourceText)}&from=${sourceLang}&to=${targetLang}&appid=${BAIDU_APP_ID}&salt=${salt}&sign=${sign}`)
      )

      const data = await response.json()

      if (data.error_code) {
        message.error(`${t('trans.translateFailed')}: ${data.error_msg}`)
        setLoading(false)
        return
      }

      // 解析翻译结果
      if (data.trans_result && data.trans_result.length > 0) {
        const result = data.trans_result.map((item: any) => item.dst).join('\n')
        setTranslatedText(result)
        message.success(t('trans.translateSuccess'))
      } else {
        message.error(t('trans.translateEmpty'))
      }
    } catch (error) {
      console.error('翻译错误:', error)
      message.error(t('trans.networkError'))
    } finally {
      setLoading(false)
    }
  }

  const handleSwapLanguages = () => {
    setSourceText(translatedText)
    setTranslatedText(sourceText)
    const temp = sourceLang
    setSourceLang(targetLang)
    setTargetLang(temp)
  }

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text)
      .then(() => message.success(t('common.copySuccess')))
      .catch(() => message.error(t('common.copyFailed')))
  }

  const handleDownload = () => {
    if (!translatedText) {
      message.warning(t('trans.noContentToDownload'))
      return
    }

    const blob = new Blob([translatedText], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `translation_${Date.now()}.txt`
    a.click()
    URL.revokeObjectURL(url)
    message.success(t('common.downloadSuccess'))
  }

  const handleSpeak = (text: string, lang: string) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.lang = lang
      window.speechSynthesis.speak(utterance)
    } else {
      message.warning(t('trans.browserNotSupportSpeech'))
    }
  }

  return (
    <PageContainer>
      <TranslatorCard>
        <Title level={2} style={{ textAlign: 'center', marginBottom: '32px' }}>
          {t('trans.title')}
        </Title>
        <Paragraph style={{
          textAlign: 'center',
          color: '#64748b',
          marginBottom: '32px'
        }}>
          {t('trans.description')}
        </Paragraph>

        <Row gutter={[24, 24]}>
          <Col xs={24}>
            <div style={{ marginBottom: '16px' }}>
              <LanguageSelector>
                <Select
                  value={sourceLang}
                  onChange={setSourceLang}
                  style={{ width: '120px' }}
                >
                  {languageOptions.map(option => (
                    <Option key={option.value} value={option.value}>
                      {option.label}
                    </Option>
                  ))}
                </Select>
                <Button
                  icon={<SwapOutlined />}
                  onClick={handleSwapLanguages}
                  type="text"
                />
                <Select
                  value={targetLang}
                  onChange={setTargetLang}
                  style={{ width: '120px' }}
                >
                  {languageOptions.map(option => (
                    <Option key={option.value} value={option.value}>
                      {option.label}
                    </Option>
                  ))}
                </Select>
              </LanguageSelector>
            </div>

            <Row gutter={[24, 0]} align="top">
              <Col xs={24} md={12}>
                <TextAreaWrapper>
                  <TextArea
                    value={sourceText}
                    onChange={(e) => setSourceText(e.target.value)}
                    placeholder={t('trans.sourceTextPlaceholder')}
                    autoSize={{ minRows: 6, maxRows: 12 }}
                    style={{ background: '#f8fafc' }}
                  />
                </TextAreaWrapper>
                <div style={{
                  display: 'flex',
                  gap: '8px',
                  marginTop: '12px',
                  justifyContent: 'flex-end'
                }}>
                  <Button
                    icon={<SoundOutlined />}
                    onClick={() => handleSpeak(sourceText, sourceLang)}
                    type="text"
                  >
                    {t('trans.speakBtn')}
                  </Button>
                  <Button
                    icon={<CopyOutlined />}
                    onClick={() => handleCopy(sourceText)}
                    type="text"
                  >
                    {t('trans.copyBtn')}
                  </Button>
                </div>
              </Col>

              <Col xs={24} md={12}>
                <TextAreaWrapper>
                  <TextArea
                    value={translatedText}
                    onChange={(e) => setTranslatedText(e.target.value)}
                    placeholder={t('trans.translatedTextPlaceholder')}
                    autoSize={{ minRows: 6, maxRows: 12 }}
                    style={{ background: '#f8fafc' }}
                    disabled
                  />
                </TextAreaWrapper>
                <div style={{
                  display: 'flex',
                  gap: '8px',
                  marginTop: '12px',
                  justifyContent: 'flex-end'
                }}>
                  <Button
                    icon={<SoundOutlined />}
                    onClick={() => handleSpeak(translatedText, targetLang)}
                    type="text"
                  >
                    {t('trans.speakBtn')}
                  </Button>
                  <Button
                    icon={<CopyOutlined />}
                    onClick={() => handleCopy(translatedText)}
                    type="text"
                  >
                    {t('trans.copyBtn')}
                  </Button>
                </div>
              </Col>
            </Row>

            <ActionButtons>
              <Button
                type="primary"
                size="large"
                onClick={handleTranslate}
                loading={loading}
                style={{
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  border: 'none',
                  padding: '12px 48px',
                  fontSize: '1.1rem'
                }}
              >
                {t('trans.translateBtn')}
              </Button>
              {translatedText && (
                <Button
                  icon={<DownloadOutlined />}
                  size="large"
                  onClick={handleDownload}
                >
                  {t('trans.downloadBtn')}
                </Button>
              )}
            </ActionButtons>
          </Col>
        </Row>
      </TranslatorCard>
    </PageContainer>
  )
}

export default Trans
