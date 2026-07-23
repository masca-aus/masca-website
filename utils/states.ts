export type State = {
  code: string
  name: string
  capital: string
  bg: string
  fg: string
}

// Single source of truth for state chapter branding — used by the States
// section grid and the event card chapter pills.
export const STATES: State[] = [
  { code: "VIC", name: "Victoria", capital: "Melbourne", bg: "#CF2128", fg: "#FFFFFF" },
  { code: "NSW", name: "New South Wales", capital: "Sydney", bg: "#263D94", fg: "#FFFFFF" },
  { code: "QLD", name: "Queensland", capital: "Brisbane", bg: "#821619", fg: "#FFFFFF" },
  { code: "WA", name: "Western Australia", capital: "Perth", bg: "#F7921F", fg: "#FFFFFF" },
  { code: "SA", name: "South Australia", capital: "Adelaide", bg: "#FBE700", fg: "#000000" },
  { code: "ACT", name: "A. Capital Territory", capital: "Canberra", bg: "#298A43", fg: "#FFFFFF" },
  { code: "TAS", name: "Tasmania", capital: "Hobart", bg: "#9E00A3", fg: "#FFFFFF" },
  { code: "NZ", name: "New Zealand", capital: "Wellington", bg: "#00E8E8", fg: "#000000" },
]