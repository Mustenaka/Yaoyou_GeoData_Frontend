import request from './request'
import type { DeviceChangeRequest, DeviceDetail, DeviceItem, DeviceStatus, ListParams, PageResult } from '@/types/api'

export const deviceApi = {
  list(params: ListParams) {
    return request.get<PageResult<DeviceItem>, PageResult<DeviceItem>>('/admin/devices', { params })
  },
  detail(id: number) {
    return request.get<DeviceDetail, DeviceDetail>(`/admin/devices/${id}`)
  },
  updateStatus(id: number, status: DeviceStatus, reason?: string) {
    return request.put(`/admin/devices/${id}/status`, { status, reason: reason || '' })
  },
  revoke(id: number, reason?: string) {
    return request.post(`/admin/devices/${id}/revoke`, { reason: reason || 'admin_revoke' })
  },
  changeRequests(params: Pick<ListParams, 'page' | 'page_size' | 'status'>) {
    return request.get<PageResult<DeviceChangeRequest>, PageResult<DeviceChangeRequest>>('/admin/devices/change-requests', {
      params,
    })
  },
  approveChangeRequest(id: number, note?: string) {
    return request.post<DeviceChangeRequest, DeviceChangeRequest>(`/admin/devices/change-requests/${id}/approve`, {
      note: note || '',
    })
  },
  rejectChangeRequest(id: number, note?: string) {
    return request.post<DeviceChangeRequest, DeviceChangeRequest>(`/admin/devices/change-requests/${id}/reject`, {
      note: note || '',
    })
  },
}
