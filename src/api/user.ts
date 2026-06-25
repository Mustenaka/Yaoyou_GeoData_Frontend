import request from './request'
import type {
  ListParams,
  PageResult,
  PasswordResetResponse,
  RoleCode,
  UserCreateResponse,
  UserItem,
  UserPayload,
  UserStatus,
} from '@/types/api'

export const userApi = {
  list(params: ListParams) {
    return request.get<PageResult<UserItem>, PageResult<UserItem>>('/admin/users', { params })
  },
  create(payload: UserPayload) {
    return request.post<UserCreateResponse, UserCreateResponse>('/admin/users', payload)
  },
  detail(id: number) {
    return request.get<UserItem, UserItem>(`/admin/users/${id}`)
  },
  update(id: number, payload: UserPayload) {
    return request.put<UserItem, UserItem>(`/admin/users/${id}`, payload)
  },
  updateRole(id: number, roleCode: RoleCode) {
    return request.put(`/admin/users/${id}/role`, { role_code: roleCode })
  },
  updateStatus(id: number, status: UserStatus) {
    return request.put(`/admin/users/${id}/status`, { status })
  },
  updateTrial(id: number, expiresAt: string | null) {
    return request.put(`/admin/users/${id}/trial`, { expires_at: expiresAt })
  },
  updateTemporary(id: number, expiresAt: string | null) {
    return request.put(`/admin/users/${id}/temporary`, { expires_at: expiresAt })
  },
  resetPassword(id: number, password?: string) {
    return request.post<PasswordResetResponse, PasswordResetResponse>(`/admin/users/${id}/password/reset`, {
      password: password || '',
    })
  },
}
