import dayjs from 'dayjs'

interface AuthorData {
  _id: string;
  avatarUrl?: string;
  fullname: string;
  name: string;
  type: string;
  isPro?: boolean;
  isHf?: boolean;
  isHfAdmin?: boolean;
  isMod?: boolean;
  plan?: string;
  followerCount: number;
  isUserFollowing: boolean;
}

/**
 * 获取作者姓名列表
 * @param authors 作者数据数组
 * @returns 格式化后的作者姓名字符串
*/
export const getAuthorNames = (authors: Array<{ name: string; _id: string }>): string => {
  if (!authors || !Array.isArray(authors) || authors.length === 0) return '未知作者'
  const names = authors.slice(0, 2).map(author => author.name)
  return names.length > 2 ? `${names.join(', ')} 等` : names.join(', ')
}

/**
 * 获取作者姓名或用户名
 * @param authorData 作者数据
 * @returns 作者姓名或用户名
*/
export const getAuthorDataName = (authorData?: AuthorData): string => {
  return authorData?.fullname || authorData?.name || '未知'
}

/**
 * 获取组织名称
 * @param org 组织数据
 * @returns 组织名称
*/
export const getOrganizationName = (org?: { fullname?: string; name?: string }): string => {
  return org?.fullname || org?.name || ''
}

/**
 * 获取时间agos
 * @param dateString 日期字符串
 * @returns 时间agos字符串
*/
export const getTimeAgo = (dateString: string): string => {
  const date = dayjs(dateString)
  const now = dayjs()
  const diffHours = now.diff(date, 'hour')
  if (diffHours < 1) return '刚刚'
  if (diffHours < 24) return `${diffHours}小时前`
  if (diffHours < 24 * 7) return `${Math.floor(diffHours / 24)}天前`
  return date.format('MM-DD')
}

/**
 * 格式化数字，添加单位（k、M）
 * @param num 数字
 * @returns 格式化后的字符串
*/
export const formatNumber = (num: number | undefined): string => {
  if (num === undefined) return '0'
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
  if (num >= 1000) return `${(num / 1000).toFixed(1)}k`
  return num.toString()
}

/**
 * 格式化参数数量，添加单位（B、M、k）
 * @param params 参数数量
 * @returns 格式化后的字符串
*/
export const formatParamCount = (params: number | undefined): string => {
  if (!params) return ''
  if (params >= 1000000000) return `${(params / 1000000000).toFixed(1)}B`
  if (params >= 1000000) return `${(params / 1000000).toFixed(1)}M`
  return formatNumber(params)
}

/**
 * 获取模型任务标签
 * @param pipeline_tag 模型任务标签
 * @returns 格式化后的任务标签字符串
*/
export const getTaskTag = (pipeline_tag?: string) => {
  if (!pipeline_tag) return null
  const taskMap: Record<string, string> = {
    'text-generation': '文本生成',
    'image-to-text': '图生文',
    'any-to-any': '多模态',
    'text-to-audio': '文生音频',
    'image-text-to-text': '图文理解',
    'automatic-speech-recognition': '语音识别',
    'conversational': '对话',
  }
  return taskMap[pipeline_tag] || pipeline_tag
}

/**
 * 获取硬件标签
 * @param runtime 模型运行时信息
 * @returns 格式化后的硬件标签字符串
*/
export const getHardwareTag = (runtime: any) => {
  if (!runtime?.hardware?.current) return null
  const hw = runtime.hardware.current
  if (hw.includes('a100')) return 'A100'
  if (hw.includes('a10g')) return 'A10G'
  if (hw.includes('cpu')) return 'CPU'
  return hw
}
