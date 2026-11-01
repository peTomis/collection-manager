import { ObjectId } from "mongodb";
import { CardVariantType, ItemType, Language } from "@/types/mongodb";

// Query params can be arrays (?id=a&id=b): only accept a single string.
export const queryString = (value: string | string[] | undefined): string | undefined => (typeof value === "string" ? value : undefined);

// Returns null instead of throwing on malformed ids, so routes can answer 400.
export const parseObjectId = (value: string | string[] | undefined): ObjectId | null => {
  const id = queryString(value);
  return id && ObjectId.isValid(id) && /^[0-9a-f]{24}$/i.test(id) ? new ObjectId(id) : null;
};

const oneOf = <T extends string>(values: T[], value: string | string[] | undefined): T | undefined => values.find((v) => v === queryString(value));

// One version of a card or sealed product in the query (?id, type, language, variant: cards only), or null when anything is malformed
export const parseVersion = (query: Partial<Record<string, string | string[]>>) => {
  const id = parseObjectId(query.id);
  const type = oneOf([ItemType.CARD, ItemType.SEALED], query.type);
  const language = oneOf(Object.values(Language), query.language);
  const variant = oneOf(Object.values(CardVariantType), query.variant);
  if (!id || !type || !language || (query.variant !== undefined && !variant)) return null;
  return { id: String(id), type, language, variant: variant ?? null };
};

export { LIMITS } from "@/lib/limits";
