import Head from "next/head";
import { useT } from "@/lib/i18n";

export const SITE_NAME = "Binderly";
export const SITE_URL = "https://binderly.petomis.com";

interface MetadataProps {
  // Page name, shown before the site name ("Binders · Binderly"). The home page has none.
  title?: string;
  description?: string;
  // Path of the page, for the canonical URL
  path?: string;
  // Pages that shouldn't show up in search results
  noindex?: boolean;
}

// Title, description and social previews of a page, in the current language (crawlers get the English of the server render).
// Icons, manifest and theme colour are shared, in pages/_document.tsx.
const Metadata = ({ title, description, path = "/", noindex }: MetadataProps) => {
  const t = useT();
  description ??= t.metadata.description;
  const fullTitle = title ? `${title} · ${SITE_NAME}` : `${SITE_NAME} · ${t.metadata.tagline}`;
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
      <meta property="og:image:alt" content={t.metadata.imageAlt} />
      <meta property="og:locale" content={t.metadata.ogLocale} />

      {/* X / Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />
    </Head>
  );
};

export default Metadata;
