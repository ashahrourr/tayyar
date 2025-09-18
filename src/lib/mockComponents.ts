// src/lib/mockComponents.ts
import type { Page } from './types'

export const mockPages: Page[] = [
  {
    id: 'mini-market-home',
    name: 'Mini Market Homepage',
    components: [
      // BACKGROUND
      {
        id: 'page-bg',
        type: 'Container',
        x: 0, y: 0, w: '100%', h: '100%',
        props: { style: { background: '#F9FAFB' } },
      },

      // HERO SECTION
      {
        id: 'hero-bg',
        type: 'Container',
        x: 0, y: 0, w: '100%', h: 400,
        props: {
          style: {
            background: 'linear-gradient(135deg, #22C55E 0%, #16A34A 100%)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
          },
        },
      },
      {
        id: 'hero-headline',
        type: 'Text',
        x: 0, y: 100, w: '100%', h: 'fit-content',
        props: {
          children: 'Fresh Groceries at Your Doorstep',
          style: {
            fontSize: 48,
            fontWeight: 800,
            color: '#FFFFFF',
            textAlign: 'center',
          },
        },
      },
      {
        id: 'hero-sub',
        type: 'Text',
        x: 0, y: 160, w: '100%', h: 'fit-content',
        props: {
          children: 'Shop local produce, snacks, and essentials online',
          style: {
            fontSize: 20,
            fontWeight: 500,
            color: '#E5E7EB',
            textAlign: 'center',
          },
        },
      },
      {
        id: 'hero-cta',
        type: 'Button',
        x: 420, y: 240, w: 200, h: 56,
        props: {
          children: 'Start Shopping',
          style: {
            background: '#FFFFFF',
            color: '#16A34A',
            fontSize: 18,
            fontWeight: 700,
            borderRadius: 12,
            border: 'none',
            boxShadow: '0 8px 20px rgba(0,0,0,0.15)',
          },
        },
      },

      // FEATURED PRODUCTS GRID (3 cols)
      {
        id: 'products-heading',
        type: 'Text',
        x: 0, y: 440, w: '100%', h: 'fit-content',
        props: {
          children: 'Featured Products',
          style: {
            fontSize: 28,
            fontWeight: 700,
            color: '#111827',
            textAlign: 'center',
            marginBottom: 20,
          },
        },
      },

      // Product 1
      {
        id: 'prod-1',
        type: 'Card',
        x: 120, y: 500, w: 240, h: 300,
        props: {
          children: 'Apples\n$2.99 / lb',
          style: {
            background: '#FFFFFF',
            borderRadius: 12,
            boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
            padding: 16,
            fontWeight: 600,
            textAlign: 'center',
          },
        },
      },
      // Product 2
      {
        id: 'prod-2',
        type: 'Card',
        x: 370, y: 500, w: 240, h: 300,
        props: {
          children: 'Fresh Bread\n$1.99 each',
          style: {
            background: '#FFFFFF',
            borderRadius: 12,
            boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
            padding: 16,
            fontWeight: 600,
            textAlign: 'center',
          },
        },
      },
      // Product 3
      {
        id: 'prod-3',
        type: 'Card',
        x: 620, y: 500, w: 240, h: 300,
        props: {
          children: 'Organic Milk\n$3.49 / gallon',
          style: {
            background: '#FFFFFF',
            borderRadius: 12,
            boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
            padding: 16,
            fontWeight: 600,
            textAlign: 'center',
          },
        },
      },

      // FOOTER
      {
        id: 'footer',
        type: 'Container',
        x: 0, y: 840, w: '100%', h: 100,
        props: {
          style: {
            background: '#111827',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          },
        },
      },
      {
        id: 'footer-text',
        type: 'Text',
        x: 0, y: 872, w: '100%', h: 'fit-content',
        props: {
          children: '© 2025 Mini Market — All rights reserved',
          style: {
            color: '#9CA3AF',
            fontSize: 14,
            textAlign: 'center',
          },
        },
      },
    ],
  },
]
