import request from './request'
import type { ClientLog, SystemLog } from '@/types/api'

export const logApi = {
  systemList() {
    return request.get<any, SystemLog[]>('/admin/logs/system')
  },
  clientList() {
    return request.get<any, ClientLog[]>('/admin/logs/client')
  },
  downloadClientLog(id: number) {
    return request.get(`/admin/logs/client/${id}/download`, {
      responseType: 'blob',
    })
  },
}
