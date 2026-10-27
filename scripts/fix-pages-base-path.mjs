import { createHash } from 'node:crypto'
import { readFile, readdir, rename, writeFile } from 'node:fs/promises'
import { join, relative } from 'node:path'

const [outputDir, basePath] = process.argv.slice(2)

if (!outputDir || !/^\/[\w-]+(?:\/[\w-]+)*\/$/.test(basePath ?? '')) {
  throw new Error('Usage: node scripts/fix-pages-base-path.mjs <output-dir> /repository-name/')
}

async function* outputFiles(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) yield* outputFiles(path)
    else if (entry.isFile() && /\.(html|css|js)$/.test(entry.name)) yield path
  }
}

const assetPath = /(\b(?:href|src)\s*=\s*)(["'])\/(?=assets\/|logo\.svg(?:[?#]|["']))/g
const rootBootstrap = /(window\.__OPENSPEC_BASE_PATH__\s*=\s*)(["'])\/\2/g
const cssAssetPath = /(url\(\s*["']?)\/(?=assets\/)/g
const jsAssetPath = /(["'`])\/(?=assets\/)/g
// OpenSpecUI 15's transition link passes an already-prefixed href to TanStack
// Router, which applies basepath again. Strip it before router.navigate().
const navigationHref = /function ([$\w]+)\(e\)\{let t=new URL\(e,window\.location\.origin\);return`\$\{t\.pathname\}\$\{t\.search\}\$\{t\.hash\}`\}/g
const vitePreloadBase = /return`\/`\+e/g
let htmlCount = 0
let updatedCount = 0
let navigationCount = 0

for await (const file of outputFiles(outputDir)) {
  const original = await readFile(file, 'utf8')
  let updated = original
  if (file.endsWith('.html')) {
    htmlCount++
    updated = updated
      .replace(assetPath, (_, attribute, quote) => `${attribute}${quote}${basePath}`)
      .replace(rootBootstrap, (_, assignment) => `${assignment}${JSON.stringify(basePath)}`)
  } else if (file.endsWith('.css')) {
    updated = updated.replace(cssAssetPath, (_, prefix) => `${prefix}${basePath}`)
  } else {
    updated = updated
      .replace(jsAssetPath, (_, quote) => `${quote}${basePath}`)
      .replace(vitePreloadBase, () => `return${JSON.stringify(basePath)}+e`)
      .replace(navigationHref, (_, name) => {
        navigationCount++
        return `function ${name}(e){let t=new URL(e,window.location.origin),b=${JSON.stringify(basePath)},p=t.pathname;if(p===b.slice(0,-1))p="/";else if(p.startsWith(b))p=p.slice(b.length-1);return p+t.search+t.hash}`
      })
  }
  if (updated !== original) {
    await writeFile(file, updated)
    updatedCount++
  }
}

if (htmlCount === 0) throw new Error(`No HTML files found in ${outputDir}`)
if (navigationCount !== 1) {
  throw new Error(`Expected one OpenSpecUI 15 navigation helper; found ${navigationCount}. Review the workaround before deploying.`)
}

// The upstream filenames describe the original content. After patching, give
// the entire asset graph a new URL so cached chunks cannot import the old entry.
const assetFiles = []
for await (const file of outputFiles(join(outputDir, 'assets'))) assetFiles.push(file)
const hash = createHash('sha256')
for (const file of assetFiles.sort()) {
  hash.update(relative(outputDir, file))
  hash.update(await readFile(file))
}
const assetsDirectory = `assets-${hash.digest('hex').slice(0, 12)}`
await rename(join(outputDir, 'assets'), join(outputDir, assetsDirectory))
for await (const file of outputFiles(outputDir)) {
  const original = await readFile(file, 'utf8')
  const updated = original.replace(/(?<![\w-])assets\//g, `${assetsDirectory}/`)
  if (updated !== original) await writeFile(file, updated)
}
console.log(`Checked ${htmlCount} HTML files; adjusted ${updatedCount} HTML/CSS/JS files for ${basePath}`)
console.log(`Versioned patched assets: ${assetsDirectory}`)
