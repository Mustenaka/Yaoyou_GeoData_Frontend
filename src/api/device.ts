import request from './request'
import type { DeviceInfo } from '@/types/api'

export const deviceApi = {
  list() {
    return request.get<any, DeviceInfo[]>('/admin/devices')
  },
  updateStatus(id: number, status: number) {
    return request.put(`/admin/devices/${id}/status`, { status })
  },
}
