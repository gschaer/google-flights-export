// Pure extraction + formatting helpers. No DOM dependency beyond
// `extractLegsFromDom`, which is called with a DOM subtree.
//
// Google Flights' booking page renders each flight leg inside a
// `.c257Jb` container, with children that concatenate several text
// fragments without spaces in the rendered innerText, e.g.
//   "Etihad EY 146EconomyAirbus A321neoEY 146"
// The parsers below are tolerant of both the space-less (innerText)
// and space-separated (textContent) forms.

// Alternation is ordered longest-first so "Premium Economy" wins over "Economy".
// `\b` is not used because "146Economy" has no word boundary (digit→letter is
// a word-char transition in JS regex).
const CABIN_CLASS_RE = /(Premium Economy|Premium economy|Business|Economy|First)/
const TIME_RE = /\d{1,2}:\d{2}\s?(?:AM|PM)/i

export function parseAirlineAndFlight(text) {
  const cabinMatch = text.match(CABIN_CLASS_RE)
  if (!cabinMatch) throw new Error(`No cabin class in: ${text}`)
  const cabinClass = cabinMatch[1]
  const before = text.slice(0, cabinMatch.index).trim()
  const after = text
    .slice(cabinMatch.index + cabinMatch[0].length)
    .trim()

  const flightNumMatch = before.match(/([A-Z0-9]{1,3}\s?\d{1,4})\s*$/)
  if (!flightNumMatch) throw new Error(`No flight number before cabin: ${before}`)
  const flightNumber = flightNumMatch[1].replace(/\s+/g, " ")
  const airline = before.slice(0, flightNumMatch.index).trim()

  // Strip the trailing repeat of the flight number. We build the pattern from
  // the already-parsed flight number so digits in the designator (e.g. "6E 1234")
  // cannot be confused with trailing aircraft digits (e.g. "A350EY 800").
  const flightNumPattern = flightNumber.replace(/\s+/g, "\\s?")
  const aircraft = after.replace(new RegExp(`\\s*${flightNumPattern}\\s*$`), "").trim()

  return { airline, flightNumber, cabinClass, aircraft }
}

function parseTimeAndDate(text, { allowDayOffset }) {
  // Text forms seen:
  //   "10:45 AM10:45 AM on Tue, May 12Geneva Airport (GVA)"
  //   "12:35 PM+112:35 PM on Wed, May 13Narita International Airport (NRT)"
  //   and the same with spaces inserted between fragments.
  const timeMatch = text.match(TIME_RE)
  if (!timeMatch) throw new Error(`No time in: ${text}`)
  const time = timeMatch[0].toUpperCase().replace(/\s+/g, " ")

  let dayOffset = 0
  if (allowDayOffset) {
    // The offset "+N" is followed by the time repeating ("+112:35 PM" ⇒ offset=1,
    // time=12:35 PM). Use a non-greedy quantifier with a lookahead for the next
    // HH:MM so the offset can't eat into the hour digits.
    const offsetMatch = text.match(/\+(\d{1,2}?)(?=\s*\d{1,2}:\d{2})/)
    if (offsetMatch) dayOffset = parseInt(offsetMatch[1], 10)
  }

  const dateMatch = text.match(/on\s+(\w+),\s+(\w+)\s+(\d{1,2})/)
  if (!dateMatch) throw new Error(`No date in: ${text}`)
  const [, dayOfWeek, month, dayOfMonth] = dateMatch

  const iataMatch = text.match(/\(([A-Z]{3})\)\s*$/)
  if (!iataMatch) throw new Error(`No IATA code in: ${text}`)
  const iata = iataMatch[1]

  // Airport name is the text between the end of the date fragment and " (IATA)"
  const airportStart = dateMatch.index + dateMatch[0].length
  const airportEnd = text.length - iataMatch[0].length
  const airport = text.slice(airportStart, airportEnd).trim()

  const result = {
    time,
    dayOfWeek,
    month,
    dayOfMonth: parseInt(dayOfMonth, 10),
    airport,
    iata,
  }
  if (allowDayOffset) result.dayOffset = dayOffset
  return result
}

export function parseDeparture(text) {
  return parseTimeAndDate(text, { allowDayOffset: false })
}

export function parseArrival(text) {
  return parseTimeAndDate(text, { allowDayOffset: true })
}

export function parseDuration(text) {
  const m = text.match(/Travel time:\s*(\d+\s*hr(?:\s*\d+\s*min)?|\d+\s*min)/)
  if (!m) throw new Error(`Could not parse duration: ${text}`)
  return {
    duration: m[1].replace(/\s+/g, " ").trim(),
    overnight: /Overnight/.test(text),
  }
}

export function parseLegStrings({ mx, dep, arr, dur }) {
  return {
    ...parseAirlineAndFlight(mx),
    departure: parseDeparture(dep),
    arrival: parseArrival(arr),
    ...parseDuration(dur),
  }
}

function formatLegLines(leg, { bold, linebreak }) {
  const openB = bold ? "<b>" : "*"
  const closeB = bold ? "</b>" : "*"
  const d = leg.departure
  const a = leg.arrival
  return [
    `${openB}${leg.airline} ${leg.flightNumber}${closeB} (dur: ${leg.duration})`,
    `Departure ${d.airport} (${d.iata}) ${d.dayOfMonth} ${d.month} ${d.time}`,
    `Arrival ${a.airport} (${a.iata}) ${a.dayOfMonth} ${a.month} ${a.time}`,
  ].join(linebreak)
}

export function formatTripText(legs) {
  return legs
    .map((leg) => formatLegLines(leg, { bold: false, linebreak: "\r\n" }))
    .join("\r\n\r\n")
}

export function formatTripHtml(legs) {
  return legs
    .map((leg) => formatLegLines(leg, { bold: true, linebreak: "<br/>" }))
    .join("<br/><br/>")
}

const LEG_CONTAINER_SELECTOR = ".c257Jb"
const MX_SELECTOR = ".MX5RWe"
const DEP_SELECTOR = ".dPzsIb"
const ARR_SELECTOR = ".SWFQlc"
const DUR_SELECTOR = ".CQYfx"

function readText(el) {
  if (!el) return ""
  const raw = typeof el.innerText === "string" ? el.innerText : el.textContent
  return (raw || "").replace(/\s+/g, " ").trim()
}

export function extractLegsFromDom(root) {
  const legs = root.querySelectorAll(LEG_CONTAINER_SELECTOR)
  return Array.from(legs).map((leg) =>
    parseLegStrings({
      mx: readText(leg.querySelector(MX_SELECTOR)),
      dep: readText(leg.querySelector(DEP_SELECTOR)),
      arr: readText(leg.querySelector(ARR_SELECTOR)),
      dur: readText(leg.querySelector(DUR_SELECTOR)),
    })
  )
}
