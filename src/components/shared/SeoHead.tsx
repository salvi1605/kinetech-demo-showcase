import { Helmet } from "react-helmet-async";

interface SeoHeadProps {
  title: string;
  description: string;
  path: string;
  type?: "website" | "article";
}

const BASE_URL = "https://agendixpro.app";

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
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
    </Helmet>
  );
}
