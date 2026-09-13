import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Typography,
  Row,
  Col,
  Card,
  Spin,
  message,
  Image,
  Tag,
  Button,
  Space,
  Divider,
  List
} from 'antd'
import {
  ArrowLeftOutlined,
  BookOutlined,
  EyeOutlined,
  StarOutlined,
  UserOutlined,
  ReadOutlined
} from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import styled from 'styled-components'

const { Title, Text, Paragraph } = Typography

const DetailContainer = styled.div`
  width: 100%;
  min-height: calc(100vh - 64px);
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
  padding: 80px 24px 24px;

  @media (max-width: 768px) {
    padding: 70px 16px 16px;
  }
`

const ContentWrapper = styled.div`
  max-width: 1200px;
  margin: 0 auto;
`

const HeaderCard = styled(Card)`
  border-radius: 16px;
  overflow: hidden;
  margin-bottom: 24px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
`

const CoverImage = styled(Image)`
  width: 100%;
  max-width: 300px;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);

  @media (max-width: 768px) {
    max-width: 200px;
  }
`

const InfoSection = styled.div`
  padding: 24px;

  .ant-typography {
    margin-bottom: 12px;
  }
`

const ChapterList = styled(Card)`
  border-radius: 16px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);

  .ant-list-item {
    padding: 16px 24px;
    cursor: pointer;
    transition: all 0.3s ease;

    &:hover {
      background: rgba(102, 126, 234, 0.05);
    }
  }
`

const BackButton = styled(Button)`
  margin-bottom: 24px;
  border-radius: 20px;
  height: 40px;
  padding: 0 24px;
  font-weight: 500;

  &:hover {
    transform: translateX(-4px);
  }
`

interface TopicInfo {
  id: number;
  title: string;
  description: string;
  cover: string;
  views_count: number;
  likes_count: number;
  is_finish: number;
  author: {
    name: string;
  };
  tag_list: Array<{
    id: number;
    title: string;
  }>;
  comics: Array<{
    id: number;
    title: string;
    cover: string;
    order: number;
  }>;
}

const CartoonDetail: React.FC = () => {
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [topicInfo, setTopicInfo] = useState<TopicInfo | null>(null)

  useEffect(() => {
    if (id) {
      fetchTopicDetail(Number(id))
    }
  }, [id])

  // 获取漫画详情
  const fetchTopicDetail = async (topicId: number) => {
    try {
      setLoading(true)
      const response = await fetch((`/api/kuaikan/v2/pweb/topic/${topicId}`))
      const data = await response.json()

      if (data.data && data.data.topic_info) {
        setTopicInfo(data.data.topic_info)
      } else {
        message.error(t('cartoonDetail.fetchDetailFailed'))
      }
    } catch (error) {
      console.error('获取漫画详情失败:', error)
      message.error(t('cartoonDetail.fetchDetailFailed'))
    } finally {
      setLoading(false)
    }
  }

  // 处理章节点击
  const handleChapterClick = async (comicId: number) => {
    try {
      const response = await fetch((`/api/kuaikan/v2/pweb/comic/${comicId}`))
      const data = await response.json()
    
      if (data.data && data.data.comic_info && data.data.comic_info.comic_images) {
        navigate(`/cartoon/chapter/${comicId}`)
      } else {
        message.warning(t('cartoonChapter.noContent'))
      }
    } catch (error) {
      console.error('获取章节内容失败:', error)
      message.error(t('cartoonChapter.fetchChapterFailed'))
    }
  }

  // 格式化数字显示
  const formatNumber = (num: number = 0) => {
    if (num >= 10000) {
      return (num / 10000).toFixed(1) + '万'
    }
    return num.toString()
  }

  if (loading) {
    return (
      <DetailContainer>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
          <Spin size="large" tip={t('common.loading')} />
        </div>
      </DetailContainer>
    )
  }

  if (!topicInfo) {
    return (
      <DetailContainer>
        <ContentWrapper>
          <BackButton
            type="default"
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate('/cartoon')}
          >
            {t('cartoonDetail.backToList')}
          </BackButton>
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#999' }}>
            {t('cartoonDetail.notFound')}
          </div>
        </ContentWrapper>
      </DetailContainer>
    )
  }

  return (
    <DetailContainer>
      <ContentWrapper>
        <BackButton
          type="default"
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate('/cartoon')}
        >
          {t('cartoonDetail.backToList')}
        </BackButton>

        <HeaderCard>
          <Row gutter={[32, 32]}>
            <Col xs={24} sm={8} md={6} style={{ display: 'flex', justifyContent: 'center' }}>
              <CoverImage
                // @ts-ignore
                src={topicInfo.cover_image_url}
                alt={topicInfo.title}
                preview={false}
              />
            </Col>
            <Col xs={24} sm={16} md={18}>
              <InfoSection>
                <Title level={2} style={{ marginBottom: 16 }}>
                  {topicInfo.title}
                  {topicInfo.is_finish === 1 && (
                    <Tag color="success" style={{ marginLeft: 12 }}>{t('cartoon.finished')}</Tag>
                  )}
                </Title>

                <Space direction="vertical" size={12} style={{ width: '100%' }}>
                  {/* @ts-ignore */}
                  {topicInfo.user && (
                    <Text>
                      <UserOutlined style={{ marginRight: 8 }} />
                      {t('cartoonDetail.author')}：{/* @ts-ignore */}
                      {topicInfo.user.nickname}
                    </Text>
                  )}

                  <Space size={24} wrap>
                    <Text>
                      <EyeOutlined style={{ marginRight: 8 }} />
                      {/* @ts-ignore */}
                      {t('cartoonDetail.status')}：{formatNumber(topicInfo.update_status)}
                    </Text>
                    <Text>
                      <StarOutlined style={{ marginRight: 8 }} />
                      {t('cartoonDetail.likes')}：{formatNumber(topicInfo.likes_count)}
                    </Text>
                    <Text>
                      <BookOutlined style={{ marginRight: 8 }} />
                      {t('cartoon.chapters')}：{topicInfo.comics?.length || 0} {t('cartoonDetail.hua')}
                    </Text>
                  </Space>

                  {/* @ts-ignore */}
                  {topicInfo.tags && topicInfo.tags.length > 0 && (
                    <div>
                      <Text style={{ marginRight: 12 }}>{t('cartoonDetail.tags')}：</Text>
                      {/* @ts-ignore */}
                      {topicInfo.tags.map(tag => (
                        <Tag color="blue" key={tag} style={{ marginBottom: 8 }}>
                          {tag}
                        </Tag>
                      ))}
                    </div>
                  )}

                  <Divider style={{ margin: '12px 0' }} />

                  <div>
                    <Text strong style={{ display: 'block', marginBottom: 8 }}>
                      {t('cartoonDetail.intro')}：
                    </Text>
                    <Paragraph style={{ marginBottom: 0, color: '#666' }}>
                      {topicInfo.description}
                    </Paragraph>
                  </div>
                </Space>
              </InfoSection>
            </Col>
          </Row>
        </HeaderCard>

        {topicInfo.comics && topicInfo.comics.length > 0 && (
          <ChapterList
            title={
              <Space>
                <ReadOutlined />
                <Text strong>{t('cartoonDetail.chapterList')}</Text>
              </Space>
            }
          >
            <List
              dataSource={topicInfo.comics.sort((a, b) => b.id - a.id)}
              renderItem={(comic, index) => (
                <List.Item
                  onClick={() => handleChapterClick(comic.id)}
                >
                  <List.Item.Meta
                    avatar={
                      <Text style={{ fontSize: 16, fontWeight: 500, minWidth: 60 }}>
                        {t('cartoonDetail.episode')} {topicInfo.comics!.length - index} {t('cartoonDetail.hua')}
                      </Text>
                    }
                    title={comic.title}
                    // @ts-ignore
                    description={comic.created_at}
                  />
                </List.Item>
              )}
            />
          </ChapterList>
        )}
      </ContentWrapper>
    </DetailContainer>
  )
}

export default CartoonDetail
