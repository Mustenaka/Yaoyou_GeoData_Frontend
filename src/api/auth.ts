import request from './request'
import type { LoginResponse, UserInfo } from '@/types/api'

export const authApi = {
  login(username: string, password: string) {
    return request.post<any, LoginResponse>('/auth/login', { username, password })
  },
  logout() {
    return request.post('/auth/logout')
  },
  me() {
    return request.get<any, UserInfo>('/users/me')
  },
}
