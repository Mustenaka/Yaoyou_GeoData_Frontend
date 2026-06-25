import axios, { AxiosError, type AxiosRequestConfig, type InternalAxiosRequestConfig } from 'axios'
import type { ApiResponse, LoginResponse } from '@/types/api'
import { clearSessionStorage, storageKeys } from '@/utils/storage'

export const baseURL = import.meta.env.VITE_API_BASE || '/api'

export const errorMessages: Record<number, string> = {
  10001: '请求参数不正确',
  10002: '未登录或登录已失效',
  10003: '无权执行该操作',
  10004: '记录不存在',
  10005: '服务器内部错误',
  11001: '用户名或密码错误',
  11002: '会话已失效',
  11003: 'Token 无效',
  11004: '用户已禁用',
  11005: '用户已存在',
  11006: '注册入口已关闭',
  12001: '角色无权访问该功能',
  12002: '企业已禁用',
  12003: '企业已过期',
  12004: '试用账号已过期',
  12005: '临时账号已过期',
  12006: '只能访问本企业数据',
  12007: '后台操作权限不足',
  13001: '授权已过期',
  13002: '设备不匹配',
  13003: '设备未授权',
  13004: '客户端版本低于最低要求',
  13005: '换机申请状态无效',
  13006: '授权无效',
  13007: '设备已被阻断',
  14001: '文件哈希不一致',
  14002: '重复上传',
  14003: '不支持的文件类型',
  14004: '文件解析失败',
  14005: '文件版本不兼容',
  14006: '项目 UUID 无效',
  16001: '服务器时间校验失败',
  16002: '请求签名无效',
  16003: '需要联网校验',
  17001: '存储容量已达限制',
  17002: '系统设置参数无效',
  17003: '维护任务执行失败',
  17004: '数据库备份失败',
}

export class ApiError extends Error {
  code: number

  constructor(code: number, message?: string) {
    super(errorMessages[code] || message || '请求失败')
    this.name = 'ApiError'
    this.code = code
  }
}

const request = axios.create({
  baseURL,
  timeout: 20000,
})

let isRefreshing = false
let refreshQueue: Array<(token: string) => void> = []

function getAccessToken() {
  return localStorage.getItem(storageKeys.accessToken) || ''
}

function getRefreshToken() {
  return localStorage.getItem(storageKeys.refreshToken) || ''
}

function setAccessToken(token: string) {
  localStorage.setItem(storageKeys.accessToken, token)
}

function shouldUnwrap(config?: AxiosRequestConfig) {
  return config?.responseType !== 'blob'
}

function redirectToLogin() {
  clearSessionStorage()
  const current = `${window.location.pathname}${window.location.search}`
  const login = `/admin/login${current && current !== '/admin/login' ? `?redirect=${encodeURIComponent(current.replace(/^\/admin/, '') || '/')}` : ''}`
  window.location.replace(login)
}

request.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = getAccessToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

request.interceptors.response.use(
  (response) => {
    if (!shouldUnwrap(response.config)) return response.data
    const payload = response.data as ApiResponse<unknown>
    if (payload.code !== 0) {
      throw new ApiError(payload.code, payload.message)
    }
    return payload.data
  },
  async (error: AxiosError<ApiResponse<unknown>>) => {
    const originalRequest = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined
    const status = error.response?.status

    if (status === 401 && originalRequest && !originalRequest._retry && getRefreshToken()) {
      if (isRefreshing) {
        return new Promise((resolve) => {
          refreshQueue.push((token: string) => {
            originalRequest.headers.Authorization = `Bearer ${token}`
            resolve(request(originalRequest))
          })
        })
      }

      originalRequest._retry = true
      isRefreshing = true

      try {
        const refreshResponse = await axios.post<ApiResponse<LoginResponse>>(`${baseURL}/auth/refresh`, {
          refresh_token: getRefreshToken(),
        })
        if (refreshResponse.data.code !== 0) {
          throw new ApiError(refreshResponse.data.code, refreshResponse.data.message)
        }
        const session = refreshResponse.data.data
        setAccessToken(session.access_token)
        refreshQueue.forEach((callback) => callback(session.access_token))
        refreshQueue = []
        originalRequest.headers.Authorization = `Bearer ${session.access_token}`
        return request(originalRequest)
      } catch (refreshError) {
        refreshQueue = []
        redirectToLogin()
        return Promise.reject(refreshError)
      } finally {
        isRefreshing = false
      }
    }

    if (error.response?.data?.code) {
      return Promise.reject(new ApiError(error.response.data.code, error.response.data.message))
    }
    return Promise.reject(error)
  },
)

export async function downloadBlob(url: string, params?: Record<string, unknown>) {
  return request.get<Blob, Blob>(url, { params, responseType: 'blob' })
}

export default request
