import request from './request'
import type { UserInfo } from '@/types/api'

export const userApi = {
  list() {
    return request.get<any, UserInfo[]>('/admin/users')
  },
  updateStatus(id: number, status: number) {
    return request.put(`/admin/users/${id}/status`, { status })
  },
  remove(id: number) {
    return request.delete(`/admin/users/${id}`)
  },
}
