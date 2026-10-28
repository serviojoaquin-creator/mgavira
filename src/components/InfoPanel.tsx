import { useEffect, useRef } from 'react'
import { ArrowUpRight, X, MapPin, Clock3, HeartHandshake, ShieldCheck, MessageCircleMore } from 'lucide-react'
import { chapters, insuranceCoverage, insuranceSteps, messages, reasons, serviceOverview, whatsapp, type PanelId } from '../data/site'

const icons = [ShieldCheck, Clock3, HeartHandshake, MessageCircleMore]

export function InfoPanel({ panel, onClose }: { panel: PanelId | null; onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    if (!panel) return
    const previousFocus = document.activeElement as HTMLElement | null
    const old = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeRef.current?.focus()
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose() }
    window.addEventListener('keydown', escape)
    return () => { document.body.style.overflow = old; window.removeEventListener('keydown', escape); previousFocus?.focus() }
  }, [panel, onClose])
  if (!panel) return null
  const chapter = chapters.find(x => x.id === panel)!
  return <div className="panel-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) onClose() }}>
    <section className="info-panel" role="dialog" aria-modal="true" aria-labelledby="panel-title" tabIndex={-1}>
      <div className="panel-top"><span className="eyebrow">{chapter.eyebrow} · TRANSPORTE MGAVIRA</span><button ref={closeRef} className="icon-button" type="button" aria-label="Cerrar información" onClick={onClose}><X size={22} /></button></div>
      <h2 id="panel-title">{chapter.heading}</h2>
      {panel === 'services' && <>
        {serviceOverview.paragraphs.map(paragraph => <p className="panel-lede" key={paragraph}>{paragraph}</p>)}
        <div className="panel-callout">{serviceOverview.coverage}</div>
        <a className="button button-primary" href={whatsapp(messages.services)} target="_blank" rel="noopener noreferrer">Consultar por un traslado <ArrowUpRight size={18} /></a>
      </>}
      {panel === 'coverage' && <>
        <p className="panel-lede">Ofrecemos servicios de traslado en la Ciudad Autónoma de Buenos Aires y el Área Metropolitana de Buenos Aires.</p>
        <div className="coverage-map" role="img" aria-label="Representación esquemática de la cobertura en CABA y AMBA; no indica recorridos fijos">
          <div className="coverage-ring ring-outer"><span>AMBA</span><div className="coverage-ring ring-inner"><span>CABA</span><MapPin size={32} /></div></div>
          <div className="map-caption">Área de consulta · representación orientativa</div>
        </div>
        <p>Consultanos por tu ubicación y los horarios que necesitás. Evaluamos cada solicitud según el recorrido.</p>
        <a className="button button-primary" href={whatsapp(messages.coverage)} target="_blank" rel="noopener noreferrer">Consultar disponibilidad <ArrowUpRight size={18} /></a>
      </>}
      {panel === 'why' && <>
        <p className="panel-lede">Sabemos lo importante que es para cada familia contar con un servicio responsable, puntual y comprometido.</p>
        <div className="panel-cards two">{reasons.map((item, i) => { const Icon = icons[i]; return <article className="mini-card" key={item.title}><Icon size={24} className="reason-icon" aria-hidden="true" /><h3>{item.title}</h3><p>{item.text}</p></article> })}</div>
        <div className="experience-callout"><strong>6</strong><div><b>años de experiencia</b><span>Una trayectoria acompañando a las familias en sus necesidades de traslado.</span></div></div>
        <a className="button button-primary" href={whatsapp(messages.main)} target="_blank" rel="noopener noreferrer">Contactanos por WhatsApp <ArrowUpRight size={18} /></a>
      </>}
      {panel === 'insurance' && <>
        <p className="panel-lede">En Transporte MGavira trabajamos con obras sociales y prepagas y ofrecemos orientación para gestionar las autorizaciones correspondientes.</p>
        <div className="insurance-coverage"><h3>{insuranceCoverage.title}</h3><p>{insuranceCoverage.text}</p><small>{insuranceCoverage.requirements}</small></div>
        <div className="steps">{insuranceSteps.map(step => <article key={step.number}><span>{step.number}</span><div><h3>{step.title}</h3><p>{step.text}</p></div></article>)}</div>
        <p className="fine-print">La disponibilidad del servicio y las autorizaciones están sujetas a evaluación y a las condiciones de cada cobertura.</p>
        <a className="button button-primary" href={whatsapp(messages.insurance)} target="_blank" rel="noopener noreferrer">Consultar por mi cobertura <ArrowUpRight size={18} /></a>
      </>}
    </section>
  </div>
}
