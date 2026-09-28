// Components
import Metadata from "@/components/metadata";
import DatabaseContainer from "@/containers/database";

export default function DatabasePage() {
  return (
    <>
      <Metadata title="Database" description="Browse Pokémon TCG sets, cards and sealed products, with daily Cardmarket prices per language and variant." path="/database" />
      <DatabaseContainer />
    </>
  );
}
