// Components
import Metadata from "@/components/metadata";
import { useT } from "@/lib/i18n";
import BindersContainer from "@/containers/binders";

export default function BindersPage() {
  const t = useT();
  return (
    <>
      <Metadata title={t.metadata.binders.title} description={t.metadata.binders.description} path="/binders" />
      <BindersContainer />
    </>
  );
}
