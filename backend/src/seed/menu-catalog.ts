/** The Brewing Cottage café menu — professional Unsplash images, PKR prices. */
export const UNLIMITED_STOCK = 999_999;

export type MenuCategorySeed = {
  name: string;
  sortOrder: number;
  items: Array<{
    name: string;
    price: number;
    imageUrl: string;
    description: string;
  }>;
};

const img = (id: string) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=800&q=80`;

export const MENU_CATEGORIES: MenuCategorySeed[] = [
  {
    name: 'Appetizers',
    sortOrder: 1,
    items: [
      {
        name: 'Chipotle Loaded Fries',
        price: 650,
        imageUrl: img('photo-1573080496219-bb080dd4f877'),
        description: 'Crispy fries loaded with chipotle sauce, cheese, and toppings.',
      },
      {
        name: 'Chunky Dynamite Fries',
        price: 650,
        imageUrl: img('photo-1630384060421-cb20d0e0649d'),
        description: 'Thick-cut fries tossed in creamy dynamite sauce.',
      },
      {
        name: 'Dragon Fries',
        price: 680,
        imageUrl: img('photo-1541592106381-b31e9677c0e5'),
        description: 'Fiery seasoned fries with dragon sauce and herbs.',
      },
      {
        name: 'Curly Fries',
        price: 450,
        imageUrl: img('photo-1518013431117-eb1465fa5752'),
        description: 'Golden curly fries, perfectly seasoned and crisp.',
      },
      {
        name: 'Waffle Fries',
        price: 480,
        imageUrl: img('photo-1528735602780-2552fd46c7af'),
        description: 'Crispy waffle-cut fries with a light salt finish.',
      },
      {
        name: 'Classic French Fries',
        price: 400,
        imageUrl: img('photo-1576107232684-1279f390859f'),
        description: 'Classic thin-cut fries, hot and golden.',
      },
    ],
  },
  {
    name: 'Wings',
    sortOrder: 2,
    items: [
      {
        name: 'Habanero Wings',
        price: 850,
        imageUrl: img('photo-1527477396000-e27163b481c2'),
        description: 'Crispy wings glazed in bold habanero heat.',
      },
      {
        name: 'BBQ Wings',
        price: 820,
        imageUrl: img('photo-1608039829572-78524f79c4c7'),
        description: 'Smoky BBQ-glazed chicken wings.',
      },
      {
        name: 'Honey Chili Wings',
        price: 840,
        imageUrl: img('photo-1567620832903-9fc6debc209f'),
        description: 'Sweet honey and chili-glazed crispy wings.',
      },
    ],
  },
  {
    name: 'Paninis',
    sortOrder: 3,
    items: [
      {
        name: 'Pesto Chicken Panini',
        price: 780,
        imageUrl: img('photo-1509440159596-0249088772ff'),
        description: 'Grilled panini with pesto, chicken, and melted cheese.',
      },
      {
        name: 'BBQ Chicken Panini',
        price: 780,
        imageUrl: img('photo-1528736235302-52922df5c122'),
        description: 'BBQ chicken, cheese, and crisp bread pressed hot.',
      },
      {
        name: 'Parmesan Chicken Panini',
        price: 800,
        imageUrl: img('photo-1509722747041-616f39b57569'),
        description: 'Chicken panini finished with rich parmesan.',
      },
    ],
  },
  {
    name: 'Sandwiches',
    sortOrder: 4,
    items: [
      {
        name: 'Classic Club Sandwich',
        price: 750,
        imageUrl: img('photo-1550547660-d9450f859349'),
        description: 'Triple-layer club with chicken, egg, and fresh veggies.',
      },
      {
        name: 'Grilled Chicken Sandwich',
        price: 720,
        imageUrl: img('photo-1606755962773-d324e0a13086'),
        description: 'Juicy grilled chicken on toasted bread with greens.',
      },
      {
        name: 'The Brewing Cottage Special Sandwich',
        price: 850,
        imageUrl: img('photo-1567234669003-dce7a7a88821'),
        description: 'House special layered sandwich — our signature stack.',
      },
    ],
  },
  {
    name: 'Beef Burgers',
    sortOrder: 5,
    items: [
      {
        name: 'Cowboy Burger',
        price: 1100,
        imageUrl: img('photo-1568901346375-23c9450c58cd'),
        description: 'Hearty beef patty with bold cowboy toppings.',
      },
      {
        name: 'The Bad Boy Burger',
        price: 1200,
        imageUrl: img('photo-1553979459-d2229ba7433b'),
        description: 'Loaded beef burger with cheese and house sauce.',
      },
      {
        name: 'Street Burger',
        price: 1050,
        imageUrl: img('photo-1572802419224-296b0aeee0d9'),
        description: 'Street-style beef burger, messy and delicious.',
      },
      {
        name: 'Swiss Mushroom Burger',
        price: 1150,
        imageUrl: img('photo-1594212699903-ec8a3eca50f5'),
        description: 'Beef patty with Swiss cheese and sautéed mushrooms.',
      },
    ],
  },
  {
    name: 'Chicken Burgers',
    sortOrder: 6,
    items: [
      {
        name: 'Buffalo Chicken Burger',
        price: 950,
        imageUrl: img('photo-1606755962773-d324e0a13086'),
        description: 'Spicy buffalo chicken burger with cool dressing.',
      },
      {
        name: 'Grilled Chicken Burger',
        price: 900,
        imageUrl: img('photo-1606755962773-d324e0a13086'),
        description: 'Flame-grilled chicken breast burger.',
      },
      {
        name: 'Dragon Chicken Burger',
        price: 980,
        imageUrl: img('photo-1562967916-eb82221dfb92'),
        description: 'Crispy chicken with fiery dragon sauce.',
      },
      {
        name: 'Crispy Chicken Burger',
        price: 920,
        imageUrl: img('photo-1626082927389-6cd097cdc6ec'),
        description: 'Golden crispy chicken fillet in a soft bun.',
      },
    ],
  },
  {
    name: 'Pasta',
    sortOrder: 7,
    items: [
      {
        name: 'Rigatoni Pasta',
        price: 950,
        imageUrl: img('photo-1621996346565-e3dbc646d9a9'),
        description: 'Rigatoni in a rich house tomato or cream sauce.',
      },
      {
        name: 'Fettuccine Alfredo',
        price: 1000,
        imageUrl: img('photo-1645112411341-6c4fd023714a'),
        description: 'Creamy Alfredo fettuccine with parmesan.',
      },
      {
        name: 'Penne Pomodoro',
        price: 900,
        imageUrl: img('photo-1551183053-bf91a1d81141'),
        description: 'Penne tossed in fresh pomodoro tomato sauce.',
      },
    ],
  },
  {
    name: 'Hot Coffee',
    sortOrder: 8,
    items: [
      {
        name: 'Americano',
        price: 350,
        imageUrl: img('photo-1514432324607-a09d9b4aefdd'),
        description: 'Espresso stretched with hot water for a smooth cup.',
      },
      {
        name: 'Cappuccino',
        price: 450,
        imageUrl: img('photo-1572442388796-11668a67e53d'),
        description: 'Equal parts espresso, steamed milk, and airy foam.',
      },
      {
        name: 'Latte',
        price: 480,
        imageUrl: img('photo-1561882468-9110e03e0f78'),
        description: 'Silky steamed milk over espresso with light foam.',
      },
      {
        name: 'Doppio Espresso',
        price: 320,
        imageUrl: img('photo-1510590337019-5ef8d3d32116'),
        description: 'A double shot of rich, concentrated espresso.',
      },
      {
        name: 'Spanish Latte',
        price: 520,
        imageUrl: img('photo-1461023058943-07fcbe16d735'),
        description: 'Sweet condensed-milk Spanish-style hot latte.',
      },
      {
        name: 'Irish Latte',
        price: 550,
        imageUrl: img('photo-1541167760496-1628856ab772'),
        description: 'Creamy Irish-style latte with a warm finish.',
      },
    ],
  },
  {
    name: 'Cold Coffee',
    sortOrder: 9,
    items: [
      {
        name: 'Vanilla Latte',
        price: 520,
        imageUrl: img('photo-1517701604599-bb29b565090c'),
        description: 'Iced latte with smooth vanilla syrup.',
      },
      {
        name: 'Caramel Latte',
        price: 540,
        imageUrl: img('photo-1461023058943-07fcbe16d735'),
        description: 'Iced latte sweetened with rich caramel.',
      },
      {
        name: 'Hazelnut Latte',
        price: 540,
        imageUrl: img('photo-1461023058943-07fcbe16d735'),
        description: 'Iced latte with toasted hazelnut flavor.',
      },
      {
        name: 'Spanish Latte',
        price: 560,
        imageUrl: img('photo-1511920170033-f8396924c348'),
        description: 'Iced Spanish latte with condensed milk sweetness.',
      },
      {
        name: 'Irish Latte',
        price: 580,
        imageUrl: img('photo-1495474472287-4d71bcdd2085'),
        description: 'Chilled Irish-style latte over ice.',
      },
    ],
  },
  {
    name: 'Mocktails',
    sortOrder: 10,
    items: [
      {
        name: 'Raspberry Mocktail',
        price: 550,
        imageUrl: img('photo-1536935338788-846bb9981813'),
        description: 'Refreshing raspberry mocktail over ice.',
      },
      {
        name: 'Strawberry Mocktail',
        price: 550,
        imageUrl: img('photo-1551024506-0bccd828d307'),
        description: 'Bright strawberry mocktail, lightly sweet.',
      },
      {
        name: 'Blueberry Mocktail',
        price: 550,
        imageUrl: img('photo-1497534446932-c925b458314e'),
        description: 'Cool blueberry mocktail with citrus notes.',
      },
      {
        name: 'Passion Fruit Mocktail',
        price: 580,
        imageUrl: img('photo-1551538827-9c037cb4f32a'),
        description: 'Tropical passion fruit mocktail, zesty and fresh.',
      },
    ],
  },
  {
    name: 'Mojitos',
    sortOrder: 11,
    items: [
      {
        name: 'Raspberry Mojito',
        price: 580,
        imageUrl: img('photo-1551538827-9c037cb4f32a'),
        description: 'Mint mojito with fresh raspberry.',
      },
      {
        name: 'Strawberry Mojito',
        price: 580,
        imageUrl: img('photo-1513558161293-cdaf765ed2fd'),
        description: 'Classic mint mojito with ripe strawberry.',
      },
      {
        name: 'Blueberry Mojito',
        price: 580,
        imageUrl: img('photo-1544145945-f90425340c7e'),
        description: 'Mint mojito muddled with blueberries.',
      },
      {
        name: 'Passion Fruit Mojito',
        price: 600,
        imageUrl: img('photo-1470337458703-46ad1756a187'),
        description: 'Tropical passion fruit mint mojito.',
      },
    ],
  },
  {
    name: 'Ice Cream',
    sortOrder: 12,
    items: [
      {
        name: 'Vanilla',
        price: 350,
        imageUrl: img('photo-1563805042-7684c019e1cb'),
        description: 'Classic creamy vanilla ice cream.',
      },
      {
        name: 'Strawberry',
        price: 350,
        imageUrl: img('photo-1497034825429-c343d7c6a68f'),
        description: 'Fresh strawberry ice cream scoop.',
      },
      {
        name: 'Chocolate',
        price: 380,
        imageUrl: img('photo-1562376552-0d160a2f238d'),
        description: 'Rich chocolate ice cream.',
      },
      {
        name: 'Pistachio',
        price: 400,
        imageUrl: img('photo-1624353365286-3f8d62daad51'),
        description: 'Nutty pistachio ice cream.',
      },
    ],
  },
  {
    name: 'Ice Cream Shakes',
    sortOrder: 13,
    items: [
      {
        name: 'Vanilla Shake',
        price: 480,
        imageUrl: img('photo-1572490122747-3968b75cc699'),
        description: 'Thick vanilla ice cream milkshake.',
      },
      {
        name: 'Strawberry Shake',
        price: 500,
        imageUrl: img('photo-1623065422902-30a2d299bbe4'),
        description: 'Creamy strawberry milkshake.',
      },
      {
        name: 'Chocolate Shake',
        price: 520,
        imageUrl: img('photo-1577805947697-89e18249d767'),
        description: 'Rich chocolate ice cream shake.',
      },
      {
        name: 'Pistachio Shake',
        price: 550,
        imageUrl: img('photo-1560008581-09826d1de69e'),
        description: 'Smooth pistachio milkshake.',
      },
    ],
  },
  {
    name: 'Slush',
    sortOrder: 14,
    items: [
      {
        name: 'Blue Lagoon Slush',
        price: 450,
        imageUrl: img('photo-1513558161293-cdaf765ed2fd'),
        description: 'Icy blue lagoon flavored slush.',
      },
      {
        name: 'Green Apple Slush',
        price: 450,
        imageUrl: img('photo-1622597467836-f3285f2131b8'),
        description: 'Tangy green apple frozen slush.',
      },
    ],
  },
];

export const SHOP_SEED = {
  name: 'The Brewing Cottage',
  taxPercent: 5,
  currency: 'PKR',
  phone: '+92 312 8671544',
  whatsapp: '+923128671544',
  address: 'Shop No. 02, Sector B, Family B Park, DHA Phase 2, Islamabad',
  logoUrl: '/uploads/logo-brewing-cottage.png',
  aboutText:
    'The Brewing Cottage is your neighborhood café in DHA Phase 2, Islamabad — serving coffee, comfort food, burgers, pasta, and cool drinks in a warm cottage vibe.',
};
