import './styles.css'

type ProductScope = 'both' | 'mobile' | 'win'

interface ApiResponse<T> {
  code: number
  message: string
  data: T
}

interface RegistrationReceipt {
  id: number
  status: string
  created_at: string
}

const root = document.querySelector<HTMLDivElement>('#site-root')

if (!root) {
  throw new Error('site root not found')
}

root.innerHTML = `
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
      <section class="hero" aria-labelledby="hero-title">
        <div class="hero-copy">
          <p class="eyebrow">项目介绍</p>
          <h1 id="hero-title">垚无忧土工数据管理系统</h1>
          <p class="hero-lead">
            垚无忧土工移动端一键提取完工开土数据表并导出，数据无缝适配垚无忧土工桌面端私有格式处理链路，全面覆盖开土数据、土样描述、密度、含水率、
            界限含水率、剪切试验等多项核心模块，最终输出标准化数据结果文件。
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
            <img src="/assets/win-home.png" alt="垚无忧土工桌面端首页预览" />
          </div>
          <div class="preview-window preview-window--pad">
            <img src="/assets/pad-project-landscape.jpg" alt="垚无忧土工移动端项目页横屏预览" />
          </div>
          <div class="phone-frame">
            <img src="/assets/mobile-entry-portrait.jpg" alt="垚无忧土工移动端录入页面预览" />
          </div>
        </div>
      </section>

      <section id="apps" class="section apps-section" aria-labelledby="apps-title">
        <div class="section-heading">
          <p class="eyebrow">移动端 / 桌面端</p>
          <h2 id="apps-title">移动端录入 / 桌面端处理</h2>
        </div>
        <div class="app-showcase">
          <article class="app-card">
            <div class="app-card__media app-card__media--mobile">
              <img src="/assets/mobile-entry-portrait.jpg" alt="垚无忧土工移动端录入界面" loading="lazy" />
            </div>
            <div class="app-card__body">
              <p class="app-kicker">垚无忧土工移动端</p>
              <h3>现场项目与开土记录录入</h3>
              <p>
                蓝牙直连秒传数据至移动端设备，专为现场作业场景打造；覆盖项目创建、记录录入、配置读取、项目包输出、云端上传全流程，
                省去人工传递与重复整理环节，大幅降本提效。
              </p>
            </div>
          </article>
          <article class="app-card">
            <div class="app-card__media app-card__media--desktop">
              <img src="/assets/win-home.png" alt="垚无忧土工桌面端数据处理界面" loading="lazy" />
            </div>
            <div class="app-card__body">
              <p class="app-kicker">垚无忧土工桌面端</p>
              <h3>数据处理与结果整理</h3>
              <p>
                可直接对接移动端采集的数据表，完成私有格式数据处理与标准化输出，兼容各类数据源格式并采用统一处理逻辑；
                支持按项目维度对海量数据进行批量处理，全工作流自动化运行，有效降低人工操作成本，保障数据处理的效率与一致性。
              </p>
            </div>
          </article>
        </div>
      </section>

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
