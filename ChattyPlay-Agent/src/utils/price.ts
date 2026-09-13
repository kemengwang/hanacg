/**
 * 格式化价格
 * @param price - 价格值
 * @param currency - 货币类型，例如 'USD' 或 'CNY'
 * @returns 返回格式化后的价格字符串，例如 '$10.00' 或 '¥10.00'
 */
export const formatPrice = (price: number | undefined, currency: string): string => {
  if (!price) return '--'
  const formatted = price.toFixed(2)
  return currency === 'USD' ? `$${formatted}` : `¥${formatted}`
}

/**
 * 格式化价格变化值
 * @param change - 价格变化值
 * @returns 返回格式化后的价格变化字符串，例如 '+10.00' 或 '-5.00'
 */
export const formatChange = (change: number | undefined): string => {
  if (change === undefined) return '--'
  const sign = change >= 0 ? '+' : ''
  return `${sign}${change.toFixed(2)}`
}

/**
 * 格式化百分比
 * @param percent - 百分比值
 * @returns 返回格式化后的百分比字符串，例如 '+10.00%' 或 '-5.00%'
 */
export const formatPercent = (percent: number | undefined): string => {
  if (percent === undefined) return '--'
  const sign = percent >= 0 ? '+' : ''
  return `${sign}${percent.toFixed(2)}%`
}

/**
 * 根据价格变化百分比返回价格类名
 * @param changePercent - 价格变化百分比值
 * @returns 返回价格类名，例如 'up' 或 'down'
 */
export const getPriceClass = (changePercent: number | undefined): string => {
  if (changePercent === undefined) return ''
  return changePercent >= 0 ? 'up' : 'down'
}
