import React, { useState } from 'react'
import { Input, Button, Select, Card, Row, Col, message, Typography, Slider, Collapse } from 'antd'
import {
  PictureOutlined,
  DownloadOutlined,
  ClearOutlined,
  SettingOutlined
} from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import styled from 'styled-components'

const { TextArea } = Input
const { Option } = Select
const { Title, Paragraph, Text } = Typography
const { Panel } = Collapse

const PageContainer = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 40px 20px;
  min-height: calc(100vh - 200px);
`

const GeneratorCard = styled(Card)`
  border-radius: 16px;
  border: none;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  padding: 40px;

  @media (max-width: 768px) {
    padding: 24px;
  }
`

const TextAreaWrapper = styled.div`
  .ant-input {
    border-radius: 12px;
    min-height: 100px;
    font-size: 1rem;
    line-height: 1.6;
  }
`

const ImagePreview = styled.div`
  background: #f8fafc;
  border-radius: 12px;
  padding: 20px;
  text-align: center;
  min-height: 400px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;

  img {
    max-width: 100%;
    max-height: 500px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }

  .placeholder {
    color: #94a3b8;
    font-size: 1.1rem;
  }

  .images-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 16px;
    width: 100%;

    img {
      width: 100%;
      height: auto;
    }
  }

  @media (max-width: 576px) {
    .images-grid {
      grid-template-columns: 1fr;
    }
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

const SettingItem = styled.div`
  margin-bottom: 16px;

  .setting-label {
    display: flex;
    justify-content: space-between;
    margin-bottom: 8px;
    font-size: 0.9rem;
    color: #64748b;
  }

  .ant-slider {
    margin: 8px 0;
  }
`

const TextToPhoto: React.FC = () => {
  const { t } = useTranslation()
  const [prompt, setPrompt] = useState('')
  const [negativePrompt, setNegativePrompt] = useState('')
  const [imageSize, setImageSize] = useState('512x512')
  const [samples, setSamples] = useState(1)
  const [steps, setSteps] = useState(31)
  const [guidanceScale, setGuidanceScale] = useState(7.5)
  const [seed, setSeed] = useState<number | null>(null)
  const [safetyChecker, setSafetyChecker] = useState('no')
  const [enhancePrompt, setEnhancePrompt] = useState('no')
  const [multiLingual, setMultiLingual] = useState('no')
  const [selfAttention, setSelfAttention] = useState('no')
  const [upscale, setUpscale] = useState('no')
  const [panorama, setPanorama] = useState('no')
  const [generatedImages, setGeneratedImages] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [imageLoadState, setImageLoadState] = useState<Record<number, boolean>>({})

  const sizeOptions = [
    { value: '256x256', label: '256x256' },
    { value: '512x512', label: '512x512' },
    { value: '768x768', label: '768x768' },
    { value: '1024x1024', label: '1024x1024' }
  ]

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      message.warning(t('textToPhoto.enterPositivePrompt'))
      return
    }

    setLoading(true)
    setGeneratedImages([])
    setImageLoadState({})

    try {
      const [width, height] = imageSize.split('x').map(Number)

      // 使用 Pollinations.ai API - 完全免费，无需 API Key
      const images: string[] = []

      for (let i = 0; i < samples; i++) {
        // 构建请求 URL
        // Pollinations.ai 不支持 negative 参数，我们将负面提示词集成到 prompt 中
        let finalPrompt = prompt
        if (negativePrompt && negativePrompt.trim()) {
          // 使用特殊语法来排除元素
          finalPrompt = `${prompt}, avoiding: ${negativePrompt}`
        }

        const params = new URLSearchParams({
          width: width.toString(),
          height: height.toString(),
          seed: seed === null ? Math.floor(Math.random() * 1000000).toString() : (seed + i).toString(),
          model: 'flux',
          nologo: 'true'
        })

        // 添加随机数避免缓存
        params.append('noCache', Date.now().toString())

        const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(finalPrompt)}?${params.toString()}`
        images.push(imageUrl)
      }

      console.log('生成的图片 URL:', images)

      // 直接设置图片 URL
      setGeneratedImages(images)
      message.success(t('textToPhoto.generateSuccess').replace('X', images.length.toString()))
    } catch (error: any) {
      console.error('生成图片时出错:', error)
      message.error(`${t('textToPhoto.generateFailed')}: ${error.message || t('trans.networkError')}`)
    } finally {
      setLoading(false)
    }
  }

  const handleDownload = (imageUrl: string, index: number) => {
    const link = document.createElement('a')
    link.href = imageUrl
    link.download = `generated_image_${Date.now()}_${index + 1}.png`
    link.target = '_blank'
    link.click()
    message.success(t('textToPhoto.imageDownloadSuccess'))
  }

  const handleDownloadAll = () => {
    if (generatedImages.length === 0) {
      message.warning(t('textToPhoto.noImagesToDownload'))
      return
    }

    generatedImages.forEach((imageUrl, index) => {
      setTimeout(() => {
        handleDownload(imageUrl, index)
      }, index * 500)
    })
    message.success(t('textToPhoto.startDownload').replace('X', generatedImages.length.toString()))
  }

  const handleClear = () => {
    setPrompt('')
    setNegativePrompt('')
    setGeneratedImages([])
    setSamples(1)
    setSteps(31)
    setGuidanceScale(7.5)
    setSeed(null)
  }

  return (
    <PageContainer>
      <GeneratorCard>
        <Title level={2} style={{ textAlign: 'center', marginBottom: '16px' }}>
          {t('textToPhoto.title')}
        </Title>
        <Paragraph style={{
          textAlign: 'center',
          color: '#64748b',
          marginBottom: '32px'
        }}>
          {t('textToPhoto.description')}
        </Paragraph>

        <Row gutter={[24, 24]}>
          <Col xs={24} lg={12}>
            <div style={{ marginBottom: '16px' }}>
              <Text strong>{t('textToPhoto.positivePrompt')}</Text>
              <Text type="secondary" style={{ marginLeft: '8px' }}>{t('textToPhoto.positivePromptDesc')}</Text>
            </div>
            <TextAreaWrapper>
              <TextArea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder={t('textToPhoto.positivePromptPlaceholder')}
                autoSize={{ minRows: 3, maxRows: 6 }}
                style={{ background: '#f8fafc', marginBottom: '16px' }}
              />
            </TextAreaWrapper>

            <div style={{ marginBottom: '16px' }}>
              <Text strong>{t('textToPhoto.negativePrompt')}</Text>
              <Text type="secondary" style={{ marginLeft: '8px' }}>{t('textToPhoto.negativePromptDesc')}</Text>
            </div>
            <TextAreaWrapper>
              <TextArea
                value={negativePrompt}
                onChange={(e) => setNegativePrompt(e.target.value)}
                placeholder={t('textToPhoto.negativePromptPlaceholder')}
                autoSize={{ minRows: 2, maxRows: 4 }}
                style={{ background: '#f8fafc', marginBottom: '16px' }}
              />
            </TextAreaWrapper>

            <Collapse
              ghost
              expandIconPosition="end"
              style={{ marginBottom: '16px' }}
            >
              <Panel header={<span><SettingOutlined /> {t('textToPhoto.advancedSettings')}</span>} key="settings">
                <SettingItem>
                  <div className="setting-label">
                    <span>{t('textToPhoto.imageSize')}</span>
                    <Text>{imageSize}</Text>
                  </div>
                  <Select
                    value={imageSize}
                    onChange={setImageSize}
                    style={{ width: '100%' }}
                  >
                    {sizeOptions.map(option => (
                      <Option key={option.value} value={option.value}>
                        {option.label}
                      </Option>
                    ))}
                  </Select>
                </SettingItem>

                <SettingItem>
                  <div className="setting-label">
                    <span>{t('textToPhoto.samples')}</span>
                    <Text>{samples}</Text>
                  </div>
                  <Slider
                    min={1}
                    max={4}
                    value={samples}
                    onChange={setSamples}
                  />
                </SettingItem>

                <SettingItem>
                  <div className="setting-label">
                    <span>{t('textToPhoto.steps')}</span>
                    <Text>{steps}</Text>
                  </div>
                  <Slider
                    min={21}
                    max={51}
                    step={10}
                    value={steps}
                    onChange={setSteps}
                    marks={{ 21: '21', 31: '31', 41: '41', 51: '51' }}
                  />
                </SettingItem>

                <SettingItem>
                  <div className="setting-label">
                    <span>{t('textToPhoto.guidanceScale')}</span>
                    <Text>{guidanceScale}</Text>
                  </div>
                  <Slider
                    min={1}
                    max={20}
                    step={0.5}
                    value={guidanceScale}
                    onChange={setGuidanceScale}
                  />
                </SettingItem>

                <SettingItem>
                  <div className="setting-label">
                    <span>{t('textToPhoto.seed')}</span>
                    <Text>{seed === null ? t('textToPhoto.random') : seed}</Text>
                  </div>
                  <Slider
                    min={0}
                    max={999999999}
                    step={1}
                    value={seed || 0}
                    onChange={(value) => setSeed(value === 0 ? null : value)}
                  />
                  <Button
                    size="small"
                    onClick={() => setSeed(null)}
                    style={{ marginTop: '4px' }}
                  >
                    {t('textToPhoto.randomSeed')}
                  </Button>
                </SettingItem>

                <div style={{ marginTop: '16px' }}>
                  <Text strong>{t('textToPhoto.functionOptions')}</Text>
                  <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div>
                      <Text style={{ marginRight: '8px' }}>{t('textToPhoto.safetyChecker')}:</Text>
                      <Select
                        value={safetyChecker}
                        onChange={setSafetyChecker}
                        size="small"
                      >
                        <Option value="yes">{t('textToPhoto.yes')}</Option>
                        <Option value="no">{t('textToPhoto.no')}</Option>
                      </Select>
                    </div>
                    <div>
                      <Text style={{ marginRight: '8px' }}>{t('textToPhoto.enhancePrompt')}:</Text>
                      <Select
                        value={enhancePrompt}
                        onChange={setEnhancePrompt}
                        size="small"
                      >
                        <Option value="yes">{t('textToPhoto.yes')}</Option>
                        <Option value="no">{t('textToPhoto.no')}</Option>
                      </Select>
                    </div>
                    <div>
                      <Text style={{ marginRight: '8px' }}>{t('textToPhoto.multiLingual')}:</Text>
                      <Select
                        value={multiLingual}
                        onChange={setMultiLingual}
                        size="small"
                      >
                        <Option value="yes">{t('textToPhoto.yes')}</Option>
                        <Option value="no">{t('textToPhoto.no')}</Option>
                      </Select>
                    </div>
                    <div>
                      <Text style={{ marginRight: '8px' }}>{t('textToPhoto.selfAttention')}:</Text>
                      <Select
                        value={selfAttention}
                        onChange={setSelfAttention}
                        size="small"
                      >
                        <Option value="yes">{t('textToPhoto.yes')}</Option>
                        <Option value="no">{t('textToPhoto.no')}</Option>
                      </Select>
                    </div>
                    <div>
                      <Text style={{ marginRight: '8px' }}>{t('textToPhoto.upscale')}:</Text>
                      <Select
                        value={upscale}
                        onChange={setUpscale}
                        size="small"
                      >
                        <Option value="yes">{t('textToPhoto.yes')}</Option>
                        <Option value="no">{t('textToPhoto.no')}</Option>
                      </Select>
                    </div>
                    <div>
                      <Text style={{ marginRight: '8px' }}>{t('textToPhoto.panorama')}:</Text>
                      <Select
                        value={panorama}
                        onChange={setPanorama}
                        size="small"
                      >
                        <Option value="yes">{t('textToPhoto.yes')}</Option>
                        <Option value="no">{t('textToPhoto.no')}</Option>
                      </Select>
                    </div>
                  </div>
                </div>
              </Panel>
            </Collapse>

            <ActionButtons>
              <Button
                type="primary"
                size="large"
                icon={<PictureOutlined />}
                onClick={handleGenerate}
                loading={loading}
                style={{
                  background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                  border: 'none',
                  padding: '12px 48px',
                  fontSize: '1.1rem'
                }}
              >
                {t('textToPhoto.generateBtn')}
              </Button>
              {generatedImages.length > 0 && (
                <>
                  <Button
                    icon={<ClearOutlined />}
                    size="large"
                    onClick={handleClear}
                  >
                    {t('textToPhoto.clearBtn')}
                  </Button>
                </>
              )}
            </ActionButtons>
          </Col>

          <Col xs={24} lg={12}>
            <ImagePreview>
              {generatedImages.length > 0 ? (
                <div style={{ width: '100%' }}>
                  {generatedImages.length === 1 ? (
                    <img
                      src={generatedImages[0]}
                      alt="Generated"
                      crossOrigin="anonymous"
                      onLoad={() => setImageLoadState({ 0: true })}
                      onError={() => message.warning(t('textToPhoto.imageLoadFailed'))}
                      style={{ opacity: imageLoadState[0] ? 1 : 0.5 }}
                    />
                  ) : (
                    <div className="images-grid">
                      {generatedImages.map((imageUrl, index) => (
                        <div key={index} style={{ position: 'relative' }}>
                          <img
                            src={imageUrl}
                            alt={`Generated ${index + 1}`}
                            crossOrigin="anonymous"
                            onLoad={() => setImageLoadState((prev) => ({ ...prev, [index]: true }))}
                            onError={() => message.warning(t('textToPhoto.imageNLoadFailed').replace('X', (index + 1).toString()))}
                            style={{ opacity: imageLoadState[index] ? 1 : 0.5 }}
                          />
                          <Button
                            type="primary"
                            size="small"
                            icon={<DownloadOutlined />}
                            onClick={() => handleDownload(imageUrl, index)}
                            style={{
                              position: 'absolute',
                              bottom: '8px',
                              right: '8px',
                              opacity: 0.9
                            }}
                          >
                            {t('textToPhoto.downloadBtn')}
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                  {generatedImages.length > 1 && (
                    <Button
                      type="primary"
                      icon={<DownloadOutlined />}
                      onClick={handleDownloadAll}
                      style={{
                        marginTop: '16px',
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        border: 'none'
                      }}
                    >
                      {t('textToPhoto.downloadAllBtn')}
                    </Button>
                  )}
                </div>
              ) : (
                <div className="placeholder">
                  <PictureOutlined style={{ fontSize: '3rem', marginBottom: '16px', display: 'block' }} />
                  {loading ? t('textToPhoto.generatingImage') : t('textToPhoto.imageDisplayPlaceholder')}
                </div>
              )}
            </ImagePreview>
          </Col>
        </Row>
      </GeneratorCard>
    </PageContainer>
  )
}

export default TextToPhoto
