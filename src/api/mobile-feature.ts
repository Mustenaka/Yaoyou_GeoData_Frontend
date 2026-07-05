import request from './request'

export interface MobileSmartFillCompany {
  company_id: number
  company_name: string
  hidden: boolean
}

export interface MobileSmartFillPolicy {
  global_hidden: boolean
  companies: MobileSmartFillCompany[] | null
}

export interface MobileSmartFillGlobalResponse {
  global_hidden: boolean
}

export const mobileFeatureApi = {
  smartFill() {
    return request.get<MobileSmartFillPolicy, MobileSmartFillPolicy>('/admin/mobile-feature/smart-fill')
  },
  updateSmartFillGlobal(hidden: boolean) {
    return request.put<MobileSmartFillGlobalResponse, MobileSmartFillGlobalResponse>('/admin/mobile-feature/smart-fill/global', { hidden })
  },
  updateSmartFillCompany(companyId: number, hidden: boolean) {
    return request.put<MobileSmartFillCompany, MobileSmartFillCompany>(`/admin/mobile-feature/smart-fill/company/${companyId}`, { hidden })
  },
}
