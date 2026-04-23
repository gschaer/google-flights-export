import { build } from "esbuild"
import { mkdirSync, writeFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const srcEntry = resolve(projectRoot, "src/GoogleFlightsExport.js")
const distDir = resolve(projectRoot, "dist")
const bundlePath = resolve(distDir, "GoogleFlightsExport.bundle.js")
const bookmarkletPath = resolve(distDir, "GoogleFlightsExport.bookmarklet.js")

mkdirSync(distDir, { recursive: true })

const result = await build({
  entryPoints: [srcEntry],
  bundle: true,
  minify: true,
  format: "iife",
  target: "es2020",
  write: false,
  legalComments: "none",
})

const code = result.outputFiles[0].text
writeFileSync(bundlePath, code)

const bookmarklet = "javascript:" + encodeURIComponent(code)
writeFileSync(bookmarkletPath, bookmarklet)

const kb = (n) => (n / 1024).toFixed(1) + " KB"
console.log(`✓ bundle      ${bundlePath}  (${kb(code.length)})`)
console.log(`✓ bookmarklet ${bookmarkletPath}  (${kb(bookmarklet.length)})`)
