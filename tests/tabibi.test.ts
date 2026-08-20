import { beforeEach, describe, expect, it, vi } from "vitest";
import crypto from "crypto";

/**
 * اختبارات طبقة tabibi (MySQL المشتركة): الحسابات والجلسات والسجلات.
 * يتم محاكاة getDb() بجداول في الذاكرة عبر proxy، فلا حاجة لقاعدة حقيقية.
 */
type TabibiApi = typeof import("../server/tabibi");

// ---------------------------------------------------------------------------
// قاعدة ذاكرة بسيطة تطابق واجهة drizzle المستخدمة في server/tabibi.ts
// ---------------------------------------------------------------------------
type Row = Record<string, unknown>;

function inMemoryDb() {
  const tables: Record<string, Row[]> = { tabibi_users: [], tabibi_sessions: [], tabibi_records: [] };
  const schemaCache = new Map<object, string>();

  const register = (table: object, name: string) => schemaCache.set(table, name);

  function tableToName(table: object): string {
    // مطابقة بالمرجع أولًا، ثم بمقارنة الخصائص (عمود واحد مشترك) كإحتياط
    const direct = [...schemaCache.entries()].find(([t]) => t === table);
    if (direct) return direct[1];
    const tableKeys = Object.keys(table).filter((k) => !k.startsWith("_")).sort();
    const fuzzy = [...schemaCache.entries()].find(
      ([t]) =>
        JSON.stringify(Object.keys(t).filter((k) => !k.startsWith("_")).sort()) ===
        JSON.stringify(tableKeys),
    );
    const name = fuzzy ? fuzzy[1] : "unknown";
    return name;
  }

  const chain = {
    select: () => ({
      from: (t: object) => {
        const name = tableToName(t);
        let rows = [...tables[name]];
        let limited = -1;
        const api = {
          where: (...predicates: Array<unknown>) => {
            rows = rows.filter((row) => predicates.every((p) => matches(p, row)));
            return api;
          },
          orderBy: () => api,
          limit: (n: number) => {
            limited = n;
            return api;
          },
          then: (resolve: (v: Row[]) => unknown) =>
            Promise.resolve().then(() => resolve(rows.slice(0, limited === -1 ? rows.length : limited))),
          ...queryOps(),
        };
        function queryOps() {
          return {
            exec: async () => rows.slice(0, limited === -1 ? rows.length : limited),
          };
        }
        return {
          ...api,
          then: (resolve: (v: Row[]) => unknown) => {
            return Promise.resolve().then(() => resolve(rows.slice(0, limited === -1 ? rows.length : limited)));
          },
        } as unknown;
      },
    }),
    insert: (t: object) => ({
      values: async (v: Row | Row[]) => {
        const name = tableToName(t);
        for (const row of Array.isArray(v) ? v : [v]) tables[name].push({ ...row });
        return;
      },
    }),
    update: (t: object) => ({
      set: (patch: Row) => ({
        where: (...predicates: Array<unknown>) => {
          const name = tableToName(t);
          const normalized: Row = {};
          for (const [k, v] of Object.entries(patch)) {
            if (isSqlNull(v) || (v && typeof v === "object" && (v as { sql?: boolean }).sql)) normalized[k] = null;
            else normalized[k] = v;
          }
          for (const row of tables[name]) {
            if (predicates.every((p) => matches(p, row))) Object.assign(row, normalized);
          }
        },
      }),
    }),
    delete: (t: object) => ({
      where: (...predicates: Array<unknown>) => {
        const name = tableToName(t);
        tables[name] = tables[name].filter((row) => !predicates.every((p) => matches(p, row)));
      },
    }),
  };

  return { chain, register, tables, schemaCache };
}

// ---------------------------------------------------------------------------
// محاكاة drizzle: eq/columns + getDb
// ---------------------------------------------------------------------------
/** تفسير شروط drizzle: eq object {column, value, op}، أو eq object {__col, match}، أو دالة predicate، أو sql`NULL`. */
function matches(predicate: unknown, row: Row): boolean {
  const p = predicate as { column?: { key?: string }; value?: unknown; op?: unknown; match?: unknown };
  if (typeof p === "function") return (p as (r: Row) => boolean)(row);
  if (p && typeof p === "object" && "column" in p && p.column && typeof p.column === "object" && "key" in (p.column as object)) {
    const key = (p.column as { key: string }).key;
    const value = isSqlNull(p.value) ? null : p.value;
    if (key === undefined) return false;
    const rowValue = (row as Record<string, unknown>)[key];
    const op = (p as { op?: string }).op ?? "=";
    if (op === ">") return rowValue instanceof Date && typeof value !== "function" && value instanceof Date && rowValue > value;
    return rowValue === value;
  }
  if (p && typeof p === "object" && "__and" in p) {
    return ((p as { __and: unknown[] }).__and as unknown[]).every((sub) => matches(sub, row));
  }
  if (p && typeof p === "object" && "match" in p && typeof p.match === "function") {
    return (p.match as (v: unknown) => (r: Row) => boolean)(p.value)(row);
  }
  return false;
}

function isSqlNull(value: unknown): boolean {
  return (
    typeof value === "object" &&
    value !== null &&
    ("__mockSql" in (value as object) || "sourceSQL" in (value as object) || "params" in (value as object))
  );
}

const memo = new Map<object, { name: string; col: (value: unknown) => (row: Row) => boolean }>();

function fakeEq(table: object, column: string): { __col: string; match: (value: unknown) => (row: Row) => boolean } {
  const key = { table, column } as object;
  const cached = memo.get(key);
  if (cached) return { __col: column, match: cached.col };
  const col = (value: unknown) => (row: Row) => row[column] === value;
  memo.set(key, { name: column, col });
  return { __col: column, match: col };
}

// نعيد ربط جداول drizzle بأسماء الذاكرة عبر الاستيراد
import { tabibiUsers, tabibiSessions, tabibiRecords } from "../drizzle/schema";

function bindTables(db: ReturnType<typeof inMemoryDb>) {
  db.register(tabibiUsers, "tabibi_users");
  db.register(tabibiSessions, "tabibi_sessions");
  db.register(tabibiRecords, "tabibi_records");
}

/** تحويل أسماء JS (camelCase) إلى أسماء DB (snake_case أو أي اسم معرّف في column("name")). */
const colNameMap = new Map<object, Map<string, string>>();
function jsToDbName(table: object, jsKey: string): string {
  let map = colNameMap.get(table);
  if (!map) {
    map = new Map();
    for (const jsKey2 of Object.keys(table as object)) {
      const col = (table as Record<string, { name?: string }>)[jsKey2];
      if (col && typeof col === "object" && col.name) map.set(jsKey2, col.name);
    }
    colNameMap.set(table, map);
  }
  return map.get(jsKey) ?? jsKey;
}

/** العكس: اسم DB → اسم JS، عبر البحث في جميع الجداول المرتبطة (drizzle mysql يعيد rows بأسماء JS). */
const dbToJsMap = new Map<string, string>();
function ensureDbToJs() {
  if (dbToJsMap.size > 0) return;
  for (const table of [tabibiUsers, tabibiSessions, tabibiRecords] as object[]) {
    for (const jsKey of Object.keys(table)) {
      const col = (table as Record<string, { name?: string }>)[jsKey];
      if (col && typeof col === "object" && col.name) dbToJsMap.set(col.name, jsKey);
    }
  }
}
function dbToJsName(dbName: string): string {
  ensureDbToJs();
  return dbToJsMap.get(dbName) ?? dbName;
}

// إنشاء proxy يجعل db(tabibiUsers).select()... يطابق drizzle chain
function drizzleLike(db: ReturnType<typeof inMemoryDb>) {
  const tables = db.tables;
  const schemaCache = db.schemaCache;

  function tableToName(table: object): string {
    // مطابقة بالمرجع أولًا، ثم بمقارنة الخصائص (عمود واحد مشترك) كإحتياط
    const direct = [...schemaCache.entries()].find(([t]) => t === table);
    if (direct) return direct[1];
    const tableKeys = Object.keys(table).filter((k) => !k.startsWith("_")).sort();
    const fuzzy = [...schemaCache.entries()].find(
      ([t, name]) =>
        JSON.stringify(Object.keys(t).filter((k) => !k.startsWith("_")).sort()) ===
        JSON.stringify(tableKeys),
    );
    return fuzzy ? fuzzy[1] : "unknown";
  }

  // proxy: db.select().from(t)... db.insert(t).values(v)...
  // يوجّه إلى db.chain مباشرة (inMemoryDb يعيد {chain, register, tables, schemaCache})
  return db.chain as unknown as {
    select: () => unknown;
    insert: (t: object) => { values: (v: Row | Row[]) => Promise<void> };
    update: (t: object) => { set: (patch: Row) => { where: (...predicates: Array<unknown>) => void } };
    deleteOp: (t: object) => { where: (...predicates: Array<unknown>) => void };
  };
}

// ---------------------------------------------------------------------------
// تثبيت الموكات
// ---------------------------------------------------------------------------
vi.mock("../server/db", () => ({
  getDb: () => Promise.resolve(undefined as unknown),
}));

let currentDb: ReturnType<typeof inMemoryDb> | null = null;

async function installDb(db: ReturnType<typeof inMemoryDb>) {
  currentDb = db;
  const mod = await import("../server/db");
  (mod as { getDb: () => Promise<unknown> }).getDb = async () => drizzleLike(db);
}

// ---------------------------------------------------------------
// معادلات drizzle eq/columns المستوردة في server/tabibi.ts —
// server/tabibi.ts يستخدم eq(tabibiUsers.phone, value) مباشرة من drizzle-orm،
// لذا نحتاج موك eq وsql وgt وdesc وand.
// ---------------------------------------------------------------
import type { Column } from "drizzle-orm"; // unused kept for clarity

function fakeColumns() {
  // الأعمدة المستخدمة كمرجع: tabibiUsers.phone ... إلخ. نطابق حسب خاصية table+name
  const colMap = new Map<string, string>();
  for (const [table, name] of [
    [tabibiUsers, "phone"],
    [tabibiUsers, "id"],
    [tabibiSessions, "tokenHash"],
    [tabibiSessions, "expiresAt"],
    [tabibiSessions, "userId"],
    [tabibiRecords, "collection"],
    [tabibiRecords, "ownerKey"],
    [tabibiRecords, "id"],
  ] as [object, string][]) {
    colMap.set(`${(table as { _name?: string }).toString?.() ?? ""}`, name);
  }
  return colMap;
}

// بما أن server/tabibi.ts يستورد eq من drizzle-orm مباشرة (وليس من ملفنا)،
// نستخدم alias module في vitest config لـ drizzle-orm. هنا نحقق ذلك يدويًا
// عبر vi.mock("drizzle-orm").
vi.mock("drizzle-orm", async (importOriginal) => {
  const mod = await importOriginal<typeof import("drizzle-orm")>();
  // شكل eq في drizzle-orm: يعيد object {column, value, op} — column.name هو اسم العمود في قاعدة البيانات
  const eqFn = (col: { name?: string }, value: unknown) => {
    return {
      // drizzle mysql يعيد rows بأسماء JS؛ نحوّل column.name (اسم DB) إلى اسم JS
      column: { key: typeof col?.name === "string" ? dbToJsName(col.name) : undefined },
      value,
      op: "=",
    };
  };
  return {
    ...mod,
    eq: eqFn,
    and: (...predicates: Array<unknown>) => ({ __and: predicates }),
    gt: (col: { name?: string }, value: unknown) => ({
      column: { key: typeof col?.name === "string" ? dbToJsName(col.name) : undefined },
      value,
      op: ">",
    }),
    desc: (col: { name?: string }) => ({ key: typeof col?.name === "string" ? dbToJsName(col.name) : undefined }),
    sql: Object.assign(
      (strings: TemplateStringsArray, ...values: unknown[]) => ({ sql: true, raw: strings.join("") }),
      { raw: "" },
    ),
  };
});

// ---------------------------------------------------------------------------
function makeHash(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const digest = crypto.pbkdf2Sync(password, salt, 100_000, 32, "sha256").toString("hex");
  return `pbkdf2:${salt}:${digest}`;
}

describe("tabibi layer (MySQL)", () => {
  let db: ReturnType<typeof inMemoryDb>;
  let Tabibi: TabibiApi;

  beforeEach(async () => {
    vi.resetModules();
    db = inMemoryDb();
    bindTables(db);
    await installDb(db);
    memo.clear();
    Tabibi = await import("../server/tabibi");
  });

  it("creates a patient account with pending provider default", async () => {
    try {
    const user = await Tabibi.createTabibiUser({
      phone: "0911111111",
      role: "patient",
      display_name: "مريض",
      password_hash: makeHash("pass"),
    });
    expect(user.status).toBe("active");
    } catch (e) {
      throw e;
    }
    const provider = await Tabibi.createTabibiUser({
      phone: "0922222222",
      role: "provider",
      display_name: "طبيب",
      password_hash: makeHash("pass"),
    });
    expect(provider.status).toBe("pending");
  });

  it("issues and verifies session tokens without storing them in cleartext", async () => {
    const user = await Tabibi.createTabibiUser({
      phone: "0913333333",
      role: "patient",
      display_name: "مستخدم",
      password_hash: makeHash("pass"),
    });
    const token = Tabibi.newSessionToken();
    await Tabibi.createTabibiSession({ id: user.id, role: "patient" }, token);
    const stored = db.tables.tabibi_sessions[0] as Row;
    expect(stored.tokenHash).toBe(Tabibi.hashToken(token));
    expect(stored.tokenHash).not.toBe(token);
    const verified = await Tabibi.verifySessionToken(token);
    expect(verified?.id).toBe(user.id);
    const verifiedBad = await Tabibi.verifySessionToken(token + "x");
    expect(verifiedBad).toBeNull();
  });

  it("locks the account after 5 failed login attempts for 15 minutes", async () => {
    await Tabibi.createTabibiUser({
      phone: "0914444444",
      role: "patient",
      display_name: "مستخدم",
      password_hash: makeHash("pass"),
    });
    for (let i = 0; i < 5; i++) {
      const locked = await Tabibi.recordFailedLogin("0914444444");
      if (i < 4) expect(locked).toBe(false);
      else expect(locked).toBe(true);
    }
    const stored = db.tables.tabibi_users[0] as Row;
    expect(stored.failedAttempts).toBe(5);
    expect(stored.lockedUntil).toBeTruthy();
    const until = new Date(stored.lockedUntil as string);
    expect(until.getTime() - Date.now()).toBeGreaterThan(14 * 60 * 1000);
    expect(Tabibi.isLockedOut(stored as unknown as Parameters<typeof Tabibi.isLockedOut>[0])).toBe(true);
  });

  it("resets failed attempts on successful login and revokes sessions on suspension", async () => {
    const user = await Tabibi.createTabibiUser({
      phone: "0915555555",
      role: "patient",
      display_name: "مستخدم",
      password_hash: makeHash("pass"),
    });
    const token = Tabibi.newSessionToken();
    await Tabibi.createTabibiSession({ id: user.id, role: "patient" }, token);
    await Tabibi.recordFailedLogin(user.phone);
    await Tabibi.resetFailedLogins(user.id);
    expect(db.tables.tabibi_users[0].failedAttempts).toBe(0);
    await Tabibi.updateUserStatus(user.id, "suspended");
    expect(db.tables.tabibi_sessions).toHaveLength(0);
    expect((db.tables.tabibi_users[0] as Row).status).toBe("suspended");
  });

  it("upserts and reads general records by owner key", async () => {
    await Tabibi.upsertRecord("patient_setup", "patient:0916666666", { address: "طرابلس" }, "u1");
    await Tabibi.upsertRecord("patient_setup", "patient:0916666666", { address: "بنغازي" }, "u1");
    const record = await Tabibi.readRecord<{ address: string }>("patient_setup", "patient:0916666666");
    expect(record?.address).toBe("بنغازي");
    expect(db.tables.tabibi_records).toHaveLength(1);
  });
});
