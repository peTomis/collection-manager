import { CardVariant, SealedVariant } from "@/types/mongodb";
import { ItemSpecificType } from "@/types/constants";
import { useEffect, useState } from "react";
import DatabaseSelect from "../database-select";
import { useDispatch, useSelector } from "@/redux/store";
import { getCardsBySet, setCard } from "@/redux/slices/cards";
import { getSealedBySet, setSingleSealed } from "@/redux/slices/sealed";
import { getSets, getTcgSets, setSet } from "@/redux/slices/sets";
import DatabasePreview from "./components/database-preview";
import DatabaseCardList from "./components/database-card-list";

const DatabaseSetContainer = () => {
  const [type, setType] = useState<null | ItemSpecificType>(null);
  const [variant, setVariant] = useState<CardVariant | SealedVariant | null>(null);

  const { card, cards } = useSelector((state) => state.cards);
  const { sealed, singleSealed } = useSelector((state) => state.sealed);
  const { set, sets, tcgSets } = useSelector((state) => state.sets);
  const { user } = useSelector((state) => state.user);

  const dispatch = useDispatch();

  useEffect(() => {
    if (!set?._id || !type || !user) return;
    if (type === ItemSpecificType.CARD || type === ItemSpecificType.CARD_LIST) {
      if (cards.length === 0 || cards?.[0]?.set !== set._id) {
        dispatch(getCardsBySet(user, set._id));
      }
    } else {
      if (sealed.length === 0 || sealed?.[0]?.set !== set._id) {
        dispatch(getSealedBySet(user, set._id));
      }
    }
  }, [set, type, user]);

  useEffect(() => {
    if (!user) return;
    if (sets.length === 0) dispatch(getSets(user));
  }, [user]);

  useEffect(() => {
    if (tcgSets.length === 0) dispatch(getTcgSets());
    if (sets.length === 0 && user) dispatch(getSets(user));
  }, []);

  const itemToDisplay =
    type === null
      ? []
      : type === ItemSpecificType.CARD
      ? cards.map((c) => ({
          label: `${c.number} - ${c.name.replace(/\s*\(.*?\)\s*/g, " ")}`,
          value: c._id,
        }))
      : sealed
          .filter((c) => c.type === type)
          .map((c) => ({
            label: c.name,
            value: c._id,
          }));

  return (
    <div className="grid min-h-0 grid-cols-1 gap-2 md:grid-cols-6">
      <div className="min-h-0">
        <DatabaseSelect
          placeholder="set"
          selected={set?._id ?? ""}
          list={sets.map((s) => ({ label: s.name, value: s._id }))}
          onChange={(value) => {
            dispatch(setSet(sets.find((s) => s._id === value) ?? null));
            dispatch(setCard(null));
            dispatch(setSingleSealed(null));
            setType(null);
            setVariant(null);
          }}
          set
        />
      </div>
      <div className="min-h-0">
        <DatabaseSelect
          placeholder="type"
          selected={type ?? ""}
          list={Object.values(ItemSpecificType).map((t) => ({ label: t, value: t }))}
          onChange={(value) => {
            setType(value as ItemSpecificType);
            dispatch(setCard(null));
            setVariant(null);
          }}
          active={set !== null}
        />
      </div>
      {type != ItemSpecificType.CARD_LIST && (
        <>
          <div className="min-h-0">
            <DatabaseSelect
              placeholder={(type ?? "").toLowerCase()}
              selected={singleSealed?._id ?? card?._id ?? ""}
              list={itemToDisplay}
              onChange={(value) => {
                if (type === ItemSpecificType.CARD) {
                  dispatch(setCard(cards.find((c) => c._id === value) ?? null));
                  dispatch(setSingleSealed(null));
                } else {
                  dispatch(setSingleSealed(sealed.find((s) => s._id === value) ?? null));
                  dispatch(setCard(null));
                }
              }}
              active={type !== null}
            />
          </div>
          <DatabasePreview set={set} variant={variant} setVariant={setVariant} />
        </>
      )}
      {type === ItemSpecificType.CARD_LIST && <DatabaseCardList variant={variant} setVariant={setVariant} />}
    </div>
  );
};

export default DatabaseSetContainer;
