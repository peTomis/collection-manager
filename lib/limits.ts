// Shared by API routes and client code, so it must not import server-only modules
// Caps for user generated content
export const LIMITS = {
  NAME_LENGTH: 100,
  LISTS_PER_USER: 50,
  ITEMS_PER_LIST: 2000,
  QUANTITY: 9999,
  HISTORIC_PRICES_BATCH: 1000,
};
