const commons = 'https://commons.wikimedia.org/w/api.php';
const imageHosts = new Set(['upload.wikimedia.org', 'thumb.wikimedia.org']);
const acceptedMimeTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);
const licenseHosts = new Set(['creativecommons.org', 'www.creativecommons.org']);
const sourceHosts = new Set(['commons.wikimedia.org']);
const dishes = [
  'Apfelstrudel', 'Apfelkuchen', 'Käsekuchen', 'Marmorkuchen', 'Schokoladenkuchen',
  'Schwarzwälder Kirschtorte', 'Tiramisu', 'Panna Cotta', 'Crème brûlée', 'Waffeln',
  'Pfannkuchen', 'Kaiserschmarrn', 'Milchreis', 'Lasagne', 'Spaghetti Bolognese',
  'Carbonara', 'Pizza Margherita', 'Risotto', 'Chili con Carne', 'Chili sin Carne',
  'Kartoffelsalat', 'Kartoffelsuppe', 'Kürbissuppe', 'Linsensuppe', 'Ratatouille',
  'Rinderrouladen', 'Wiener Schnitzel', 'Frikadellen', 'Brot', 'Bananenbrot',
  'Rindergulasch', 'Gulasch', 'Gulaschsuppe', 'Sauerbraten', 'Bienenstich',
  'Maultaschen', 'Gemüsecurry', 'Butter Chicken', 'Hummus', 'Falafel',
];

export function recipePhotoSubject(question, blocks) {
  if (!/rezept|zubereit|backe|koche|mache/iu.test(question)) return '';
  if (!blocks.some(block => block.type === 'heading' && /^(?:Zutaten|Zubereitung)/iu.test(block.text))) return '';
  // Only send a public dish name, never an assistant transcript.
  const spoken = question.toLocaleLowerCase('de');
  return dishes.find(dish => new RegExp(`(?<![\\p{L}])${dish.toLocaleLowerCase('de')}(?=$|[^\\p{L}]|rezept)`, 'u').test(spoken)) || '';
}

export function loadRecipePhoto(article, subject, signal) {
  if (!subject) return;
  const request = new AbortController();
  const abort = () => request.abort();
  if (signal.aborted) return;
  signal.addEventListener('abort', abort, { once: true });
  const timeout = setTimeout(abort, 8000);
  void insertRecipePhoto(article, subject, request.signal).catch(() => {}).finally(() => {
    clearTimeout(timeout);
    signal.removeEventListener('abort', abort);
  });
}

function httpsUrl(value, hosts) {
  try {
    const url = new URL(value);
    if (url.protocol === 'https:' && !url.username && !url.password && hosts.has(url.hostname)) return url;
  } catch {
    // Skip files without usable URLs.
  }
}

function plainText(value) {
  return typeof value === 'string' ? value.replace(/<[^>]*>/gu, '').trim() : '';
}

export async function findRecipePhoto(dish, signal) {
  const subject = dish.trim();
  if (!/^[\p{L}][\p{L} -]{1,47}$/u.test(subject)) return null;
  const titleSearch = /^[\p{L}]+$/u.test(subject) ? subject : `"${subject}"`;
  const url = new URL(commons);
  url.search = new URLSearchParams({
    action: 'query', generator: 'search', gsrnamespace: '6', gsrlimit: '8',
    gsrsearch: `intitle:${titleSearch} filetype:bitmap`,
    prop: 'imageinfo', iiprop: 'url|mime|extmetadata', iiurlwidth: '640',
    iiextmetadatafilter: 'Artist|LicenseShortName|LicenseUrl',
    format: 'json', formatversion: '2', origin: '*',
  });
  const response = await fetch(url, { signal, credentials: 'omit', referrerPolicy: 'no-referrer' });
  if (!response.ok) throw new Error('Bildsuche nicht erreichbar');
  const { query, error } = await response.json();
  if (error) throw new Error('Bildsuche nicht erreichbar');
  const titleMatch = subject.toLocaleLowerCase('de');
  const pages = (query?.pages ?? []).filter(page => page.title.toLocaleLowerCase('de').includes(titleMatch));
  const exactTitle = title => title.replace(/^File:/u, '').replace(/\.[a-z]+$/iu, '').toLocaleLowerCase('de') === titleMatch;
  pages.sort((a, b) => Number(exactTitle(b.title)) - Number(exactTitle(a.title)) || a.index - b.index);
  for (const page of pages) {
    const info = page.imageinfo?.[0];
    if (!acceptedMimeTypes.has(info?.mime)) continue;
    const image = httpsUrl(info.thumburl, imageHosts);
    const source = httpsUrl(info.descriptionurl, sourceHosts);
    const metadata = info.extmetadata;
    const author = plainText(metadata?.Artist?.value);
    const license = plainText(metadata?.LicenseShortName?.value);
    const licenseUrl = httpsUrl(metadata?.LicenseUrl?.value?.replace(/^http:/u, 'https:'), licenseHosts);
    if (!image || !source || !author || !licenseUrl || !/^CC (?:BY(?:-SA)?\b|0\b)/u.test(license)) continue;
    return { image: image.href, source: source.href, author, license, licenseUrl: licenseUrl.href, alt: subject };
  }
  return null;
}

export async function insertRecipePhoto(article, dish, signal) {
  const photo = await findRecipePhoto(dish, signal);
  if (!photo || signal.aborted) return false;
  const figure = document.createElement('figure');
  figure.className = 'commons-photo';
  const image = document.createElement('img');
  image.alt = photo.alt;
  image.decoding = 'async';
  image.referrerPolicy = 'no-referrer';
  image.src = photo.image;
  await image.decode();
  if (signal.aborted) return false;
  const caption = document.createElement('figcaption');
  const source = document.createElement('a');
  source.href = photo.source;
  source.target = '_blank';
  source.rel = 'noopener noreferrer';
  source.textContent = 'Wikimedia Commons';
  const license = source.cloneNode();
  license.href = photo.licenseUrl;
  license.textContent = photo.license;
  caption.append(photo.author + ' · ', source, ' · ', license);
  figure.append(image, caption);
  const heading = article.querySelector('h3');
  if (heading) heading.after(figure);
  else article.prepend(figure);
  return true;
}
