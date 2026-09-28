import { combineReducers } from "redux";

import bindersReducer from "./slices/binders";
import cardsReducer from "./slices/cards";
import historicPricesReducer from "./slices/historic-prices";
import portfolioReducer from "./slices/portfolio";
import pricesReducer from "./slices/prices";
import sealedReducer from "./slices/sealed";
import setsReducer from "./slices/sets";
import user from "./slices/user";
import wishlistsReducer from "./slices/wishlists";

const rootReducer = combineReducers({
  binders: bindersReducer,
  cards: cardsReducer,
  historicPrices: historicPricesReducer,
  portfolio: portfolioReducer,
  prices: pricesReducer,
  sealed: sealedReducer,
  sets: setsReducer,
  user: user,
  wishlists: wishlistsReducer,
});

export default rootReducer;
