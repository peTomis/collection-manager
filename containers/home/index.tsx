// Libraries
import { useEffect } from "react";

// State
import { useDispatch, useSelector } from "@/redux/store";
import { getPortfolio } from "@/redux/slices/portfolio";
import { getBinders } from "@/redux/slices/binders";
import { getWishlists } from "@/redux/slices/wishlists";
import { getSets } from "@/redux/slices/sets";

// Components
import Topbar from "@/components/organisms/topbar";
import NetWorth from "./components/net-worth";
import BindersWidget from "./components/binders-widget";
import TopFlop from "./components/top-flop";

const HomeContainer = () => {
  const { user } = useSelector((state) => state.user);

  const dispatch = useDispatch();

  useEffect(() => {
    if (!user) return;
    dispatch(getPortfolio(user));
    dispatch(getBinders(user));
    dispatch(getWishlists(user));
    dispatch(getSets(user));
  }, [user]);

  return (
    <main className="flex flex-col min-h-screen font-geist text-ink">
      <Topbar />
      <div className="grid w-full max-w-[1440px] mx-auto grid-cols-1 gap-4 px-4 pt-4 pb-5 lg:grid-cols-[minmax(0,1fr)_400px] lg:gap-6 lg:px-10 lg:pt-8 lg:pb-12">
        <NetWorth />
        {/* On desktop the binders card fills the net worth row height and scrolls its list */}
        <div className="order-last lg:order-none lg:relative">
          <BindersWidget />
        </div>
        <div className="lg:col-span-2">
          <TopFlop />
        </div>
      </div>
    </main>
  );
};

export default HomeContainer;
