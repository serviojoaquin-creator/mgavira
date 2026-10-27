import { lazy, Suspense, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { Check, ArrowDown, ArrowRight, ArrowUpRight, Car, LayoutGrid, MapPin, Menu, MessageCircle, X } from 'lucide-react'
import { LoadingScreen } from './components/LoadingScreen'
import { ContactForm } from './components/ContactForm'
import { StaticHero, StaticBusinessSections } from './components/StaticOverview'
import { chapters, contact, insuranceCoverage, insuranceSteps, messages, reasons, services, whatsapp, type PanelId } from './data/site'
import './styles.css'
import './static-overview.css'

gsap.registerPlugin(ScrollTrigger)
const Experience3D = lazy(() => import('./components/Experience3D').then(module => ({ default: module.Experience3D })))
function webGLAvailable() {
  try {
    const canvas = document.createElement('canvas')
    return !!(canvas.getContext('webgl2') || canvas.getContext('webgl'))
  } catch { return false }
}
type PageView = 'static' | '3d'
function initialView(): PageView {
  const query = new URLSearchParams(window.location.search).get('view')
  // The regular entry always starts with the journey; static is an explicit choice.
  return query === 'static' ? 'static' : '3d'
}
const nav = [
  { label: 'Servicios', href: '#services' },
  { label: 'Cobertura', href: '#coverage' },
  { label: 'Nosotros', href: '#why' },
  { label: 'Contacto', href: '#contact' },
]

function ChapterDetails({ id }: { id: PanelId }) {
  if (id === 'services') return <div className="story-detail">
    {services.map((item, index) => <div className="story-row" key={item.title}>
      <span className="story-row-index">0{index + 1}</span><div><h3>{item.title}</h3><p>{item.text}</p></div>
    </div>)}
    <p className="story-footnote">Trabajamos con obras sociales y prepagas.</p>
  </div>
  if (id === 'coverage') return <div className="story-detail story-coverage">
    <div className="coverage-types"><span>CABA</span><i /><span>AMBA</span></div>
    <p>Traslados en la Ciudad Autónoma de Buenos Aires y el Área Metropolitana de Buenos Aires.</p>
    <p className="story-footnote">Consultanos por tu ubicación y los horarios que necesitás. Evaluamos cada solicitud según el recorrido.</p>
  </div>
  if (id === 'why') return <div className="story-detail">
    <div className="reason-lines">{reasons.map((item, index) => <div className="reason-line" key={item.title}>
      <span>0{index + 1}</span><div><h3>{item.title}</h3><p>{item.text}</p></div>
    </div>)}</div>
    <p className="story-footnote"><strong>6 años de experiencia</strong> acompañando a las familias en sus necesidades de traslado.</p>
  </div>
  return <div className="story-detail story-insurance">
    <p className="story-intro">Trabajamos con obras sociales y prepagas y te orientamos durante la gestión.</p>
    <div className="insurance-coverage"><h3>{insuranceCoverage.title}</h3><p>{insuranceCoverage.text}</p><small>{insuranceCoverage.requirements}</small></div>
    {insuranceSteps.map(step => <div className="story-row" key={step.number}>
      <span className="story-row-index">{step.number}</span><div><h3>{step.title}</h3><p>{step.text}</p></div>
    </div>)}
    <p className="story-legal">La disponibilidad y las autorizaciones están sujetas a evaluación y a las condiciones de cada cobertura.</p>
  </div>
}

export default function App() {
  const progress = useRef(0)
  const vignette = useRef<HTMLDivElement>(null)
  const [supports3D] = useState(webGLAvailable)
  const [pageView, setPageView] = useState<PageView>(initialView)
  const fallback = !supports3D || pageView === 'static'
  const pendingSection = useRef<string | null>(null)
  const [loading, setLoading] = useState(!fallback)
  const [sceneReady, setSceneReady] = useState(false)
  const [loadProgress, setLoadProgress] = useState(0)
  const markReady = useCallback(() => setSceneReady(true), [])
  const reportProgress = useCallback((value: number) => setLoadProgress(previous => Math.max(previous, value)), [])
  const finishLoading = useCallback(() => setLoading(false), [])
  const [active, setActive] = useState(0)
  const [arrived, setArrived] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [showJourneyNotice, setShowJourneyNotice] = useState(true)
  const [compact, setCompact] = useState(() => window.innerWidth < 760)

  useEffect(() => {
    const update = () => setCompact(window.innerWidth < 760)
    window.addEventListener('resize', update, { passive: true })
    return () => window.removeEventListener('resize', update)
  }, [])

  useEffect(() => { if (fallback) setLoading(false) }, [fallback])

  const changeView = (view: 'static' | '3d', directServices = false) => {
    pendingSection.current = view === '3d' ? 'inicio' : directServices ? 'services' : active === 0 ? 'inicio' : ['inicio', ...chapters.map(chapter => chapter.id), 'contact'][active]
    setMenuOpen(false)
    if (view === '3d' && supports3D) { setSceneReady(false); setLoadProgress(0); setLoading(true) }
    else setLoading(false)
    setPageView(view)
    const url = new URL(window.location.href)
    if (url.searchParams.has('view')) url.searchParams.set('view', view)
    url.hash = pendingSection.current
    window.history.replaceState(null, '', url)
  }

  useLayoutEffect(() => {
    const ids = ['inicio', ...chapters.map(chapter => chapter.id), 'contact']
    const elements = ids.map(id => document.getElementById(id)!)
    if (pendingSection.current) {
      const destination = document.getElementById(pendingSection.current)
      if (destination) window.scrollTo({ top: Math.max(0, destination.offsetTop - (fallback ? (compact ? 100 : 120) : 0)), behavior: 'instant' })
      pendingSection.current = null
    }
    const update = () => {
      const y = window.scrollY + 1
      const index = Math.max(0, elements.findIndex((_, i) => {
        const next = elements[i + 1]
        return !next || y < next.offsetTop
      }))
      const section = elements[index]
      const distance = index === ids.length - 1 ? Math.max(1, (document.getElementById('arrival-stage')?.offsetHeight ?? window.innerHeight) - window.innerHeight) : section.offsetHeight
      const local = Math.max(0, Math.min(1, (y - section.offsetTop) / distance))
      progress.current = (index + local) / ids.length
      if (vignette.current) vignette.current.style.opacity = String(index === 0 ? 1 - Math.min(1, local * 1.8) : 1)
      setActive(previous => previous === index ? previous : index)
      setArrived(index === 5 && local >= .72)
    }
    if (fallback) {
      window.addEventListener('scroll', update, { passive: true })
      update()
      return () => window.removeEventListener('scroll', update)
    }
    const trigger = ScrollTrigger.create({ trigger: '#journey', start: 'top top', end: 'bottom bottom', onUpdate: update, onRefresh: update })
    ScrollTrigger.refresh()
    update()
    return () => trigger.kill()
  }, [fallback, compact])

  const goToSign = (id: PanelId) => {
    const section = document.getElementById(id)
    if (section) window.scrollTo({ top: section.offsetTop + section.offsetHeight * .54, behavior: 'smooth' })
  }

  return <>
    {loading && <LoadingScreen progress={loadProgress} ready={sceneReady} onComplete={finishLoading} onSkip={() => changeView('static', true)} />}
    <div className={fallback ? 'site-view-static' : 'site-view-3d'} inert={loading} aria-hidden={loading || undefined}>
    {!fallback &&
      <Suspense fallback={<div className="fallback-scene" aria-hidden="true" />}>
        <Experience3D progress={progress} compact={compact} onOpen={goToSign} onReady={markReady} onProgress={reportProgress} />
      </Suspense>}
    {!fallback && <div id="sign-contact-layer" className="sign-contact-layer" aria-label="Contacto desde los carteles" />}
    {!fallback && <div ref={vignette} className={`scene-vignette${active > 0 ? ' city-view' : ''}`} aria-hidden="true" />}

    <header className="site-header">
      <a href="#inicio" className="brand" aria-label="Transporte MGavira, ir al inicio">
        <img className="brand-logo" src="/media/v20/logo.webp" width="76" height="76" alt="" />
        <span className="brand-word"><strong>TRANSPORTES</strong><b>MGAVIRA</b></span>
      </a>
      <nav className={`main-nav ${menuOpen ? 'open' : ''}`} aria-label="Navegación principal">
        {nav.map(item => <a key={item.href} href={item.href} onClick={() => setMenuOpen(false)}>{item.label}</a>)}
      </nav>
      <button className="view-toggle" data-static={fallback} disabled={!supports3D} onClick={() => changeView(fallback ? '3d' : 'static')}>
        {fallback ? <Car size={17} aria-hidden="true" /> : <LayoutGrid size={17} aria-hidden="true" />}
        <span>{!supports3D ? 'Vista estática' : fallback ? 'Ver recorrido 3D' : 'Ver carteles'}</span>
      </button>
      <a className="header-contact" href={whatsapp(messages.main)} target="_blank" rel="noopener noreferrer">Hablemos <ArrowUpRight size={16} aria-hidden="true" /></a>
      <button className="menu-toggle" aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'} aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X size={24} /> : <Menu size={24} />}</button>
    </header>

    {!fallback && !loading && showJourneyNotice && <aside className="journey-notice" aria-labelledby="journey-notice-title">
      <button className="journey-notice-close" aria-label="Cerrar aviso del recorrido 3D" onClick={() => setShowJourneyNotice(false)}><X size={18} aria-hidden="true" /></button>
      <div className="journey-notice-title"><Car size={22} aria-hidden="true" /><h2 id="journey-notice-title">Esta página se recorre en 3D</h2></div>
      <p>Si preferís evitar el recorrido, podés ver directamente todos los servicios y la información de MGavira.</p>
      <button className="journey-notice-direct" onClick={() => changeView('static', true)}>Ver servicios sin recorrido <ArrowUpRight size={17} aria-hidden="true" /></button>
      <button className="journey-notice-continue" onClick={() => setShowJourneyNotice(false)}>Seguir con el recorrido 3D <ArrowRight size={15} aria-hidden="true" /></button>
    </aside>}

    <main id="journey">
      <section id="inicio" className="scene-section hero-section" aria-labelledby="hero-title">
        {fallback ? <StaticHero /> : <>
        <div className="section-copy hero-copy">
          <h1 id="hero-title">Tu viaje,<br />en buenas<br /><span>manos.</span></h1>
          <p className="hero-description">A terapias, Centro Educativo Terapéutico y colegios.<br />Te acompañamos en cada recorrido, con el cuidado que necesitás.</p>
          <div className="hero-actions">
            <a className="button button-primary" href={whatsapp(messages.main)} target="_blank" rel="noopener noreferrer">Coordinemos tu traslado <ArrowUpRight size={18} aria-hidden="true" /></a>
            <a className="hero-explore" href="#services">Conocé cómo viajamos <ArrowRight size={18} aria-hidden="true" /></a>
          </div>
        </div>
        <div className="hero-baseline"><div className="hero-proof"><span><strong>6 años</strong> acompañando familias</span><i /><span><strong>CABA + AMBA</strong> nuestra zona de cobertura</span></div><a className="scroll-cue" href="#services"><span>EL RECORRIDO EMPIEZA ACÁ</span><ArrowDown size={18} aria-hidden="true" /></a></div>
        </>}
      </section>

      {fallback ? <StaticBusinessSections Details={ChapterDetails} /> : <div className="sign-gallery">
        {chapters.map(chapter => <section key={chapter.id} id={chapter.id} className={`journey-chapter chapter-${chapter.id}`} aria-labelledby={`${chapter.id}-title`}>
          <div className="visually-hidden">
            <h2 id={`${chapter.id}-title`}>{chapter.sign}</h2>
            <ChapterDetails id={chapter.id} />
          </div>
        </section>)}
      </div>}

      <section id="contact" className={`contact-section${fallback ? ' contact-fallback' : ''}`} aria-labelledby={fallback ? 'contact-title' : 'arrival-title'}>
        <div id="arrival-stage" className="arrival-stage">
          <div className="arrival-view">
            <div className="arrival-topline"><span>06 / EL DESTINO</span><span>BUENOS AIRES · ARGENTINA</span></div>
            <div className="arrival-caption">
              <div className="arrival-status"><span className={arrived ? 'status-dot settled' : 'status-dot'} />{arrived ? 'Llegamos a destino' : 'El último tramo'}</div>
              <h2 id="arrival-title">Llegar bien.<br /><em>Eso es lo que cuenta.</em></h2>
              <p>En cada viaje, la tranquilidad de estar acompañado.</p>
            </div>
            <a className="arrival-next" href="#consulta"><span>EL PRÓXIMO RECORRIDO EMPIEZA CON VOS</span><span className="arrival-next-icon"><ArrowDown size={22} aria-hidden="true" /></span></a>
            <div className="arrival-check" aria-hidden="true"><Check size={18} /><span>Cerca, de principio a fin.</span></div>
          </div>
        </div>
        <div id="consulta" className="contact-destination" aria-labelledby="contact-title">
          <div className="contact-heading"><span>TRANSPORTE MGAVIRA</span><span>HABLEMOS DE TU PRÓXIMO VIAJE <ArrowUpRight size={16} aria-hidden="true" /></span></div>
          <div className="contact-shell">
            <div className="contact-intro">
              <span className="eyebrow"><span className="eyebrow-line" /> ESTAMOS CERCA</span>
              <h2 id="contact-title">Tu próximo<br />recorrido,<br /><em>lo coordinamos juntos.</em></h2>
              <p>Contanos adónde necesitás ir. Revisamos el recorrido y la disponibilidad para acompañarte.</p>
              <a className="contact-direct" href={whatsapp(messages.main)} target="_blank" rel="noopener noreferrer"><MessageCircle size={23} aria-hidden="true" /><span>¿Preferís hablar directamente?<strong>Escribinos por WhatsApp <ArrowUpRight size={18} aria-hidden="true" /></strong></span></a>
              <div className="contact-facts">
                <div><MapPin size={17} aria-hidden="true" /><span>{contact.coverage}</span></div>
                <div><span>{contact.hours}</span></div>
                <div><span>{contact.phoneDisplay}</span></div>
              </div>
            </div>
            <ContactForm />
          </div>
          <div className="contact-signoff"><span>{fallback ? 'Cerca, de principio a fin.' : 'Gracias por recorrer la ciudad con nosotros.'}</span><a className="text-link" href="#inicio">Volver al inicio <ArrowUpRight size={16} aria-hidden="true" /></a></div>
        </div>
      </section>
    </main>

    {!fallback && <div className={`journey-index${active === 5 || active === 0 ? ' arrival-hidden' : ''}`} aria-hidden="true"><span>RECORRIDO</span><div className="index-bars">{Array.from({ length: 6 }, (_, i) => <i className={i === active ? 'active' : ''} key={i} />)}</div><b>0{active + 1} / 06</b></div>}
    <a className={`floating-whatsapp${active === 5 || active === 0 || (!fallback && showJourneyNotice) ? ' arrival-hidden' : ''}`} href={whatsapp(messages.main)} target="_blank" rel="noopener noreferrer" aria-label="Consultar por WhatsApp"><MessageCircle size={21} aria-hidden="true" /><span>WhatsApp</span></a>
    <footer className="site-footer"><span>© {new Date().getFullYear()} Transporte MGavira</span><span>Traslados en CABA y AMBA · Atención cercana, recorridos responsables.</span></footer>
    </div>
  </>
}


