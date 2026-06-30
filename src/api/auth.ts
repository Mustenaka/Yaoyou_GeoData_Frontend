import request from './request'
import type { LoginResponse, MeResponse } from '@/types/api'

export interface LoginPayload {
  username: string
  password: string
  client_type: 'admin'
  app_version?: string
}

export interface PasswordChangePayload {
  current_password: string
  new_password: string
}

export const authApi = {
  login(payload: LoginPayload) {
    return request.post<LoginResponse, LoginResponse>('/auth/login', payload)
  },
  refresh(refreshToken: string) {
    return request.post<LoginResponse, LoginResponse>('/auth/refresh', { refresh_token: refreshToken })
  },
  logout(refreshToken?: string) {
    return request.post('/auth/logout', { refresh_token: refreshToken })
  },
  me() {
    return request.get<MeResponse, MeResponse>('/auth/me')
  },
  changePassword(payload: PasswordChangePayload) {
    return request.post<{ changed: boolean }, { changed: boolean }>('/auth/password/change', payload)
  },
}
