// Components
import Metadata from "@/components/metadata";
import BindersContainer from "@/containers/binders";

export default function BindersPage() {
  return (
    <>
      <Metadata title="Binders" description="Your binders: the cards and sealed products you own, with quantities, value and price trends." path="/binders" />
      <BindersContainer />
    </>
  );
}
