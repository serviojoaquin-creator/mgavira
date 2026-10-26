export const contact = {
  phoneDisplay: '11 3486-2771',
  phoneWhatsApp: '5491134862771',
  hours: 'Lunes a viernes · 08:00 a 19:00',
  coverage: 'CABA y AMBA',
} as const

export type PanelId = 'services' | 'coverage' | 'why' | 'insurance'

export const chapters: { id: PanelId; eyebrow: string; sign: string; heading: string; summary: string; cta: string }[] = [
  {
    id: 'services', eyebrow: '01 / SERVICIOS', sign: 'NUESTROS SERVICIOS',
    heading: 'Traslados pensados para acompañarte.',
    summary: 'Terapias, Centro Educativo Terapéutico y colegios. Cada recorrido se coordina con responsabilidad, puntualidad y comunicación directa.',
    cta: 'Explorar servicios',
  },
  {
    id: 'coverage', eyebrow: '02 / COBERTURA', sign: '¿DÓNDE TRABAJAMOS?',
    heading: 'Cerca de donde nos necesitás.',
    summary: 'Trabajamos en CABA y AMBA. Consultanos por tu ubicación y los horarios que necesitás.',
    cta: 'Ver cobertura',
  },
  {
    id: 'why', eyebrow: '03 / NOSOTROS', sign: '¿POR QUÉ MGAVIRA?',
    heading: 'Mucho más que un traslado.',
    summary: 'Seis años acompañando a las familias con empatía, organización y compromiso en cada viaje.',
    cta: 'Conocé cómo trabajamos',
  },
  {
    id: 'insurance', eyebrow: '04 / COBERTURAS', sign: 'OBRAS SOCIALES',
    heading: 'Te orientamos durante el proceso.',
    summary: 'Trabajamos con obras sociales y prepagas y orientamos la consulta para gestionar las autorizaciones correspondientes.',
    cta: 'Conocer el proceso',
  },
]

export const services = [
  { title: 'Traslados a terapias', text: 'Acompañamos la asistencia a tratamientos y actividades terapéuticas con horarios coordinados y comunicación directa.' },
  { title: 'Traslados a Centro Educativo Terapéutico', text: 'Organizamos cada recorrido al Centro Educativo Terapéutico considerando los horarios y las necesidades de quienes viajan.' },
  { title: 'Traslados a colegios', text: 'Coordinamos recorridos y horarios hacia instituciones educativas según las necesidades de cada familia.' },
]

export const insuranceCoverage = {
  title: 'Cobertura del 100%',
  text: 'La obra social cubre el 100% de la prestación de traslado contemplada en la Ley 24.901.',
  requirements: 'Con CUD, indicación médica y autorización correspondiente de la obra social.',
  source: 'https://www.argentina.gob.ar/normativa/nacional/ley-24901-47677/actualizacion',
} as const

export const reasons = [
  { title: 'Responsabilidad', text: 'Nos comprometemos con cada recorrido y con la tranquilidad de las familias.' },
  { title: 'Puntualidad', text: 'La organización y el cumplimiento de los horarios forman parte de nuestro compromiso.' },
  { title: 'Empatía', text: 'Brindamos una atención cercana y respetuosa.' },
  { title: 'Comunicación directa', text: 'Mantenemos contacto para coordinar horarios y resolver imprevistos.' },
]

export const insuranceSteps = [
  { number: '01', title: 'Nos contás qué traslado necesitás', text: 'Compartís días, horarios y direcciones de origen y destino.' },
  { number: '02', title: 'Nos indicás tu cobertura', text: 'Informás tu obra social o prepaga para orientar la consulta.' },
  { number: '03', title: 'Coordinamos los siguientes pasos', text: 'Evaluamos el recorrido y te orientamos sobre la gestión necesaria.' },
]

export function whatsapp(message: string) {
  return `https://wa.me/${contact.phoneWhatsApp}?text=${encodeURIComponent(message)}`
}

export const messages = {
  main: 'Hola, buen día. Me comunico desde la página web de Transporte MGavira. Quisiera consultar por un servicio de traslado.',
  services: 'Hola, quisiera consultar por un servicio de traslado de Transporte MGavira.',
  coverage: 'Hola, quisiera consultar si realizan traslados en mi zona y conocer la disponibilidad.',
  insurance: 'Hola, quisiera consultar por un traslado mediante mi obra social o prepaga.',
} as const

export function signMessage(id: PanelId) {
  return id === 'why' ? messages.main : messages[id]
}
