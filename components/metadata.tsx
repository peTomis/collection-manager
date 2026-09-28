import Head from "next/head";

const Metadata = () => {
  const title = "Collection Manager";
  const description = "Collection Manager is a tool to help you keep track of your collection of collectibles, like trading cards, action figures, and more.";

  return (
    <Head>
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href="https://www.collectionmanager.petomis.com" />
      {/* Open Graph metadata */}
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content="https://www.collectionmanager.petomis.com/" />
      <meta property="og:site_name" content="Collection Manager" />
      <meta property="og:image" content="https://www.collectionmanager.petomis.com/images/sample.png" />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:image:alt" content="Petomis' Collection Manager" />
      <meta property="og:locale" content="en_US" />
      <meta property="og:type" content="website" />

      {/* Twitter metadata */}
      {/* <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:site" content="@Petomis" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content="https://www.collectionmanager.petomis.com/images/sample.png" />
      <meta name="twitter:image:width" content="1200" />
      <meta name="twitter:image:height" content="630" />
      <meta name="twitter:image:alt" content="Petomis' Collection Manager" /> */}

      {/* Icons */}
      <link rel="icon" href="/favicon.ico" />
      <link rel="mask-icon" href="/favicon.svg" color="#ffffff" />
    </Head>
  );
};

export default Metadata;
