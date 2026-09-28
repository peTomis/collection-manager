// Components
import Metadata from "@/components/metadata";
import WishlistsContainer from "@/containers/wishlists";

export default function WishlistsPage() {
  return (
    <>
      <Metadata title="Wishlists" description="Your wishlists: the cards and sealed products you want, with target prices and alerts when they are reached." path="/wishlists" />
      <WishlistsContainer />
    </>
  );
}
