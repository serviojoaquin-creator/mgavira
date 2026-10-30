# Transporte MGavira · v21

Landing page 3D con React, Vite, TypeScript, Three.js, React Three Fiber, Drei y GSAP.

## Desarrollo y publicación

```bash
pnpm install --frozen-lockfile
npm run dev
npm run build
```

Publicar `dist`. Vercel está configurado como Vite y ejecuta `npm run build`. Definir `SITE_URL` con el dominio definitivo antes de compilar para generar canonical, Open Graph y sitemap. Sin dominio configurado no se inventa una URL pública.

Es una página estática: no necesita Functions, base de datos ni Image Optimization. El formulario prepara un mensaje de WhatsApp en el navegador y no almacena datos. Los textos y el contacto están en `src/data/site.ts`.

**Plan Vercel:** Hobby permite uso personal no comercial. Una web que promociona servicios de transporte es comercial y requiere un plan que lo permita, independientemente del tamaño. Referencias: https://vercel.com/docs/plans/hobby y https://vercel.com/docs/limits/fair-use-guidelines . No se realizó ningún despliegue.

## Peso y optimización v20

| Medición | Antes | Ahora |
| --- | ---: | ---: |
| Archivos de publicación sin comprimir | 32,76 MB | 5,84 MB |
| Modelo Cronos | 6,08 MB | 1,07 MB |

MB decimales. La reducción total es aproximadamente 82%. La transferencia inicial 3D estimada es 4,11 MB usando Brotli para JS/CSS/HTML, sin contar fuentes externas de Google ni cabeceras HTTP; no es una medición de red real.

- GLB con Draco: conserva 213.010 triángulos, 52 lotes de mallas, 19 materiales y cuatro ruedas independientes. No se simplificó la geometría. Posiciones a 16 bits y normales a 12 bits.
- Decodificador Draco local en `public/draco/v1`; no depende de una CDN externa.
- Fotografías, logo, follaje y corteza en WebP. Imagen social en JPEG. Se conserva el canal alpha.
- Cielo HDR de 1024 × 512 y reflejos urbanos HDR de 512 × 256. Se conserva el rango dinámico.
- Recursos versionados en `public/media/v20`, caché inmutable de un año; HTML revalidado. Al reemplazar medios, cambiar la versión de carpeta y sus URLs.
- Originales grandes y recursos no usados archivados localmente en `work/asset-masters`, fuera del despliegue y del ZIP fuente. También se excluyen Blender, node_modules, capturas y archivos ZIP.
- El build falla si supera el presupuesto interno de 8 MB o incluye antiguos PNG/GLB sin optimizar. `npm run audit:size` muestra el detalle.

El modelo publicado actual es `public/media/v23/cronos.glb`. Los originales editables permanecen localmente en `work/model-v23`. La versión v20 descrita arriba es histórica. Para mantenimiento, `scripts/optimize-media.mjs` usa Sharp (se puede indicar su módulo mediante `SHARP_MODULE`) y `scripts/optimize-scene.py` se ejecuta en Blender 4.5. Estas herramientas no son necesarias para compilar ni alojar la página; los archivos finales ya están incluidos.

## Dirección visual v21

Se conserva el Cronos 3D actual y la estructura de la ciudad. La referencia de conducción se traduce en una cámara baja, cercana y casi centrada detrás del auto; sol cálido con sombras diagonales, relleno frío más discreto, reflejos HDR, vidrio verde azulado y piedra cálida. Las fachadas reciben aletas de bronce y vidrieras que continúan alrededor de las esquinas. Son geometrías instanciadas y materiales compartidos; no se agregaron texturas pesadas ni pases de posprocesado.

La apertura mantiene el auto estacionado junto al título. Los acercamientos de lectura y la llegada conservan sus cámaras específicas. No se sustituyó el vehículo por una fotografía. La sensación se acerca a una cámara de videojuego; la escena sigue siendo procedural, no una reproducción fotorrealista de la referencia ni una réplica CAD exacta del Cronos.

## Recorrido y accesibilidad

Ruta de 173,3 m, seis capítulos, cuatro paradas con información completa dentro de carteles 3D, acercamiento de cámara y regreso al auto. Las ruedas giran según la distancia recorrida, también al retroceder con el scroll. Tráfico, peatones articulados y árboles animados dan movimiento a la ciudad; se reduce su cantidad en móvil.

Sin WebGL se ofrece una vista alternativa con el mismo contenido; también se puede elegir desde los botones de la página. La URL principal inicia el recorrido 3D tanto en desarrollo como en producción. El formulario y los textos quedan disponibles para tecnologías de asistencia.

## Verificación

```bash
npm run build
node scripts/verify-wheel-roll.mjs
node scripts/verify-route.mjs
```

Los controles verifican compilación, tamaño, cuatro rigs de ruedas, sentido de rodadura, continuidad del recorrido, detenciones y llegada sin invadir cruce ni cordón. `scripts/verify-cronos-model.py -- --v23`, ejecutado con Blender, reimporta el GLB y valida medidas y jerarquías. El informe actual está en `work/model-v23/validation.json`.

Créditos de HDR, fotografías y texturas en `public/media/v20/CREDITS.md`; decodificador en `public/draco/v1/CREDITS.md`.

## Pórticos publicitarios sobre la avenida

Cuatro pórticos inspirados en la señalización elevada de la referencia del usuario. La estructura metálica reticulada cruza la avenida entre dos apoyos sobre las veredas, con un gálibo visual de 4,7 m. Cada panel horizontal mide 6,2 × 3,15 m y muestra la fotografía completa en ambas caras, orientada de frente al tránsito. El fondo oscuro, el marco fino y la iluminación propia mantienen las fotos visibles sin recortarlas ni deformarlas. Árboles y luminarias cercanos respetan el espacio de los apoyos. La geometría de todos los perfiles se combina una vez y se comparte entre los cuatro pórticos, sin animaciones ni recursos de imagen adicionales. Las ubicaciones e imágenes se editan en `src/data/avenuePosters.ts`; se conservan los identificadores y las cuatro fotografías existentes. Los carteles de servicios y sus paradas mantienen su comportamiento.

## Vista estática opcional

El botón «Ver carteles» del encabezado abre una galería de los cuatro carteles informativos completos, con enlaces directos y desplazamiento normal. «Ver recorrido 3D» permite volver al inicio del recorrido. El ingreso habitual comienza con el recorrido 3D; no se restaura una elección estática de una visita anterior. Los enlaces explícitos permiten elegir la vista: `?view=static` abre directamente la galería y `?view=3d` el recorrido si WebGL está disponible. También se puede elegir la vista estática desde la pantalla de carga. La entrada normal abre siempre el recorrido 3D cuando WebGL está disponible, incluso si el sistema solicita movimiento reducido. La vista estática se abre únicamente mediante los botones de alternativa, el enlace explícito `?view=static` o si el navegador no soporta WebGL. La galería no monta el canvas ni necesita cargar los recursos 3D. Los datos del formulario se conservan al alternar porque el formulario permanece montado.

Al entrar al recorrido se muestra un aviso explicativo, que se puede cerrar, continuar o usar para abrir todos los servicios sin recorrido. Durante la carga también se explica la alternativa y se puede acceder directamente. Se mantiene la vista estática automática únicamente cuando WebGL no está disponible. La preferencia de movimiento reducido sigue ajustando las transiciones de la interfaz, sin cambiar la vista inicial.

## Acabado cinematográfico v22

- Asfalto y baldosas fotográficos de Poly Haven (CC0), con mapas independientes de color, normales y AO/rugosidad; escala física en metros. Créditos en public/media/v22/CREDITS.md.
- Sombras de contacto GTAO tomadas de la profundidad del render principal, sin volver a dibujar la ciudad. Antialiasing MSAA y acabado de color sutil; sin desenfoque sobre los carteles.
- Reflejos locales de la ciudad capturados una vez a 128 px por cara; el Cronos principal y el tráfico se excluyen de la captura.
- Luz solar cálida, relleno de cielo, niebla atmosférica, árboles más irregulares y fachadas de piedra con balcones y cornisas.
- Cámara de seguimiento más abierta para mantener el auto completo y mostrar más avenida. La geometría del Cronos y el giro de ruedas se conservan.
- Calidad adaptable: si una muestra de 3 segundos tras el calentamiento queda por debajo de 26 FPS, se elimina el paso GTAO y baja la resolución interna a 1x. La geometría y los materiales se conservan. Sin soporte de buffers flotantes se usa el render estándar.
- En desarrollo, el canvas expone data-render-quality y data-sample-fps para diagnóstico; no se muestran controles técnicos al visitante.
- Materiales nuevos versionados y cacheados por un año. La publicación sigue sujeta al presupuesto interno de 8 MB.


Tránsito v22: modelo separado de 47.959 triángulos, frente a los 213.010 del vehículo principal. Reduce 77,5% de geometría por auto secundario y mantiene los cuatro ejes de rueda.
Los autos secundarios se dibujan por lotes compartidos (instancing): 52 partes para toda la flota, en lugar de repetir las 52 partes por vehículo. Se conservan la pintura individual y la animación de cada rueda.

## Cronos v23: ajuste a las referencias

La reconstrucción conserva longitud de 4,364 m, batalla de 2,521 m y ruedas independientes de radio 0,31 m. Se revisaron la altura de los zócalos, el relieve del capó, hombros de guardabarros, inclinación del pilar B, división de las ventanillas, tintes diferenciados del parabrisas y vidrios laterales, parrilla horizontal y ópticas halógenas con reflectores facetados. Las llantas tienen cinco radios dobles de grafito con bordes mecanizados, cuatro bulones y neumáticos 195/55 R16 con dibujo superficial.

Las tres fotos aportadas orientan el modelo; faltan vistas ortogonales frontal/trasera y medidas de secciones. Por eso se documenta como reconstrucción aproximada, no como una réplica CAD exacta. La ciudad, los carteles y las cámaras mantienen su diseño v22.

Para regenerar con Blender 4.5:

```powershell
blender -b --python scripts/build-cronos.py -- --review
blender -b --python scripts/optimize-cronos-v23.py
blender -b --python scripts/verify-cronos-model.py -- --v23
node scripts/verify-wheel-roll.mjs
npm run build
```

El GLB previo se archiva fuera de la publicación, sin duplicar descargas. Los autos secundarios conservan su versión liviana v22.

## Fotos de carteles publicitarios v24

Los cuatro pórticos publicitarios muestran las fotos aportadas por el usuario, en orden: acompañamiento dentro del auto, familia, CUD y traslado familiar. Cada foto aparece en ambas caras de su cartel y conserva el encuadre completo y su proporción; las franjas restantes usan un fondo oscuro. Los carteles de servicios mantienen su información.

Las imágenes están optimizadas como WebP en public/media/v24 y agregan 104.128 bytes en total. El build completo pesa aproximadamente 7,84 MB. Configuración y ubicaciones: src/data/avenuePosters.ts. Preparación de imágenes: node scripts/prepare-avenue-posters.mjs; reutiliza los originales archivados en work/asset-masters/avenue-posters.

Mejora de visibilidad: fotos aproximadamente un 55–64% más grandes según su proporción, paneles más bajos y 0,6 m más próximos al borde de la calle. El material de las fotos conserva su color aunque el edificio proyecte sombra. Se reutilizan los mismos WebP optimizados.

## Servicios, cobertura y contacto en carteles

- Orden compartido en 3D, vista estática y formulario: terapias, Centro Educativo Terapéutico y colegios. Se actualizó también el inicio y la descripción de la página.
- Obras sociales: se destaca cobertura del 100% de la prestación contemplada en la Ley 24.901, junto con CUD, indicación médica y autorización correspondiente. Fuente oficial consultada: https://www.argentina.gob.ar/normativa/nacional/ley-24901-47677/actualizacion (arts. 2 y 13).
- Los cuatro carteles informativos tienen un enlace real de WhatsApp sobre su cara, con mensaje según la sección. Los carteles publicitarios con fotografías no incluyen botones de contacto. Los enlaces se ocultan al salir de la vista o dar la espalda a la cámara; no requieren raycasting de la ciudad. El número se comparte con el resto del sitio.
- Los enlaces usan una capa fija con perspectiva 3D sobre el recorrido para recibir clics sin que las secciones transparentes los tapen. Son accesibles con teclado y tienen nombres descriptivos. La vista estática mantiene un botón en cada cartel.
- La composición reserva una franja inferior para contacto y ajusta el contenido completo a la altura disponible, conservando las proporciones del texto.

## Rediseño de la vista sin recorrido

La vista estática es una página editorial completa: portada fotográfica, navegación por secciones, servicios en orden terapias / Centro Educativo Terapéutico / colegios, cobertura en CABA y AMBA, acompañamiento a familias, obras sociales y formulario. Se reutilizan las cuatro fotografías optimizadas de public/media/v24, sin agregar recursos de imagen. La portada se muestra al entrar desde el inicio; el acceso explícito a servicios sigue llevando a esa sección.

Componentes: src/components/StaticOverview.tsx. Estilos independientes y limitados a .site-view-static: src/static-overview.css. Los datos y textos de las prestaciones se comparten con el recorrido 3D. La vista estática mantiene el Canvas desmontado y las imágenes inferiores se cargan de forma diferida.

Se conservan los cuatro contactos de los carteles informativos. Se retiraron los ocho enlaces (dos caras por cartel) de los carteles publicitarios con fotografías. Publicación actual: aproximadamente 7,86 MB, dentro del presupuesto de 8 MB.

### Nitidez y fluidez del recorrido

- Render principal con MSAA 4x, resolución compartida entre canvas y postproceso, y recuperación suave de contraste.
- Escala adaptativa entre 1.25x y 2x en pantallas habituales, con presupuesto de píxeles para resoluciones grandes. Prioriza reducir AO antes que resolución; se recupera de forma gradual y sin cambios durante el avance.
- AO a media resolución y acabado de color en una sola pasada de salida. Los targets se redimensionan sin reconstruir el compositor.
- Sombras de 2048 px estabilizadas en la cuadrícula del mapa; actualización de sombras limitada al estar detenido.
- Peatones y tránsito fuera de cámara dejan de generar geometría innecesaria; el detalle facial distante se simplifica. Transformaciones de arquitectura precalculadas.
- Compilación anticipada de materiales detrás de la pantalla de carga y pasos de animación acotados al volver de otra pestaña.
- `node scripts/verify-render-quality.mjs` comprueba límites de resolución, rechazo de picos aislados y orden de adaptación. `?qualityAudit=1&view=3d` habilita métricas locales en `canvas.dataset.frameStats`, sin transmitir datos.

### Landing independiente y sección CUD

La alternativa «Ver carteles» tiene una composición propia: portada con fotografías, servicios desplegables con cambio de imagen, cobertura ilustrada, compromiso de MGavira y una sección dedicada al Certificado Único de Discapacidad. Conserva los mismos datos de servicios, pasos y contacto del recorrido.

El bloque CUD explica qué es, para qué sirve y cómo se coordina un traslado con obra social o prepaga, con la imagen aportada, contacto específico y preguntas frecuentes. Incluye enlaces a Argentina.gob.ar y a la Ley 24.901; distingue el certificado de la indicación médica y la autorización de la prestación.

Las animaciones de entrada usan IntersectionObserver y transformaciones/opacidad CSS; el mapa dibuja sus recorridos y los servicios cambian de fotografía. Se desactivan los movimientos cuando el sistema solicita reducirlos. La vista estática mantiene el Canvas desmontado. No incorpora bibliotecas ni imágenes nuevas.


### Servicios unificados y fotografía familiar v25

El cartel de servicios del recorrido y la landing muestran un único bloque: «Traslados a terapias, CET y colegios». El título, los dos párrafos de presentación y la mención a obras sociales y prepagas se comparten desde `serviceOverview` en `src/data/site.ts`. Se retiran las tres opciones desplegables de la landing; toda la información está visible. La sigla CET se conserva en mayúsculas también en el inicio, la sección CUD, el formulario y los metadatos.

La foto del traslado con silla de ruedas se reemplaza en la landing y en el cuarto pórtico por una fotografía de madre e hija de Nicola Barts / Pexels. Se sirve como WebP de 960 × 640 px en `public/media/v25/familia-acompanamiento.webp`; sus créditos y licencia están en esa carpeta. La descripción alternativa relata la escena, sin atribuir diagnósticos por la apariencia ni presentar a las modelos como clientas. El original anterior permanece archivado localmente, fuera de la publicación.


### Obras sociales con logos v26

Se incorporan exclusivamente los 20 logos visibles en la lámina aportada por el usuario: OSDE, Swiss Medical, Medicus, Galeno, Sancor Salud, Medifé, Premedic, Hospital Universitario Austral, OSDEPYM, OSPOCE, OSPF, OSECAC, OSPEP, OSPRERA, OSTIG, OSPIT, OSCEARA, OSUTHGRA, OSMÉDICA y OSEPJANA. No se buscaron ni añadieron otros logos. La lista y las coordenadas se comparten desde `src/data/insurancePartners.ts`.

La landing muestra una grilla adaptable, con nombres accesibles y consulta por cobertura. El cartel de obras sociales dibuja los mismos logos dentro de su cara; conserva cobertura, requisitos, pasos y contacto. Se reutiliza un único atlas WebP sin pérdida de 88.670 bytes, sin generar nuevas marcas ni crear solicitudes por cada logo. Los créditos están en `public/media/v26/CREDITS.md`.

### Materiales y fotografía de cámara v27

Ventanas con cuatro variaciones de textura arquitectónica, interiores, persianas y reflejos, conservando un único lote instanciado. Atlas original generado con IA; no es fotografía del negocio. Reflejos urbanos HDR sobre la carrocería, cámara inicial más baja, sombras suaves estabilizadas y actualización limitada a 20 Hz también durante el avance. Asfalto de grano más fino con normales menos agresivas y archivos versionados. Se mantiene el auto 3D, su geometría y las ruedas, el recorrido y los carteles.

El render admite hasta 2x con presupuesto de 8,29 millones de píxeles en escritorio y 2,4 millones en móvil, MSAA 2x y adaptación hasta 1,25x en pantallas habituales. No garantiza una tasa de FPS en cualquier equipo. Sigue siendo una reconstrucción 3D interactiva, no una filmación ni una réplica fotorrealista certificada.
