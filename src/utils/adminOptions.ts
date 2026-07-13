import type { SelectOption } from 'naive-ui'
import { companyApi } from '@/api/company'
import { userApi } from '@/api/user'
import type { UserItem } from '@/types/api'
import { pageList, queryValue } from '@/utils/query'

export interface UserSelectOption extends SelectOption {
  user: UserItem
}

export async function fetchCompanySelectOptions(keyword = ''): Promise<SelectOption[]> {
  const result = await companyApi.list({ page: 1, page_size: 30, keyword: queryValue(keyword) })
  return pageList(result.list).map((item) => ({ label: item.company_name, value: item.id }))
}

export async function fetchUserSelectOptions(options: {
  keyword?: string
  companyId?: number | null
  noCompany?: boolean
} = {}): Promise<UserSelectOption[]> {
  const result = await userApi.list({
    page: 1,
    page_size: 30,
    keyword: queryValue(options.keyword),
    company_id: queryValue(options.companyId),
    no_company: options.noCompany || undefined,
  })
  return pageList(result.list).map((user) => ({
    label: `${user.username}${user.real_name ? ` · ${user.real_name}` : ''}${user.company_name ? ` · ${user.company_name}` : ''}`,
    value: user.id,
    user,
  }))
}

export function mergeSelectedOption(options: SelectOption[], selected?: SelectOption | null) {
  if (!selected || options.some((option) => option.value === selected.value)) return options
  return [selected, ...options]
}
