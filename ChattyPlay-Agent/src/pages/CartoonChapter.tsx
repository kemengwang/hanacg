import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Typography,
  Spin,
  message,
  Button,
  Space,
  Card,
  Row,
  Col
} from 'antd'
import {
  ArrowLeftOutlined,
  ArrowRightOutlined,
  BookOutlined,
  VerticalAlignTopOutlined
} from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import styled from 'styled-components'

const { Title, Paragraph } = Typography

const ChapterContainer = styled.div`
  width: 100%;
  min-height: calc(100vh - 64px);
  background: #f0f2f5;
  padding: 80px 24px 24px;

  @media (max-width: 768px) {
    padding: 70px 16px 16px;
  }
`

const ContentWrapper = styled.div`
  max-width: 900px;
  margin: 0 auto;
`

const HeaderBar = styled.div`
  background: white;
  padding: 16px 24px;
  border-radius: 12px;
  margin-bottom: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;

  @media (max-width: 768px) {
    flex-direction: column;
    align-items: stretch;
  }
`

const ComicImage = styled.img`
  width: 100%;
  height: auto;
  display: block;
  margin: 0 auto;
  background: #f5f5f5;

  @media (max-width: 768px) {
    max-width: 100%;
  }
`

const NavigationButton = styled(Button)`
  border-radius: 20px;
  height: 40px;
  font-weight: 500;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
  }

  &:disabled {
    cursor: not-allowed;
    &:hover {
      transform: none;
      box-shadow: none;
    }
  }
`

const BackToTopButton = styled.button<{ $visible: boolean }>`
  position: fixed;
  right: 24px;
  bottom: 80px;
  z-index: 10000;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  border: none;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  font-size: 24px;
  cursor: pointer;
  display: ${props => props.$visible ? 'flex' : 'none'};
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  opacity: ${props => props.$visible ? 1 : 0};
  transform: ${props => props.$visible ? 'translateY(0)' : 'translateY(20px)'};
  pointer-events: ${props => props.$visible ? 'auto' : 'none'};

  &:hover {
    background: linear-gradient(135deg, #764ba2 0%, #667eea 100%);
    transform: translateY(-4px);
    box-shadow: 0 8px 24px rgba(102, 126, 234, 0.5);
  }

  &:active {
    transform: translateY(-2px);
    box-shadow: 0 4px 16px rgba(102, 126, 234, 0.4);
  }

  &:focus {
    outline: none;
    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4), 0 0 0 3px rgba(102, 126, 234, 0.1);
  }

  @media (max-width: 768px) {
    right: 16px;
    bottom: 70px;
    width: 48px;
    height: 48px;
    font-size: 20px;
  }
`

interface ComicInfo {
  id: number;
  title: string;
  comic_images: Array<{ url: string }>;
  topic_id: number;
  order: number;
  previous_comic_info?: {
    id: number;
    title: string;
  };
  next_comic_info?: {
    id: number;
    title: string;
  };
}

const CartoonChapter: React.FC = () => {
  const { t } = useTranslation()
  const { comicId } = useParams<{ comicId: string }>()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [comicInfo, setComicInfo] = useState<ComicInfo | null>(null)
  const [nextComicInfo, setNextComicInfo] = useState<ComicInfo | null>(null)
  const [previousComicInfo, setPreviousComicInfo] = useState<ComicInfo | null>(null)
  const [topicInfo, setTopicInfo] = useState<any>(null)
  const [showBackToTop, setShowBackToTop] = useState(false)

  useEffect(() => {
    if (comicId) {
      fetchComicDetail(Number(comicId))
      scrollToTop()
    }
  }, [comicId])

  // 监听滚动，显示/隐藏返回顶部按钮
  useEffect(() => {
    const handleScroll = () => {
      setShowBackToTop(window.scrollY > 400)
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // 返回顶部
  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    })
  }

  // 获取章节详情
  const fetchComicDetail = async (id: number) => {
    try {
      setLoading(true)
      const response = await fetch((`/api/kuaikan/v2/pweb/comic/${id}`))
      const data = await response.json()

      if (data.data && data.data.comic_info) {
        setComicInfo(data.data.comic_info)
        setNextComicInfo(data.data.next_comic_info)
        setPreviousComicInfo(data.data.previous_comic_info)
        setTopicInfo(data.data.topic_info)
      } else {
        message.error(t('cartoonChapter.fetchChapterFailed'))
      }
    } catch (error) {
      console.error('获取章节内容失败:', error)
      message.error(t('cartoonChapter.fetchChapterFailed'))
    } finally {
      setLoading(false)
    }
  }

  // 上一章
  const handlePrevious = () => {
    if (previousComicInfo?.id) {
      navigate(`/cartoon/chapter/${previousComicInfo.id}`)
      scrollToTop()
    } else {
      message.warning(t('cartoonChapter.alreadyFirstChapter'))
    }
  }

  // 下一章
  const handleNext = () => {
    if (nextComicInfo?.id) {
      navigate(`/cartoon/chapter/${nextComicInfo.id}`)
      scrollToTop()
    } else {
      message.info(t('cartoonChapter.alreadyLastChapter'))
    }
  }

  // 返回详情页
  const handleBack = () => {
    if (comicInfo) {
      navigate(`/cartoon/${topicInfo.id}`)
    } else {
      navigate('/cartoon')
    }
  }

  if (loading) {
    return (
      <ChapterContainer>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
          <Spin size="large" tip={t('common.loading')} />
        </div>
      </ChapterContainer>
    )
  }

  if (!comicInfo) {
    return (
      <ChapterContainer>
        <ContentWrapper>
          <NavigationButton
            type="default"
            icon={<ArrowLeftOutlined />}
            onClick={handleBack}
          >
            {t('cartoonChapter.backToDetail')}
          </NavigationButton>
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#999' }}>
            {t('cartoonChapter.noContent')}
          </div>
        </ContentWrapper>
      </ChapterContainer>
    )
  }

  return (
    <>
      <ChapterContainer>
      <ContentWrapper>
        <HeaderBar>
          <Space direction="vertical" size={4}>
            <Title level={4} style={{ margin: 0 }}>
              {comicInfo.title}
            </Title>
            <Paragraph type="secondary" style={{ margin: 0, fontSize: 12 }}>
              {t('cartoonChapter.total')} {comicInfo.comic_images?.length || 0} {t('cartoonChapter.pages')}
            </Paragraph>
          </Space>

          <Space wrap>
            <NavigationButton
              type="default"
              icon={<ArrowLeftOutlined />}
              onClick={handlePrevious}
              disabled={!previousComicInfo?.id}
            >
              {t('cartoon.prevChapter')}
            </NavigationButton>
            <NavigationButton
              type="default"
              onClick={handleBack}
            >
              {t('cartoonChapter.backToDetail')}
            </NavigationButton>
            <NavigationButton
              type="primary"
              onClick={handleNext}
              icon={<ArrowRightOutlined />}
              disabled={!nextComicInfo?.id}
            >
              {t('cartoon.nextChapter')}
            </NavigationButton>
          </Space>
        </HeaderBar>

        <Card
          bordered={false}
          style={{ borderRadius: 12, boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)' }}
        >
          {comicInfo.comic_images && comicInfo.comic_images.length > 0 ? (
            <div>
              {comicInfo.comic_images.map((imageUrl, index) => (
                <ComicImage
                  key={index}
                  // @ts-ignore
                  src={imageUrl.url}
                  alt={`${comicInfo.title} - ${t('cartoonChapter.page')} ${index + 1}`}
                  loading="lazy"
                />
              ))}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '60px 0', color: '#999' }}>
              {t('cartoonChapter.noContent')}
            </div>
          )}
        </Card>

        <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
          <Col span={8}>
            <NavigationButton
              type="default"
              block
              icon={<ArrowLeftOutlined />}
              onClick={handlePrevious}
              disabled={!previousComicInfo?.id}
            >
              {t('cartoon.prevChapter')}
            </NavigationButton>
          </Col>
          <Col span={8}>
            <NavigationButton
              type="default"
              block
              onClick={handleBack}
              icon={<BookOutlined />}
            >
              {t('cartoonChapter.backToDetail')}
            </NavigationButton>
          </Col>
          <Col span={8}>
            <NavigationButton
              type="primary"
              block
              onClick={handleNext}
              icon={<ArrowRightOutlined />}
              disabled={!nextComicInfo?.id}
            >
              {t('cartoon.nextChapter')}
            </NavigationButton>
          </Col>
        </Row>
      </ContentWrapper>
    </ChapterContainer>

    {/* 返回顶部按钮 - 移到容器外部 */}
    <BackToTopButton
      $visible={showBackToTop}
      onClick={scrollToTop}
      aria-label={t('cartoonChapter.backToTop')}
    >
      <VerticalAlignTopOutlined />
    </BackToTopButton>
  </>
)}

export default CartoonChapter
