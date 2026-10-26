import { useState, type FormEvent } from 'react'
import { ArrowUpRight, Send } from 'lucide-react'
import { whatsapp } from '../data/site'

export function ContactForm() {
  const [sent, setSent] = useState(false)
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const value = (key: string) => String(data.get(key) ?? '').trim()
    const message = [
      'Hola, buen día. Me comunico desde la página web de Transporte MGavira. Quisiera consultar por un traslado.',
      `Tipo de traslado: ${value('type')}`,
      `Días solicitados: ${value('days')}`,
      `Horarios: ${value('times')}`,
      `Origen: ${value('origin')}`,
      `Destino: ${value('destination')}`,
      value('insurance') ? `Obra social o prepaga: ${value('insurance')}` : '',
    ].filter(Boolean).join('\n')
    window.open(whatsapp(message), '_blank', 'noopener,noreferrer')
    setSent(true)
  }
  return <form className="contact-form" onSubmit={submit}>
    <div className="form-header"><Send size={20} aria-hidden="true" /><span>Prepará tu consulta</span></div>
    <div className="form-grid">
      <label>Tipo de traslado<select name="type" required defaultValue=""><option value="" disabled>Seleccioná una opción</option><option>Terapia</option><option>Centro Educativo Terapéutico</option><option>Colegio</option></select></label>
      <label>Días solicitados<input name="days" placeholder="Ej. lunes a viernes" required autoComplete="off" /></label>
      <label>Horarios<input name="times" placeholder="Ej. ingreso 08:00, salida 16:00" required autoComplete="off" /></label>
      <label><span>Obra social o prepaga <small>(opcional)</small></span><input name="insurance" placeholder="Si corresponde" autoComplete="off" /></label>
      <label className="wide">Dirección de origen<input name="origin" placeholder="Calle y altura, localidad" required autoComplete="street-address" /></label>
      <label className="wide">Dirección de destino<input name="destination" placeholder="Calle y altura, localidad" required autoComplete="off" /></label>
    </div>
    <p className="form-note">Los datos se usan sólo para preparar tu mensaje de WhatsApp. No se guardan en esta página.</p>
    <button className="button button-primary form-submit" type="submit">Enviar consulta <ArrowUpRight size={18} aria-hidden="true" /></button>
    {sent && <p className="form-feedback" role="status">Se abrió WhatsApp con tu consulta preparada. Revisá el mensaje antes de enviarlo.</p>}
  </form>
}
