// Minimal RFC 4180 CSV parser — just enough for Google Sheets' CSV export,
// so the career board needs no CSV dependency.
//
// Handles a UTF-8 BOM, CRLF / LF / CR line endings, quoted fields with doubled
// quotes ("") and embedded commas or newlines, and a trailing newline. Fields
// are returned verbatim (no trimming — callers decide). Blank lines come back
// as a single empty cell rather than being dropped, so row indexes still map
// to spreadsheet row numbers (callers skip them). Stray quotes inside an
// unquoted field are kept literally rather than throwing: a committee typo
// should never take the page down.

export function parseCsv(text: string): string[][] {
  const src = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text
  const rows: string[][] = []
  let row: string[] = []
  let field = ""
  let fieldStarted = false
  let inQuotes = false

  const endField = () => {
    row.push(field)
    field = ""
    fieldStarted = false
  }
  const endRow = () => {
    endField()
    rows.push(row)
    row = []
  }

  for (let i = 0; i < src.length; i++) {
    const ch = src[i]

    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          field += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        field += ch
      }
      continue
    }

    if (ch === '"' && !fieldStarted) {
      inQuotes = true
      fieldStarted = true
    } else if (ch === ",") {
      endField()
    } else if (ch === "\n" || ch === "\r") {
      endRow()
      if (ch === "\r" && src[i + 1] === "\n") i++
    } else {
      field += ch
      fieldStarted = true
    }
  }

  // Flush the final row when the text doesn't end with a newline.
  if (fieldStarted || field.length > 0 || row.length > 0) endRow()

  return rows
}
