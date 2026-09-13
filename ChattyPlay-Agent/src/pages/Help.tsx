import React from 'react'
import { Card, Row, Col, Typography } from 'antd'
import {
  MessageOutlined,
  VideoCameraOutlined,
  SoundOutlined,
  TranslationOutlined,
  PictureOutlined,
  QuestionCircleOutlined
} from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import styled from 'styled-components'

const { Title, Paragraph } = Typography

const PageContainer = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 40px 20px;
  min-height: calc(100vh - 200px);
`

const SectionTitle = styled.h2`
  margin-bottom: 40px;
  text-align: center;
  font-size: 2rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
`

const HelpCard = styled(Card)`
  border-radius: 12px;
  border: none;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  transition: all 0.3s ease;
  height: 100%;

  &:hover {
    transform: translateY(-5px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
  }

  .ant-card-head {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: #fff;
    border-radius: 12px 12px 0 0;
  }
`

const HelpIcon = styled.div`
  font-size: 2.5rem;
  color: #667eea;
  margin-bottom: 16px;
`

const Help: React.FC = () => {
  const { t } = useTranslation()
  const helpSections = [
    {
      title: t('help.chatgpt.title'),
      description: t('help.chatgpt.description'),
      icon: <MessageOutlined />,
      steps: [
        t('help.chatgpt.step1'),
        t('help.chatgpt.step2'),
        t('help.chatgpt.step3'),
        t('help.chatgpt.step4')
      ]
    },
    {
      title: t('help.video.title'),
      description: t('help.video.description'),
      icon: <VideoCameraOutlined />,
      steps: [
        t('help.video.step1'),
        t('help.video.step2'),
        t('help.video.step3'),
        t('help.video.step4')
      ]
    },
    {
      title: t('help.music.title'),
      description: t('help.music.description'),
      icon: <SoundOutlined />,
      steps: [
        t('help.music.step1'),
        t('help.music.step2'),
        t('help.music.step3'),
        t('help.music.step4')
      ]
    },
    {
      title: t('help.trans.title'),
      description: t('help.trans.description'),
      icon: <TranslationOutlined />,
      steps: [
        t('help.trans.step1'),
        t('help.trans.step2'),
        t('help.trans.step3'),
        t('help.trans.step4')
      ]
    },
    {
      title: t('help.textToPhoto.title'),
      description: t('help.textToPhoto.description'),
      icon: <PictureOutlined />,
      steps: [
        t('help.textToPhoto.step1'),
        t('help.textToPhoto.step2'),
        t('help.textToPhoto.step3'),
        t('help.textToPhoto.step4'),
        t('help.textToPhoto.step5')
      ]
    },
    {
      title: t('help.faq.title'),
      description: t('help.faq.description'),
      icon: <QuestionCircleOutlined />,
      steps: [
        t('help.faq.step1'),
        t('help.faq.step2'),
        t('help.faq.step3'),
        t('help.faq.step4')
      ]
    }
  ]

  return (
    <PageContainer>
      <SectionTitle>{t('help.title')}</SectionTitle>
      <Row gutter={[24, 24]}>
        {helpSections.map((section, index) => (
          <Col xs={24} md={12} key={index}>
            <HelpCard hoverable>
              <Card.Meta
                title={
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px'
                  }}>
                    <HelpIcon>{section.icon}</HelpIcon>
                    <span>{section.title}</span>
                  </div>
                }
                description={
                  <div>
                    <Paragraph style={{ marginBottom: '24px', color: '#64748b' }}>
                      {section.description}
                    </Paragraph>
                    <Title level={5} style={{ marginBottom: '16px', fontSize: '1rem' }}>
                      {t('help.stepsTitle')}
                    </Title>
                    <ul style={{
                      listStyle: 'none',
                      padding: 0,
                      margin: 0
                    }}>
                      {section.steps.map((step, stepIndex) => (
                        <li key={stepIndex} style={{
                          padding: '8px 0',
                          paddingLeft: '24px',
                          position: 'relative'
                        }}>
                          <span style={{
                            position: 'absolute',
                            left: 0,
                            top: '8px',
                            width: '20px',
                            height: '20px',
                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            color: '#fff',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.8rem',
                            fontWeight: 'bold'
                          }}>
                            {stepIndex + 1}
                          </span>
                          {step}
                        </li>
                      ))}
                    </ul>
                  </div>
                }
              />
            </HelpCard>
          </Col>
        ))}
      </Row>
    </PageContainer>
  )
}

export default Help
