import request, { downloadBlob } from './request'
import type { ClientLog, SystemLog } from '@/types/api'

export const logApi = {
  systemList() {
    return request.get<any, SystemLog[]>('/admin/logs/system')
  },
  clientList() {
    return request.get<any, ClientLog[]>('/admin/logs/client')
  },
  downloadClientLog(id: number) {
    return downloadBlob(`/admin/logs/client/${id}/download`)
  },
}
