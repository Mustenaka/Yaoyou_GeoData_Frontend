import request from './request'
import type { SystemLog } from '@/types/api'

export const logApi = {
  systemList() {
    return request.get<any, SystemLog[]>('/admin/logs/system')
  },
}
