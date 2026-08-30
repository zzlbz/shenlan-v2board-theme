import { useEffect, useMemo, useRef, useState } from 'react'
import * as Icons from 'lucide-react'
import QRCode from 'qrcode'
import DOMPurify from 'dompurify'
import { api, apiEnvelope, getAuth, isDemo, setAuth } from './api'
import type { CommissionLog, GuestConfig, InviteData, KnowledgeItem, NoticeItem, OrderItem, Plan, ServerNode, SubscribeInfo, ThemeWindow, TicketItem, TrafficLog, UserConfig, UserInfo } from './types'

declare global { interface Window { settings?: ThemeWindow; grecaptcha?: { render: (element: HTMLElement, options: { sitekey: string; theme?: string; callback: (token: string) => void; 'expired-callback'?: () => void }) => number } } }

type Notify = (message: string, kind?: 'success' | 'error') => void
interface PaymentMethod { id: number; name: string; payment: string; icon?: string; handling_fee_fixed?: number; handling_fee_percent?: number }
const settings = window.settings || {}
const brand = settings.title || 'Shenlan'

const formatMoney = (value = 0, symbol = '¥') => `${symbol}${(value / 100).toFixed(2)}`
const formatBytes = (value = 0) => value >= 1024 ** 3 ? `${(value / 1024 ** 3).toFixed(value >= 10 * 1024 ** 3 ? 0 : 1)} GB` : `${(value / 1024 ** 2).toFixed(0)} MB`
const formatDate = (timestamp?: number | null, withTime = false) => !timestamp ? '长期有效' : new Intl.DateTimeFormat('zh-CN', withTime ? { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' } : { year: 'numeric', month: '2-digit', day: '2-digit' }).format(timestamp * 1000)
const periodMap: Record<string, string> = { month_price: '一个月', quarter_price: '三个月', half_year_price: '半年', year_price: '一年', two_year_price: '两年', three_year_price: '三年', onetime_price: '一次性', reset_price: '流量重置', deposit: '账户充值' }
const billingPeriods = [
  { key: 'month_price', label: '月付' }, { key: 'quarter_price', label: '季付' }, { key: 'half_year_price', label: '半年' }, { key: 'year_price', label: '一年' },
  { key: 'two_year_price', label: '两年' }, { key: 'three_year_price', label: '三年' }, { key: 'onetime_price', label: '一次性' }
] as const
type BillingPeriodKey = typeof billingPeriods[number]['key'] | 'reset_price'
const hasPrice = (plan: Plan, key: BillingPeriodKey) => typeof plan[key] === 'number'
const planFeatures = (plan: Plan) => (plan.content || `每月 ${plan.transfer_enable} GB 流量\n${plan.device_limit || '不限'} 台设备同时在线\n全球网络节点\n完整客户端支持`).replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]*>/g, '').split('\n').map((item) => item.trim()).filter(Boolean)
const statusMap: Record<number, string> = { 0: '待支付', 1: '开通中', 2: '已取消', 3: '已完成', 4: '已折抵' }
const safeHtml = (html: string) => DOMPurify.sanitize(html, { FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'link', 'style', 'form'] })

function useHashRoute() {
  const get = () => {
    const path = location.hash.replace(/^#/, '').split('?')[0] || (getAuth() || isDemo ? '/dashboard' : '/')
    return path.startsWith('/order/') ? '/orders' : path
  }
  const [route, setRoute] = useState(get)
  useEffect(() => { const listener = () => setRoute(get()); addEventListener('hashchange', listener); return () => removeEventListener('hashchange', listener) }, [])
  return [route, (next: string) => { location.hash = next }] as const
}

function useLoad<T>(loader: () => Promise<T>, dependencies: unknown[] = []) {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState('')
  const [version, setVersion] = useState(0)
  useEffect(() => { let mounted = true; setError(''); loader().then((value) => mounted && setData(value)).catch((reason) => mounted && setError(reason.message || '加载失败')); return () => { mounted = false } }, [...dependencies, version])
  return { data, error, reload: () => setVersion((value) => value + 1) }
}

function Logo({ compact = false, onClick }: { compact?: boolean; onClick?: () => void }) {
  const content = <>{settings.logo ? <img src={settings.logo} alt={brand} /> : <span className="logo-mark"><Icons.Sparkles size={18}/></span>}<span>{brand}</span>{!compact && <small>网络服务</small>}</>
  return onClick ? <button type="button" className={`logo logo-button ${compact ? 'compact' : ''}`} aria-label="返回概览" onClick={onClick}>{content}</button> : <div className={`logo ${compact ? 'compact' : ''}`}>{content}</div>
}

function Empty({ icon: Icon = Icons.Inbox, title, description }: { icon?: typeof Icons.Inbox; title: string; description?: string }) {
  return <div className="empty"><span><Icon size={25}/></span><strong>{title}</strong>{description && <p>{description}</p>}</div>
}

function Loading() { return <div className="loading"><i></i><span>正在同步数据</span></div> }
function ErrorBox({ message }: { message: string }) { return <div className="error-box"><Icons.CircleAlert size={18}/>{message}</div> }

function NoticeDialog({ notice, onClose }: { notice: NoticeItem | null; onClose: () => void }) {
  useEffect(() => {
    if (!notice) return
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose() }
    document.body.style.overflow = 'hidden'
    addEventListener('keydown', closeOnEscape)
    return () => { document.body.style.overflow = ''; removeEventListener('keydown', closeOnEscape) }
  }, [notice, onClose])
  if (!notice) return null
  return <div className="modal-layer notice-modal-layer" onMouseDown={onClose}>
    <section className="notice-modal" role="dialog" aria-modal="true" aria-labelledby="notice-dialog-title" onMouseDown={(event) => event.stopPropagation()}>
      <div className="notice-modal-heading"><div><span><Icons.Megaphone/></span><div><small>网站公告</small><h2 id="notice-dialog-title">{notice.title}</h2></div></div><button type="button" aria-label="关闭公告" onClick={onClose}><Icons.X/></button></div>
      <div className="notice-modal-meta"><Icons.CalendarDays/>{formatDate(notice.created_at, true)}</div>
      <div className="notice-modal-content" dangerouslySetInnerHTML={{ __html: safeHtml(notice.content || '') }}></div>
      <div className="notice-modal-actions"><button type="button" className="primary" onClick={onClose}>我知道了</button></div>
    </section>
  </div>
}

function BackToTop() {
  const [visible, setVisible] = useState(() => window.scrollY > 360)
  useEffect(() => {
    const update = () => setVisible(window.scrollY > 360)
    addEventListener('scroll', update, { passive: true })
    update()
    return () => removeEventListener('scroll', update)
  }, [])
  const scrollToTop = () => {
    const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches
    window.scrollTo({ top: 0, behavior: reducedMotion ? 'auto' : 'smooth' })
    if (!reducedMotion) setTimeout(() => { if (window.scrollY > 1) window.scrollTo({ top: 0, behavior: 'auto' }) }, 650)
  }
  return <button type="button" className={`back-to-top ${visible ? 'visible' : ''}`} aria-label="返回页面顶部" aria-hidden={!visible} tabIndex={visible ? 0 : -1} onClick={scrollToTop}><Icons.ArrowUpToLine/><span>顶部</span></button>
}

function SubscriptionQrDialog({ image, onClose }: { image: string; onClose: () => void }) {
  useEffect(() => {
    if (!image) return
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose() }
    document.body.style.overflow = 'hidden'
    addEventListener('keydown', closeOnEscape)
    return () => { document.body.style.overflow = ''; removeEventListener('keydown', closeOnEscape) }
  }, [image, onClose])
  if (!image) return null
  return <div className="modal-layer subscription-qr-layer" onMouseDown={onClose}>
    <section className="subscription-qr-modal" role="dialog" aria-modal="true" aria-labelledby="subscription-qr-title" onMouseDown={(event) => event.stopPropagation()}>
      <div className="subscription-qr-heading"><h2 id="subscription-qr-title">扫描二维码订阅</h2><button type="button" aria-label="关闭订阅二维码" onClick={onClose}><Icons.X/></button></div>
      <div className="subscription-qr-content"><img src={image} alt="订阅链接二维码"/><p>使用客户端扫描二维码，即可导入当前订阅。</p></div>
    </section>
  </div>
}

function RecaptchaBox({ siteKey, onToken }: { siteKey: string; onToken: (token: string) => void }) {
  const container = useRef<HTMLDivElement>(null)
  useEffect(() => {
    let cancelled = false
    const render = () => { if (!cancelled && container.current && window.grecaptcha) window.grecaptcha.render(container.current, { sitekey: siteKey, theme: 'dark', callback: onToken, 'expired-callback': () => onToken('') }); else if (!cancelled) setTimeout(render, 250) }
    let script = document.getElementById('shenlan-recaptcha') as HTMLScriptElement | null
    if (!script) { script = document.createElement('script'); script.id = 'shenlan-recaptcha'; script.async = true; script.defer = true; script.src = 'https://www.recaptcha.net/recaptcha/api.js?render=explicit'; document.head.appendChild(script) }
    render()
    return () => { cancelled = true }
  }, [siteKey])
  return <div className="recaptcha-box" ref={container}/>
}

function Landing({ navigate }: { navigate: (path: string) => void }) {
  const guest = useLoad<GuestConfig>(() => api('/api/v1/guest/comm/config', { auth: false }))
  return <div className="landing">
    <header><Logo/><nav><a href="#features">服务优势</a><a href="#steps">开始使用</a><button onClick={() => navigate('/login')}>登录</button><button className="primary" onClick={() => navigate('/register')}>立即注册</button></nav></header>
    <main>
      <section className="landing-hero"><div className="hero-orbit orbit-one"></div><div className="hero-orbit orbit-two"></div><span className="hero-badge"><i></i> 全球网络服务已就绪</span><h1>{settings.shenlan?.hero_title || '让每一次连接，都快人一步'}</h1><p>{settings.shenlan?.hero_description || guest.data?.app_description || settings.description || '低延迟全球网络、清晰的订阅管理和专注体验的客户端支持。'}</p><div className="hero-actions"><button className="primary" onClick={() => navigate('/register')}>免费开始 <Icons.ArrowRight size={18}/></button><button onClick={() => navigate('/login')}>已有账户登录</button></div><div className="trust-row"><span><Icons.ShieldCheck/>安全可靠</span><span><Icons.RadioTower/>全球线路</span><span><Icons.Zap/>智能加速</span></div></section>
      <section className="feature-strip" id="features"><article><b>多协议</b><span>适配面板可用节点</span></article><article><b>同源接口</b><span>账户数据由面板提供</span></article><article><b>响应式</b><span>支持桌面与移动设备</span></article><article><b>服务工单</b><span>问题反馈集中处理</span></article></section>
      <section className="landing-features" id="steps"><div><span>01</span><h2>订阅状态一眼掌握</h2><p>剩余流量、重置周期、到期时间和设备使用情况都集中在一个清晰的界面里。</p></div><div><span>02</span><h2>让合适的节点找到你</h2><p>按协议、状态和倍率快速筛选，减少选择成本，连接体验更直接。</p></div><div><span>03</span><h2>从购买到使用更流畅</h2><p>套餐、周期、优惠和支付信息分步确认，每一步都有明确反馈。</p></div></section>
    </main><footer><Logo compact/><span>稳定、安全、快速地连接世界</span><small>© {new Date().getFullYear()} {brand}</small></footer>
  </div>
}

function AuthPage({ mode, navigate, onLogin, notify }: { mode: 'login' | 'register' | 'forget'; navigate: (path: string) => void; onLogin: () => void; notify: Notify }) {
  const guest = useLoad<GuestConfig>(() => api('/api/v1/guest/comm/config', { auth: false }))
  const hashParams = new URLSearchParams(location.hash.includes('?') ? location.hash.split('?')[1] : '')
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [emailCode, setEmailCode] = useState('')
  const [invite, setInvite] = useState(new URLSearchParams(location.search).get('code') || hashParams.get('code') || '')
  const [recaptcha, setRecaptcha] = useState(''); const [recaptchaKey, setRecaptchaKey] = useState(0)
  const title = mode === 'login' ? '欢迎回来' : mode === 'register' ? '创建你的账户' : '重置登录密码'
  useEffect(() => { const verify = hashParams.get('verify'); if (mode !== 'login' || !verify) return; setLoading(true); api<{ auth_data?: string }>('/api/v1/passport/auth/token2Login', { auth: false, params: { verify } }).then((result) => { setAuth(result.auth_data || ''); onLogin(); const target = hashParams.get('redirect') || 'dashboard'; navigate(`/${target.replace(/^\//, '')}`) }).catch((error) => notify(error.message, 'error')).finally(() => setLoading(false)) }, [])
  const submit = async (event: React.FormEvent) => { event.preventDefault(); if (mode === 'register' && guest.data?.is_recaptcha === 1 && !recaptcha) { notify('请先完成人机验证', 'error'); return } setLoading(true); try { const endpoint = mode === 'login' ? '/api/v1/passport/auth/login' : mode === 'register' ? '/api/v1/passport/auth/register' : '/api/v1/passport/auth/forget'; const result = await api<{ auth_data?: string }>(endpoint, { method: 'POST', auth: false, params: { email, password, email_code: emailCode, invite_code: invite, recaptcha_data: recaptcha } }); if (mode === 'forget') { notify('密码已重置，请重新登录'); navigate('/login') } else { setAuth(result.auth_data || ''); onLogin(); navigate('/dashboard') } } catch (error) { notify((error as Error).message, 'error') } finally { setLoading(false) } }
  const sendCode = async () => { if (guest.data?.is_recaptcha === 1 && !recaptcha) { notify('请先完成人机验证', 'error'); return } try { await api('/api/v1/passport/comm/sendEmailVerify', { method: 'POST', auth: false, params: { email, recaptcha_data: recaptcha, isforget: mode === 'forget' ? 1 : 0 } }); notify('验证码已经发送'); if (guest.data?.is_recaptcha === 1) { setRecaptcha(''); setRecaptchaKey((value) => value + 1) } } catch (error) { notify((error as Error).message, 'error') } }
  return <div className="auth-page"><div className="auth-aside"><button className="back-button" onClick={() => navigate('/')}><Icons.ArrowLeft/>返回首页</button><Logo/><div><span className="hero-badge"><i></i> SHENLAN SECURE ACCESS</span><h1>简单连接，<br/>专注探索。</h1><p>清晰的体验，从登录的第一步开始。</p></div><div className="auth-quote"><Icons.Quote/><p>快速、稳定，而且每一项状态都清清楚楚。</p><span>来自 Shenlan 用户</span></div></div><div className="auth-main"><form onSubmit={submit}><div className="auth-heading"><h2>{title}</h2><p>{mode === 'login' ? '输入账户信息以继续使用服务' : mode === 'register' ? '注册后即可查看套餐与节点' : '验证邮箱后设置一个新密码'}</p></div><label>邮箱地址<input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" /></label>{mode !== 'login' && guest.data?.is_email_verify === 1 && <label>邮箱验证码<div className="input-action"><input required value={emailCode} onChange={(e) => setEmailCode(e.target.value)} placeholder="6 位验证码"/><button type="button" onClick={sendCode}>发送验证码</button></div></label>}<label>{mode === 'forget' ? '新密码' : '密码'}<input required minLength={8} type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="至少 8 位字符" /></label>{mode === 'register' && <label>邀请码{guest.data?.is_invite_force !== 1 && <small>选填</small>}<input required={guest.data?.is_invite_force === 1} value={invite} onChange={(e) => setInvite(e.target.value)} placeholder="输入邀请码" /></label>}{mode !== 'login' && guest.data?.is_recaptcha === 1 && guest.data.recaptcha_site_key && <RecaptchaBox key={recaptchaKey} siteKey={guest.data.recaptcha_site_key} onToken={setRecaptcha}/>}<button className="form-submit" disabled={loading}>{loading ? '请稍候…' : mode === 'login' ? '登录账户' : mode === 'register' ? '立即注册' : '确认重置'}</button>{mode === 'login' && <button type="button" className="form-link" onClick={() => navigate('/forget')}>忘记密码？</button>}<div className="auth-switch">{mode === 'login' ? <>还没有账户？<button type="button" onClick={() => navigate('/register')}>免费注册</button></> : <>已经有账户？<button type="button" onClick={() => navigate('/login')}>返回登录</button></>}</div></form></div></div>
}

const navItems = [
  { path: '/dashboard', label: '概览', icon: Icons.Home }, { path: '/store', label: '订阅商店', icon: Icons.ShoppingBag }, { path: '/nodes', label: '节点状态', icon: Icons.Server }, { path: '/knowledge', label: '使用文档', icon: Icons.BookOpen }, { path: '/invite', label: '邀请奖励', icon: Icons.Gift }, { path: '/deposit', label: '账户充值', icon: Icons.CircleDollarSign }, { path: '/account', label: '用户中心', icon: Icons.UserRound }, { path: '/traffic', label: '流量明细', icon: Icons.ChartNoAxesColumnIncreasing }, { path: '/orders', label: '我的订单', icon: Icons.ReceiptText }, { path: '/tickets', label: '服务工单', icon: Icons.MessageSquareText }
]

function DashboardShell({ route, navigate, user, reloadUser, notify }: { route: string; navigate: (path: string) => void; user: UserInfo; reloadUser: () => void; notify: Notify }) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [activeNotice, setActiveNotice] = useState<NoticeItem | null>(null)
  const notices = useLoad<NoticeItem[]>(() => api('/api/v1/user/notice/fetch', { params: { current: 1, pageSize: 100 } }))
  const current = route.startsWith('/checkout/') ? navItems[1] : route.startsWith('/payment/') ? navItems.find((item) => item.path === '/orders')! : navItems.find((item) => route.startsWith(item.path)) || navItems[0]
  const pageTitle = route.startsWith('/checkout/') ? '确认订单' : route.startsWith('/payment/') ? '支付订单' : current.label
  const logOut = () => { setAuth(''); navigate('/'); location.reload() }
  useEffect(() => {
    if (!mobileOpen) return
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') setMobileOpen(false) }
    document.body.style.overflow = 'hidden'
    addEventListener('keydown', closeOnEscape)
    return () => { document.body.style.overflow = ''; removeEventListener('keydown', closeOnEscape) }
  }, [mobileOpen])
  useEffect(() => {
    const popupNotice = notices.data?.find((notice) => Array.isArray(notice.tags) && notice.tags.includes('弹窗'))
    if (popupNotice) setActiveNotice(popupNotice)
  }, [notices.data])
  return <div className="dashboard-shell"><header className="topbar"><Logo compact onClick={() => navigate('/dashboard')}/><nav>{navItems.slice(0, 7).map((item) => <button className={current.path === item.path ? 'active' : ''} key={item.path} onClick={() => navigate(item.path)}><item.icon size={18}/>{item.label}</button>)}</nav><div className="top-actions"><button className="icon-button" aria-label="打开服务工单" onClick={() => navigate('/tickets')}><Icons.Bell size={18}/></button><button className="avatar" aria-label="打开用户中心" onClick={() => navigate('/account')}>{user.email.slice(0, 1).toUpperCase()}</button><button className="mobile-menu" aria-label={mobileOpen ? '关闭功能菜单' : '打开功能菜单'} aria-expanded={mobileOpen} onClick={() => setMobileOpen(!mobileOpen)}>{mobileOpen ? <Icons.X size={20}/> : <Icons.Menu size={20}/>}</button></div></header>
    {mobileOpen && <button className="mobile-backdrop" aria-label="关闭功能菜单" onClick={() => setMobileOpen(false)}></button>}
    <div className={`mobile-drawer ${mobileOpen ? 'open' : ''}`}>{navItems.map((item) => <button className={current.path === item.path ? 'active' : ''} onClick={() => { navigate(item.path); setMobileOpen(false) }} key={item.path}><item.icon/>{item.label}</button>)}<button onClick={logOut}><Icons.LogOut/>退出登录</button></div>
    <main className="app-main"><div className="page-heading"><h1>{pageTitle}</h1><div className="breadcrumb"><Icons.Home size={14}/> 首页 <Icons.ChevronRight size={14}/> {pageTitle}</div></div>
      {route.startsWith('/dashboard') && <DashboardPage navigate={navigate} notify={notify} notices={notices.data || []} noticesError={notices.error} openNotice={setActiveNotice}/>} {route.startsWith('/store') && <StorePage navigate={navigate}/>} {route.startsWith('/checkout/') && <CheckoutPage planId={Number(route.split('/')[2])} user={user} notify={notify} navigate={navigate}/>} {route.startsWith('/payment/') && <PaymentPage tradeNo={decodeURIComponent(route.split('/')[2] || '')} notify={notify} navigate={navigate}/>} {route.startsWith('/nodes') && <NodesPage/>} {route.startsWith('/knowledge') && <KnowledgePage/>} {route.startsWith('/invite') && <InvitePage notify={notify}/>} {route.startsWith('/deposit') && <DepositPage user={user} reloadUser={reloadUser} notify={notify} navigate={navigate}/>} {route.startsWith('/traffic') && <TrafficPage/>} {route.startsWith('/orders') && <OrdersPage notify={notify} navigate={navigate}/>} {route.startsWith('/tickets') && <TicketsPage notify={notify}/>} {route.startsWith('/account') && <AccountPage user={user} reloadUser={reloadUser} notify={notify} logOut={logOut}/>}</main><footer><Logo compact/><span>{settings.description || '稳定、安全、快速地连接世界'}</span><small>© {new Date().getFullYear()} {brand}</small></footer><NoticeDialog notice={activeNotice} onClose={() => setActiveNotice(null)}/></div>
}

function DashboardPage({ navigate, notify, notices, noticesError, openNotice }: { navigate: (path: string) => void; notify: Notify; notices: NoticeItem[]; noticesError: string; openNotice: (notice: NoticeItem) => void }) {
  const data = useLoad(async () => { const [subscribe, stat] = await Promise.all([api<SubscribeInfo>('/api/v1/user/getSubscribe'), api<number[]>('/api/v1/user/getStat')]); return { subscribe, stat } })
  const [subscriptionQr, setSubscriptionQr] = useState('')
  const [creatingQr, setCreatingQr] = useState(false)
  if (data.error) return <ErrorBox message={data.error}/>
  if (!data.data) return <Loading/>
  const { subscribe, stat } = data.data
  const used = subscribe.u + subscribe.d
  const percent = subscribe.transfer_enable ? Math.min(100, Math.round(used / subscribe.transfer_enable * 100)) : 0
  const copySubscribe = async () => {
    if (!subscribe.subscribe_url) return
    try { await navigator.clipboard.writeText(subscribe.subscribe_url); notify('复制成功') }
    catch { notify('复制失败，请手动复制订阅链接', 'error') }
  }
  const showSubscriptionQr = async () => {
    if (!subscribe.subscribe_url || creatingQr) return
    setCreatingQr(true)
    try { setSubscriptionQr(await QRCode.toDataURL(subscribe.subscribe_url, { width: 320, margin: 2, errorCorrectionLevel: 'M', color: { dark: '#06101f', light: '#ffffff' } })) }
    catch { notify('二维码生成失败，请使用复制订阅地址', 'error') }
    finally { setCreatingQr(false) }
  }
  return <><section className="welcome compact-welcome"><div><h2>你好，{subscribe.email.split('@')[0]}</h2><p>订阅状态与常用操作都已经为你整理好了。</p></div><div className="system-status"><i></i><div><strong>账户数据已同步</strong><span>当前信息来自面板接口</span></div><Icons.ShieldCheck/></div></section>
    <section className="panel dashboard-notices"><div className="card-title"><div><Icons.Megaphone size={20}/><h3>最新公告</h3></div><span>{notices.length ? `共 ${notices.length} 条` : ''}</span></div>{noticesError ? <ErrorBox message={noticesError}/> : notices.length ? <div className="notice-list">{notices.slice(0, 4).map((notice) => <article className="notice" key={notice.id}><span></span><div><strong>{notice.title}</strong><p>{notice.content.replace(/<[^>]*>/g, '').slice(0, 78)}</p><button type="button" className="notice-detail" onClick={() => openNotice(notice)}><Icons.Eye/>查看详情</button></div><time>{formatDate(notice.created_at)}</time></article>)}</div> : <Empty title="暂无公告"/>}</section>
    <section className="hero-grid"><article className="subscription-card"><div className="card-heading"><div><span className="soft-icon"><Icons.Zap size={20}/></span><div><small>当前订阅</small><h2>{subscribe.plan?.name || '尚未订阅套餐'}</h2></div></div><span className={`status-pill ${!subscribe.plan ? 'muted' : ''}`}>{subscribe.plan ? '运行中' : '未激活'}</span></div>{subscribe.plan ? <><div className="usage-row"><div className="usage-dial" style={{ background: `conic-gradient(var(--primary) 0 ${percent}%,rgba(111,137,178,.16) ${percent}% 100%)` }}><span>{percent}<small>%</small></span></div><div className="usage-copy"><strong>已使用 {formatBytes(used)}</strong><span>本周期共 {formatBytes(subscribe.transfer_enable)}</span><div className="meter"><i style={{ width: `${percent}%` }}></i></div><small>{subscribe.reset_day === null ? '流量不自动重置' : `距离重置还有 ${subscribe.reset_day} 天`}</small></div></div><div className="subscription-meta"><div><span>到期时间</span><strong>{formatDate(subscribe.expired_at)}</strong></div><div><span>在线设备</span><strong>{subscribe.alive_ip} / {subscribe.device_limit || '∞'}</strong></div><div><span>可用流量</span><strong>{formatBytes(Math.max(0, subscribe.transfer_enable - used))}</strong></div></div></> : <Empty icon={Icons.PackageOpen} title="还没有激活套餐" description="选择适合你的方案，解锁订阅与节点。"/>}</article>
      <article className="quick-card"><div className="card-title"><div><Icons.Download size={20}/><h3>快速连接</h3></div><button onClick={data.reload}><Icons.RefreshCw size={16}/></button></div><div className="subscribe-box"><span>你的订阅链接</span><code>{subscribe.subscribe_url || '购买套餐后生成'}</code><div className="subscribe-actions"><button disabled={!subscribe.subscribe_url} onClick={copySubscribe}><span className="subscribe-action-icon copy"><Icons.Copy/></span><span><strong>复制订阅地址</strong><small>复制订阅链接到剪贴板</small></span></button><button disabled={!subscribe.subscribe_url || creatingQr} onClick={showSubscriptionQr}><span className="subscribe-action-icon qr"><Icons.QrCode/></span><span><strong>{creatingQr ? '正在生成二维码' : '扫描二维码订阅'}</strong><small>使用客户端扫描二维码导入</small></span></button></div></div><div className="platforms"><button onClick={() => navigate('/knowledge')}><b>W</b><span>Windows</span></button><button onClick={() => navigate('/knowledge')}><b>M</b><span>macOS</span></button><button onClick={() => navigate('/knowledge')}><b>i</b><span>iOS</span></button><button onClick={() => navigate('/knowledge')}><b>A</b><span>Android</span></button></div></article></section><SubscriptionQrDialog image={subscriptionQr} onClose={() => setSubscriptionQr('')}/>
    <section className="stats-grid"><button onClick={() => navigate('/orders')}><span className="stat-icon blue"><Icons.ReceiptText/></span><div><small>待处理订单</small><strong>{stat[0] || 0} <em>笔</em></strong><span>查看订单记录</span></div></button><button onClick={() => navigate('/tickets')}><span className="stat-icon violet"><Icons.MessageSquareText/></span><div><small>进行中工单</small><strong>{stat[1] || 0} <em>个</em></strong><span>技术支持</span></div></button><button onClick={() => navigate('/invite')}><span className="stat-icon cyan"><Icons.Users/></span><div><small>成功邀请</small><strong>{stat[2] || 0} <em>人</em></strong><span>邀请好友使用</span></div></button><button onClick={() => navigate('/store')}><span className="stat-icon green"><Icons.CalendarClock/></span><div><small>剩余有效期</small><strong>{subscribe.expired_at ? Math.max(0, Math.ceil((subscribe.expired_at - Date.now() / 1000) / 86400)) : '∞'} <em>天</em></strong><span>保持服务连续</span></div></button></section>
    <section className="panel action-panel dashboard-actions"><div className="card-title"><div><Icons.Command size={20}/><h3>常用操作</h3></div></div><div className="action-grid"><button onClick={() => navigate('/store')}><span><Icons.ShoppingBag/></span><strong>购买套餐</strong><small>选择或续费订阅</small></button><button onClick={() => navigate('/nodes')}><span><Icons.Server/></span><strong>节点列表</strong><small>查看当前可用线路</small></button><button onClick={() => navigate('/traffic')}><span><Icons.ChartNoAxesColumnIncreasing/></span><strong>流量统计</strong><small>了解本月使用情况</small></button><button onClick={() => navigate('/orders')}><span><Icons.ReceiptText/></span><strong>我的订单</strong><small>查看订单与支付状态</small></button><button onClick={() => navigate('/tickets')}><span><Icons.Headphones/></span><strong>联系支持</strong><small>提交服务工单</small></button></div></section></>
}

function StorePage({ navigate }: { navigate: (path: string) => void }) {
  const plans = useLoad<Plan[]>(() => api('/api/v1/user/plan/fetch'))
  const config = useLoad<UserConfig>(() => api('/api/v1/user/comm/config'))
  if (plans.error) return <ErrorBox message={plans.error}/>
  if (!plans.data) return <Loading/>
  return <section className="store-page"><div className="section-title"><div><span>01</span><h2>选择适合你的套餐</h2></div><p>选择套餐后，再到确认页面选择付款周期。</p></div><div className="plan-grid">{plans.data.map((item, index) => {
    const prices = billingPeriods.filter(({ key }) => hasPrice(item, key)).map(({ key }) => Number(item[key]))
    const soldOut = item.capacity_limit !== null && item.capacity_limit !== undefined && item.capacity_limit <= 0
    return <article className="plan-card" key={item.id}>{index === 1 && <span className="recommend">推荐</span>}<div className="plan-top"><span className="plan-index">0{index + 1}</span><span className={`stock-pill ${soldOut ? 'sold-out' : ''}`}><Icons.PackageCheck/>{soldOut ? '暂时售罄' : '库存充足'}</span></div><h3>{item.name}</h3><p><strong>{formatMoney(prices.length ? Math.min(...prices) : 0, config.data?.currency_symbol)}</strong><span>起</span></p><div className="period-support" aria-label="支持的付款周期">{billingPeriods.map(({ key, label }) => <span className={hasPrice(item, key) ? 'supported' : 'unsupported'} key={key}>{hasPrice(item, key) ? <Icons.Check/> : <Icons.X/>}{label}</span>)}</div><div className="plan-spec">{planFeatures(item).map((feature) => <span key={feature}><Icons.CheckCircle2/>{feature}</span>)}</div><button className="primary plan-buy" disabled={soldOut || !prices.length} onClick={() => navigate(`/checkout/${item.id}`)}><Icons.ShoppingCart/>{soldOut ? '暂时售罄' : '购买'}</button></article>
  })}</div>{!plans.data.length && <Empty icon={Icons.PackageOpen} title="暂无可购买套餐"/>}</section>
}

function CheckoutPage({ planId, user, notify, navigate }: { planId: number; user: UserInfo; notify: Notify; navigate: (path: string) => void }) {
  const plans = useLoad<Plan[]>(() => api('/api/v1/user/plan/fetch'))
  const config = useLoad<UserConfig>(() => api('/api/v1/user/comm/config'))
  const [period, setPeriod] = useState<BillingPeriodKey>('month_price')
  const [coupon, setCoupon] = useState('')
  const [busy, setBusy] = useState(false)
  const [couponChecking, setCouponChecking] = useState(false)
  const plan = plans.data?.find((item) => item.id === planId)
  const periods: { key: BillingPeriodKey; label: string }[] = plan ? [
    ...billingPeriods.filter(({ key }) => hasPrice(plan, key)),
    ...(user.plan_id === plan.id && hasPrice(plan, 'reset_price') ? [{ key: 'reset_price' as const, label: '流量重置' }] : [])
  ] : []
  useEffect(() => { if (periods.length && !periods.some((item) => item.key === period)) setPeriod(periods[0].key) }, [planId, plan?.id])
  const amount = plan && hasPrice(plan, period) ? Number(plan[period]) : 0
  const validateCoupon = async () => { if (!plan || !coupon.trim()) { notify('请先输入优惠码', 'error'); return } setCouponChecking(true); try { await api('/api/v1/user/coupon/check', { method: 'POST', params: { code: coupon.trim(), plan_id: plan.id, period } }); notify('优惠码有效，创建订单时将自动使用') } catch (error) { notify((error as Error).message, 'error') } finally { setCouponChecking(false) } }
  const purchase = async () => { if (!plan || !periods.length) return; setBusy(true); try { if (coupon.trim()) await api('/api/v1/user/coupon/check', { method: 'POST', params: { code: coupon.trim(), plan_id: plan.id, period } }); const tradeNo = await api<string>('/api/v1/user/order/save', { method: 'POST', params: { plan_id: plan.id, period, coupon_code: coupon.trim() } }); notify(`订单 ${tradeNo} 已创建，请选择支付方式`); navigate(`/payment/${encodeURIComponent(tradeNo)}`) } catch (error) { notify((error as Error).message, 'error') } finally { setBusy(false) } }
  if (!Number.isInteger(planId) || planId <= 0) return <ErrorBox message="套餐参数无效，请返回商店重新选择"/>
  if (plans.error) return <ErrorBox message={plans.error}/>
  if (!plans.data) return <Loading/>
  if (!plan) return <section className="panel"><Empty icon={Icons.PackageX} title="没有找到这个套餐" description="套餐可能已下架，请返回商店重新选择。"/><button className="back-store centered" onClick={() => navigate('/store')}><Icons.ArrowLeft/>返回商店</button></section>
  return <section className="checkout-page"><div className="checkout-intro"><h2>订单信息</h2><p>请确认套餐信息、选择付款周期，然后创建订单。</p></div><div className="order-confirm-layout"><div className="order-main"><article className="order-plan-summary"><div className="order-plan-heading"><h3>{plan.name}</h3><span className="stock-pill"><Icons.PackageCheck/>库存充足</span></div><div className="order-features">{planFeatures(plan).map((feature) => <span key={feature}><Icons.CheckCircle2/>{feature}</span>)}</div></article><div className="section-title top-gap"><div><span>02</span><h2>选择付款周期</h2></div></div><div className="confirm-period-grid">{periods.map((item) => <button className={period === item.key ? 'selected' : ''} onClick={() => setPeriod(item.key)} key={item.key}><span>{item.label}</span><strong>{formatMoney(Number(plan[item.key]), config.data?.currency_symbol)}</strong><Icons.Check/></button>)}</div>{!periods.length && <ErrorBox message="该套餐当前没有可购买的付款周期"/>}</div><aside className="order-side"><section><div className="section-title"><div><i></i><h2>优惠码</h2></div></div><div className="coupon-input standalone"><input value={coupon} onChange={(event) => setCoupon(event.target.value)} placeholder="输入优惠码（如有）"/><button type="button" disabled={couponChecking} onClick={validateCoupon}><Icons.BadgeCheck/>{couponChecking ? '验证中…' : '验证'}</button></div></section><section><div className="section-title"><div><i></i><h2>订单摘要</h2></div></div><div className="order-summary"><div><span>套餐</span><strong>{plan.name}</strong></div><div><span>付款周期</span><strong>{periodMap[period]}</strong></div><div><span>小计</span><strong>{formatMoney(amount, config.data?.currency_symbol)}</strong></div><div className="order-total"><span>总计</span><strong>{formatMoney(amount, config.data?.currency_symbol)}</strong></div></div></section><div className="checkout-actions"><button className="back-store" onClick={() => navigate('/store')}><Icons.ArrowLeft/>返回商店</button><button className="primary checkout-button" disabled={busy || !periods.length} onClick={purchase}>{busy ? '正在创建订单…' : '提交订单'}<Icons.ShoppingCart/></button></div><p className="secure-note"><Icons.ShieldCheck/>订单由面板后端安全创建，支付方式将在订单页选择。</p></aside></div></section>
}

function NodesPage() {
  const nodes = useLoad<ServerNode[]>(() => api('/api/v1/user/server/fetch'))
  const [keyword, setKeyword] = useState(''); const [type, setType] = useState('all')
  const filtered = useMemo(() => (nodes.data || []).filter((node) => (type === 'all' || node.type === type) && node.name.toLowerCase().includes(keyword.toLowerCase())), [nodes.data, keyword, type])
  if (nodes.error) return <ErrorBox message={nodes.error}/>
  if (!nodes.data) return <Loading/>
  const types = [...new Set(nodes.data.map((node) => node.type))]
  return <><section className="toolbar"><div className="search"><Icons.Search/><input value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="搜索节点名称"/></div><div className="filter-tabs"><button className={type === 'all' ? 'active' : ''} onClick={() => setType('all')}>全部</button>{types.map((item) => <button className={type === item ? 'active' : ''} onClick={() => setType(item)} key={item}>{item.toUpperCase()}</button>)}</div><span>共 {filtered.length} 个节点</span></section><section className="node-grid">{filtered.map((node) => { const online = node.is_online === 1; const protocol = node.type.toUpperCase(); return <article key={`${node.type}-${node.id}`}><div className="node-card-top"><span className="country protocol-badge">{protocol.slice(0, 5)}</span><span className={`live ${online ? '' : 'offline'}`}><i></i>{online ? '在线' : '离线'}</span></div><h3>{node.name}</h3><p>{protocol} · {node.rate || 1}x 倍率</p><div className="node-tags">{(node.tags?.length ? node.tags : ['面板节点']).map((tag) => <span key={tag}>{tag}</span>)}</div><div className="node-meta"><span>状态来自面板后端</span><strong>{node.last_check_at ? `检测于 ${formatDate(node.last_check_at, true)}` : '暂无检测时间'}</strong></div></article> })}{!filtered.length && <Empty icon={Icons.ServerOff} title="没有找到匹配节点"/>}</section></>
}

function KnowledgePage() {
  const list = useLoad<Record<string, KnowledgeItem[]>>(() => api('/api/v1/user/knowledge/fetch', { params: { language: 'zh-CN' } }))
  const [keyword, setKeyword] = useState(''); const [article, setArticle] = useState<KnowledgeItem | null>(null); const [loading, setLoading] = useState(false)
  const open = async (id: number) => { setLoading(true); try { setArticle(await api('/api/v1/user/knowledge/fetch', { params: { id } })) } finally { setLoading(false) } }
  if (list.error) return <ErrorBox message={list.error}/>
  if (!list.data) return <Loading/>
  if (article) return <article className="article-view"><button className="back-button" onClick={() => setArticle(null)}><Icons.ArrowLeft/>返回文档列表</button><span className="article-category">{article.category}</span><h1>{article.title}</h1><p className="article-updated">最后更新：{formatDate(article.updated_at, true)}</p><div className="article-body" dangerouslySetInnerHTML={{ __html: safeHtml(article.body || '') }}></div></article>
  return <><section className="knowledge-hero"><Icons.BookOpenCheck/><h2>需要什么帮助？</h2><p>搜索客户端教程、订阅导入和常见问题。</p><div className="search large"><Icons.Search/><input value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="输入关键词搜索文档"/></div></section>{loading && <Loading/>}<section className="knowledge-groups">{Object.entries(list.data).map(([category, items]) => { const filtered = items.filter((item) => item.title.includes(keyword)); if (!filtered.length) return null; return <article key={category}><div className="group-heading"><span><Icons.Star/></span><div><h3>{category}</h3><p>{filtered.length} 篇文章</p></div></div>{filtered.map((item) => <button onClick={() => open(item.id)} key={item.id}><Icons.FileText/><span>{item.title}<small>更新于 {formatDate(item.updated_at)}</small></span><Icons.ChevronRight/></button>)}</article> })}</section></>
}

function InvitePage({ notify }: { notify: Notify }) {
  const invite = useLoad<InviteData>(() => api('/api/v1/user/invite/fetch')); const details = useLoad<CommissionLog[]>(() => api('/api/v1/user/invite/details', { params: { current: 1, page_size: 20 } })); const config = useLoad<UserConfig>(() => api('/api/v1/user/comm/config'))
  if (invite.error) return <ErrorBox message={invite.error}/>; if (!invite.data) return <Loading/>
  const [registered, earned, pending, rate, available] = invite.data.stat; const code = invite.data.codes[0]?.code; const link = `${location.origin}/?code=${code || ''}#/register`
  const create = async () => { try { await api('/api/v1/user/invite/save'); notify('新的邀请码已生成'); invite.reload() } catch (error) { notify((error as Error).message, 'error') } }
  return <><section className="invite-hero"><div><span className="hero-badge"><i></i> INVITE & EARN</span><h2>分享连接，收获奖励</h2><p>好友通过你的链接注册并购买套餐，你将按照当前比例获得奖励。</p><div className="invite-link"><code>{code ? link : '还没有可用邀请码'}</code>{code ? <button onClick={() => { navigator.clipboard.writeText(link); notify('邀请链接已复制') }}><Icons.Copy/>复制链接</button> : <button onClick={create}><Icons.Plus/>生成邀请码</button>}</div></div><span className="invite-art"><Icons.UsersRound/></span></section><section className="invite-stats"><article><span><Icons.Users/></span><div><small>成功邀请</small><strong>{registered} 人</strong></div></article><article><span><Icons.Percent/></span><div><small>当前比例</small><strong>{rate}%</strong></div></article><article><span><Icons.Clock3/></span><div><small>确认中</small><strong>{formatMoney(pending, config.data?.currency_symbol)}</strong></div></article><article><span><Icons.WalletCards/></span><div><small>可用佣金</small><strong>{formatMoney(available, config.data?.currency_symbol)}</strong></div></article></section><section className="panel table-panel"><div className="card-title"><div><Icons.History/><h3>奖励记录</h3></div><span>累计 {formatMoney(earned, config.data?.currency_symbol)}</span></div>{details.data?.length ? <div className="data-table"><div className="table-row table-head"><span>订单号</span><span>订单金额</span><span>获得奖励</span><span>时间</span></div>{details.data.map((item) => <div className="table-row" key={item.id}><span>{item.trade_no}</span><span>{formatMoney(item.order_amount, config.data?.currency_symbol)}</span><span className="success-text">+{formatMoney(item.get_amount, config.data?.currency_symbol)}</span><span>{formatDate(item.created_at, true)}</span></div>)}</div> : <Empty title="还没有奖励记录"/>}</section></>
}

function DepositPage({ user, reloadUser, notify, navigate }: { user: UserInfo; reloadUser: () => void; notify: Notify; navigate: (path: string) => void }) {
  const config = useLoad<UserConfig>(() => api('/api/v1/user/comm/config'))
  const presets = [600, 3000, 6800, 12800, 25600, 32800, 64800, 128000]
  const [selected, setSelected] = useState(0)
  const [custom, setCustom] = useState('')
  const [busy, setBusy] = useState(false)
  const [renewing, setRenewing] = useState(false)
  const customCents = custom.trim() ? Math.round(Number(custom) * 100) : 0
  const amount = selected || customCents
  const validAmount = Number.isFinite(amount) && amount > 0 && amount < 9999999
  const choosePreset = (value: number) => { setSelected(value); setCustom('') }
  const changeCustom = (value: string) => { setCustom(value); setSelected(0) }
  const toggleRenewal = async () => {
    setRenewing(true)
    try {
      await api('/api/v1/user/update', { method: 'POST', params: { auto_renewal: user.auto_renewal ? 0 : 1 } })
      notify(user.auto_renewal ? '已关闭余额自动续费' : '已开启余额自动续费')
      reloadUser()
    } catch (error) { notify((error as Error).message, 'error') }
    finally { setRenewing(false) }
  }
  const submit = async () => {
    if (!validAmount) { notify(amount >= 9999999 ? '单次充值金额过大，请降低金额后重试' : '请选择或输入有效的充值金额', 'error'); return }
    setBusy(true)
    try {
      const tradeNo = await api<string>('/api/v1/user/order/save', { method: 'POST', params: { plan_id: 0, period: 'deposit', deposit_amount: amount } })
      notify(`充值订单 ${tradeNo} 已创建，请选择支付方式`)
      navigate(`/payment/${encodeURIComponent(tradeNo)}`)
    } catch (error) { notify((error as Error).message, 'error') }
    finally { setBusy(false) }
  }
  return <section className="deposit-page"><div className="checkout-intro"><h2>账户充值</h2><p>选择预设金额或输入自定义金额。订单创建后将直接进入支付页面，支付成功后余额到账。</p></div><article className="deposit-balance-card"><div className="card-title"><div><Icons.WalletCards/><h3>账户余额</h3></div></div><div className="deposit-balance"><strong>{formatMoney(user.balance, config.data?.currency_symbol)}</strong><span>充值后的余额仅限消费，无法提现</span></div><div className="deposit-renewal"><div><strong>自动续费</strong><span>套餐到期时使用账户余额自动续订</span></div><button type="button" className={`switch ${user.auto_renewal ? 'on' : ''}`} aria-label={user.auto_renewal ? '关闭余额自动续费' : '开启余额自动续费'} aria-pressed={Boolean(user.auto_renewal)} disabled={renewing} onClick={toggleRenewal}><i></i></button></div></article><article className="deposit-amount-card"><div className="card-title"><div><Icons.CircleDollarSign/><h3>充值金额</h3></div></div><div className="deposit-note"><Icons.Info/>充值后的余额仅限消费，无法提现</div><div className="deposit-presets">{presets.map((value) => <button type="button" className={selected === value ? 'selected' : ''} aria-pressed={selected === value} onClick={() => choosePreset(value)} key={value}>{formatMoney(value, config.data?.currency_symbol)}</button>)}</div><label className="deposit-custom"><span>自定义金额</span><div><b>{config.data?.currency_symbol || '¥'}</b><input type="number" inputMode="decimal" min="0.01" max="99999.98" step="0.01" value={custom} onChange={(event) => changeCustom(event.target.value)} placeholder="请输入充值金额"/></div></label><div className="deposit-submit"><button type="button" className="back-store" onClick={() => navigate('/dashboard')}><Icons.ArrowLeft/>返回概览</button><button type="button" className="primary" disabled={busy || !validAmount} onClick={submit}><Icons.ShoppingCart/>{busy ? '正在创建订单…' : '立即充值'}</button></div></article></section>
}

function TrafficPage() {
  const logs = useLoad<TrafficLog[]>(() => api('/api/v1/user/stat/getTrafficLog'))
  if (logs.error) return <ErrorBox message={logs.error}/>; if (!logs.data) return <Loading/>
  const rows = logs.data.map((item) => ({ ...item, total: (item.u + item.d) * (item.server_rate || 1) })); const total = rows.reduce((sum, item) => sum + item.total, 0); const max = Math.max(...rows.map((item) => item.total), 1)
  return <><section className="traffic-overview"><article><span><Icons.ArrowUpFromLine/></span><div><small>本月上传</small><strong>{formatBytes(rows.reduce((sum, item) => sum + item.u, 0))}</strong></div></article><article><span><Icons.ArrowDownToLine/></span><div><small>本月下载</small><strong>{formatBytes(rows.reduce((sum, item) => sum + item.d, 0))}</strong></div></article><article><span><Icons.ChartSpline/></span><div><small>倍率后总计</small><strong>{formatBytes(total)}</strong></div></article></section><section className="panel traffic-chart"><div className="card-title"><div><Icons.ChartNoAxesColumnIncreasing/><h3>最近 14 天用量</h3></div></div><div className="bars">{rows.slice().reverse().map((item) => <div className="bar-item" key={item.record_at}><div><i style={{ height: `${Math.max(8, item.total / max * 100)}%` }}></i></div><span>{new Date(item.record_at * 1000).getDate()}</span><small>{formatBytes(item.total)}</small></div>)}</div></section><section className="panel table-panel traffic-table"><div className="card-title"><div><Icons.ListFilter/><h3>流量明细</h3></div></div><div className="data-table"><div className="table-row table-head"><span>日期</span><span>上传</span><span>下载</span><span>倍率后总计</span></div>{rows.map((item) => <div className="table-row" key={item.record_at}><span data-label="日期">{formatDate(item.record_at)}</span><span data-label="上传">{formatBytes(item.u)}</span><span data-label="下载">{formatBytes(item.d)}</span><span data-label="倍率后总计">{formatBytes(item.total)}</span></div>)}</div></section></>
}

function OrdersPage({ notify, navigate }: { notify: Notify; navigate: (path: string) => void }) {
  const orders = useLoad<OrderItem[]>(() => api('/api/v1/user/order/fetch')); const config = useLoad<UserConfig>(() => api('/api/v1/user/comm/config'))
  const [paying, setPaying] = useState<OrderItem | null>(null); const [methods, setMethods] = useState<PaymentMethod[]>([]); const [busy, setBusy] = useState(false); const [qrImage, setQrImage] = useState(''); const [qrValue, setQrValue] = useState('')
  const cancel = async (tradeNo: string) => { try { await api('/api/v1/user/order/cancel', { method: 'POST', params: { trade_no: tradeNo } }); notify('订单已取消'); orders.reload() } catch (error) { notify((error as Error).message, 'error') } }
  const openPay = async (order: OrderItem) => { try { setQrImage(''); setQrValue(''); setMethods(await api('/api/v1/user/order/getPaymentMethod')); setPaying(order) } catch (error) { notify((error as Error).message, 'error') } }
  const paymentAmount = (method: PaymentMethod) => paying ? Math.round(paying.total_amount * (1 + (method.handling_fee_percent || 0) / 100) + (method.handling_fee_fixed || 0)) : 0
  const feeText = (method: PaymentMethod) => { const parts: string[] = []; if (method.handling_fee_percent) parts.push(`${method.handling_fee_percent}%`); if (method.handling_fee_fixed) parts.push(formatMoney(method.handling_fee_fixed, config.data?.currency_symbol)); return parts.length ? `手续费 ${parts.join(' + ')}` : '无额外手续费' }
  const checkout = async (method: number) => { if (!paying) return; setBusy(true); try { const result = await apiEnvelope<unknown>('/api/v1/user/order/checkout', { method: 'POST', params: { trade_no: paying.trade_no, method } }); if (result.type === 0 && typeof result.data === 'string') { setQrValue(result.data); setQrImage(await QRCode.toDataURL(result.data, { width: 260, margin: 2, color: { dark: '#07101e', light: '#ffffff' } })) } else if (result.type === 1 && typeof result.data === 'string') { location.assign(result.data) } else { notify('支付请求已提交，请稍候查看订单状态'); setPaying(null) } setTimeout(orders.reload, 800) } catch (error) { notify((error as Error).message, 'error') } finally { setBusy(false) } }
  useEffect(() => { if (!paying || !qrImage) return; const timer = setInterval(async () => { try { const status = await api<number>('/api/v1/user/order/check', { params: { trade_no: paying.trade_no } }); if (status !== 0) { clearInterval(timer); setPaying(null); setQrImage(''); setQrValue(''); orders.reload(); notify('支付状态已更新') } } catch { /* 保持二维码页面，允许用户手动重试 */ } }, 3000); return () => clearInterval(timer) }, [paying?.trade_no, qrImage])
  if (orders.error) return <ErrorBox message={orders.error}/>; if (!orders.data) return <Loading/>
  return <><section className="panel table-panel orders-panel"><div className="card-title"><div><Icons.ReceiptText/><h3>全部订单</h3></div><span>共 {orders.data.length} 笔</span></div>{orders.data.length ? <div className="data-table orders-table"><div className="table-row table-head"><span>订单号</span><span>套餐</span><span>周期</span><span>金额</span><span>状态</span><span>操作</span></div>{orders.data.map((order) => <div className="table-row" key={order.trade_no}><span data-label="订单号">{order.trade_no}</span><span data-label="套餐">{order.plan?.name || '余额充值'}</span><span data-label="周期">{periodMap[order.period] || order.period}</span><span data-label="金额">{formatMoney(order.total_amount, config.data?.currency_symbol)}</span><span data-label="状态"><b className={`order-status status-${order.status}`}>{statusMap[order.status] || '未知'}</b></span><span data-label="操作">{order.status === 0 ? <span className="order-actions"><button onClick={() => navigate(`/payment/${encodeURIComponent(order.trade_no)}`)}>支付</button><button className="danger-link" onClick={() => cancel(order.trade_no)}>取消</button></span> : '—'}</span></div>)}</div> : <Empty icon={Icons.ReceiptText} title="还没有订单"/>}</section>{paying && <div className="modal-layer" onMouseDown={() => setPaying(null)}><section className="payment-modal" role="dialog" aria-modal="true" aria-label="选择支付方式" onMouseDown={(e) => e.stopPropagation()}><div className="card-title"><div><Icons.CreditCard/><h3>{qrImage ? '扫码完成支付' : '选择支付方式'}</h3></div><button aria-label="关闭支付窗口" onClick={() => setPaying(null)}><Icons.X/></button></div><div className="pay-order"><span>{paying.plan?.name || '订单支付'}</span><strong>{formatMoney(paying.total_amount, config.data?.currency_symbol)}</strong></div>{qrImage ? <div className="qr-payment"><img src={qrImage} alt="支付二维码"/><p>请使用对应支付应用扫描二维码，页面会自动更新订单状态</p><a href={qrValue} target="_blank" rel="noopener noreferrer">在当前设备打开支付链接</a></div> : <div className="payment-methods">{methods.map((method) => <button disabled={busy || method.payment === 'StripeCredit'} onClick={() => checkout(method.id)} key={method.id}>{method.icon ? <img src={method.icon} alt=""/> : <Icons.WalletCards/>}<span><strong>{method.name}</strong><small>{method.payment === 'StripeCredit' ? '暂不支持银行卡令牌输入，请改用 StripeCheckout' : `${method.payment} · ${feeText(method)}`}</small></span><span className="payment-total"><small>预计支付</small><strong>{formatMoney(paymentAmount(method), config.data?.currency_symbol)}</strong></span></button>)}</div>}{!methods.length && !qrImage && <Empty title="暂无可用支付方式"/>}</section></div>}</>
}

function PaymentPage({ tradeNo, notify, navigate }: { tradeNo: string; notify: Notify; navigate: (path: string) => void }) {
  const orders = useLoad<OrderItem[]>(() => api('/api/v1/user/order/fetch'))
  const config = useLoad<UserConfig>(() => api('/api/v1/user/comm/config'))
  const methods = useLoad<PaymentMethod[]>(() => api('/api/v1/user/order/getPaymentMethod'))
  const [busy, setBusy] = useState(false)
  const [qrImage, setQrImage] = useState('')
  const [qrValue, setQrValue] = useState('')
  const order = orders.data?.find((item) => item.trade_no === tradeNo)
  const isDeposit = order?.period === 'deposit' || order?.plan_id === 0
  const paymentAmount = (method: PaymentMethod) => order ? Math.round(order.total_amount * (1 + (method.handling_fee_percent || 0) / 100) + (method.handling_fee_fixed || 0)) : 0
  const feeText = (method: PaymentMethod) => { const parts: string[] = []; if (method.handling_fee_percent) parts.push(`${method.handling_fee_percent}%`); if (method.handling_fee_fixed) parts.push(formatMoney(method.handling_fee_fixed, config.data?.currency_symbol)); return parts.length ? `手续费 ${parts.join(' + ')}` : '无额外手续费' }
  const checkout = async (method: number) => {
    if (!order) return
    setBusy(true)
    try {
      const result = await apiEnvelope<unknown>('/api/v1/user/order/checkout', { method: 'POST', params: { trade_no: order.trade_no, method } })
      if (result.type === 0 && typeof result.data === 'string') {
        setQrValue(result.data)
        setQrImage(await QRCode.toDataURL(result.data, { width: 260, margin: 2, color: { dark: '#07101e', light: '#ffffff' } }))
      } else if (result.type === 1 && typeof result.data === 'string') location.assign(result.data)
      else { notify('支付请求已提交，请稍候查看订单状态'); navigate('/orders') }
    } catch (error) { notify((error as Error).message, 'error') }
    finally { setBusy(false) }
  }
  useEffect(() => {
    if (!order || !qrImage) return
    const timer = setInterval(async () => {
      try {
        const status = await api<number>('/api/v1/user/order/check', { params: { trade_no: order.trade_no } })
        if (status !== 0) { clearInterval(timer); notify('支付状态已更新'); navigate('/orders') }
      } catch { /* 保持二维码页面，允许用户继续扫码 */ }
    }, 3000)
    return () => clearInterval(timer)
  }, [order?.trade_no, qrImage])
  if (!tradeNo) return <ErrorBox message="订单号无效，请返回订单列表"/>
  if (orders.error || methods.error) return <ErrorBox message={orders.error || methods.error}/>
  if (!orders.data || !methods.data) return <Loading/>
  if (!order) return <section className="panel"><Empty icon={Icons.ReceiptText} title="没有找到这个订单" description="订单可能尚未同步，请到订单列表继续支付。"/><button className="back-store centered" onClick={() => navigate('/orders')}><Icons.ArrowLeft/>返回我的订单</button></section>
  if (order.status !== 0) return <section className="panel"><Empty icon={Icons.CheckCircle2} title="该订单无需继续支付" description={`当前状态：${statusMap[order.status] || '已处理'}`}/><button className="back-store centered" onClick={() => navigate('/orders')}><Icons.ArrowLeft/>返回我的订单</button></section>
  return <section className="payment-page"><div className="checkout-intro"><h2>{isDeposit ? '账户充值支付' : '选择支付方式'}</h2><p>订单已经创建，请选择可用的支付方式完成付款。</p></div><div className="payment-page-layout"><article className="payment-order-card"><div className="card-title"><div><Icons.ReceiptText/><h3>订单信息</h3></div><span className="order-status status-0">待支付</span></div><div className="payment-order-summary"><div><span>订单号</span><strong>{order.trade_no}</strong></div><div><span>{isDeposit ? '类型' : '套餐'}</span><strong>{isDeposit ? '账户充值' : order.plan?.name || '订单支付'}</strong></div><div><span>{isDeposit ? '入账项目' : '付款周期'}</span><strong>{isDeposit ? '账户余额' : periodMap[order.period] || order.period}</strong></div><div className="order-total"><span>{isDeposit ? '充值金额' : '订单金额'}</span><strong>{formatMoney(order.total_amount, config.data?.currency_symbol)}</strong></div></div><button className="back-store" onClick={() => navigate(isDeposit ? '/deposit' : '/orders')}><Icons.ArrowLeft/>{isDeposit ? '返回账户充值' : '返回我的订单'}</button></article><article className="payment-method-card"><div className="card-title"><div><Icons.CreditCard/><h3>{qrImage ? '扫码完成支付' : '支付方式'}</h3></div></div>{qrImage ? <div className="qr-payment"><img src={qrImage} alt="支付二维码"/><p>请使用对应支付应用扫描二维码，支付成功后页面会自动更新。</p><a href={qrValue} target="_blank" rel="noopener noreferrer">在当前设备打开支付链接</a></div> : <div className="payment-methods">{methods.data.map((method) => <button disabled={busy || method.payment === 'StripeCredit'} onClick={() => checkout(method.id)} key={method.id}>{method.icon ? <img src={method.icon} alt=""/> : <Icons.WalletCards/>}<span><strong>{method.name}</strong><small>{method.payment === 'StripeCredit' ? '暂不支持银行卡令牌输入，请改用 StripeCheckout' : `${method.payment} · ${feeText(method)}`}</small></span><span className="payment-total"><small>预计支付</small><strong>{formatMoney(paymentAmount(method), config.data?.currency_symbol)}</strong></span></button>)}</div>}{!methods.data.length && !qrImage && <Empty title="暂无可用支付方式"/>}</article></div></section>
}

function TicketsPage({ notify }: { notify: Notify }) {
  const tickets = useLoad<TicketItem[]>(() => api('/api/v1/user/ticket/fetch')); const [selected, setSelected] = useState<TicketItem | null>(null); const [creating, setCreating] = useState(false); const [subject, setSubject] = useState(''); const [message, setMessage] = useState(''); const [level, setLevel] = useState(1)
  const open = async (id: number) => { try { setSelected(await api('/api/v1/user/ticket/fetch', { params: { id } })) } catch (error) { notify((error as Error).message, 'error') } }
  const create = async (event: React.FormEvent) => { event.preventDefault(); try { await api('/api/v1/user/ticket/save', { method: 'POST', params: { subject, message, level } }); notify('工单已提交'); setCreating(false); setSubject(''); setMessage(''); tickets.reload() } catch (error) { notify((error as Error).message, 'error') } }
  const reply = async () => { if (!selected || !message) return; try { await api('/api/v1/user/ticket/reply', { method: 'POST', params: { id: selected.id, message } }); notify('回复已发送'); setMessage(''); open(selected.id) } catch (error) { notify((error as Error).message, 'error') } }
  if (tickets.error) return <ErrorBox message={tickets.error}/>; if (!tickets.data) return <Loading/>
  if (selected) return <section className="ticket-detail panel"><div className="card-title"><div><button className="back-button" onClick={() => setSelected(null)}><Icons.ArrowLeft/></button><div><h3>#{selected.id} {selected.subject}</h3><small>{selected.status ? '已关闭' : '处理中'}</small></div></div></div><div className="messages">{selected.message?.map((item) => <div className={`message ${item.is_me ? 'mine' : ''}`} key={item.id}><span>{item.is_me ? '我' : '客服'}</span><div><p>{item.message}</p><time>{formatDate(item.created_at, true)}</time></div></div>)}</div>{!selected.status && <div className="reply-box"><textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="输入回复内容"/><button className="primary" onClick={reply}><Icons.Send/>发送回复</button></div>}</section>
  return <>{creating ? <section className="panel create-ticket"><div className="card-title"><div><Icons.MessageSquarePlus/><h3>创建新工单</h3></div><button onClick={() => setCreating(false)}><Icons.X/></button></div><form onSubmit={create}><label>问题主题<input value={subject} required onChange={(e) => setSubject(e.target.value)} placeholder="简要描述你的问题"/></label><label>优先级<select value={level} onChange={(e) => setLevel(Number(e.target.value))}><option value={0}>低</option><option value={1}>普通</option><option value={2}>紧急</option></select></label><label>详细说明<textarea value={message} required onChange={(e) => setMessage(e.target.value)} placeholder="请描述遇到的现象、设备和已经尝试过的方法"/></label><button className="primary form-submit">提交工单</button></form></section> : <section className="panel ticket-list"><div className="card-title"><div><Icons.Headphones/><h3>服务工单</h3></div><button className="primary small" onClick={() => setCreating(true)}><Icons.Plus/>新建工单</button></div>{tickets.data.length ? tickets.data.map((ticket) => <button className="ticket-row" onClick={() => open(ticket.id)} key={ticket.id}><span className={`ticket-level level-${ticket.level}`}><Icons.MessageSquareText/></span><div><strong>#{ticket.id} {ticket.subject}</strong><small>创建于 {formatDate(ticket.created_at, true)}</small></div><b className={ticket.status ? 'closed' : 'open'}>{ticket.status ? '已关闭' : '处理中'}</b><Icons.ChevronRight/></button>) : <Empty title="还没有服务工单"/>}</section>}</>
}

function AccountPage({ user, reloadUser, notify, logOut }: { user: UserInfo; reloadUser: () => void; notify: Notify; logOut: () => void }) {
  const config = useLoad<UserConfig>(() => api('/api/v1/user/comm/config')); const [oldPassword, setOldPassword] = useState(''); const [newPassword, setNewPassword] = useState(''); const [giftcard, setGiftcard] = useState('')
  const update = async (field: keyof UserInfo, value: number) => { try { await api('/api/v1/user/update', { method: 'POST', params: { [field]: value } }); notify('设置已保存'); reloadUser() } catch (error) { notify((error as Error).message, 'error') } }
  const changePassword = async (event: React.FormEvent) => { event.preventDefault(); try { await api('/api/v1/user/changePassword', { method: 'POST', params: { old_password: oldPassword, new_password: newPassword } }); notify('密码修改成功，请重新登录'); logOut() } catch (error) { notify((error as Error).message, 'error') } }
  const redeem = async () => { try { await api('/api/v1/user/redeemgiftcard', { method: 'POST', params: { giftcard } }); notify('礼品卡兑换成功'); setGiftcard(''); reloadUser() } catch (error) { notify((error as Error).message, 'error') } }
  const resetSubscription = async () => { try { await api('/api/v1/user/resetSecurity'); notify('订阅链接已重置') } catch (error) { notify((error as Error).message, 'error') } }
  return <><section className="profile-hero"><div className="profile-avatar">{user.email[0].toUpperCase()}</div><div><h2>{user.email.split('@')[0]}</h2><p>{user.email}</p><span>注册于 {formatDate(user.created_at)}</span></div><div className="profile-balance"><small>账户余额</small><strong>{formatMoney(user.balance, config.data?.currency_symbol)}</strong></div></section><section className="settings-grid"><article className="panel"><div className="card-title"><div><Icons.BellRing/><h3>通知设置</h3></div></div>{([['remind_expire','到期邮件提醒','套餐即将到期时发送通知'],['remind_traffic','流量邮件提醒','流量即将耗尽时发送通知'],['auto_renewal','余额自动续费','使用账户余额自动续订套餐']] as const).map(([field, title, desc]) => <div className="setting-row" key={field}><div><strong>{title}</strong><small>{desc}</small></div><button className={`switch ${user[field] ? 'on' : ''}`} onClick={() => update(field, user[field] ? 0 : 1)}><i></i></button></div>)}</article><article className="panel"><div className="card-title"><div><Icons.ShieldCheck/><h3>安全设置</h3></div></div><div className="setting-action"><div><strong>重置订阅地址</strong><small>泄露后立即生成新的订阅链接</small></div><button className="danger" onClick={resetSubscription}>立即重置</button></div><form className="inline-form" onSubmit={changePassword}><h4>修改密码</h4><input type="password" required value={oldPassword} onChange={(e) => setOldPassword(e.target.value)} placeholder="当前密码"/><input type="password" required minLength={8} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="新密码（至少 8 位）"/><button>保存新密码</button></form></article><article className="panel"><div className="card-title"><div><Icons.Gift/><h3>兑换礼品卡</h3></div></div><p className="panel-description">输入礼品卡代码，可用于充值余额、增加流量或兑换套餐。</p><div className="input-action"><input value={giftcard} onChange={(e) => setGiftcard(e.target.value)} placeholder="输入礼品卡代码"/><button onClick={redeem}>立即兑换</button></div></article><article className="panel danger-zone"><div className="card-title"><div><Icons.LogOut/><h3>登录状态</h3></div></div><p>在公共设备上使用完毕后，请务必退出当前账户。</p><button onClick={logOut}>退出登录</button></article></section></>
}

export default function App() {
  const [route, navigate] = useHashRoute(); const [loggedIn, setLoggedIn] = useState(Boolean(getAuth()) || isDemo); const [toast, setToast] = useState<{ message: string; kind: string } | null>(null)
  const notify: Notify = (message, kind = 'success') => { setToast({ message, kind }); setTimeout(() => setToast(null), 3200) }
  const user = useLoad<UserInfo>(() => api('/api/v1/user/info'), [loggedIn])
  useEffect(() => { if (settings.shenlan?.accent) document.documentElement.style.setProperty('--primary', settings.shenlan.accent) }, [])
  let content
  if (!loggedIn && route === '/') content = <Landing navigate={navigate}/>
  else if (!loggedIn && ['/login','/register','/forget'].includes(route)) content = <AuthPage mode={route.slice(1) as 'login' | 'register' | 'forget'} navigate={navigate} onLogin={() => setLoggedIn(true)} notify={notify}/>
  else if (!loggedIn) content = <Landing navigate={navigate}/>
  else if (user.error) content = <div className="standalone-error"><Logo/><ErrorBox message={user.error}/><button onClick={() => { setAuth(''); setLoggedIn(false); navigate('/') }}>返回首页</button></div>
  else if (!user.data) content = <div className="splash"><Logo/><Loading/></div>
  else content = <DashboardShell route={route} navigate={navigate} user={user.data} reloadUser={user.reload} notify={notify}/>
  return <>{content}<BackToTop/>{toast && <div className={`toast ${toast.kind}`}><span>{toast.kind === 'success' ? <Icons.Check/> : <Icons.CircleAlert/>}</span>{toast.message}</div>}</>
}
