import './styles.css'

type ProductScope = 'both' | 'mobile' | 'win'

interface ApiResponse<T> {
  code: number
  message?: string
  data: T
}

interface RegistrationReceipt {
  id: number
  status: string
  created_at: string
}

interface SiteHomeImages {
  win: string
  pad: string
  phone: string
}

interface SiteHomeSection1 {
  eyebrow: string
  title: string
  lead: string
  images: SiteHomeImages
}

interface SiteHomeCard {
  kicker: string
  title: string
  text: string
  image: string
}

interface SiteHomeSection2 {
  eyebrow: string
  title: string
  cards: SiteHomeCard[]
}

interface SiteHomeContent {
  version: number
  section1: SiteHomeSection1
  section2: SiteHomeSection2
  updated_at?: string
}

const DEFAULT_HOME_CONTENT: SiteHomeContent = {
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

const allowedImagePrefixes = ['/assets/', '/api/site/assets/']
const root = document.querySelector<HTMLDivElement>('#site-root')

if (!root) {
  throw new Error('site root not found')
}

function escapeHtml(value: unknown) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => {
    switch (char) {
      case '&':
        return '&amp;'
      case '<':
        return '&lt;'
      case '>':
        return '&gt;'
      case '"':
        return '&quot;'
      case "'":
        return '&#39;'
      default:
        return char
    }
  })
}

function decodePath(value: string) {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

function safeImageSrc(value: unknown, fallback: string) {
  if (typeof value !== 'string') return fallback
  const path = value.trim()
  const decodedPath = decodePath(path)
  if (!path || path.includes('..') || decodedPath.includes('..') || path.includes('\\')) return fallback
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(path)) return fallback
  return allowedImagePrefixes.some((prefix) => path.startsWith(prefix)) ? path : fallback
}

function textOrFallback(value: unknown, fallback: string) {
  return typeof value === 'string' && value.trim() ? value : fallback
}

function normalizeHomeContent(input?: Partial<SiteHomeContent>): SiteHomeContent {
  const defaults = DEFAULT_HOME_CONTENT
  const section1 = input?.section1 ?? ({} as Partial<SiteHomeSection1>)
  const section1Images = section1.images ?? ({} as Partial<SiteHomeImages>)
  const section2 = input?.section2 ?? ({} as Partial<SiteHomeSection2>)
  const cards = Array.isArray(section2.cards) ? section2.cards : []

  return {
    version: 1,
    updated_at: typeof input?.updated_at === 'string' ? input.updated_at : undefined,
    section1: {
      eyebrow: textOrFallback(section1.eyebrow, defaults.section1.eyebrow),
      title: textOrFallback(section1.title, defaults.section1.title),
      lead: textOrFallback(section1.lead, defaults.section1.lead),
      images: {
        win: safeImageSrc(section1Images.win, defaults.section1.images.win),
        pad: safeImageSrc(section1Images.pad, defaults.section1.images.pad),
        phone: safeImageSrc(section1Images.phone, defaults.section1.images.phone),
      },
    },
    section2: {
      eyebrow: textOrFallback(section2.eyebrow, defaults.section2.eyebrow),
      title: textOrFallback(section2.title, defaults.section2.title),
      cards: defaults.section2.cards.map((defaultCard, index) => {
        const card = cards[index] ?? ({} as Partial<SiteHomeCard>)
        return {
          kicker: textOrFallback(card.kicker, defaultCard.kicker),
          title: textOrFallback(card.title, defaultCard.title),
          text: textOrFallback(card.text, defaultCard.text),
          image: safeImageSrc(card.image, defaultCard.image),
        }
      }),
    },
  }
}

function renderHero(content: SiteHomeContent) {
  return `
      <section class="hero" aria-labelledby="hero-title">
        <div class="hero-copy">
          <p class="eyebrow">${escapeHtml(content.section1.eyebrow)}</p>
          <h1 id="hero-title">${escapeHtml(content.section1.title)}</h1>
          <p class="hero-lead">
            ${escapeHtml(content.section1.lead)}
          </p>
          <div class="hero-actions">
            <a class="primary-action" href="#apply">申请使用</a>
            <a class="secondary-action" href="#apps">查看应用</a>
          </div>
        </div>

        <div class="preview-stage" aria-label="产品界面预览">
          <div class="preview-window preview-window--win">
            <div class="window-bar">
              <span></span><span></span><span></span>
            </div>
            <img src="${escapeHtml(content.section1.images.win)}" alt="垚无忧土工桌面端首页预览" />
          </div>
          <div class="preview-window preview-window--pad">
            <img src="${escapeHtml(content.section1.images.pad)}" alt="垚无忧土工移动端项目页横屏预览" />
          </div>
          <div class="phone-frame">
            <img src="${escapeHtml(content.section1.images.phone)}" alt="垚无忧土工移动端录入页面预览" />
          </div>
        </div>
      </section>`
}

function renderApps(content: SiteHomeContent) {
  const cards = content.section2.cards.slice(0, 2)
  const mediaClasses = ['app-card__media--mobile', 'app-card__media--desktop']
  return `
      <section id="apps" class="section apps-section" aria-labelledby="apps-title">
        <div class="section-heading">
          <p class="eyebrow">${escapeHtml(content.section2.eyebrow)}</p>
          <h2 id="apps-title">${escapeHtml(content.section2.title)}</h2>
        </div>
        <div class="app-showcase">
          ${cards
            .map(
              (card, index) => `
          <article class="app-card">
            <div class="app-card__media ${mediaClasses[index] || ''}">
              <img src="${escapeHtml(card.image)}" alt="${escapeHtml(card.title)}" loading="lazy" />
            </div>
            <div class="app-card__body">
              <p class="app-kicker">${escapeHtml(card.kicker)}</p>
              <h3>${escapeHtml(card.title)}</h3>
              <p>
                ${escapeHtml(card.text)}
              </p>
            </div>
          </article>`,
            )
            .join('')}
        </div>
      </section>`
}

function renderPage(content: SiteHomeContent) {
  return `
  <div class="site-shell">
    <header class="site-header" aria-label="主导航">
      <a class="brand" href="#top" aria-label="垚无忧首页">
        <img src="/assets/logo.png" alt="垚无忧 Logo" />
        <span>
          <strong>垚无忧</strong>
          <small>Yaowuyou</small>
        </span>
      </a>
      <nav class="site-nav" aria-label="页面章节">
        <a href="#top">首页</a>
        <a href="#apps">应用简介</a>
        <a href="#apply">申请使用</a>
      </nav>
      <a class="admin-link" href="https://www.yaowuyoutech.com/admin/login?redirect=/dashboard">管理端登录</a>
    </header>

    <main id="top">
      ${renderHero(content)}

      ${renderApps(content)}

      <section id="apply" class="section apply-section" aria-labelledby="apply-title">
        <div class="apply-copy">
          <p class="eyebrow">Access Request</p>
          <h2 id="apply-title">申请使用垚无忧土工数据管理系统</h2>
          <p>
            提交后会进入后台注册申请列表，管理员审核通过后再创建账号。
            申请不会自动生成可登录账号。
          </p>
        </div>

        <form class="apply-form" id="application-form" novalidate>
          <label>
            <span>单位名称</span>
            <input name="company_name" type="text" maxlength="128" autocomplete="organization" required />
          </label>
          <div class="form-grid">
            <label>
              <span>联系人</span>
              <input name="contact_name" type="text" maxlength="64" autocomplete="name" required />
            </label>
            <label>
              <span>手机</span>
              <input name="phone" type="tel" maxlength="32" autocomplete="tel" required />
            </label>
          </div>
          <label>
            <span>邮箱</span>
            <input name="email" type="email" maxlength="128" autocomplete="email" required />
          </label>
          <fieldset>
            <legend>申请产品</legend>
            <label><input type="radio" name="requested_product" value="both" checked /> 垚无忧土工移动端 + 垚无忧土工桌面端</label>
            <label><input type="radio" name="requested_product" value="mobile" /> 垚无忧土工移动端</label>
            <label><input type="radio" name="requested_product" value="win" /> 垚无忧土工桌面端</label>
          </fieldset>
          <label>
            <span>申请说明</span>
            <textarea name="reason" maxlength="1000" rows="4" placeholder="可填写项目场景、预计使用范围或需要开通的账号说明"></textarea>
          </label>
          <button class="submit-button" type="submit">提交申请</button>
          <p class="form-message" id="form-message" role="status" aria-live="polite"></p>
        </form>
      </section>
    </main>

    <footer class="site-footer">
      <span>垚无忧土工数据管理系统 / Yaowuyou</span>
      <a href="https://beian.miit.gov.cn/" target="_blank" rel="noreferrer">苏ICP备2026044110号</a>
    </footer>
  </div>
`
}

async function fetchHomeContent() {
  const controller = new AbortController()
  const timeoutId = window.setTimeout(() => controller.abort(), 3000)
  try {
    const response = await fetch('/api/site/home-content', { signal: controller.signal })
    if (!response.ok) throw new Error('home content request failed')
    const payload = (await response.json()) as ApiResponse<SiteHomeContent>
    if (payload.code !== 0 || !payload.data) throw new Error(payload.message || 'home content invalid')
    return normalizeHomeContent(payload.data)
  } finally {
    window.clearTimeout(timeoutId)
  }
}

function replaceHomeSections(content: SiteHomeContent) {
  const normalized = normalizeHomeContent(content)
  const hero = document.querySelector<HTMLElement>('.hero')
  const apps = document.querySelector<HTMLElement>('.apps-section')
  if (hero) hero.outerHTML = renderHero(normalized)
  if (apps) apps.outerHTML = renderApps(normalized)
}

root.innerHTML = renderPage(DEFAULT_HOME_CONTENT)

void fetchHomeContent()
  .then((content) => replaceHomeSections(content))
  .catch(() => {
    replaceHomeSections(DEFAULT_HOME_CONTENT)
  })

const form = document.querySelector<HTMLFormElement>('#application-form')
const message = document.querySelector<HTMLParagraphElement>('#form-message')
const submitButton = form?.querySelector<HTMLButtonElement>('.submit-button')

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const phonePattern = /^[0-9+\-() ]{6,32}$/

function setMessage(text: string, type: 'idle' | 'success' | 'error' = 'idle') {
  if (!message) return
  message.textContent = text
  message.dataset.type = type
}

function formValue(data: FormData, key: string) {
  return String(data.get(key) || '').trim()
}

async function submitApplication(event: SubmitEvent) {
  event.preventDefault()
  if (!form || !submitButton) return

  const data = new FormData(form)
  const companyName = formValue(data, 'company_name')
  const contactName = formValue(data, 'contact_name')
  const phone = formValue(data, 'phone')
  const email = formValue(data, 'email')
  const requestedProduct = formValue(data, 'requested_product') as ProductScope
  const reason = formValue(data, 'reason')

  if (!companyName || !contactName || !phone || !email) {
    setMessage('请填写单位、联系人、手机和邮箱。', 'error')
    return
  }
  if (!phonePattern.test(phone)) {
    setMessage('请输入有效的手机号码。', 'error')
    return
  }
  if (!emailPattern.test(email)) {
    setMessage('请输入有效的邮箱地址。', 'error')
    return
  }

  submitButton.disabled = true
  submitButton.textContent = '提交中...'
  setMessage('正在提交申请，请稍候。')

  try {
    const response = await fetch('/api/registration/applications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        app_type: 'enterprise',
        source_channel: 'official_site',
        company_name: companyName,
        contact_name: contactName,
        phone,
        email,
        requested_product: requestedProduct,
        requested_role: 'enterprise_admin',
        reason,
      }),
    })
    const contentType = response.headers.get('content-type') || ''
    if (!contentType.includes('application/json')) {
      throw new Error(response.ok ? '服务响应格式异常，请稍后再试。' : '提交失败，请稍后再试。')
    }
    const payload = (await response.json()) as ApiResponse<RegistrationReceipt>
    if (!response.ok || payload.code !== 0) {
      throw new Error(payload.message || '提交失败，请稍后再试。')
    }
    form.reset()
    setMessage(`申请已提交，回执编号：${payload.data.id}。管理员审核后会联系您。`, 'success')
  } catch (error) {
    setMessage(error instanceof Error ? error.message : '提交失败，请稍后再试。', 'error')
  } finally {
    submitButton.disabled = false
    submitButton.textContent = '提交申请'
  }
}

form?.addEventListener('submit', submitApplication)
