// src/lib/mockComponents.ts
import { UIComponent } from './types'

export const mockPages: { id: string; name: string; components: UIComponent[] }[] = [
  {
    id: 'products',
    name: 'Products',
    components: [
      // Background (white page)
      { id: 'page-bg', type: 'Container', x: 0, y: 0, w: '100%', h: 1500,
        props: { className: 'bg-white' } },

      // Header
      { id: 'hdr', type: 'Container', x: 0, y: 0, w: '100%', h: 64,
        props: { className: 'bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/70 border-b' } },
      { id: 'logo', type: 'Text', parentId: 'hdr', x: 40, y: 20, w: 240, h: 24,
        props: { className: 'text-gray-900 font-bold text-xl cursor-pointer', children: '🥬 FreshMart', navigateTo: 'products' } },
      { id: 'cart', type: 'Button', parentId: 'hdr', x: 820, y: 14, w: 120, h: 36,
        props: { className: 'bg-green-600 hover:bg-green-700 text-white font-semibold px-4 py-2 rounded-xl', children: 'Cart ({{cartCount || 0}})', navigateTo: 'cart' } },

      // Title
      { id: 'title', type: 'Text', x: 40, y: 96, w: 900, h: 40,
        props: { className: 'text-4xl font-bold text-gray-900', children: 'Fresh & Premium Groceries' } },
      { id: 'sub', type: 'Text', x: 40, y: 144, w: 900, h: 28,
        props: { className: 'text-lg text-gray-600', children: 'Browse our selection and add items to your cart' } },

      // Row 1
      ...card('apples',  40, 200, 'Crisp Apples',   'https://picsum.photos/seed/apples/600/400',  '3.99/lb'),
      ...card('carrots', 344,200, 'Organic Carrots','https://picsum.photos/seed/carrots/600/400', '2.49/lb'),
      ...card('milk',    648,200, 'Whole Milk',     'https://picsum.photos/seed/milk/600/400',    '4.29/gal'),
      // Row 2
      ...card('bread',   40, 496, 'Fresh Bread',    'https://picsum.photos/seed/bread/600/400',   '3.49'),
      ...card('lettuce', 344,496, 'Green Lettuce',  'https://picsum.photos/seed/lettuce/600/400', '1.99'),
      ...card('cheese',  648,496, 'Aged Cheddar',   'https://picsum.photos/seed/cheese/600/400',  '5.99'),
      // Row 3
      ...card('bananas', 40,  792, 'Organic Bananas','https://picsum.photos/seed/bananas/600/400', '1.59/lb'),
      ...card('strawb',  344,792, 'Fresh Strawberries','https://picsum.photos/seed/strawb/600/400','4.99'),
      ...card('apricot', 648,792, 'Apricots',       'https://picsum.photos/seed/apricots/600/400','3.79/lb'),
      // Row 4 (push past 1200px to force scroll)
      ...card('tomato',  40, 1088, 'Heirloom Tomatoes','https://picsum.photos/seed/tomato/600/400','2.89/lb'),
      ...card('spinach', 344,1088, 'Baby Spinach',   'https://picsum.photos/seed/spinach/600/400', '2.49'),
      ...card('yogurt',  648,1088, 'Greek Yogurt',   'https://picsum.photos/seed/yogurt/600/400',  '6.49'),
    ],
  },
]

// helper: canvas-relative card pattern
function card(id: string, x: number, y: number, name: string, img: string, price: string): UIComponent[] {
  return [
    { id: `card-${id}`, type: 'Card', x, y, w: 280, h: 256,
      props: { className: 'bg-white rounded-2xl shadow-lg ring-1 ring-black/5 p-6 transition hover:shadow-xl' } },
    { id: `img-${id}`, type: 'Container', parentId: `card-${id}`, x: x+16, y: y+16, w: 248, h: 148,
      props: { className: 'overflow-hidden rounded-xl bg-gray-100',
        children: `<img src="${img}" class="w-full h-full object-cover" alt="${name}" />` } },
    { id: `name-${id}`, type: 'Text', parentId: `card-${id}`, x: x+16, y: y+176, w: 248, h: 24,
      props: { className: 'text-gray-900 font-semibold', children: name } },
    { id: `price-${id}`, type: 'Text', parentId: `card-${id}`, x: x+16, y: y+204, w: 120, h: 20,
      props: { className: 'text-green-700 font-semibold', children: `$${price}` } },
    { id: `btn-${id}`, type: 'Button', parentId: `card-${id}`, x: x+168, y: y+200, w: 96, h: 36,
      props: {
        className: 'bg-green-600 hover:bg-green-700 text-white font-semibold px-3 py-2 rounded-xl',
        children: 'Add',
        'onClick.append': { key: 'cartItems', value: { name, price, quantity: 1 } },
        'onClick.increment': 'cartCount'
      } },
  ] as unknown as UIComponent[]
}
