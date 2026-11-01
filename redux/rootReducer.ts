import { combineReducers } from "redux";

import bindersReducer from "./slices/binders";
import portfolioReducer from "./slices/portfolio";
import setsReducer from "./slices/sets";
import user from "./slices/user";
import wishlistsReducer from "./slices/wishlists";

const rootReducer = combineReducers({
  binders: bindersReducer,
  portfolio: portfolioReducer,
  sets: setsReducer,
  user: user,
  wishlists: wishlistsReducer,
});

export default rootReducer;
