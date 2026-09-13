/**
 * Token 管理工具
 * 用于管理用户登录状态的 token
 */

const TOKEN_KEY = 'chattyplay-token'

/**
 * 生成随机 token
 */
const generateToken = (): string => {
  return Math.random().toString(36).substring(2) + Date.now().toString(36)
}

/**
 * 保存 token 到 localStorage
 * @param token - 要保存的 token 值，如果不传则自动生成随机 token
 */
export const setToken = (token?: string): void => {
  const tokenValue = token || generateToken()
  localStorage.setItem(TOKEN_KEY, tokenValue)
}

/**
 * 获取 token
 * @returns 返回存储的 token，如果不存在则返回 null
 */
export const getToken = (): string | null => {
  return localStorage.getItem(TOKEN_KEY)
}

/**
 * 删除 token（退出登录时使用）
 */
export const removeToken = (): void => {
  localStorage.removeItem(TOKEN_KEY)
}

/**
 * 检查是否已登录
 * @returns 返回是否已登录（token 是否存在）
 */
export const isAuthenticated = (): boolean => {
  return !!getToken()
}

/**
 * 保存键值对到 localStorage
 * @param key - 键名
 * @param value - 键值
 */
export const setStorageItem = (key: string, value: string): void => {
  localStorage.setItem(key, value)
}

/**
 * 获取 localStorage 中的值
 * @param key - 键名
 * @returns 返回对应的值，如果不存在则返回 null
 */
export const getStorageItem = (key: string): string | null => {
  return localStorage.getItem(key)
}

/**
 * 删除 localStorage 中的键值对
 * @param key - 键名
 */
export const removeStorageItem = (key: string): void => {
  localStorage.removeItem(key)
}

/**
 * 清空所有 localStorage 数据
 */
export const clearStorage = (): void => {
  localStorage.clear()
}
