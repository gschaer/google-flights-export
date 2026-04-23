// Live Google Flights end-to-end test. Gated behind `LIVE=1` because it
// depends on network, Google's rate limiting, and cookie/consent state.
//
//   LIVE=1 yarn test tests/bookmarklet-live.test.js
//
// Or pass a direct URL to a Google Flights booking/selected-flight page to
// skip the search flow:
//
//   LIVE=1 GFE_TEST_URL="https://www.google.com/travel/flights/booking?..." yarn test tests/bookmarklet-live.test.js

import { test, expect } from "@playwright/test"
import { readFileSync, existsSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const projectRoot = resolve(__dirname, "..")
const bundlePath = resolve(projectRoot, "dist/GoogleFlightsExport.bundle.js")

const LIVE = process.env.LIVE === "1"
const TEST_URL = process.env.GFE_TEST_URL || null

test.describe("bookmarklet against live Google Flights", () => {
  test.skip(!LIVE, "Live test skipped. Run with LIVE=1 to enable.")
  test.beforeAll(() => {
    if (!existsSync(bundlePath)) {
      throw new Error(`Bundle not found at ${bundlePath}. Run \`yarn build\` first.`)
    }
  })

  test("extracts flight legs from a real Google Flights page", async ({
    page,
    context,
  }) => {
    test.slow() // allow up to 3× the default timeout for network
    await context.grantPermissions(["clipboard-read", "clipboard-write"])

    if (TEST_URL) {
      await page.goto(TEST_URL)
    } else {
      await runDefaultSearchFlow(page)
    }

    // Wait until the booking/detail DOM is present (leg cards render).
    await page.waitForSelector(".c257Jb", { timeout: 30_000 })

    const bundle = readFileSync(bundlePath, "utf8")
    await page.addScriptTag({ content: bundle })

    await page.waitForFunction(() => window.__gfeResult != null, { timeout: 10_000 })
    const result = await page.evaluate(() => window.__gfeResult)

    if (!result.ok) throw new Error(`Bookmarklet failed: ${result.error}`)

    expect(result.count).toBeGreaterThan(0)
    expect(result.text).toMatch(/\*[A-Z][\w ]+\s[A-Z]{1,3}\s?\d+\*/) // "*Airline XX 123*"
    expect(result.text).toMatch(/Departure .+ \([A-Z]{3}\) \d{1,2} \w+ \d{1,2}:\d{2}\s?(AM|PM)/)
    expect(result.text).toMatch(/Arrival .+ \([A-Z]{3}\) \d{1,2} \w+ \d{1,2}:\d{2}\s?(AM|PM)/)
    expect(result.html).toContain("<b>")
    expect(result.html).toContain("<br/>")
  })
})

async function runDefaultSearchFlow(page) {
  await page.goto("https://www.google.com/travel/flights", {
    waitUntil: "domcontentloaded",
  })

  // Accept consent banner if shown (EU / first visit).
  const consentBtn = page
    .getByRole("button", { name: /accept all|i agree|agree/i })
    .first()
  if (await consentBtn.isVisible().catch(() => false)) {
    await consentBtn.click()
  }

  // Fill origin.
  const originInput = page
    .getByRole("combobox", { name: /where from/i })
    .first()
  await originInput.click()
  await originInput.fill("Geneva")
  await page
    .getByRole("option", { name: /Geneva Airport|GVA/i })
    .first()
    .click()

  // Fill destination.
  const destInput = page
    .getByRole("combobox", { name: /where to/i })
    .first()
  await destInput.click()
  await destInput.fill("Tokyo")
  await page
    .getByRole("option", { name: /Narita|NRT|Tokyo/i })
    .first()
    .click()

  // Pick a date ~90 days out.
  const depDate = new Date()
  depDate.setDate(depDate.getDate() + 90)
  const iso = depDate.toISOString().slice(0, 10)
  const dateInput = page.getByPlaceholder(/departure/i).first()
  await dateInput.click()
  await dateInput.fill(iso)
  await page.keyboard.press("Enter")

  // Click Search.
  await page.getByRole("button", { name: /^search$/i }).first().click()

  // Wait for results, then open the first flight to reach the booking/detail view.
  await page.waitForSelector('ul[role="list"] li[role="listitem"]', { timeout: 30_000 })
  await page
    .locator('ul[role="list"] li[role="listitem"]')
    .first()
    .click()

  // Some flows land on a Select-fares/booking page that renders .c257Jb.
  // If it's just the expanded row, also click "Select flight" to reach booking.
  const selectBtn = page
    .getByRole("button", { name: /select flight|book with/i })
    .first()
  if (await selectBtn.isVisible().catch(() => false)) {
    await selectBtn.click()
  }
}
