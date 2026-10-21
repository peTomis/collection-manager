// Card images TCGdex doesn't have (Best of Game, the holo H cards of Aquapolis and Skyridge…), saved as public/cards/<set>/<number>/low.webp,
// TCGdex's small size (no high one: lib/tcgdex.ts uses low for them on every screen) and points the cards TCGdex lists without an image there.
// They come from pokemontcg.io once, here: its host is too slow to show them from in the app.
//
// Usage: node --env-file=.env scripts/fetch-card-images.mjs           (dry run: lists the missing images and where they'd come from)
//        node --env-file=.env scripts/fetch-card-images.mjs --apply   (downloads and converts them; existing files are kept)
import { existsSync, mkdirSync } from "node:fs";
import { MongoClient } from "mongodb";
import sharp from "sharp";

const CARDS = new URL("../public/cards", import.meta.url).pathname;
const apply = process.argv.includes("--apply");

// Same as lib/tcgdex-ids.ts
const tcgdexSetId = (setId) => (setId === "sv3pt5" ? "sv03.5" : setId);
const tcgdexNumber = (localId) => (/^H\d+$/.test(localId) ? 1000 + Number(localId.slice(1)) : Number(localId));
const formatCardNumber = (number) => (number > 1000 ? `H${number - 1000}` : String(number));
// pokemontcg.io set ids are TCGdex's except for these
const POKEMONTCG_SET_IDS = { lc: "base6", bog: "bp" };
// TCGdex's low image width
const WIDTH = 245;
// pokemontcg.io serves its images slowly (seconds to minutes each): several at once, retried when one stalls
const PARALLEL = 8;
const ATTEMPTS = 3;

const download = async (url) => {
  for (let attempt = 1; ; attempt++) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(180_000) });
      if (!response.ok) return { status: response.status };
      return { buffer: Buffer.from(await response.arrayBuffer()) };
    } catch (error) {
      if (attempt === ATTEMPTS) return { status: error.name === "TimeoutError" ? "timeout" : error.message };
    }
  }
};

if (!process.env.MONGODB_URI) throw new Error('Missing environment variable: "MONGODB_URI"');
const client = new MongoClient(process.env.MONGODB_URI);

try {
  await client.connect();
  const db = client.db("collection-manager");
  let saved = 0;
  const failed = [];
  for (const set of await db.collection("sets").find({ tcgdex: { $nin: [null, ""] } }).sort({ releasedAt: 1 }).toArray()) {
    const response = await fetch(`https://api.tcgdex.net/v2/en/sets/${encodeURIComponent(tcgdexSetId(set.tcgdex))}`);
    if (!response.ok) {
      console.warn(`${set.name}: not on TCGdex (${response.status}), skipped`);
      continue;
    }
    const listed = (await response.json()).cards ?? [];
    const withoutImage = new Set(listed.filter((c) => !c.image).map((c) => tcgdexNumber(c.localId)));
    const cards = await db.collection("cards").find({ set: String(set._id) }, { projection: { number: 1, name: 1 } }).sort({ number: 1 }).toArray();
    const missing = cards.filter((c) => withoutImage.has(c.number) && !existsSync(`${CARDS}/${set.tcgdex}/${formatCardNumber(c.number)}/low.webp`));
    if (!missing.length) continue;
    console.log(`${set.name}: ${missing.length} missing (${missing.map((c) => formatCardNumber(c.number)).join(", ")})`);
    if (!apply) continue;
    const queue = [...missing];
    const worker = async () => {
      for (let card; (card = queue.shift()); ) {
        const number = formatCardNumber(card.number);
        const { buffer, status } = await download(`https://images.pokemontcg.io/${POKEMONTCG_SET_IDS[set.tcgdex] ?? set.tcgdex}/${number}.png`);
        if (!buffer) {
          failed.push(`${set.name} ${number} ${card.name} (${status})`);
          continue;
        }
        const folder = `${CARDS}/${set.tcgdex}/${number}`;
        mkdirSync(folder, { recursive: true });
        await sharp(buffer).resize({ width: WIDTH }).webp({ quality: 80 }).toFile(`${folder}/low.webp`);
        console.log(`  ${set.name} ${number} saved`);
        saved++;
      }
    };
    await Promise.all(Array.from({ length: PARALLEL }, worker));
  }
  if (apply) console.log(`Saved ${saved} images.`);
  else console.log("Dry run: run again with --apply to download them.");
  if (failed.length) console.warn(`Not downloaded (missing on pokemontcg.io, or it timed out: run again):\n  ${failed.join("\n  ")}`);
} finally {
  await client.close();
}
