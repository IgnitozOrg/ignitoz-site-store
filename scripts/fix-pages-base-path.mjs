import { readFile, readdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

const [outputDir, basePath] = process.argv.slice(2)

if (!outputDir || !/^\/[\w-]+(?:\/[\w-]+)*\/$/.test(basePath ?? '')) {
  throw new Error('Usage: node scripts/fix-pages-base-path.mjs <output-dir> /repository-name/')
}

async function* htmlFiles(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) yield* htmlFiles(path)
    else if (entry.isFile() && entry.name.endsWith('.html')) yield path
  }
}

const assetPath = /(\b(?:href|src)\s*=\s*)(["'])\/(?=assets\/|logo\.svg(?:[?#]|["']))/g
const rootBootstrap = /(window\.__OPENSPEC_BASE_PATH__\s*=\s*)(["'])\/\2/g
let htmlCount = 0
let updatedCount = 0

for await (const file of htmlFiles(outputDir)) {
  htmlCount++
  const original = await readFile(file, 'utf8')
  const updated = original
    .replace(assetPath, (_, attribute, quote) => `${attribute}${quote}${basePath}`)
    .replace(rootBootstrap, (_, assignment) => `${assignment}${JSON.stringify(basePath)}`)

  if (assetPath.test(updated) || rootBootstrap.test(updated)) {
    throw new Error(`Absolute root asset path remains in ${file}`)
  }
  if (updated !== original) {
    await writeFile(file, updated)
    updatedCount++
  }
}

if (htmlCount === 0) throw new Error(`No HTML files found in ${outputDir}`)
console.log(`Checked ${htmlCount} HTML files; adjusted ${updatedCount} for ${basePath}`)
