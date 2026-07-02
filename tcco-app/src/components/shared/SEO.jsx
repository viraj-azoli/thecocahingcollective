import { Helmet } from 'react-helmet-async';

const SITE_NAME = 'The Coaching Collective Online';
const DEFAULT_DESC = 'Find your perfect coach. Grow through mindful, professional coaching on TCCO.';
const DEFAULT_IMAGE = 'https://tcco.app/og-image.png'; // replace with actual OG image URL

export default function SEO({ title, description, image, url, noIndex = false }) {
  const fullTitle = title ? `${title} | ${SITE_NAME}` : SITE_NAME;
  const desc = description || DEFAULT_DESC;
  const img  = image || DEFAULT_IMAGE;

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={desc} />
      {noIndex && <meta name="robots" content="noindex, nofollow" />}

      {/* Open Graph */}
      <meta property="og:site_name"   content={SITE_NAME} />
      <meta property="og:title"       content={fullTitle} />
      <meta property="og:description" content={desc} />
      <meta property="og:type"        content="website" />
      {url   && <meta property="og:url"   content={url} />}
      {img   && <meta property="og:image" content={img} />}

      {/* Twitter */}
      <meta name="twitter:card"        content="summary_large_image" />
      <meta name="twitter:title"       content={fullTitle} />
      <meta name="twitter:description" content={desc} />
      {img && <meta name="twitter:image" content={img} />}
    </Helmet>
  );
}
