import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios'
import { useStorage } from '@vueuse/core'
import type { ApiResponse, LoginResponse } from '@/types/api'
import { storageKeys } from '@/utils/storage'

const baseURL = import.meta.env.VITE_API_BASE || '/api'

const request = axios.create({
  baseURL,
  timeout: 15000,
})

const accessToken = useStorage(storageKeys.accessToken, '')
const refreshToken = useStorage(storageKeys.refreshToken, '')

let isRefreshing = false
let queue: Array<(token: string) => void> = []

request.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (accessToken.value) {
    config.headers.Authorization = `Bearer ${accessToken.value}`
  }
  return config
})

request.interceptors.response.use(
  ((response: any) => {
    const payload = response.data as ApiResponse<unknown>
    if (payload.code !== 0) {
      return Promise.reject(new Error(payload.message || '请求失败'))
    }
    return payload.data
  }) as any,
  async (error: AxiosError) => {
    const status = error.response?.status
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean }

    if (status === 401 && originalRequest && !originalRequest._retry && refreshToken.value) {
      if (isRefreshing) {
        return new Promise((resolve) => {
          queue.push((token: string) => {
            originalRequest.headers.Authorization = `Bearer ${token}`
            resolve(request(originalRequest))
          })
        })
      }

      originalRequest._retry = true
      isRefreshing = true

      try {
        const response = await axios.post<ApiResponse<LoginResponse>>(`${baseURL}/auth/refresh`, {
          refresh_token: refreshToken.value,
        })
        const session = response.data.data
        accessToken.value = session.access_token
        queue.forEach((callback) => callback(session.access_token))
        queue = []
        originalRequest.headers.Authorization = `Bearer ${session.access_token}`
        return request(originalRequest)
      } catch (refreshError) {
        accessToken.value = ''
        refreshToken.value = ''
        window.location.href = '/admin/login'
        return Promise.reject(refreshError)
      } finally {
        isRefreshing = false
      }
    }

    return Promise.reject(error)
  },
)

export default request
