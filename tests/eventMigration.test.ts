import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";

const name = "20260916_010000_add_events_submission_workflow";
const migrationPath = path.resolve(import.meta.dirname, "../migrations", `${name}.ts`);
const eventTables = ["_events_v", "events"];
const identifier = "[a-z_][a-z_0-9]*";

// Inspect every executable statement without importing or running a migration.
// Dynamic SQL, helper calls, or extra top-level work require a fresh audit.
function migrationSQL(direction: "up" | "down"): string[] {
  expect(existsSync(migrationPath), "the reviewed Events migration exists").toBe(true);
  const source = ts.createSourceFile(
    migrationPath,
    readFileSync(migrationPath, "utf8"),
    ts.ScriptTarget.Latest,
    true,
  );
  const functions = source.statements.filter(ts.isFunctionDeclaration);
  expect(functions.map((node) => node.name?.text).sort()).toEqual(["down", "up"]);
  for (const node of source.statements) {
    if (ts.isFunctionDeclaration(node)) continue;
    expect(ts.isImportDeclaration(node), "no unaudited top-level code").toBe(true);
    if (ts.isImportDeclaration(node)) {
      expect(node.moduleSpecifier.getText(source)).toMatch(/^["']@payloadcms\/db-postgres["']$/);
    }
  }
  const body = functions.find((node) => node.name?.text === direction)?.body;
  expect(body?.statements.length).toBeGreaterThan(0);
  return [...(body?.statements ?? [])].flatMap((statement) => {
    expect(ts.isExpressionStatement(statement)).toBe(true);
    if (!ts.isExpressionStatement(statement)) throw new Error("Unexpected migration code");
    const awaited = statement.expression;
    expect(ts.isAwaitExpression(awaited)).toBe(true);
    if (!ts.isAwaitExpression(awaited)) throw new Error("SQL must be awaited");
    const call = awaited.expression;
    expect(ts.isCallExpression(call)).toBe(true);
    if (!ts.isCallExpression(call)) throw new Error("Unexpected migration operation");
    expect(call.expression.getText(source)).toBe("db.execute");
    expect(call.arguments).toHaveLength(1);
    const sql = call.arguments[0];
    expect(ts.isTaggedTemplateExpression(sql)).toBe(true);
    if (!ts.isTaggedTemplateExpression(sql)) throw new Error("Expected static SQL");
    expect(sql.tag.getText(source)).toBe("sql");
    expect(ts.isNoSubstitutionTemplateLiteral(sql.template)).toBe(true);
    if (!ts.isNoSubstitutionTemplateLiteral(sql.template)) throw new Error("Dynamic SQL is forbidden");
    return sql.template.text
      .replace(/--[^\n]*|\/\*[\s\S]*?\*\//g, " ")
      .split(";")
      .map((part) => part.trim().replace(/\s+/g, " ").toLowerCase())
      .filter(Boolean)
      .map((part) => part.replace(/"([a-z_][a-z_0-9]*)"/g, "$1").replace(/\bpublic\./g, ""));
  });
}

function capture(statements: string[], expression: RegExp): string[] {
  return statements.flatMap((statement) => statement.match(expression)?.[1] ?? []);
}

describe("Events migration scope", () => {
  it("creates only event-owned tables and enum types without changing existing data", () => {
    const up = migrationSQL("up");
    expect(capture(up, /^create table (\w+) /).sort()).toEqual(eventTables);
    const enums = capture(up, /^create type (\w+) as enum\(/);
    expect(enums.length).toBeGreaterThan(0);
    for (const type of enums) expect(type).toMatch(/^enum_(events|_events_v)_/);

    for (const statement of up) {
      // Full statement allowlist: rejects DROP/TRUNCATE/RENAME, row writes,
      // grants, policies, lock-table changes, and future unknown operations.
      const allowed = [
        new RegExp(`^create type enum_(?:events|_events_v)_${identifier} as enum\\('[^;]+\\)$`),
        /^create table (?:events|_events_v) \(.+\)$/,
        new RegExp(`^alter table (?:events|_events_v) add constraint ${identifier} foreign key \\(.+\\) references (?:events|media)\\(.+\\) on delete (?:set null|cascade) on update no action$`),
        new RegExp(`^create (?:unique )?index ${identifier} on (?:events|_events_v) using btree \\(.+\\)$`),
        /^alter table (?:events|_events_v) enable row level security$/,
        /^revoke all(?: privileges)? on(?: table)? (?:events|_events_v) from anon, authenticated$/,
      ];
      expect(allowed.some((pattern) => pattern.test(statement)), statement).toBe(true);
      expect(statement).not.toMatch(/\b(?:drop|truncate|rename|grant|insert|merge|copy)\b/);
      expect(statement).not.toMatch(/^(?:alter table|create table|revoke all(?: privileges)? on(?: table)?) (?:users|media|committee|sponsors|payload_\w+)\b/);
    }
    // The poster relationship is owned by Events; it must not mutate Media.
    expect(up.filter((statement) => statement.includes("references media(id)"))).toHaveLength(2);
  });

  it("enables RLS and revokes both browser roles on every new public table", () => {
    const up = migrationSQL("up");
    const tables = capture(up, /^create table (\w+) /);
    expect(tables.length).toBeGreaterThan(0);
    for (const table of tables) {
      expect(up).toContain(`alter table ${table} enable row level security`);
      expect(up).toContain(`revoke all on table ${table} from anon, authenticated`);
    }
  });

  it("rolls back only the new objects without cascading into existing structures", () => {
    const up = migrationSQL("up");
    const down = migrationSQL("down");
    expect(capture(down, /^drop table (\w+)$/).sort()).toEqual(eventTables);
    expect(capture(down, /^drop type (\w+)$/).sort()).toEqual(
      capture(up, /^create type (\w+) as enum\(/).sort(),
    );
    for (const statement of down) {
      expect(statement, "rollback must not cascade, grant access, or touch existing tables").toMatch(
        /^(?:drop table (?:events|_events_v)|drop type enum_(?:events|_events_v)_\w+|alter table (?:events|_events_v) disable row level security|revoke all on table (?:events|_events_v) from anon, authenticated)$/,
      );
    }
    // The version parent FK references Events, so children must go first.
    expect(down.indexOf("drop table _events_v")).toBeLessThan(down.indexOf("drop table events"));
    for (const table of eventTables) {
      expect(down).toContain(`revoke all on table ${table} from anon, authenticated`);
      expect(down.indexOf(`revoke all on table ${table} from anon, authenticated`)).toBeLessThan(
        down.indexOf(`alter table ${table} disable row level security`),
      );
      expect(down).toContain(`alter table ${table} disable row level security`);
      expect(down.indexOf(`alter table ${table} disable row level security`)).toBeLessThan(
        down.indexOf(`drop table ${table}`),
      );
    }
  });

  it("preserves all existing snapshot structures and registers the migration", () => {
    type Snapshot = { tables: Record<string, unknown>; enums: Record<string, unknown> };
    const folder = path.dirname(migrationPath);
    const previous: Snapshot = JSON.parse(readFileSync(path.join(folder, "20260907_142655_add_committee_departments.json"), "utf8"));
    const snapshotPath = path.join(folder, `${name}.json`);
    expect(existsSync(snapshotPath), "the generated schema snapshot exists").toBe(true);
    const current: Snapshot = JSON.parse(readFileSync(snapshotPath, "utf8"));
    for (const section of ["tables", "enums"] as const) {
      for (const [key, value] of Object.entries(previous[section])) {
        expect(current[section][key], `${section}.${key} must remain unchanged`).toEqual(value);
      }
    }
    expect(Object.keys(current.tables).filter((key) => !(key in previous.tables)).sort()).toEqual([
      "public._events_v",
      "public.events",
    ]);
    const registry = readFileSync(path.join(folder, "index.ts"), "utf8");
    expect(registry).toContain(`from './${name}'`);
    expect(registry).toContain(`up: migration_${name}.up`);
    expect(registry).toContain(`down: migration_${name}.down`);
    expect(registry).toContain(`name: '${name}'`);
  });
});
