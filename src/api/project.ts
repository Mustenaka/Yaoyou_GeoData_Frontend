import request from './request'
import type { PageResult, ProjectInfo, ProjectMember } from '@/types/api'

export const projectApi = {
  list(params?: { page?: number; page_size?: number; keyword?: string }) {
    return request.get<any, PageResult<ProjectInfo>>('/projects', { params })
  },
  members(projectId: number) {
    return request.get<any, ProjectMember[]>(`/projects/${projectId}/members`)
  },
}
