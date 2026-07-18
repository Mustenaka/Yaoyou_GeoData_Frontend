import request from './request'
import type { PageResult, WinProjectDetail, WinProjectKind, WinProjectListItem } from '@/types/api'

export const winProjectApi = {
  list(projectKind: WinProjectKind, params: { page?: number; page_size?: number; company_id?: number; keyword?: string }) {
    return request.get<PageResult<WinProjectListItem>, PageResult<WinProjectListItem>>('/admin/win/projects', {
      params: { ...params, project_kind: projectKind },
    })
  },
  detail(id: number, projectKind: WinProjectKind) {
    return request.get<WinProjectDetail, WinProjectDetail>(`/admin/win/projects/${id}`, { params: { project_kind: projectKind } })
  },
}
