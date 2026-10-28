import { useEffect, type ReactNode } from 'react'
import { ArrowDown, ArrowRight, ArrowUpRight, CheckCheck, Clock3, HeartHandshake, MapPin, MessageCircle, Plus, ShieldCheck, Sparkles } from 'lucide-react'
import { insuranceSteps, messages, reasons, serviceOverview, whatsapp } from '../data/site'

const cudSource = 'https://www.argentina.gob.ar/justicia/derechofacil/leysimple/certificado-unico-discapacidad'
const cudMessage = 'Hola, cuento con CUD y quisiera consultar por un traslado con mi obra social o prepaga.'
const sectionLinks = [['services', 'Servicios'], ['coverage', 'Cobertura'], ['why', 'Nuestro compromiso'], ['insurance', 'CUD y obras sociales']] as const

function useStaticMotion() {
  useEffect(() => {
    const root = document.querySelector<HTMLElement>('.site-view-static')
    if (!root) return
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    let observer: IntersectionObserver | undefined
    const setup = () => {
      observer?.disconnect()
      root.removeAttribute('data-motion')
      if (media.matches || !('IntersectionObserver' in window)) return
      const items = root.querySelectorAll<HTMLElement>('[data-reveal]')
      items.forEach(item => item.classList.remove('is-revealed'))
      root.dataset.motion = 'on'
      observer = new IntersectionObserver(entries => {
        for (const entry of entries) if (entry.isIntersecting) {
          entry.target.classList.add('is-revealed')
          observer?.unobserve(entry.target)
        }
      }, { threshold: .08, rootMargin: '0px 0px -24px 0px' })
      items.forEach(item => observer!.observe(item))
    }
    setup()
    media.addEventListener('change', setup)
    return () => { observer?.disconnect(); media.removeEventListener('change', setup); root.removeAttribute('data-motion') }
  }, [])
}

function ContactLink({ children, message = messages.main, light = false }: { children: ReactNode; message?: string; light?: boolean }) {
  return <a className={`sl-action${light ? ' sl-action-light' : ''}`} href={whatsapp(message)} target="_blank" rel="noopener noreferrer">{children}<span><ArrowUpRight size={19} aria-hidden="true" /></span></a>
}

export function StaticHero() {
  useStaticMotion()
  return <>
    <div className="sl-hero">
      <div className="sl-hero-copy" data-reveal>
        <p className="sl-eyebrow"><span />TRANSPORTES MGAVIRA · CABA Y AMBA</p>
        <h1 id="hero-title">Hay viajes<br />que empiezan<br />con <em>confianza.</em></h1>
        <p className="sl-hero-lede">A terapias, al Centro Educativo Terapéutico (CET), al colegio. Te acompañamos con la tranquilidad de saber que estás en buenas manos.</p>
        <div className="sl-hero-actions"><ContactLink>Coordinemos tu traslado</ContactLink><a className="sl-text-link" href="#services">Conocé los servicios <ArrowDown size={16} aria-hidden="true" /></a></div>
        <div className="sl-hero-proof"><div className="sl-proof-icon"><HeartHandshake size={23} aria-hidden="true" /></div><p><strong>Cerca, de principio a fin.</strong><span>6 años acompañando a las familias.</span></p></div>
      </div>
      <div className="sl-hero-art" data-reveal>
        <div className="sl-hero-orbit" aria-hidden="true"><svg viewBox="0 0 600 600"><path d="M100 520C-30 310 65 20 315 50S680 265 505 470 140 660 100 520Z" /></svg></div>
        <figure className="sl-hero-photo"><img src="/media/v24/familia.webp" alt="Una familia abrazada y sonriente al aire libre." width="768" height="512" fetchPriority="high" /><figcaption><span>Lo más importante del viaje</span><strong>son las personas.</strong></figcaption></figure>
        <figure className="sl-hero-inset"><img src="/media/v24/acompanamiento.webp" alt="Una madre acompaña a su hija durante un viaje en auto." width="730" height="375" /><figcaption><span />Un traslado. Mucho cuidado.</figcaption></figure>
        <a className="sl-cud-badge" href="#cud"><ShieldCheck size={24} aria-hidden="true" /><span>Trabajamos con CUD<strong>Conocé cómo te acompañamos</strong></span><ArrowUpRight size={16} aria-hidden="true" /></a>
        <span className="sl-art-note" aria-hidden="true">CADA FAMILIA, UN RECORRIDO.</span>
      </div>
    </div>
    <nav className="sl-section-nav" aria-label="Explorar información">{sectionLinks.map(([id, label], i) => <a key={id} href={`#${id}`}><span>0{i + 1}</span>{label}<ArrowDown size={15} aria-hidden="true" /></a>)}</nav>
    <div className="sl-intro-line" data-reveal><p>No es solo llegar.<br /><strong>Es cómo te acompañamos.</strong></p><span>Organización, empatía y comunicación directa en cada recorrido.</span><ArrowDown size={25} aria-hidden="true" /></div>
  </>
}

function ServiceSection() {
  return <section id="services" className="journey-chapter sl-section sl-services" aria-labelledby="services-title">
    <div className="sl-section-top" data-reveal><div><p className="sl-eyebrow">01 / NUESTROS SERVICIOS</p><h2 id="services-title">Tu rutina, con un<br /><em>mejor recorrido.</em></h2></div></div>
    <div className="sl-services-layout">
      <div className="sl-services-visual" data-reveal>
        <img className="is-active" src="/media/v24/acompanamiento.webp" alt="Una madre acompaña a su hija durante un viaje en auto." width="730" height="375" loading="lazy" decoding="async" />
        <div className="sl-service-photo-caption"><span>EL CUIDADO VIAJA CON VOS</span><strong>Cerca, en cada recorrido.</strong></div>
      </div>
      <div className="sl-service-overview" data-reveal>
        <h3>{serviceOverview.title}</h3>
        {serviceOverview.paragraphs.map(paragraph => <p key={paragraph}>{paragraph}</p>)}
        <ContactLink message={messages.services}>Consultá por tu traslado</ContactLink>
        <div className="sl-service-note"><ShieldCheck size={20} aria-hidden="true" /><p>{serviceOverview.coverage}<a href="#insurance">Te contamos cómo <ArrowRight size={14} aria-hidden="true" /></a></p></div>
      </div>
    </div>
  </section>
}

function AreaIllustration() {
  return <div className="sl-map" aria-label="Ilustración esquemática de la cobertura en CABA y AMBA">
    <svg viewBox="0 0 640 480" role="img" aria-labelledby="sl-map-title">
      <title id="sl-map-title">Recorridos coordinados en CABA y AMBA. Esquema ilustrativo, sin límites geográficos exactos.</title>
      <defs><pattern id="sl-map-grid" width="42" height="42" patternUnits="userSpaceOnUse" patternTransform="rotate(-25)"><path d="M42 0H0V42" fill="none" stroke="#aa95ba" strokeWidth="1" opacity=".18" /></pattern><linearGradient id="sl-map-water" x2="0" y2="1"><stop stopColor="#a6cbbd" /><stop offset="1" stopColor="#d6dfca" /></linearGradient></defs>
      <rect width="640" height="480" fill="#e9e3e9" /><path d="M390-20C470 85 435 110 492 185S510 310 670 358V-20Z" fill="url(#sl-map-water)" /><path d="M390-20C470 85 435 110 492 185S510 310 670 358" fill="none" stroke="#789a87" strokeWidth="3" opacity=".45" />
      <rect width="640" height="480" fill="url(#sl-map-grid)" /><circle cx="313" cy="245" r="174" fill="#bca3ce" opacity=".13" /><circle cx="313" cy="245" r="126" fill="none" stroke="#aa8abc" strokeDasharray="3 9" /><circle cx="313" cy="245" r="174" fill="none" stroke="#aa8abc" opacity=".3" />
      <path className="sl-map-route sl-route-one" d="M140 358Q190 350 185 280T264 222 353 141" /><path className="sl-map-route sl-route-two" d="M204 115Q210 205 304 245T412 330" />
      {[[140,358],[353,141],[204,115],[412,330],[304,245]].map(([x,y],i)=><g key={i} transform={`translate(${x} ${y})`}><circle r="13" fill="#f8f5f8" /><circle r="6" fill={i===4?'#147756':'#81539e'} /></g>)}
      <g fill="#55425f" fontFamily="Arial,sans-serif" fontWeight="700"><text x="82" y="77" fontSize="31">AMBA</text><text x="324" y="263" fontSize="25">CABA</text></g><text x="465" y="92" fill="#668477" fontFamily="Arial,sans-serif" fontSize="12" transform="rotate(37 465 92)">RÍO DE LA PLATA</text>
    </svg>
    <div className="sl-map-label"><span className="sl-live-dot" /><span>Tu próximo recorrido empieza acá.</span><MapPin size={18} aria-hidden="true" /></div>
    <small>Mapa ilustrativo. Consultá por tu localidad.</small>
  </div>
}

function CoverageSection() {
  return <section id="coverage" className="journey-chapter sl-section sl-coverage" aria-labelledby="coverage-title"><div className="sl-coverage-copy" data-reveal><p className="sl-eyebrow">02 / CERCA DE VOS</p><h2 id="coverage-title">De tu puerta<br /><em>a tu destino.</em></h2><p>Trabajamos en la Ciudad de Buenos Aires y el Área Metropolitana de Buenos Aires. Organizamos cada recorrido de forma personalizada.</p><div className="sl-area-tags"><span>CABA</span><span>AMBA</span><span>Horarios coordinados</span></div><ContactLink light message={messages.coverage}>Consultá por tu zona</ContactLink><small>Evaluamos disponibilidad según origen, destino, días y horarios.</small></div><div className="sl-map-wrap" data-reveal><AreaIllustration /></div></section>
}

function CommitmentSection() {
  const icons = [ShieldCheck, Clock3, HeartHandshake, MessageCircle]
  return <section id="why" className="journey-chapter sl-section sl-commitment" aria-labelledby="why-title"><div className="sl-commitment-photo" data-reveal><img src="/media/v25/familia-acompanamiento.webp" alt="Una madre y su hija comparten un abrazo y sonríen en casa." width="960" height="640" loading="lazy" decoding="async" /><div className="sl-experience-stamp"><strong>6</strong><span>AÑOS DE<br />EXPERIENCIA</span><Sparkles size={21} aria-hidden="true" /></div></div><div className="sl-commitment-copy" data-reveal><p className="sl-eyebrow">03 / NUESTRA FORMA DE ACOMPAÑAR</p><h2 id="why-title">La diferencia<br />está en <em>el cuidado.</em></h2><div className="sl-values">{reasons.map((item,i)=>{const Icon=icons[i];return <div key={item.title}><Icon size={21} aria-hidden="true" /><div><h3>{item.title}</h3><p>{item.text}</p></div></div>})}</div><a className="sl-text-link" href={whatsapp(messages.main)} target="_blank" rel="noopener noreferrer">Hablemos de lo que necesitás <ArrowUpRight size={17} aria-hidden="true" /></a></div></section>
}

function CUDSection() {
  return <section id="insurance" className="journey-chapter sl-section sl-insurance" aria-labelledby="insurance-title">
    <div className="sl-section-top" data-reveal><div><p className="sl-eyebrow">04 / CUD Y OBRAS SOCIALES</p><h2 id="insurance-title">Más claridad.<br /><em>Menos vueltas.</em></h2></div><p>También te acompañamos a entender cómo gestionar tu traslado con la cobertura correspondiente.</p></div>
    <div id="cud" className="sl-cud-feature" data-reveal>
      <div className="sl-cud-image"><img src="/media/v24/cud.webp" alt="Imagen ilustrativa de un Certificado Único de Discapacidad, con sus datos personales difuminados." width="768" height="512" loading="lazy" decoding="async" /><div><ShieldCheck size={20} aria-hidden="true" /><span>Un documento.<strong>Más acceso a tus derechos.</strong></span></div></div>
      <div className="sl-cud-copy"><span className="sl-cud-tag"><span />TRABAJAMOS CON CUD</span><h3>Certificado Único<br />de Discapacidad.</h3><p>El CUD es un documento público, gratuito y válido en todo el país que acredita la discapacidad. Se otorga tras la evaluación de una junta interdisciplinaria.</p><p>Permite acceder a derechos y prestaciones, como cobertura de tratamientos, rehabilitación, apoyos educativos y beneficios en el transporte público.</p><div className="sl-cud-business"><CheckCheck size={23} aria-hidden="true" /><p><strong>¿Tenés CUD? Hablemos de tu traslado.</strong>En MGavira trabajamos con personas que cuentan con CUD y coordinamos traslados a terapias, Centro Educativo Terapéutico (CET) y colegios, con obras sociales y prepagas.</p></div><ContactLink message={cudMessage}>Consultar por un traslado con CUD</ContactLink></div>
    </div>
    <div className="sl-insurance-bottom">
      <div className="sl-coverage-promise" data-reveal><p className="sl-eyebrow">TU COBERTURA, BIEN ACOMPAÑADA</p><div><strong>100<span>%</span></strong><ShieldCheck size={31} aria-hidden="true" /></div><h3>Cobertura de la prestación<br />de traslado.</h3><p>La obra social cubre el 100% de la prestación contemplada en la Ley 24.901, con CUD, indicación médica y autorización correspondiente.</p><small>Evaluamos cada solicitud según el recorrido y las condiciones de tu cobertura.</small><a href="https://www.argentina.gob.ar/normativa/nacional/ley-24901-47677/actualizacion" target="_blank" rel="noopener noreferrer">Consultar la Ley 24.901 <ArrowUpRight size={14} aria-hidden="true" /></a></div>
      <div className="sl-process" data-reveal><h3>Empezar puede ser más simple.</h3><p>Nos contás qué necesitás. Lo organizamos juntos.</p><ol>{insuranceSteps.map(step=><li key={step.number}><span>{step.number}</span><div><h4>{step.title}</h4><p>{step.text}</p></div></li>)}</ol></div>
    </div>
    <div className="sl-faq" data-reveal><div><p className="sl-eyebrow">INFORMACIÓN QUE AYUDA</p><h3>Sobre el CUD<br /><em>y tu traslado.</em></h3><a className="sl-text-link" href={cudSource} target="_blank" rel="noopener noreferrer">Información oficial del CUD <ArrowUpRight size={15} aria-hidden="true" /></a></div><div className="sl-faq-list"><details><summary>¿El CUD autoriza por sí solo un traslado?<Plus size={20} aria-hidden="true" /></summary><p>El certificado acredita la discapacidad. Para la prestación de traslado se necesita la indicación médica, evaluar el recorrido y contar con la autorización correspondiente de la obra social o prepaga.</p></details><details><summary>¿Qué información necesitan para la consulta?<Plus size={20} aria-hidden="true" /></summary><p>Origen, destino, días, horarios y tu obra social o prepaga. Con esa información revisamos el recorrido y te orientamos sobre los siguientes pasos y la documentación necesaria.</p></details><details><summary>¿Dónde se tramita el CUD?<Plus size={20} aria-hidden="true" /></summary><p>Su tramitación es voluntaria y gratuita, ante la Junta Evaluadora que corresponda a tu domicilio. Podés consultar los requisitos y pasos en <a href="https://www.argentina.gob.ar/como-obtener-el-certificado-unico-de-discapacidad-cud" target="_blank" rel="noopener noreferrer">el sitio oficial de Argentina.gob.ar <ArrowUpRight size={13} aria-hidden="true" /></a>.</p></details></div></div>
  </section>
}

export function StaticBusinessSections() {
  return <div className="static-business-sections"><ServiceSection /><CoverageSection /><CommitmentSection /><CUDSection /><div className="sl-precontact" data-reveal><span>Lo coordinamos juntos.</span><p>Vos nos contás el destino.<br /><strong>Nosotros te acompañamos.</strong></p><a href="#consulta" aria-label="Ir al formulario de consulta"><ArrowDown size={29} aria-hidden="true" /></a></div></div>
}
