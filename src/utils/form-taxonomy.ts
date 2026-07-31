export interface FormHierarchyItem {
  key: string
  formType: string
  label: string
}

export interface FormHierarchySubgroup<T extends FormHierarchyItem = FormHierarchyItem> {
  key: 'normal' | 'special'
  label: string
  items: T[]
}

export interface FormHierarchySection<T extends FormHierarchyItem = FormHierarchyItem> {
  key: 'field' | 'survey' | 'soil' | 'other'
  index: string
  label: string
  count: number
  items: T[]
  subgroups: FormHierarchySubgroup<T>[]
}

const fieldFormOrder = [
  'field-reserve-1',
  'field-reserve-2',
  'field-reserve-3',
]

const normalTestFormOrder = [
  'excavation-record',
]

const specialTestFormOrder = [
  'permeability-variable',
  'permeability-consolidation',
  'ucs',
  'at-rest-pressure',
  'ignition-loss',
  'water-soil-simple-analysis',
  'foundation-bed',
  'angle-of-repose',
  'uu',
  'cu',
  'cd',
  'special-backup-1',
  'special-backup-2',
]

type FormTaxonomy = {
  section: FormHierarchySection['key']
  subgroup: FormHierarchySubgroup['key'] | ''
  rank: number
}

export function formTaxonomy(formType?: string): FormTaxonomy {
  const normalized = (formType || '').trim()
  const fieldIndex = fieldFormOrder.indexOf(normalized)
  if (fieldIndex >= 0 || normalized.startsWith('field-')) {
    return { section: 'field', subgroup: '', rank: 100 + (fieldIndex >= 0 ? fieldIndex : 90) }
  }
  if (normalized.startsWith('survey-')) {
    return { section: 'survey', subgroup: '', rank: 200 }
  }
  const normalIndex = normalTestFormOrder.indexOf(normalized)
  if (normalIndex >= 0) {
    return { section: 'soil', subgroup: 'normal', rank: 300 + normalIndex }
  }
  const specialIndex = specialTestFormOrder.indexOf(normalized)
  if (specialIndex >= 0) {
    return { section: 'soil', subgroup: 'special', rank: 400 + specialIndex }
  }
  return { section: 'other', subgroup: '', rank: 900 }
}

export function sortFormHierarchyItems<T extends FormHierarchyItem>(items: T[]): T[] {
  return [...items].sort((left, right) => {
    const rankDiff = formTaxonomy(left.formType).rank - formTaxonomy(right.formType).rank
    if (rankDiff !== 0) return rankDiff
    const labelDiff = left.label.localeCompare(right.label, 'zh-CN')
    return labelDiff !== 0 ? labelDiff : left.formType.localeCompare(right.formType)
  })
}

export function buildFormHierarchy<T extends FormHierarchyItem>(items: T[]): FormHierarchySection<T>[] {
  const sorted = sortFormHierarchyItems(items)
  const fieldItems = sorted.filter((item) => formTaxonomy(item.formType).section === 'field')
  const surveyItems = sorted.filter((item) => formTaxonomy(item.formType).section === 'survey')
  const normalItems = sorted.filter((item) => formTaxonomy(item.formType).subgroup === 'normal')
  const specialItems = sorted.filter((item) => formTaxonomy(item.formType).subgroup === 'special')
  const otherItems = sorted.filter((item) => formTaxonomy(item.formType).section === 'other')
  const sections: FormHierarchySection<T>[] = [
    {
      key: 'field',
      index: '1',
      label: '野外记录',
      count: fieldItems.length,
      items: fieldItems,
      subgroups: [],
    },
    {
      key: 'survey',
      index: '2',
      label: '勘察记录',
      count: surveyItems.length,
      items: surveyItems,
      subgroups: [],
    },
    {
      key: 'soil',
      index: '3',
      label: '土工试验',
      count: normalItems.length + specialItems.length,
      items: [],
      subgroups: [
        { key: 'normal', label: '常规试验', items: normalItems },
        { key: 'special', label: '特殊试验', items: specialItems },
      ],
    },
  ]
  if (otherItems.length) {
    sections.push({
      key: 'other',
      index: '',
      label: '其他配置',
      count: otherItems.length,
      items: otherItems,
      subgroups: [],
    })
  }
  return sections
}
