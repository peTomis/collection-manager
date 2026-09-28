import { ObjectId } from "mongodb";

// Query params can be arrays (?id=a&id=b): only accept a single string.
export const queryString = (value: string | string[] | undefined): string | undefined => (typeof value === "string" ? value : undefined);

// Returns null instead of throwing on malformed ids, so routes can answer 400.
export const parseObjectId = (value: string | string[] | undefined): ObjectId | null => {
  const id = queryString(value);
  return id && ObjectId.isValid(id) && /^[0-9a-f]{24}$/i.test(id) ? new ObjectId(id) : null;
};

// Caps for user generated content
export const LIMITS = {
  NAME_LENGTH: 100,
  LISTS_PER_USER: 50,
  ITEMS_PER_LIST: 2000,
  QUANTITY: 9999,
  HISTORIC_PRICES_BATCH: 1000,
};
