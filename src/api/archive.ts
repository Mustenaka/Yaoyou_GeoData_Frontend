import request, { downloadBlob } from './request'
import type {
  ArchiveCompanyItem,
  ArchiveDeviceItem,
  ArchiveDeviceProjectItem,
  ClientFileItem,
  ConfigSnapshotItem,
  ConfigSnapshotListParams,
  FormDataSnapshot,
  PageResult,
  ProjectArchiveItem,
} from '@/types/api'

export const archiveApi = {
  listArchiveCompanies() {
    return request.get<ArchiveCompanyItem[], ArchiveCompanyItem[]>('/admin/archive/companies')
  },
  listCompanyDevices(companyId: number | 'null') {
    return request.get<ArchiveDeviceItem[], ArchiveDeviceItem[]>(`/admin/archive/companies/${companyId}/devices`)
  },
  listDeviceProjects(deviceFingerprintId: number, params: { page?: number; page_size?: number }) {
    return request.get<PageResult<ArchiveDeviceProjectItem>, PageResult<ArchiveDeviceProjectItem>>(
      `/admin/archive/devices/${deviceFingerprintId}/projects`,
      { params },
    )
  },
  listProjects(params: { page?: number; page_size?: number; company_id?: number | null; keyword?: string }) {
    return request.get<PageResult<ProjectArchiveItem>, PageResult<ProjectArchiveItem>>('/admin/projects', { params })
  },
  projectDetail(id: number) {
    return request.get<ProjectArchiveItem, ProjectArchiveItem>(`/admin/projects/${id}`)
  },
  projectFiles(id: number, params: { page?: number; page_size?: number }) {
    return request.get<PageResult<ClientFileItem>, PageResult<ClientFileItem>>(`/admin/projects/${id}/files`, { params })
  },
  projectMobileData(id: number, params: { page?: number; page_size?: number }) {
    return request.get<PageResult<FormDataSnapshot>, PageResult<FormDataSnapshot>>(`/admin/projects/${id}/mobile-data`, { params })
  },
  projectWinResults(id: number, params: { page?: number; page_size?: number }) {
    return request.get<PageResult<ClientFileItem>, PageResult<ClientFileItem>>(`/admin/projects/${id}/win-results`, { params })
  },
  projectConfigs(id: number, params: { page?: number; page_size?: number }) {
    return request.get<PageResult<ConfigSnapshotItem>, PageResult<ConfigSnapshotItem>>(`/admin/projects/${id}/configs`, { params })
  },
  listConfigs(params: ConfigSnapshotListParams) {
    return request.get<PageResult<ConfigSnapshotItem>, PageResult<ConfigSnapshotItem>>('/admin/config-snapshots', { params })
  },
  configDetail(id: number) {
    return request.get<ConfigSnapshotItem, ConfigSnapshotItem>(`/admin/config-snapshots/${id}`)
  },
  formSnapshotDetail(id: number) {
    return request.get<FormDataSnapshot, FormDataSnapshot>(`/admin/form-snapshots/${id}`)
  },
  downloadConfig(id: number) {
    return downloadBlob(`/admin/config-snapshots/${id}/download`)
  },
  downloadProjectPackage(id: number) {
    return downloadBlob(`/admin/archive/projects/${id}/export/package`)
  },
  downloadProjectTable(id: number, params: { form_type?: string; kind?: 'data' | 'sample' }) {
    return downloadBlob(`/admin/archive/projects/${id}/export/table`, params)
  },
  markConfigLatest(id: number) {
    return request.post<ConfigSnapshotItem, ConfigSnapshotItem>(`/admin/config-snapshots/${id}/mark-latest`)
  },
}
