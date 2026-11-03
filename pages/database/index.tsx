// Components
import Metadata from "@/components/metadata";
import { useT } from "@/lib/i18n";
import DatabaseContainer from "@/containers/database";

export default function DatabasePage() {
  const t = useT();
  return (
    <>
      <Metadata title={t.metadata.database.title} description={t.metadata.database.description} path="/database" />
      <DatabaseContainer />
    </>
  );
}
