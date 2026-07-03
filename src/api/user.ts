import request, { downloadBlob } from './request'
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
  exportXlsx(params: Pick<ListParams, 'keyword' | 'company_id' | 'role_code' | 'status'>) {
    return downloadBlob('/admin/users/export', params as Record<string, unknown>)
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
  updateValidity(id: number, validUntil: string | null) {
    return request.put(`/admin/users/${id}/validity`, { valid_until: validUntil })
  },
  resetPassword(id: number, password?: string) {
    return request.post<PasswordResetResponse, PasswordResetResponse>(`/admin/users/${id}/password/reset`, {
      password: password || '',
    })
  },
}
