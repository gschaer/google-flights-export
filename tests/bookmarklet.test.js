import { test, expect } from "@playwright/test"
import { readFileSync, existsSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const projectRoot = resolve(__dirname, "..")
const fixturePath = resolve(__dirname, "fixtures/google-flights-booking.html")
const fixtureUrl = pathToFileURL(fixturePath).href
const bundlePath = resolve(projectRoot, "dist/GoogleFlightsExport.bundle.js")

test.beforeAll(() => {
  if (!existsSync(bundlePath)) {
    throw new Error(
      `Bundle not found at ${bundlePath}. Run \`yarn build\` before the Playwright tests.`
    )
  }
})

test.describe("bookmarklet against the HTML fixture", () => {
  test("extracts and formats all 4 legs of the GVA↔NRT trip", async ({ page, context }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"])
    await page.goto(fixtureUrl)
    const bundle = readFileSync(bundlePath, "utf8")
    await page.addScriptTag({ content: bundle })

    await page.waitForFunction(() => window.__gfeResult != null, { timeout: 5000 })
    const result = await page.evaluate(() => window.__gfeResult)

    expect(result.ok).toBe(true)
    expect(result.count).toBe(4)
    expect(result.text).toContain("*Etihad EY 146*")
    expect(result.text).toContain("*Etihad EY 800*")
    expect(result.text).toContain("*Etihad EY 801*")
    expect(result.text).toContain("*Etihad EY 147*")
    expect(result.text).toContain("Departure Geneva Airport (GVA) 12 May 10:45 AM")
    expect(result.text).toContain(
      "Arrival Narita International Airport (NRT) 13 May 12:35 PM"
    )
    expect(result.html).toContain("<b>Etihad EY 146</b>")
    expect(result.html).toContain("<br/><br/>")
  })

  test("writes both text/plain and text/html to the clipboard", async ({ page, context }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"])
    await page.goto(fixtureUrl)
    const bundle = readFileSync(bundlePath, "utf8")
    await page.addScriptTag({ content: bundle })

    await page.waitForFunction(() => window.__gfeResult?.ok === true, { timeout: 5000 })

    const clipboard = await page.evaluate(async () => {
      const items = await navigator.clipboard.read()
      const out = {}
      for (const item of items) {
        for (const type of item.types) {
          const blob = await item.getType(type)
          out[type] = await blob.text()
        }
      }
      return out
    })

    expect(clipboard["text/plain"]).toContain("*Etihad EY 146*")
    expect(clipboard["text/html"]).toContain("<b>Etihad EY 146</b>")
  })

  test("shows an error toast when no flights are found", async ({ page, context }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"])
    // Navigate to a blank page so there are no .c257Jb containers
    await page.setContent("<!doctype html><html><body>no flights here</body></html>")
    const bundle = readFileSync(bundlePath, "utf8")
    await page.addScriptTag({ content: bundle })

    await page.waitForFunction(() => window.__gfeResult != null, { timeout: 5000 })
    const result = await page.evaluate(() => window.__gfeResult)

    expect(result.ok).toBe(false)
    expect(result.error).toMatch(/No flight legs found/)
  })
})
