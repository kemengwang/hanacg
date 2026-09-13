import React from 'react'
import { Button, Typography } from 'antd'
import { HomeOutlined, ArrowLeftOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import styled from 'styled-components'

const { Title, Paragraph } = Typography

const NotFoundContainer = styled.div`
  min-height: calc(100vh - 200px);
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
  padding: 40px 20px;
  position: relative;
  overflow: hidden;

  /* 背景动画 */
  &::before {
    content: '';
    position: absolute;
    top: -50%;
    left: -50%;
    width: 200%;
    height: 200%;
    background: radial-gradient(circle, rgba(102, 126, 234, 0.1) 2px, transparent 2px);
    background-size: 50px 50px;
    animation: moveBackground 30s linear infinite;
  }

  @keyframes moveBackground {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`

const NotFoundCard = styled.div`
  text-align: center;
  padding: 60px 40px;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  border-radius: 24px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.1);
  position: relative;
  z-index: 1;
  animation: cardAppear 0.6s cubic-bezier(0.16, 1, 0.3, 1);

  @keyframes cardAppear {
    from {
      opacity: 0;
      transform: translateY(30px) scale(0.9);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }

  @media (max-width: 768px) {
    padding: 40px 24px;
    border-radius: 20px;
  }
`

const ErrorCode = styled.div`
  font-size: 12rem;
  font-weight: 900;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  line-height: 1;
  margin-bottom: 20px;
  position: relative;
  animation: numberFloat 3s ease-in-out infinite;

  @keyframes numberFloat {
    0%, 100% {
      transform: translateY(0) scale(1);
    }
    50% {
      transform: translateY(-10px) scale(1.02);
    }
  }

  &::after {
    content: '404';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    filter: blur(20px);
    opacity: 0.3;
    z-index: -1;
    animation: numberPulse 3s ease-in-out infinite;
  }

  @keyframes numberPulse {
    0%, 100% {
      transform: scale(1);
      opacity: 0.3;
    }
    50% {
      transform: scale(1.05);
      opacity: 0.5;
    }
  }

  @media (max-width: 768px) {
    font-size: 8rem;
  }

  @media (max-width: 480px) {
    font-size: 6rem;
  }
`

const GhostIcon = styled.div`
  font-size: 4rem;
  margin-bottom: 20px;
  animation: ghostFloat 3s ease-in-out infinite;

  @keyframes ghostFloat {
    0%, 100% {
      transform: translateY(0) rotate(0deg);
    }
    25% {
      transform: translateY(-10px) rotate(-5deg);
    }
    75% {
      transform: translateY(-10px) rotate(5deg);
    }
  }

  @media (max-width: 768px) {
    font-size: 3rem;
  }
`

const ActionButtons = styled.div`
  display: flex;
  gap: 16px;
  justify-content: center;
  margin-top: 40px;
  flex-wrap: wrap;

  .ant-btn {
    height: 48px;
    padding: 0 32px;
    font-size: 1rem;
    border-radius: 24px;
    font-weight: 500;
    transition: all 0.3s ease;

    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 20px rgba(102, 126, 234, 0.3);
    }

    &:active {
      transform: translateY(0);
    }
  }

  @media (max-width: 768px) {
    flex-direction: column;
    gap: 12px;

    .ant-btn {
      width: 100%;
    }
  }
`

const NotFound: React.FC = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()

  return (
    <NotFoundContainer>
      <NotFoundCard>
        <GhostIcon>👻</GhostIcon>
        <ErrorCode>404</ErrorCode>
        <Title level={2} style={{
          marginBottom: '16px',
          fontSize: '2rem',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text'
        }}>
          {t('notFound.title')}
        </Title>
        <Paragraph style={{
          fontSize: '1.1rem',
          color: '#64748b',
          marginBottom: '32px',
          maxWidth: '400px',
          margin: '0 auto 32px'
        }}>
          {t('notFound.description')}
        </Paragraph>

        <ActionButtons>
          <Button
            type="primary"
            icon={<HomeOutlined />}
            onClick={() => navigate('/home')}
            style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              border: 'none'
            }}
          >
            {t('notFound.backHomeBtn')}
          </Button>
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate(-1)}
          >
            {t('common.back')}
          </Button>
        </ActionButtons>
      </NotFoundCard>
    </NotFoundContainer>
  )
}

export default NotFound
