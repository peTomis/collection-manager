import { Card, CardVariant, Language, Sealed, SealedVariant } from "@/types/mongodb";
import { ItemSpecificType } from "@/types/constants";
import { useEffect, useState } from "react";
import DatabaseSelect from "../database-select";
import { dispatch, useSelector } from "@/redux/store";
import { getSets } from "@/redux/slices/sets";
import DatabaseSealedList from "./components/database-item-list";
import { getSealedByType, setSingleSealed } from "@/redux/slices/sealed";
import DatabasePreview from "../database-set-container/components/database-preview";

const DatabaseTypeContainer = () => {
  const [type, setType] = useState<null | ItemSpecificType>(null);
  const [variant, setVariant] = useState<null | CardVariant | SealedVariant>(null);

  const { sets } = useSelector((state) => state.sets);
  const { sealed } = useSelector((state) => state.sealed);
  const { user } = useSelector((state) => state.user);

  useEffect(() => {
    if (user) dispatch(getSealedByType(user, type as string));
  }, [type, user]);

  useEffect(() => {
    if (sets.length === 0 && user) dispatch(getSets(user));
  }, [user]);

  return (
    <div className="grid min-h-0 grid-cols-1 gap-2 md:grid-cols-8">
      <div className="min-h-0">
        <DatabaseSelect
          placeholder="type"
          selected={type ?? ""}
          list={Object.values(ItemSpecificType)
            .filter((t) => t !== ItemSpecificType.CARD_LIST && t !== ItemSpecificType.CARD)
            .map((t) => ({ label: t, value: t }))}
          onChange={(value) => {
            setType(value as ItemSpecificType);
            dispatch(setSingleSealed(null));
          }}
        />
      </div>
      {type !== ItemSpecificType.CARD && type !== ItemSpecificType.CARD_LIST && (
        <DatabaseSealedList
          type={type}
          onSealedSelect={(item: string, language: Language) => {
            const itemFound = sealed.find((s) => s._id === item);
            if (!itemFound) return;
            dispatch(setSingleSealed(itemFound));
            setVariant(itemFound.variants.find((v) => v.language === language) || null);
          }}
        />
      )}
      <DatabasePreview set={null} variant={variant} setVariant={setVariant} />
    </div>
  );
};

export default DatabaseTypeContainer;
