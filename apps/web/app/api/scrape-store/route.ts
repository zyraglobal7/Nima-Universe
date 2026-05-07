import { NextRequest, NextResponse } from 'next/server';

type Category =
  | 'top'
  | 'bottom'
  | 'dress'
  | 'outfit'
  | 'outerwear'
  | 'shoes'
  | 'accessory'
  | 'bag'
  | 'jewelry'
  | 'swimwear';

type Gender = 'male' | 'female' | 'unisex';

export interface ScrapedProduct {
  name: string;
  description: string;
  price: number;
  originalPrice?: number;
  category: Category;
  subcategory?: string;
  gender: Gender;
  colors: string[];
  sizes: string[];
  tags: string[];
  inStock: boolean;
  sourceUrl: string;
  sku?: string;
  imageUrls: string[];
}

interface ShopifyProduct {
  title: string;
  body_html: string;
  handle: string;
  product_type: string;
  tags: string | string[];
  images: { src: string }[];
  variants: {
    price: string;
    compare_at_price: string | null;
    available: boolean;
    sku: string | null;
    option1: string | null;
    title: string;
  }[];
  options: { name: string; values: string[] }[];
}

function inferCategory(productType: string, tags: string[]): Category {
  const text = `${productType} ${tags.join(' ')}`.toLowerCase();
  if (/\bdress\b|maxi dress|midi dress/.test(text)) return 'dress';
  if (/\bshoe\b|\bsneaker|\bboot\b|\bheel\b|\bsandal|\bloafer|\bpump\b/.test(text)) return 'shoes';
  if (/\bbag\b|\bpurse|\bhandbag|\btote\b|\bclutch|\bbackpack/.test(text)) return 'bag';
  if (/\bjewel|\bnecklace|\bearring|\bbracelet|\bring\b|\bwatch\b/.test(text)) return 'jewelry';
  if (/\bjacket|\bcoat\b|\bblazer|\bcardigan|\bhoodie|\bsweatshirt/.test(text)) return 'outerwear';
  if (/\bpant|\btrouser|\bjean|\bshort\b|\bskirt|\blegging/.test(text)) return 'bottom';
  if (/\bshirt|\btop\b|\bblouse|\btee\b|\btank|\bcrop\b/.test(text)) return 'top';
  if (/\bswim|\bbikini|\bswimsuit|\bbeach/.test(text)) return 'swimwear';
  if (/\bbelt|\bhat\b|\bcap\b|\bscarf|\bglove|\bsunglass|\baccessory/.test(text)) return 'accessory';
  if (/\bsuit\b|\bset\b|\boutfit|\bcoord|\bjumpsuit/.test(text)) return 'outfit';
  return 'outfit';
}

function inferGender(productType: string, tags: string[]): Gender {
  const text = `${productType} ${tags.join(' ')}`.toLowerCase();
  if (/\bwomen\b|\bwoman\b|\bfemale\b|\bgirls?\b|\bladies\b/.test(text)) return 'female';
  if (/\bmen\b|\bman\b|\bmale\b|\bboys?\b|\bgents?\b/.test(text)) return 'male';
  return 'unisex';
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function mapShopifyProduct(product: ShopifyProduct, baseUrl: string): ScrapedProduct {
  const rawTags = product.tags;
  const tags = Array.isArray(rawTags)
    ? (rawTags as string[]).map((t) => String(t).trim()).filter(Boolean)
    : typeof rawTags === 'string' && rawTags
      ? rawTags.split(',').map((t) => t.trim()).filter(Boolean)
      : [];

  const firstVariant = product.variants[0];

  const sizeOption = product.options?.find((o) => /size/i.test(o.name));
  const colorOption = product.options?.find((o) => /colou?r/i.test(o.name));

  const sizes = sizeOption
    ? sizeOption.values
    : product.variants.length > 1 && product.variants[0].title !== 'Default Title'
      ? [...new Set(product.variants.map((v) => v.option1 || v.title).filter(Boolean))]
      : [];

  const colors = colorOption ? colorOption.values : [];

  const imageUrls = product.images
    .map((img) => img.src.split('?')[0])
    .filter(Boolean)
    .slice(0, 6);

  const price = Math.round(parseFloat(firstVariant?.price || '0'));
  const comparePrice = firstVariant?.compare_at_price
    ? Math.round(parseFloat(firstVariant.compare_at_price))
    : undefined;

  return {
    name: product.title,
    description: stripHtml(product.body_html || ''),
    price,
    originalPrice: comparePrice && comparePrice > price ? comparePrice : undefined,
    category: inferCategory(product.product_type || '', tags),
    subcategory: product.product_type || undefined,
    gender: inferGender(product.product_type || '', tags),
    colors,
    sizes,
    tags,
    inStock: product.variants.some((v) => v.available),
    sourceUrl: `${baseUrl}/products/${product.handle}`,
    sku: firstVariant?.sku || undefined,
    imageUrls,
  };
}

export async function GET(request: NextRequest) {
  const rawUrl = request.nextUrl.searchParams.get('url');

  if (!rawUrl) {
    return NextResponse.json({ error: 'URL is required' }, { status: 400 });
  }

  let baseUrl: string;
  try {
    const parsed = new URL(rawUrl.startsWith('http') ? rawUrl : `https://${rawUrl}`);
    baseUrl = `${parsed.protocol}//${parsed.host}`;
  } catch {
    return NextResponse.json({ error: 'Invalid URL format' }, { status: 400 });
  }

  const fetchUrl = `${baseUrl}/products.json?limit=250`;
  console.log(`[scrape-store] Fetching: ${fetchUrl}`);

  try {
    const res = await fetch(fetchUrl, {
      headers: { Accept: 'application/json', 'User-Agent': 'Mozilla/5.0 (compatible; Nima-Import/1.0)' },
      signal: AbortSignal.timeout(20000),
    });

    const status = res.status;
    const contentType = res.headers.get('content-type') || '';
    console.log(`[scrape-store] Response: status=${status} content-type="${contentType}"`);

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      console.log(`[scrape-store] Non-OK body (first 200 chars): ${body.slice(0, 200)}`);
      return NextResponse.json(
        { error: `Store returned HTTP ${status}. This may not be a Shopify store, or the store blocks automated requests.` },
        { status: 422 }
      );
    }

    // Some Shopify stores redirect to a password page and return HTML with 200
    if (!contentType.includes('application/json')) {
      const body = await res.text().catch(() => '');
      console.log(`[scrape-store] Non-JSON content-type. Body (first 200 chars): ${body.slice(0, 200)}`);
      return NextResponse.json(
        { error: 'Store returned HTML instead of JSON — it may be password-protected or not a Shopify store.' },
        { status: 422 }
      );
    }

    let data: { products?: unknown };
    try {
      data = await res.json();
    } catch (parseErr) {
      console.log(`[scrape-store] JSON parse failed:`, parseErr);
      return NextResponse.json({ error: 'Store response was not valid JSON.' }, { status: 422 });
    }

    console.log(`[scrape-store] products array length: ${Array.isArray(data.products) ? (data.products as unknown[]).length : 'not an array'}`);

    if (!data.products || !Array.isArray(data.products)) {
      return NextResponse.json(
        { error: 'Response did not contain a products list — this may not be a Shopify store.' },
        { status: 422 }
      );
    }

    const products: ScrapedProduct[] = (data.products as ShopifyProduct[])
      .filter((p) => p.images && p.images.length > 0 && p.variants && p.variants.length > 0)
      .flatMap((p) => {
        try {
          return [mapShopifyProduct(p, baseUrl)];
        } catch (err) {
          console.warn(`[scrape-store] Skipping product "${p.title}":`, err);
          return [];
        }
      });

    console.log(`[scrape-store] Mapped ${products.length} products with images`);
    return NextResponse.json({ products, total: products.length });
  } catch (error) {
    const name = error instanceof Error ? error.name : 'unknown';
    const message = error instanceof Error ? error.message : String(error);
    console.log(`[scrape-store] Fetch threw: name=${name} message=${message}`);

    if (name === 'TimeoutError' || name === 'AbortError') {
      return NextResponse.json({ error: 'Store took too long to respond (timeout after 20s).' }, { status: 408 });
    }
    return NextResponse.json(
      { error: `Network error reaching store: ${message}` },
      { status: 422 }
    );
  }
}
