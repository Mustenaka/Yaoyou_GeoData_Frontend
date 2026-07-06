import request, { downloadBlob } from './request'
import type { ClientLogItem, ClientLogListParams, PageResult, SystemLog } from '@/types/api'

export const logApi = {
  systemList() {
    return request.get<any, SystemLog[]>('/admin/logs/system')
  },
  clientList(params: ClientLogListParams) {
    return request.get<PageResult<ClientLogItem>, PageResult<ClientLogItem>>('/admin/logs/client', { params })
  },
  clientDownload(id: number) {
    return downloadBlob(`/admin/logs/client/${id}/download`)
  },
}
