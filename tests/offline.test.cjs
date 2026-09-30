const { test, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");
const root = path.resolve(__dirname, "..");
const records = new Map();
const modules = new Map();
const storage = new Map();
let networkCalls;

// Exercise the production TypeScript modules with a deterministic storage boundary.
function load(relative) {
  const filename = path.resolve(root, relative);
  if (modules.has(filename)) return modules.get(filename);
  const exports = {};
  modules.set(filename, exports);
  const source = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const requireLocal = (id) => {
    if (id.endsWith("offline-store"))
      return {
        OFFLINE_META: "cm-offline",
        readOffline: async (key) => structuredClone(records.get(key)),
        offlineStore: async (key, value) => {
          if (value !== undefined) records.set(key, structuredClone(value));
          return structuredClone(records.get(key));
        },
      };
    if (id.startsWith(".") || id.startsWith("@/")) {
      const resolved = id.startsWith("@/") ? path.join(root, id.slice(2)) : path.resolve(path.dirname(filename), id);
      return load(`${resolved}.ts`);
    }
    return require(id);
  };
  new Function("require", "exports", source)(requireLocal, exports);
  return exports;
}
global.window = { location: { origin: "https://collection.test" } };
global.localStorage = { getItem: (key) => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value), removeItem: (key) => storage.delete(key) };
const { apiFetch } = load("lib/api-fetch.ts");
const { assertEditable, setOfflineBusy, setOfflineMeta } = load("lib/offline.ts");
const meta = { id: "snapshot", user: "owner", enabled: true, savedAt: 123, missingImages: 0 };
const card = { _id: "card", name: "Charizard (151)", number: 199, set: "set", variants: [] };
const sealed = { _id: "sealed", name: "151 Elite Trainer Box", set: "set", variants: [], type: "Elite Trainer Box" };
const historicPrices = [
  { _id: "en", card: "card", language: "en", type: "regular", price: 12 },
  { _id: "it", card: "card", language: "it", type: "regular", price: 15 },
  { _id: "reverse", card: "card", language: "en", type: "reverse", price: 20 },
  { _id: "box", sealed: "sealed", language: "en", price: 100 },
];
beforeEach(() => {
  storage.clear();
  records.clear();
  setOfflineBusy(false);
  networkCalls = 0;
  storage.set("cm-offline", JSON.stringify(meta));
  records.set("snapshot:index", {
    sets: [{ _id: "set", name: "151", code: "MEW", releasedAt: 123 }],
    cards: [card],
    sealed: [sealed],
    binders: [{ _id: "binder", items: [] }],
    wishlists: [{ _id: "wishlist", items: [] }],
    portfolio: { value: 120 },
  });
  records.set("snapshot:set:set", {
    cards: [card],
    sealed: [sealed],
    historicPrices,
    prices: [
      { card: "card", language: "en", type: "regular", timestamp: 2, price: 12 },
      { card: "card", language: "en", type: "regular", timestamp: 1, price: 10 },
    ],
    images: [],
  });
  global.fetch = async () => {
    networkCalls++;
    return new Response('{"live":true}');
  };
});
const json = async (url, init) => (await apiFetch(url, init)).json();
test("offline navigation and personal data use the snapshot without network", async () => {
  assert.equal((await json("/api/sets?user=owner")).sets[0].name, "151");
  assert.equal((await json("/api/cards?user=owner&set=set")).cards[0]._id, "card");
  assert.equal((await json("/api/cards?user=owner&id=card")).card.number, 199);
  assert.equal((await json("/api/sealed?user=owner&id=sealed")).sealed.name, sealed.name);
  assert.equal((await json("/api/binders?user=owner&withcards=true")).items[0]._id, "binder");
  assert.equal((await json("/api/wishlists?user=owner&withcards=true")).items[0]._id, "wishlist");
  assert.equal((await json("/api/portfolios?user=owner")).portfolio.value, 120);
  assert.equal(networkCalls, 0);
});
test("batch POST price reads work offline and respect item, language and variant", async () => {
  const data = await json("/api/historic-prices?user=owner", {
    method: "POST",
    body: JSON.stringify({
      items: [
        { item: "card", type: "card", language: "en", variant: "reverse" },
        { item: "sealed", type: "sealed", language: "en" },
      ],
    }),
  });
  assert.deepEqual(
    data.historicPrices.map((p) => p._id),
    ["reverse", "box"],
  );
  assert.equal((await json("/api/historic-prices?user=owner&id=card&type=card&language=it&variant=regular")).historicPrice._id, "it");
  assert.deepEqual(
    (await json("/api/prices?user=owner&id=card&type=card&language=en&variant=regular")).prices.map((p) => p.timestamp),
    [1, 2],
  );
  assert.equal(networkCalls, 0);
});
test("all collection writes are blocked, including during preparation", async () => {
  for (const method of ["POST", "DELETE", "PATCH", "PUT"]) await assert.rejects(apiFetch("/api/binders?user=owner", { method }), /locked/);
  assert.throws(assertEditable, /read-only/);
  storage.clear();
  setOfflineBusy(true);
  await assert.rejects(apiFetch("/api/wishlists?user=owner", { method: "POST" }), /locked/);
  assert.throws(assertEditable, /read-only/);
  assert.equal(networkCalls, 0);
});
test("snapshots cannot be read by another account or silently fall back to live data", async () => {
  await assert.rejects(apiFetch("/api/binders?user=someone-else"), /another account/);
  records.delete("snapshot:set:set");
  await assert.rejects(apiFetch("/api/cards?user=owner&set=set"), /missing/);
  records.delete("snapshot:index");
  await assert.rejects(apiFetch("/api/sets?user=owner"), /missing/);
  assert.equal(networkCalls, 0);
});
test("search works across the full saved catalog with literal matching", async () => {
  assert.equal((await json("/api/search?q=char")).cards[0]._id, "card");
  assert.equal((await json("/api/search?q=MEW")).sets[0]._id, "set");
  assert.deepEqual((await json("/api/search?q=.*")).cards, []);
  assert.deepEqual((await json("/api/search?q=c")).cards, []);
});
test("turning off offline mode restores live reads and writes", async () => {
  await setOfflineMeta({ ...meta, enabled: false });
  assert.doesNotThrow(assertEditable);
  assert.deepEqual(await json("/api/sets?user=owner"), { live: true });
  await apiFetch("/api/binders?user=owner", { method: "POST" });
  assert.equal(networkCalls, 2);
});

const { readOfflineExport } = load("lib/offline-export.ts");
function exportResponse(lines, fragmented = false) {
  const data = new TextEncoder().encode(lines.map((line) => JSON.stringify(line)).join("\n") + "\n");
  return new Response(
    new ReadableStream({
      start(controller) {
        for (let offset = 0; offset < data.length; offset += fragmented ? 7 : data.length) controller.enqueue(data.slice(offset, offset + (fragmented ? 7 : data.length)));
        controller.close();
      },
    }),
  );
}
function snapshotRecords() {
  const index = records.get("snapshot:index");
  return [
    {
      type: "index",
      user: "owner",
      index: {
        ...index,
        binders: index.binders.map((b) => ({ ...b, user: "owner" })),
        wishlists: index.wishlists.map((w) => ({ ...w, user: "owner" })),
        portfolio: { ...index.portfolio, user: "owner" },
      },
    },
    { type: "catalog", set: "set", catalog: records.get("snapshot:set:set") },
    { type: "complete" },
  ];
}
test("one streamed response restores the complete snapshot across arbitrary network chunks", async () => {
  const saved = [];
  const index = await readOfflineExport(exportResponse(snapshotRecords(), true), "owner", async (set, catalog) => saved.push({ set, catalog }));
  assert.equal(saved.length, 1);
  assert.equal(saved[0].catalog.historicPrices.length, 4);
  assert.equal(index.cards[0]._id, "card");
  assert.equal(index.sealed[0]._id, "sealed");
  assert.equal(index.portfolio.value, 120);
});
test("interrupted, incomplete, duplicate and wrong-account streams never complete", async () => {
  const data = snapshotRecords();
  const store = async () => {};
  await assert.rejects(readOfflineExport(exportResponse(data.slice(0, -1)), "owner", store), /interrupted/);
  await assert.rejects(readOfflineExport(exportResponse([data[0], data[2]]), "owner", store), /Incomplete/);
  await assert.rejects(readOfflineExport(exportResponse([data[0], data[1], data[1], data[2]]), "owner", store), /Unexpected/);
  await assert.rejects(readOfflineExport(exportResponse(data), "different-user", store), /account/);
  await assert.rejects(readOfflineExport(exportResponse([data[0], { type: "error", message: "Export interrupted" }]), "owner", store), /Export interrupted/);
});

async function runExportAPI(requestedUser, owner = "owner") {
  const { EventEmitter } = require("node:events");
  const queriedOwners = [];
  const dbReads = [];
  const client = {
    connect: async () => {},
    db: () => ({
      collection: (name) => ({
        find: (filter) => ({
          toArray: async () => {
            dbReads.push(name);
            if (name === "cards") return [card];
            if (name === "sealed") return [sealed];
            return historicPrices.filter((p) => (name.startsWith("card-") ? "card" in p : "sealed" in p));
          },
        }),
      }),
    }),
  };
  const mocks = {
    "@/lib/mongodb": { default: client, __esModule: true },
    "@/lib/auth": { getUserId: async () => owner },
    "@/types/constants": { DEMO_USER: "demo" },
    "@/lib/validation": { queryString: (value) => (typeof value === "string" ? value : undefined) },
    "./sets": { fetchSets: async () => [{ _id: "set", name: "151" }] },
    "./binders": {
      fetchBindersWithCard: async (user) => {
        queriedOwners.push(user);
        return [{ _id: "binder", user, items: [] }];
      },
    },
    "./wishlists": {
      fetchWishlistsWithCard: async (user) => {
        queriedOwners.push(user);
        return [{ _id: "wishlist", user, items: [] }];
      },
    },
    "./portfolios": {
      fetchPortfolio: async (user) => {
        queriedOwners.push(user);
        return { user, value: 120 };
      },
    },
  };
  const exports = {};
  const source = ts.transpileModule(fs.readFileSync(path.join(root, "pages/api/offline.ts"), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  new Function("require", "exports", source)((id) => {
    if (!(id in mocks)) throw new Error(id);
    return mocks[id];
  }, exports);
  const res = new EventEmitter();
  const chunks = [];
  const headers = {};
  res.statusCode = 200;
  res.status = (code) => {
    res.statusCode = code;
    return res;
  };
  res.json = (data) => {
    res.data = data;
  };
  res.setHeader = (key, value) => {
    headers[key] = value;
  };
  res.write = (chunk) => {
    chunks.push(chunk);
    res.headersSent = true;
    return true;
  };
  res.end = (chunk) => {
    if (chunk) chunks.push(chunk);
  };
  await exports.default({ method: "GET", query: { user: requestedUser } }, res);
  return { res, headers, queriedOwners, dbReads, records: chunks.join("").trim().split("\n").filter(Boolean).map(JSON.parse) };
}
test("snapshot endpoint resolves private data from the session and streams a complete export", async () => {
  const result = await runExportAPI("owner");
  assert.equal(result.res.statusCode, 200);
  assert.deepEqual(result.queriedOwners, ["owner", "owner", "owner"]);
  assert.equal(result.headers["Cache-Control"], "private, no-store");
  assert.deepEqual(
    result.records.map((r) => r.type),
    ["index", "catalog", "complete"],
  );
  assert.equal(result.records[1].catalog.cards[0]._id, "card");
  assert.equal(result.records[1].catalog.sealed[0]._id, "sealed");
});
test("snapshot endpoint rejects another account and exports no private data for visitors", async () => {
  const denied = await runExportAPI("someone-else");
  assert.equal(denied.res.statusCode, 409);
  assert.deepEqual(denied.queriedOwners, []);
  assert.deepEqual(denied.dbReads, []);
  const demo = await runExportAPI("demo", null);
  assert.deepEqual(demo.queriedOwners, []);
  assert.equal(demo.records[0].user, "demo");
  assert.deepEqual(demo.records[0].index.binders, []);
});
