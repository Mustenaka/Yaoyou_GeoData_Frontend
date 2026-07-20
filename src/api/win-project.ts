import request from './request'
import type { PageResult, WinDataSourceTablePage, WinProjectDetail, WinProjectKind, WinProjectListItem } from '@/types/api'

export const winProjectApi = {
  list(projectKind: WinProjectKind, params: { page?: number; page_size?: number; company_id?: number; keyword?: string }) {
    return request.get<PageResult<WinProjectListItem>, PageResult<WinProjectListItem>>('/admin/win/projects', {
      params: { ...params, project_kind: projectKind },
    })
  },
  detail(id: number, projectKind: WinProjectKind) {
    return request.get<WinProjectDetail, WinProjectDetail>(`/admin/win/projects/${id}`, { params: { project_kind: projectKind } })
  },
  previewDataSource(
    projectId: number,
    snapshotId: number,
    projectKind: WinProjectKind,
    params: { sheet_index?: number; page?: number; page_size?: number },
  ) {
    return request.get<WinDataSourceTablePage, WinDataSourceTablePage>(
      `/admin/win/projects/${projectId}/data-sources/${snapshotId}/preview`,
      { params: { ...params, project_kind: projectKind }, timeout: 60_000 },
    )
  },
  downloadDataSource(projectId: number, snapshotId: number, projectKind: WinProjectKind) {
    return request.get<Blob, Blob>(`/admin/win/projects/${projectId}/data-sources/${snapshotId}/download`, {
      params: { project_kind: projectKind },
      responseType: 'blob',
      timeout: 120_000,
    })
  },
}
