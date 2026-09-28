import Head from "next/head";

export const SITE_NAME = "Collection Manager";
export const SITE_URL = "https://www.collectionmanager.petomis.com";
const DEFAULT_DESCRIPTION =
  "Track the value of your Pokémon TCG collection. Organise cards and sealed products into binders, keep wishlists with target prices, and follow daily Cardmarket prices.";

interface MetadataProps {
  // Page name, shown before the site name ("Binders · Collection Manager"). The home page has none.
  title?: string;
  description?: string;
  // Path of the page, for the canonical URL
  path?: string;
  // Pages that shouldn't show up in search results
  noindex?: boolean;
}

// Title, description and social previews of a page. Icons, manifest and theme colour are shared, in pages/_document.tsx.
const Metadata = ({ title, description = DEFAULT_DESCRIPTION, path = "/", noindex }: MetadataProps) => {
  const fullTitle = title ? `${title} · ${SITE_NAME}` : `${SITE_NAME} · Pokémon TCG collection tracker`;
  const url = SITE_URL + path;
  const image = `${SITE_URL}/og.png`;

  return (
    <Head>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      {noindex ? <meta name="robots" content="noindex" /> : <link rel="canonical" href={url} />}

      {/* Open Graph */}
      <meta property="og:type" content="website" />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={url} />
      <meta property="og:image" content={image} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:image:alt" content="Collection Manager: know what your Pokémon cards are worth" />
      <meta property="og:locale" content="en_US" />

      {/* X / Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />
    </Head>
  );
};

export default Metadata;
