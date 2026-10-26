import type { ComponentType } from 'react'
import { ArrowDown, ArrowRight, ArrowUpRight, Check, MapPin } from 'lucide-react'
import { chapters, contact, messages, signMessage, whatsapp, type PanelId } from '../data/site'

export function StaticHero() {
  return <>
    <div className="static-welcome">
      <div className="static-welcome-copy">
        <h1 id="hero-title">Tu tranquilidad<br /><span>nos mueve.</span></h1>
        <p>A terapias, Centro Educativo Terapéutico y colegios. Coordinamos cada traslado en CABA y AMBA, con atención cercana para vos y tu familia.</p>
        <div className="static-welcome-actions">
          <a className="button button-primary" href={whatsapp(messages.main)} target="_blank" rel="noopener noreferrer">Consultá por tu traslado <ArrowUpRight size={19} aria-hidden="true" /></a>
          <a className="static-quiet-link" href="#services">Conocé los servicios <ArrowDown size={17} aria-hidden="true" /></a>
        </div>
        <div className="static-welcome-note"><span aria-hidden="true" /><span>Cerca, de principio a fin.</span></div>
      </div>
      <figure className="static-welcome-photo">
        <img src="/media/v24/familia.webp" alt="Una familia abrazada al aire libre." width="768" height="512" fetchPriority="high" />
        <figcaption><span>Cada familia es un mundo.</span><strong>Nos importa el tuyo.</strong></figcaption>
      </figure>
    </div>
    <div className="static-trust-strip" aria-label="Sobre nuestro servicio">
      <div><strong>6 años</strong><span>acompañando familias</span></div>
      <div><strong>CABA + AMBA</strong><span>nuestra zona de cobertura</span></div>
      <div><Check size={24} aria-hidden="true" /><span>Horarios coordinados.<br /><b>Comunicación directa.</b></span></div>
    </div>
    <nav className="static-section-nav" aria-label="Explorar información">
      {chapters.map((chapter, index) => <a key={chapter.id} href={`#${chapter.id}`}><span>0{index + 1}</span>{chapter.id === 'services' ? 'Servicios' : chapter.id === 'coverage' ? 'Cobertura' : chapter.id === 'why' ? 'Cómo trabajamos' : 'Obras sociales'}<ArrowRight size={16} aria-hidden="true" /></a>)}
    </nav>
  </>
}

const presentation: Record<PanelId, { title: string; lead: string; image?: string; alt?: string; caption?: string }> = {
  services: {
    title: 'Te acompañamos adonde necesitás ir.',
    lead: 'Cada recorrido empieza por escuchar lo que necesitás.',
    image: '/media/v24/acompanamiento.webp',
    alt: 'Escena de acompañamiento durante un viaje en auto.',
    caption: 'El cuidado también está en los pequeños gestos.',
  },
  coverage: {
    title: 'Tu recorrido empieza cerca.',
    lead: 'Tu ubicación y tus horarios son nuestro punto de partida.',
  },
  why: {
    title: 'El cuidado se nota en cada detalle.',
    lead: 'Una forma de trabajar que pone a las personas primero.',
    image: '/media/v24/traslado-familiar.webp',
    alt: 'Una familia prepara un traslado con una silla de ruedas junto a su vehículo.',
    caption: 'Cada familia, un recorrido diferente.',
  },
  insurance: {
    title: 'También te acompañamos en la gestión.',
    lead: 'Información clara para que puedas dar el siguiente paso.',
    image: '/media/v24/cud.webp',
    alt: 'Imagen ilustrativa de un Certificado Único de Discapacidad con los datos personales difuminados.',
  },
}

export function StaticBusinessSections({ Details }: { Details: ComponentType<{ id: PanelId }> }) {
  return <div className="static-business-sections">
    {chapters.map((chapter, index) => {
      const section = presentation[chapter.id]
      return <section key={chapter.id} id={chapter.id} className={`journey-chapter static-business-section static-${chapter.id}`} aria-labelledby={`${chapter.id}-title`}>
        <div className="static-section-inner">
          <div className="static-section-heading">
            <p className="static-section-kicker"><span>0{index + 1}</span>{chapter.id === 'why' ? 'CÓMO TRABAJAMOS' : chapter.sign}</p>
            <h2 id={`${chapter.id}-title`}>{section.title}</h2>
            <p className="static-section-lede">{section.lead}</p>
            {section.image && <figure className="static-section-photo">
              <img src={section.image} alt={section.alt} width="768" height={chapter.id === 'services' ? 395 : chapter.id === 'why' ? 384 : 512} loading="lazy" decoding="async" />
              {section.caption && <figcaption>{section.caption}</figcaption>}
            </figure>}
            {chapter.id === 'coverage' && <div className="static-area-note"><MapPin size={30} aria-hidden="true" /><div><strong>{contact.coverage}</strong><span>Coordinamos cada recorrido de forma personalizada.</span></div></div>}
          </div>
          <div className="static-section-content">
            <Details id={chapter.id} />
            <a className="static-contact-action" href={whatsapp(signMessage(chapter.id))} target="_blank" rel="noopener noreferrer">
              {chapter.id === 'coverage' ? 'Consultá por tu zona' : chapter.id === 'insurance' ? 'Consultá por tu cobertura' : chapter.id === 'services' ? 'Coordinemos tu traslado' : 'Hablemos de lo que necesitás'}<ArrowUpRight size={19} aria-hidden="true" />
            </a>
          </div>
        </div>
      </section>
    })}
  </div>
}
