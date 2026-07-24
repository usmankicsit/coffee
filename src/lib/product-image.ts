import type { Product } from './types';

const API_ORIGIN = (
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
).replace(/\/$/, '');

/** Compact Unsplash params for fast POS tiles */
const THUMB = 'auto=format&fit=crop&w=320&h=240&q=55';
const FULL = 'auto=format&fit=crop&w=640&q=70';

export const FALLBACK_PRODUCT_IMAGE = `https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?${THUMB}`;

function unsplash(id: string, size: 'thumb' | 'full' = 'thumb') {
  return `https://images.unsplash.com/${id}?${size === 'thumb' ? THUMB : FULL}`;
}

const NAME_DEFAULTS: Record<string, string> = {
  'Chipotle Loaded Fries': unsplash('photo-1573080496219-bb080dd4f877'),
  'Chunky Dynamite Fries': unsplash('photo-1630384060421-cb20d0e0649d'),
  'Dragon Fries': unsplash('photo-1541592106381-b31e9677c0e5'),
  'Curly Fries': unsplash('photo-1518013431117-eb1465fa5752'),
  'Waffle Fries': unsplash('photo-1528735602780-2552fd46c7af'),
  'Classic French Fries': unsplash('photo-1576107232684-1279f390859f'),
  'Habanero Wings': unsplash('photo-1527477396000-e27163b481c2'),
  'BBQ Wings': unsplash('photo-1608039829572-78524f79c4c7'),
  'Honey Chili Wings': unsplash('photo-1567620832903-9fc6debc209f'),
  'Pesto Chicken Panini': unsplash('photo-1509440159596-0249088772ff'),
  'BBQ Chicken Panini': unsplash('photo-1528736235302-52922df5c122'),
  'Parmesan Chicken Panini': unsplash('photo-1509722747041-616f39b57569'),
  'Classic Club Sandwich': unsplash('photo-1550547660-d9450f859349'),
  'Grilled Chicken Sandwich': unsplash('photo-1606755962773-d324e0a13086'),
  'The Brewing Cottage Special Sandwich': unsplash('photo-1567234669003-dce7a7a88821'),
  'Cowboy Burger': unsplash('photo-1568901346375-23c9450c58cd'),
  'The Bad Boy Burger': unsplash('photo-1553979459-d2229ba7433b'),
  'Street Burger': unsplash('photo-1572802419224-296b0aeee0d9'),
  'Swiss Mushroom Burger': unsplash('photo-1594212699903-ec8a3eca50f5'),
  'Buffalo Chicken Burger': unsplash('photo-1606755962773-d324e0a13086'),
  'Grilled Chicken Burger': unsplash('photo-1606755962773-d324e0a13086'),
  'Dragon Chicken Burger': unsplash('photo-1562967916-eb82221dfb92'),
  'Crispy Chicken Burger': unsplash('photo-1626082927389-6cd097cdc6ec'),
  'Rigatoni Pasta': unsplash('photo-1621996346565-e3dbc646d9a9'),
  'Fettuccine Alfredo': unsplash('photo-1645112411341-6c4fd023714a'),
  'Penne Pomodoro': unsplash('photo-1551183053-bf91a1d81141'),
  Americano: unsplash('photo-1514432324607-a09d9b4aefdd'),
  Cappuccino: unsplash('photo-1572442388796-11668a67e53d'),
  Latte: unsplash('photo-1561882468-9110e03e0f78'),
  'Doppio Espresso': unsplash('photo-1510590337019-5ef8d3d32116'),
  'Spanish Latte': unsplash('photo-1511920170033-f8396924c348'),
  'Irish Latte': unsplash('photo-1495474472287-4d71bcdd2085'),
  'Vanilla Latte': unsplash('photo-1517701604599-bb29b565090c'),
  'Caramel Latte': unsplash('photo-1461023058943-07fcbe16d735'),
  'Hazelnut Latte': unsplash('photo-1461023058943-07fcbe16d735'),
  'Raspberry Mocktail': unsplash('photo-1536935338788-846bb9981813'),
  'Strawberry Mocktail': unsplash('photo-1551024506-0bccd828d307'),
  'Blueberry Mocktail': unsplash('photo-1497534446932-c925b458314e'),
  'Passion Fruit Mocktail': unsplash('photo-1551538827-9c037cb4f32a'),
  'Raspberry Mojito': unsplash('photo-1551538827-9c037cb4f32a'),
  'Strawberry Mojito': unsplash('photo-1513558161293-cdaf765ed2fd'),
  'Blueberry Mojito': unsplash('photo-1544145945-f90425340c7e'),
  'Passion Fruit Mojito': unsplash('photo-1470337458703-46ad1756a187'),
  Vanilla: unsplash('photo-1563805042-7684c019e1cb'),
  Strawberry: unsplash('photo-1497034825429-c343d7c6a68f'),
  Chocolate: unsplash('photo-1562376552-0d160a2f238d'),
  Pistachio: unsplash('photo-1624353365286-3f8d62daad51'),
  'Vanilla Shake': unsplash('photo-1572490122747-3968b75cc699'),
  'Strawberry Shake': unsplash('photo-1623065422902-30a2d299bbe4'),
  'Chocolate Shake': unsplash('photo-1577805947697-89e18249d767'),
  'Pistachio Shake': unsplash('photo-1560008581-09826d1de69e'),
  'Blue Lagoon Slush': unsplash('photo-1513558161293-cdaf765ed2fd'),
  'Green Apple Slush': unsplash('photo-1622597467836-f3285f2131b8'),
  'Cheese cake slice': unsplash('photo-1524351199678-941a58a3df50'),
  'Chocolate fudge': unsplash('photo-1606313564200-e75d5e30476c'),
  Brownies: unsplash('photo-1607920591413-4ec007729b28'),
  'Banana bread': unsplash('photo-1509440159596-0249088772ff'),
  'Molten lava': unsplash('photo-1511910849309-0dffb247fb26'),
  'Three milk': unsplash('photo-1464349095431-e68bc7f4e12a'),
};

/** Shrink remote Unsplash URLs for faster POS tiles. */
export function optimizeImageUrl(url: string, size: 'thumb' | 'full' = 'thumb') {
  if (!url.includes('images.unsplash.com')) return url;
  try {
    const u = new URL(url);
    u.searchParams.set('auto', 'format');
    u.searchParams.set('fit', 'crop');
    if (size === 'thumb') {
      u.searchParams.set('w', '320');
      u.searchParams.set('h', '240');
      u.searchParams.set('q', '55');
    } else {
      u.searchParams.set('w', '640');
      u.searchParams.set('q', '70');
      u.searchParams.delete('h');
    }
    return u.toString();
  } catch {
    return url;
  }
}

/** Display image: custom upload/URL, else name-based dummy, else fallback. */
export function productImageSrc(
  product: Pick<Product, 'name' | 'imageUrl'>,
  size: 'thumb' | 'full' = 'thumb',
) {
  if (product.imageUrl) {
    const raw = product.imageUrl.startsWith('http')
      ? product.imageUrl
      : `${API_ORIGIN}${product.imageUrl}`;
    return optimizeImageUrl(raw, size);
  }
  const named = NAME_DEFAULTS[product.name];
  if (named) return size === 'full' ? optimizeImageUrl(named, 'full') : named;
  return size === 'full'
    ? optimizeImageUrl(FALLBACK_PRODUCT_IMAGE, 'full')
    : FALLBACK_PRODUCT_IMAGE;
}

export function hasCustomImage(product: Pick<Product, 'imageUrl'>) {
  return Boolean(product.imageUrl);
}
