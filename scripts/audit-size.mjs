import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { brotliCompressSync } from 'node:zlib'
import { fileURLToPath } from 'node:url'
const root=new URL('../dist/',import.meta.url)
const base=fileURLToPath(root)
const walk=dir=>readdirSync(dir).flatMap(name=>{const file=join(dir,name);return statSync(file).isDirectory()?walk(file):[file]})
const files=walk(base).map(file=>({path:relative(base,file).replaceAll('\\','/'),bytes:statSync(file).size}))
const total=files.reduce((n,f)=>n+f.bytes,0)
// Conservative transfer estimate: only JS/CSS/HTML use Brotli; binary assets
// count at full size. Fonts from Google, HTTP headers and cache reuse excluded.
const firstVisit=files.filter(f=>!f.path.endsWith('draco_decoder.js') && !/social\.jpg|cronos-fallback|CREDITS|LICENSE|robots|sitemap/.test(f.path))
const transfer=firstVisit.reduce((sum,f)=>sum+(/\.(js|css|html)$/.test(f.path)?brotliCompressSync(readFileSync(join(base,f.path))).length:f.bytes),0)
const report={units:'decimal bytes / 1,000,000 = MB',totalBytes:total,estimatedCold3DTransferBytes:transfer,externalFontsExcluded:true,
  budgetBytes:8_000_000,files:files.sort((a,b)=>b.bytes-a.bytes)}
if(process.argv.includes('--json'))writeFileSync(new URL('../work/size-after.json',import.meta.url),JSON.stringify(report,null,2))
console.log(JSON.stringify(report,null,2))
if(total>report.budgetBytes)throw Error('Publication exceeds the 8 MB project budget')
if(files.some(f=>/\.png$|fiat-cronos\.glb$/.test(f.path)))throw Error('An unoptimized source asset was included in publication')
