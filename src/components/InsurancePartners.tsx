import { ArrowUpRight } from 'lucide-react'
import { insuranceLogoAtlas, insurancePartners } from '../data/insurancePartners'
import { messages, whatsapp } from '../data/site'

export function InsurancePartners() {
  return <div className="insurance-partners" data-reveal aria-labelledby="insurance-partners-title">
    <div className="insurance-partners-heading"><div><p className="sl-eyebrow">TRABAJAMOS CON</p><h3 id="insurance-partners-title">Obras sociales y prepagas</h3></div><p>Estas son algunas de las coberturas con las que trabajamos. Consultanos por la tuya.</p></div>
    <ul className="insurance-partners-grid" aria-label="Obras sociales y prepagas con las que trabajamos">
      {insurancePartners.map(partner => {
        const [x, y, width, height] = partner.crop
        return <li key={partner.name}><span className="insurance-partner-art" role="img" aria-label={`Logo de ${partner.name}`} style={{
          aspectRatio: `${width} / ${height}`,
          backgroundImage: `url(${insuranceLogoAtlas.src})`,
          backgroundSize: `${insuranceLogoAtlas.width / width * 100}% ${insuranceLogoAtlas.height / height * 100}%`,
          backgroundPosition: `${x / (insuranceLogoAtlas.width - width) * 100}% ${y / (insuranceLogoAtlas.height - height) * 100}%`,
        }} /><span className="insurance-partner-name" aria-hidden="true">{partner.name}</span></li>
      })}
    </ul>
    <div className="insurance-partners-footer"><p><strong>Y otras más.</strong> Si no ves la tuya, escribinos y revisamos tu consulta.</p><a className="sl-text-link" href={whatsapp(messages.insurance)} target="_blank" rel="noopener noreferrer">Consultá por tu cobertura <ArrowUpRight size={16} aria-hidden="true" /></a></div>
  </div>
}
