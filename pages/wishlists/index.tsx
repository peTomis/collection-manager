// Components
import Metadata from "@/components/metadata";
import { useT } from "@/lib/i18n";
import WishlistsContainer from "@/containers/wishlists";

export default function WishlistsPage() {
  const t = useT();
  return (
    <>
      <Metadata title={t.metadata.wishlists.title} description={t.metadata.wishlists.description} path="/wishlists" />
      <WishlistsContainer />
    </>
  );
}
