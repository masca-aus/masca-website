import { describe, expect, it } from "vitest";

import { parseCsv } from "@/utils/csv";

describe("parseCsv (Google Sheets CSV export)", () => {
  it("parses plain rows with LF endings and a trailing newline", () => {
    expect(parseCsv("a,b,c\n1,2,3\n")).toEqual([
      ["a", "b", "c"],
      ["1", "2", "3"],
    ]);
  });

  it("parses CRLF and bare CR endings", () => {
    expect(parseCsv("a,b\r\n1,2\r\n")).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
    expect(parseCsv("a,b\r1,2")).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });

  it("strips a UTF-8 byte order mark from the first header", () => {
    expect(parseCsv("\uFEFFTitle,Company\nx,y")).toEqual([
      ["Title", "Company"],
      ["x", "y"],
    ]);
  });

  it("keeps commas, doubled quotes and newlines inside quoted fields", () => {
    const text = 'Title,Description\n"Analyst, Grad","Line one\nLine ""two"""\n';
    expect(parseCsv(text)).toEqual([
      ["Title", "Description"],
      ["Analyst, Grad", 'Line one\nLine "two"'],
    ]);
  });

  it("keeps CRLF line breaks inside quoted fields as written", () => {
    const text = 'a\r\n"one\r\ntwo"\r\n';
    expect(parseCsv(text)).toEqual([["a"], ["one\r\ntwo"]]);
  });

  it("preserves empty cells, including the gviz endpoint's padded trailing columns", () => {
    const text = '"Title","Company","",""\n"Dev","Acme","",""\n';
    expect(parseCsv(text)).toEqual([
      ["Title", "Company", "", ""],
      ["Dev", "Acme", "", ""],
    ]);
  });

  it("keeps blank lines as empty rows so indexes still match sheet row numbers", () => {
    expect(parseCsv("a,b\n\n,\n1,2\n")).toEqual([
      ["a", "b"],
      [""],
      ["", ""],
      ["1", "2"],
    ]);
  });

  it("flushes the last row when the text has no trailing newline", () => {
    expect(parseCsv("a,b\n1,2")).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
    expect(parseCsv('a\n"quoted"')).toEqual([["a"], ["quoted"]]);
  });

  it("tolerates a stray quote inside an unquoted field instead of throwing", () => {
    expect(parseCsv('a,b\n5"10 tall,x')).toEqual([
      ["a", "b"],
      ['5"10 tall', "x"],
    ]);
  });

  it("returns no rows for empty input", () => {
    expect(parseCsv("")).toEqual([]);
    expect(parseCsv("\n")).toEqual([[""]]);
  });
});
