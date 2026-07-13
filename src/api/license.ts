import request from './request'
import type { LicenseIssueResponse, LicenseItem, LicensePayload, LicenseUpdatePayload, ListParams, PageResult } from '@/types/api'

export const licenseApi = {
  list(params: Pick<ListParams, 'id' | 'page' | 'page_size' | 'company_id' | 'user_id' | 'status' | 'client_type'>) {
    return request.get<PageResult<LicenseItem>, PageResult<LicenseItem>>('/admin/licenses', { params })
  },
  issue(payload: LicensePayload) {
    return request.post<LicenseIssueResponse, LicenseIssueResponse>('/admin/licenses', payload)
  },
  update(id: number, payload: LicenseUpdatePayload) {
    return request.put<LicenseItem, LicenseItem>(`/admin/licenses/${id}`, payload)
  },
}
