import type { Product } from './types';

const API_ORIGIN = (
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
).replace(/\/$/, '');

export const FALLBACK_PRODUCT_IMAGE =
  'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=800&q=80';

const NAME_DEFAULTS: Record<string, string> = {
  'Chipotle Loaded Fries':
    'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&w=800&q=80',
  'Chunky Dynamite Fries':
    'https://images.unsplash.com/photo-1630384060421-cb20d0e0649d?auto=format&fit=crop&w=800&q=80',
  'Dragon Fries':
    'https://images.unsplash.com/photo-1585109649139-051e4c8e0f1f?auto=format&fit=crop&w=800&q=80',
  'Curly Fries':
    'https://images.unsplash.com/photo-1598679253544-2c464169bdd9?auto=format&fit=crop&w=800&q=80',
  'Waffle Fries':
    'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?auto=format&fit=crop&w=800&q=80',
  'Classic French Fries':
    'https://images.unsplash.com/photo-1576107233125-222e6d1f1b9b?auto=format&fit=crop&w=800&q=80',
  'Habanero Wings':
    'https://images.unsplash.com/photo-1527477396000-e27163b481c2?auto=format&fit=crop&w=800&q=80',
  'BBQ Wings':
    'https://images.unsplash.com/photo-1608039829572-78524f79c4c7?auto=format&fit=crop&w=800&q=80',
  'Honey Chili Wings':
    'https://images.unsplash.com/photo-1567620832903-9fc6debc209f?auto=format&fit=crop&w=800&q=80',
  'Pesto Chicken Panini':
    'https://images.unsplash.com/photo-1539252554453-80ab53fee1ce?auto=format&fit=crop&w=800&q=80',
  'BBQ Chicken Panini':
    'https://images.unsplash.com/photo-1481070414801-53daf7bc5d63?auto=format&fit=crop&w=800&q=80',
  'Parmesan Chicken Panini':
    'https://images.unsplash.com/photo-1509722747041-616f39b57569?auto=format&fit=crop&w=800&q=80',
  'Classic Club Sandwich':
    'https://images.unsplash.com/photo-1528736235302-52922df5c122?auto=format&fit=crop&w=800&q=80',
  'Grilled Chicken Sandwich':
    'https://images.unsplash.com/photo-1550507992-eb57cf8c002f?auto=format&fit=crop&w=800&q=80',
  'The Brewing Cottage Special Sandwich':
    'https://images.unsplash.com/photo-1567234669003-dce7a7a88821?auto=format&fit=crop&w=800&q=80',
  'Cowboy Burger':
    'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=800&q=80',
  'The Bad Boy Burger':
    'https://images.unsplash.com/photo-1553979459-d2229ba7433b?auto=format&fit=crop&w=800&q=80',
  'Street Burger':
    'https://images.unsplash.com/photo-1572802419224-296b0aeee0d9?auto=format&fit=crop&w=800&q=80',
  'Swiss Mushroom Burger':
    'https://images.unsplash.com/photo-1594212699903-ec8a3eca50f5?auto=format&fit=crop&w=800&q=80',
  'Buffalo Chicken Burger':
    'https://images.unsplash.com/photo-1606755962773-d324e0a13086?auto=format&fit=crop&w=800&q=80',
  'Grilled Chicken Burger':
    'https://images.unsplash.com/photo-1606755962773-d324e0a13086?auto=format&fit=crop&w=800&q=80',
  'Dragon Chicken Burger':
    'https://images.unsplash.com/photo-1562967916-eb82221dfb92?auto=format&fit=crop&w=800&q=80',
  'Crispy Chicken Burger':
    'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?auto=format&fit=crop&w=800&q=80',
  'Rigatoni Pasta':
    'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?auto=format&fit=crop&w=800&q=80',
  'Fettuccine Alfredo':
    'https://images.unsplash.com/photo-1645112411341-6c4fd023714a?auto=format&fit=crop&w=800&q=80',
  'Penne Pomodoro':
    'https://images.unsplash.com/photo-1598866594230-a7c1275525cd?auto=format&fit=crop&w=800&q=80',
  Americano:
    'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=800&q=80',
  Cappuccino:
    'https://images.unsplash.com/photo-1572442388796-11668a67e53d?auto=format&fit=crop&w=800&q=80',
  Latte:
    'https://images.unsplash.com/photo-1561882468-9110e03e0f78?auto=format&fit=crop&w=800&q=80',
  'Doppio Espresso':
    'https://images.unsplash.com/photo-1510590337019-5ef8d3d32116?auto=format&fit=crop&w=800&q=80',
  'Spanish Latte':
    'https://images.unsplash.com/photo-1511920170033-f8396924c348?auto=format&fit=crop&w=800&q=80',
  'Irish Latte':
    'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=800&q=80',
  'Vanilla Latte':
    'https://images.unsplash.com/photo-1517701604599-bb29b565090c?auto=format&fit=crop&w=800&q=80',
  'Caramel Latte':
    'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?auto=format&fit=crop&w=800&q=80',
  'Hazelnut Latte':
    'https://images.unsplash.com/photo-1578314675249-9cbd6b4e0c1b?auto=format&fit=crop&w=800&q=80',
  'Raspberry Mocktail':
    'https://images.unsplash.com/photo-1536935338788-846bb9981813?auto=format&fit=crop&w=800&q=80',
  'Strawberry Mocktail':
    'https://images.unsplash.com/photo-1546171753-97d47345ac87?auto=format&fit=crop&w=800&q=80',
  'Blueberry Mocktail':
    'https://images.unsplash.com/photo-1497534446932-c925b458314e?auto=format&fit=crop&w=800&q=80',
  'Passion Fruit Mocktail':
    'https://images.unsplash.com/photo-1551538827-9c037cb4f32a?auto=format&fit=crop&w=800&q=80',
  'Raspberry Mojito':
    'https://images.unsplash.com/photo-1551538827-9c037cb4f32a?auto=format&fit=crop&w=800&q=80',
  'Strawberry Mojito':
    'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=800&q=80',
  'Blueberry Mojito':
    'https://images.unsplash.com/photo-1544145945-f90425340c7e?auto=format&fit=crop&w=800&q=80',
  'Passion Fruit Mojito':
    'https://images.unsplash.com/photo-1470337458703-46ad1756a187?auto=format&fit=crop&w=800&q=80',
  Vanilla:
    'https://images.unsplash.com/photo-1570197788417-0e698c1c6fbe?auto=format&fit=crop&w=800&q=80',
  Strawberry:
    'https://images.unsplash.com/photo-1497034825429-c343d7c6a68f?auto=format&fit=crop&w=800&q=80',
  Chocolate:
    'https://images.unsplash.com/photo-1563805042-7684c019e1cb?auto=format&fit=crop&w=800&q=80',
  Pistachio:
    'https://images.unsplash.com/photo-1501443762994-2aa85a4b2a36?auto=format&fit=crop&w=800&q=80',
  'Vanilla Shake':
    'https://images.unsplash.com/photo-1572490122747-3968b75cc699?auto=format&fit=crop&w=800&q=80',
  'Strawberry Shake':
    'https://images.unsplash.com/photo-1579954115545-a955db412ecb?auto=format&fit=crop&w=800&q=80',
  'Chocolate Shake':
    'https://images.unsplash.com/photo-1577805947697-89e18249d767?auto=format&fit=crop&w=800&q=80',
  'Pistachio Shake':
    'https://images.unsplash.com/photo-1579954115545-a955db412ecb?auto=format&fit=crop&w=800&q=80',
  'Blue Lagoon Slush':
    'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=800&q=80',
  'Green Apple Slush':
    'https://images.unsplash.com/photo-1622597467836-f3285f2131b8?auto=format&fit=crop&w=800&q=80',
};

/** Display image: custom upload/URL, else name-based dummy, else fallback. */
export function productImageSrc(product: Pick<Product, 'name' | 'imageUrl'>) {
  if (product.imageUrl) {
    if (product.imageUrl.startsWith('http')) return product.imageUrl;
    return `${API_ORIGIN}${product.imageUrl}`;
  }
  return NAME_DEFAULTS[product.name] || FALLBACK_PRODUCT_IMAGE;
}

export function hasCustomImage(product: Pick<Product, 'imageUrl'>) {
  return Boolean(product.imageUrl);
}
