import request, { downloadBlob } from './request'
import type { ClientFileItem, PageResult, SyncFileListParams } from '@/types/api'

export const syncFileApi = {
  list(params: SyncFileListParams) {
    return request.get<PageResult<ClientFileItem>, PageResult<ClientFileItem>>('/sync/files', { params })
  },
  detail(fileId: string) {
    return request.get<ClientFileItem, ClientFileItem>(`/sync/files/${fileId}`)
  },
  download(fileId: string) {
    return downloadBlob(`/sync/files/${fileId}/download`)
  },
  reparse(fileId: string) {
    return request.post<ClientFileItem, ClientFileItem>(`/sync/files/${fileId}/reparse`)
  },
  delete(fileId: string) {
    return request.delete<{ deleted: boolean }, { deleted: boolean }>(`/sync/files/${fileId}`)
  },
}
