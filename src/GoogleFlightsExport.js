import {
  extractLegsFromDom,
  formatTripText,
  formatTripHtml,
} from "./extract.js"

const TOAST_DURATION_MS = 3000

function showToast(message, { error = false } = {}) {
  const div = document.createElement("div")
  div.textContent = message
  div.style.cssText = [
    "position:fixed",
    "top:20px",
    "right:20px",
    "z-index:2147483647",
    "padding:12px 16px",
    "border-radius:6px",
    "font:14px -apple-system,BlinkMacSystemFont,sans-serif",
    "color:#fff",
    `background:${error ? "#d93025" : "#1a73e8"}`,
    "box-shadow:0 2px 8px rgba(0,0,0,0.2)",
    "max-width:360px",
  ].join(";")
  document.body.appendChild(div)
  setTimeout(() => div.remove(), TOAST_DURATION_MS)
}

async function run() {
  const legs = extractLegsFromDom(document)
  if (legs.length === 0) {
    throw new Error(
      "No flight legs found — is this the Google Flights booking/results page?"
    )
  }
  const text = formatTripText(legs)
  const html = formatTripHtml(legs)
  await navigator.clipboard.write([
    new ClipboardItem({
      "text/plain": new Blob([text], { type: "text/plain" }),
      "text/html": new Blob([html], { type: "text/html" }),
    }),
  ])
  return { count: legs.length, text, html }
}

;(async () => {
  try {
    const { count, text, html } = await run()
    showToast(`Copied ${count} flight leg${count === 1 ? "" : "s"} to clipboard`)
    window.__gfeResult = { ok: true, count, text, html }
  } catch (err) {
    console.error("GoogleFlightsExport failed:", err)
    showToast(`Export failed: ${err.message}`, { error: true })
    window.__gfeResult = { ok: false, error: err.message }
  }
})()
