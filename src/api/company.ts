import request, { downloadBlob } from './request'
import type {
  CompanyDetail,
  CompanyItem,
  CompanyPayload,
  CompanyPolicy,
  CompanyPolicyPayload,
  ListParams,
  PageResult,
} from '@/types/api'

export const companyApi = {
  list(params: Pick<ListParams, 'page' | 'page_size' | 'keyword' | 'status'>) {
    return request.get<PageResult<CompanyItem>, PageResult<CompanyItem>>('/admin/companies', { params })
  },
  exportXlsx(params: Pick<ListParams, 'keyword' | 'status'>) {
    return downloadBlob('/admin/companies/export', params as Record<string, unknown>)
  },
  create(payload: CompanyPayload) {
    return request.post<CompanyDetail, CompanyDetail>('/admin/companies', payload)
  },
  detail(id: number) {
    return request.get<CompanyDetail, CompanyDetail>(`/admin/companies/${id}`)
  },
  update(id: number, payload: CompanyPayload) {
    return request.put<CompanyDetail, CompanyDetail>(`/admin/companies/${id}`, payload)
  },
  updateStatus(id: number, status: number) {
    return request.put(`/admin/companies/${id}/status`, { status })
  },
  updatePolicy(id: number, payload: CompanyPolicyPayload) {
    return request.put<CompanyPolicy, CompanyPolicy>(`/admin/companies/${id}/policy`, payload)
  },
}
