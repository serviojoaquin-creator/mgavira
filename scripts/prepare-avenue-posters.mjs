import { createRequire } from 'node:module'
import { mkdir, copyFile, stat, writeFile, access } from 'node:fs/promises'
import { resolve } from 'node:path'
const require = createRequire(import.meta.url)
const sharp = require('C:/Users/servi/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp')
const root = resolve(import.meta.dirname, '..')
const output = resolve(root, 'public/media/v24')
const masters = resolve(root, 'work/asset-masters/avenue-posters')
await mkdir(output, { recursive: true })
await mkdir(masters, { recursive: true })
const sources = [
 ['d387711e-796d-417f-a296-3c428642777e', 'acompanamiento'],
 ['d4968a97-dd29-47a2-b2d2-0733b253c281', 'familia'],
 ['bb26ee43-f094-49f8-af8b-8a1fe1fd880c', 'cud'],
]
const results = await Promise.all(sources.map(async ([id, name]) => {
 const original = resolve(masters, name + '.png')
 try { await access(original) } catch {
  if (!process.argv[2]) throw new Error('Supply the directory with original clipboard images as the first argument')
  await copyFile(resolve(process.argv[2], 'codex-clipboard-' + id + '.png'), original)
 }
 const file = resolve(output, name + '.webp')
 const info = await sharp(original).rotate().resize({ width: 768, withoutEnlargement: true }).webp({ quality: 80, effort: 6 }).toFile(file)
 return { name, width: info.width, height: info.height, bytes: (await stat(file)).size }
}))
await writeFile(resolve(root, 'work/avenue-posters-assets.json'), JSON.stringify(results, null, 2))
console.log(JSON.stringify(results, null, 2))
