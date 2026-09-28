const Language = ({ language }: { language: string }) => {
  if (language === "en")
    return (
      <div className="flex items-center justify-center">
        <img src={"./languages/english.svg"} width={18} height={18} alt="Card" />
      </div>
    );
  if (language === "it")
    return (
      <div className="flex items-center justify-center">
        <img src={"./languages/italian.svg"} width={18} height={18} alt="Card" />
      </div>
    );
  return <></>;
};

export default Language;
