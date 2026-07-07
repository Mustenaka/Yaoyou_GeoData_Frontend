import request from './request'

export interface SiteHomeImages {
  win: string
  pad: string
  phone: string
}

export interface SiteHomeSection1 {
  eyebrow: string
  title: string
  lead: string
  images: SiteHomeImages
}

export interface SiteHomeCard {
  kicker: string
  title: string
  text: string
  image: string
}

export interface SiteHomeSection2 {
  eyebrow: string
  title: string
  cards: SiteHomeCard[]
}

export interface SiteHomeContent {
  version: number
  section1: SiteHomeSection1
  section2: SiteHomeSection2
  updated_at?: string
}

export interface SiteHomeContentPayload {
  section1: SiteHomeSection1
  section2: SiteHomeSection2
}

export interface SiteSupportContent {
  content: string
  updated_at?: string
}

export interface SiteAssetUploadResponse {
  url: string
  thumb_url?: string
}

export const DEFAULT_SITE_HOME_CONTENT: SiteHomeContent = {
  version: 1,
  section1: {
    eyebrow: '项目介绍',
    title: '垚无忧土工数据管理系统',
    lead:
      '垚无忧土工移动端一键提取完工开土数据表并导出，数据无缝适配垚无忧土工桌面端私有格式处理链路，全面覆盖开土数据、土样描述、密度、含水率、界限含水率、剪切试验等多项核心模块，最终输出标准化数据结果文件。',
    images: {
      win: '/assets/win-home.png',
      pad: '/assets/pad-project-landscape.jpg',
      phone: '/assets/mobile-entry-portrait.jpg',
    },
  },
  section2: {
    eyebrow: '移动端 / 桌面端',
    title: '移动端录入 / 桌面端处理',
    cards: [
      {
        kicker: '垚无忧土工移动端',
        title: '现场项目与开土记录录入',
        text:
          '蓝牙直连秒传数据至移动端设备，专为现场作业场景打造；覆盖项目创建、记录录入、配置读取、项目包输出、云端上传全流程，省去人工传递与重复整理环节，大幅降本提效。',
        image: '/assets/mobile-entry-portrait.jpg',
      },
      {
        kicker: '垚无忧土工桌面端',
        title: '数据处理与结果整理',
        text:
          '可直接对接移动端采集的数据表，完成私有格式数据处理与标准化输出，兼容各类数据源格式并采用统一处理逻辑；支持按项目维度对海量数据进行批量处理，全工作流自动化运行，有效降低人工操作成本，保障数据处理的效率与一致性。',
        image: '/assets/win-home.png',
      },
    ],
  },
}

export const DEFAULT_SITE_SUPPORT_CONTENT = '技术支持联系方式待补充，请联系企业管理员。'

export const siteContentApi = {
  getHomeContent(): Promise<SiteHomeContent> {
    return request.get('/admin/site/home-content')
  },
  updateHomeContent(payload: SiteHomeContentPayload): Promise<SiteHomeContent> {
    return request.put('/admin/site/home-content', payload)
  },
  getSupportContent(): Promise<SiteSupportContent> {
    return request.get('/admin/site/support-content')
  },
  updateSupportContent(payload: Pick<SiteSupportContent, 'content'>): Promise<SiteSupportContent> {
    return request.put('/admin/site/support-content', payload)
  },
  uploadAsset(file: File): Promise<SiteAssetUploadResponse> {
    const data = new FormData()
    data.append('file', file)
    return request.post('/admin/site/assets', data)
  },
}
