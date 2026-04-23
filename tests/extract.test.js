import { test, expect } from "@playwright/test"
import {
  parseLegStrings,
  formatTripText,
  formatTripHtml,
} from "../src/extract.js"

const LEG_1 = {
  mx: "Etihad EY 146EconomyAirbus A321neoEY 146",
  dep: "10:45 AM10:45 AM on Tue, May 12Geneva Airport (GVA)",
  arr: "7:00 PM7:00 PM on Tue, May 12Zayed International Airport (AUH)",
  dur: "Travel time: 6 hr 15 min",
}

const LEG_2_OVERNIGHT = {
  mx: "Etihad EY 800EconomyAirbus A350EY 800",
  dep: "9:25 PM9:25 PM on Tue, May 12Zayed International Airport (AUH)",
  arr: "12:35 PM+112:35 PM on Wed, May 13Narita International Airport (NRT)",
  dur: "Travel time: 10 hr 10 minOvernight",
}

test("parseLegStrings extracts a simple leg", () => {
  const leg = parseLegStrings(LEG_1)
  expect(leg.airline).toBe("Etihad")
  expect(leg.flightNumber).toBe("EY 146")
  expect(leg.cabinClass).toBe("Economy")
  expect(leg.aircraft).toBe("Airbus A321neo")
  expect(leg.duration).toBe("6 hr 15 min")
  expect(leg.overnight).toBe(false)
  expect(leg.departure).toEqual({
    time: "10:45 AM",
    dayOfWeek: "Tue",
    month: "May",
    dayOfMonth: 12,
    airport: "Geneva Airport",
    iata: "GVA",
  })
  expect(leg.arrival).toEqual({
    time: "7:00 PM",
    dayOffset: 0,
    dayOfWeek: "Tue",
    month: "May",
    dayOfMonth: 12,
    airport: "Zayed International Airport",
    iata: "AUH",
  })
})

test("parseLegStrings extracts an overnight leg with +1 day offset", () => {
  const leg = parseLegStrings(LEG_2_OVERNIGHT)
  expect(leg.flightNumber).toBe("EY 800")
  expect(leg.aircraft).toBe("Airbus A350")
  expect(leg.overnight).toBe(true)
  expect(leg.duration).toBe("10 hr 10 min")
  expect(leg.arrival.time).toBe("12:35 PM")
  expect(leg.arrival.dayOffset).toBe(1)
  expect(leg.arrival.dayOfMonth).toBe(13)
  expect(leg.arrival.airport).toBe("Narita International Airport")
  expect(leg.arrival.iata).toBe("NRT")
})

test("parseLegStrings handles space-normalized input (from textContent)", () => {
  // Playwright may read the DOM via textContent, which gives space-separated tokens
  const leg = parseLegStrings({
    mx: "Etihad EY 146 Economy Airbus A321neo EY 146",
    dep: "10:45 AM 10:45 AM on Tue, May 12 Geneva Airport (GVA)",
    arr: "7:00 PM 7:00 PM on Tue, May 12 Zayed International Airport (AUH)",
    dur: "Travel time: 6 hr 15 min",
  })
  expect(leg.airline).toBe("Etihad")
  expect(leg.flightNumber).toBe("EY 146")
  expect(leg.departure.iata).toBe("GVA")
  expect(leg.arrival.iata).toBe("AUH")
})

test("formatTripText matches the original bookmarklet's output shape", () => {
  const leg = parseLegStrings(LEG_1)
  const text = formatTripText([leg])
  expect(text).toBe(
    [
      "*Etihad EY 146* (dur: 6 hr 15 min)",
      "Departure Geneva Airport (GVA) 12 May 10:45 AM",
      "Arrival Zayed International Airport (AUH) 12 May 7:00 PM",
    ].join("\r\n")
  )
})

test("formatTripHtml produces <b> + <br/> markup", () => {
  const leg = parseLegStrings(LEG_1)
  const html = formatTripHtml([leg])
  expect(html).toContain("<b>Etihad EY 146</b>")
  expect(html).toContain(
    "Departure Geneva Airport (GVA) 12 May 10:45 AM<br/>"
  )
  expect(html).toContain("<br/>Arrival Zayed International Airport (AUH)")
})

test("parseLegStrings handles digit-containing IATA airline codes (e.g. 6E/IndiGo)", () => {
  const leg = parseLegStrings({
    mx: "IndiGo 6E 1234EconomyAirbus A320neo6E 1234",
    dep: "6:15 PM6:15 PM on Thu, Jun 24Geneva Airport (GVA)",
    arr: "10:25 PM10:25 PM on Thu, Jun 24Istanbul Airport (IST)",
    dur: "Travel time: 4 hr 10 min",
  })
  expect(leg.airline).toBe("IndiGo")
  expect(leg.flightNumber).toBe("6E 1234")
  expect(leg.cabinClass).toBe("Economy")
  expect(leg.aircraft).toBe("Airbus A320neo")
})

test("formatTripText separates multiple legs with a blank line", () => {
  const legs = [parseLegStrings(LEG_1), parseLegStrings(LEG_2_OVERNIGHT)]
  const text = formatTripText(legs)
  expect(text.split("\r\n\r\n")).toHaveLength(2)
  expect(text).toContain("*Etihad EY 146*")
  expect(text).toContain("*Etihad EY 800*")
  expect(text).toContain("Arrival Narita International Airport (NRT) 13 May 12:35 PM")
})
