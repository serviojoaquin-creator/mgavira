import { useEffect, useRef, useState } from 'react'

export function LoadingScreen({ progress, ready, onComplete, onSkip }: {
  progress: number; ready: boolean; onComplete: () => void; onSkip: () => void
}) {
  const started = useRef(performance.now())
  const journey = useRef<HTMLDivElement>(null)
  const target = useRef(0)
  const sceneIsReady = useRef(false)
  const photoIsReady = useRef(false)
  const [value, setValue] = useState(0)
  const [finished, setFinished] = useState(false)
  useEffect(() => {
    const previous = document.documentElement.style.overflow
    document.documentElement.style.overflow = 'hidden'
    return () => { document.documentElement.style.overflow = previous }
  }, [])
  useEffect(() => {
    target.current = Math.max(target.current, Math.min(92, progress))
    sceneIsReady.current = ready
  }, [progress, ready])
  useEffect(() => {
    let frame = 0, current = 0, previous = performance.now()
    const animate = (now: number) => {
      const dt = Math.max(0, Math.min((now - previous) / 1000, .05))
      previous = now
      const canFinish = sceneIsReady.current && photoIsReady.current
      const goal = canFinish ? 100 : Math.max(2, target.current)
      current += Math.min(48 * dt, (goal - current) * (1 - Math.exp(-5 * dt)))
      if (canFinish && current > 99.4 && now - started.current > 1800) current = 100
      journey.current?.style.setProperty('--loading-progress', current + '%')
      const integer = Math.floor(current)
      setValue(old => old === integer ? old : integer)
      if (current === 100) { setFinished(true); return }
      frame = requestAnimationFrame(animate)
    }
    frame = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(frame)
  }, [])
  useEffect(() => {
    if (!finished) return
    const timer = window.setTimeout(onComplete, 650)
    return () => clearTimeout(timer)
  }, [finished, onComplete])
  return <div className={`loading-screen${finished ? ' loading-screen-complete' : ''}`}>
    <div className="loading-content">
      <img className="loading-logo" src="/media/v20/logo.webp" alt="Transportes MGavira" width="160" height="160" fetchPriority="high" />
      <div ref={journey} className="loading-journey" role="progressbar" aria-label="Preparando el recorrido" aria-valuemin={0} aria-valuemax={100} aria-valuenow={value}>
        <div className="loading-road"><div className="loading-road-fill" /><div className="loading-road-dashes" /><div className="loading-car-track"><div className="loading-car"><img src="/media/v20/cronos-loading.webp" alt="" width="320" height="120" fetchPriority="high" onLoad={() => { photoIsReady.current = true }} onError={() => { photoIsReady.current = true }} /></div></div><span className="loading-destination" /></div>
      </div>
      <div className="loading-caption"><span>{finished ? 'Todo listo. Vamos.' : 'Preparando tu recorrido'}</span><span className="loading-percent">{value}<small>%</small></span></div>
      <p className="loading-tagline">Cerca, de principio a fin.</p>
      {!finished && <div className="loading-view-choice"><p>Esta página tiene un recorrido 3D. Si preferís evitarlo, accedé directamente a todos los servicios y la información.</p><button className="loading-skip" onClick={onSkip}>Ver servicios sin recorrido <span aria-hidden="true">↗</span></button></div>}
    </div>
    <span className="loading-location">BUENOS AIRES · CABA + AMBA</span>
  </div>
}

