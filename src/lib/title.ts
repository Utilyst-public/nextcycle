import { useEffect } from 'react';

export function publicOrigin(metadataSiteUrl?: string) {
  const configured = import.meta.env.VITE_SITE_URL;
  const fallback = 'https://nextcycle.tech';
  try {
    const candidate = new URL(configured || metadataSiteUrl || fallback);
    if (candidate.protocol === 'https:' || candidate.protocol === 'http:') return candidate.origin;
  } catch { /* fall through to the requested public-origin fallback */ }
  return fallback;
}

export function usePageTitle(title: string | null, description?: string, metadataSiteUrl?: string, socialImage?: string) {
  useEffect(() => {
    const titleText = title ? `${title} · NextCycle` : 'NextCycle: newer evidence for California waters';
    document.title = titleText;
    const pageDescription = description || 'NextCycle helps California communities understand newer water monitoring evidence in plain language before the next official impaired-waters list.';
    let meta = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    if (!meta) { meta = document.createElement('meta'); meta.name = 'description'; document.head.append(meta); }
    meta.content = pageDescription;
    const origin = publicOrigin(metadataSiteUrl);
    let link = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!link) { link = document.createElement('link'); link.rel = 'canonical'; document.head.append(link); }
    const prefix = import.meta.env.BASE_URL.endsWith('/') ? import.meta.env.BASE_URL : `${import.meta.env.BASE_URL}/`;
    const basePath = prefix === './' ? '' : prefix.replace(/^\/+|\/+$/g, '');
    let routePath = window.location.pathname.replace(/^\/+/, '');
    if (basePath && routePath === basePath) routePath = '';
    else if (basePath && routePath.startsWith(`${basePath}/`)) routePath = routePath.slice(basePath.length + 1);
    link.href = new URL(`${prefix}${routePath}`, origin).toString();
    const canonicalUrl = link.href;
    const setProperty = (property: string, content: string) => {
      let node = document.querySelector<HTMLMetaElement>(`meta[property="${property}"]`);
      if (!node) { node = document.createElement('meta'); node.setAttribute('property', property); document.head.append(node); }
      node.content = content;
    };
    const setName = (name: string, content: string) => {
      let node = document.querySelector<HTMLMetaElement>(`meta[name="${name}"]`);
      if (!node) { node = document.createElement('meta'); node.name = name; document.head.append(node); }
      node.content = content;
    };
    setProperty('og:title', titleText);
    setProperty('og:description', pageDescription);
    setProperty('og:url', canonicalUrl);
    setProperty('og:type', 'website');
    const detailMatch = routePath.match(/^(?:w|embed)\/([^/]+)/);
    const generatedImage = socialImage
      ? new URL(`${prefix}${socialImage}`, origin).toString()
      : detailMatch
        ? new URL(`${prefix}og/${encodeURIComponent(detailMatch[1])}.png`, origin).toString()
        : new URL(`${prefix}og-image.png`, origin).toString();
    setProperty('og:image', generatedImage);
    setName('twitter:card', generatedImage ? 'summary_large_image' : 'summary');
    setName('twitter:title', titleText);
    setName('twitter:description', pageDescription);
    setName('twitter:image', generatedImage);
  }, [title, description, metadataSiteUrl, socialImage]);
}
