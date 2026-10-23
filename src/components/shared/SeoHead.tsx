import { Helmet } from "react-helmet-async";
import socialImage from "@/assets/agendixpro-social.jpg.asset.json";

interface SeoHeadProps {
  title: string;
  description: string;
  path: string;
  type?: "website" | "article";
}

const BASE_URL = "https://agendixpro.app";
const SOCIAL_IMAGE_URL = new URL(socialImage.url, BASE_URL).href;
const SOCIAL_IMAGE_ALT = "AgendixPro — Software de agenda y gestión para clínicas";

export function SeoHead({ title, description, path, type = "website" }: SeoHeadProps) {
  const url = `${BASE_URL}${path}`;
  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={url} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={url} />
      <meta property="og:type" content={type} />
      <meta property="og:image" content={SOCIAL_IMAGE_URL} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:image:type" content={socialImage.content_type} />
      <meta property="og:image:alt" content={SOCIAL_IMAGE_ALT} />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={SOCIAL_IMAGE_URL} />
      <meta name="twitter:image:alt" content={SOCIAL_IMAGE_ALT} />
    </Helmet>
  );
}
