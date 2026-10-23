// The database's rules for each collection: required fields and types (validators) and indexes.
// Applied to Atlas by scripts/setup-collections.mjs, and to the throwaway test database by tests/db/setup.ts.

const objectId = { bsonType: "objectId" };
const hexId = { bsonType: "string", pattern: "^[0-9a-f]{24}$" };
const number = { bsonType: ["int", "long", "double", "decimal"] };
const itemType = { enum: ["card", "sealed"] };

export const RULES = {
  binders: {
    schema: { required: ["user", "name"], properties: { user: objectId, name: { bsonType: "string" }, set: objectId } },
    indexes: [{ user: 1 }],
  },
  wishlists: {
    schema: { required: ["user", "name"], properties: { user: objectId, name: { bsonType: "string" } } },
    indexes: [{ user: 1 }],
  },
  "binder-items": {
    schema: {
      required: ["user", "binder", "item", "historicPrice", "type", "quantity"],
      properties: { user: objectId, binder: hexId, item: hexId, historicPrice: hexId, type: itemType, quantity: { ...number, minimum: 1 }, owned: { bsonType: "bool" } },
    },
    indexes: [{ user: 1, binder: 1 }],
  },
  "wishlist-items": {
    schema: {
      required: ["user", "wishlist", "item", "historicPrice", "type"],
      properties: { user: objectId, wishlist: hexId, item: hexId, historicPrice: hexId, type: itemType, target: { ...number, minimum: 0 } },
    },
    indexes: [{ user: 1, wishlist: 1 }],
  },
  // Written by the external scraper: only warn (in the MongoDB log) so a mismatch never blocks its daily run
  portfolios: {
    schema: { required: ["user"], properties: { user: objectId } },
    indexes: [{ user: 1 }],
    action: "warn",
  },
  cards: { indexes: [{ set: 1 }] },
  sealed: { indexes: [{ set: 1 }, { type: 1 }] },
  // Price charts read one version's daily prices in order
  "card-prices": { indexes: [{ card: 1, language: 1, type: 1, timestamp: 1 }] },
  "sealed-prices": { indexes: [{ sealed: 1, language: 1, timestamp: 1 }] },
  "card-historic-prices": { indexes: [{ card: 1, language: 1, type: 1 }] },
  "sealed-historic-prices": { indexes: [{ sealed: 1, language: 1 }] },
};

// The MongoDB validator enforcing a collection's schema
export const validatorOf = (schema) => ({ $jsonSchema: { bsonType: "object", ...schema } });
