// Offline asset preparation; production builds consume the committed outputs.
// SHARP_MODULE may point to an existing Sharp installation.
import { createRequire } from 'node:module'
import { mkdir, copyFile, stat } from 'node:fs/promises'
import { resolve } from 'node:path'
const require = createRequire(import.meta.url)
const sharp = require(process.env.SHARP_MODULE || 'sharp')
const root = resolve(import.meta.dirname, '..')
const source = resolve(root, 'work/asset-masters')
const output = resolve(root, 'public/media/v20')
await mkdir(output, { recursive: true })
await mkdir(source, { recursive: true })
const jobs = [
  ['mgavira-logo-original.png', 'logo.webp', 320, 90],
  ['cronos-loading-small.png', 'cronos-loading.webp', 384, 88],
  ['cronos-fallback.png', 'cronos-fallback.webp', 1200, 86],
  ['textures/arbol-platano-corteza.png', 'corteza.webp', 1024, 88],
  ['textures/arbol-platano-follaje.png', 'follaje.webp', 1024, 90],
]
for (const [input, name, width, quality] of jobs) {
  const original=resolve(source,input)
  await mkdir(resolve(original,'..'),{recursive:true})
  try { await stat(original) } catch { await copyFile(resolve(root,'public',input),original) }
  await sharp(original).resize({ width, withoutEnlargement: true }).webp({ quality, alphaQuality: 100, effort: 6 }).toFile(resolve(output,name))
  console.log(`${name}: ${(await stat(resolve(output,name))).size} bytes`)
}
// Social preview stays JPEG for crawler compatibility.
await sharp(resolve(source,'cronos-fallback.png')).resize({width:1200,withoutEnlargement:true}).flatten({background:'#e5e7e5'}).jpeg({quality:84,mozjpeg:true}).toFile(resolve(output,'social.jpg'))
