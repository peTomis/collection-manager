// TCGdex identifiers: how our set ids and card numbers map to TCGdex ones.
import { formatCardNumber } from "./items";

// The catalog's 151 identifier differs from TCGdex's set identifier.
export const tcgdexSetId = (setId: string) => (setId === "sv3pt5" ? "sv03.5" : setId);

// TCGdex card id within its set → our card number. Holo subset cards ("H1"/"H01") are stored as 1000 + n (see formatCardNumber).
// Ids we have no number for, like Aquapolis' "50a", give NaN.
export const tcgdexNumber = (localId: string) => (/^H\d+$/.test(localId) ? 1000 + Number(localId.slice(1)) : Number(localId));

// Our own copy of the images TCGdex lacks (scripts/fetch-card-images.mjs), laid out like TCGdex's low one: /cards/ecard2/H30/low.webp
export const localCardImage = (setId: string, number: number) => `/cards/${setId}/${formatCardNumber(number)}`;
