// src/lib/mockComponents.ts
import type { UIComponent, Page } from './types'

export const mockPages: Page[] = [
    {
      "id": "homepage",
      "name": "MarketPlace Home",
      "components": [
        {
          "id": "page-bg",
          "type": "Container",
          "x": 0,
          "y": 0,
          "w": "100%",
          "h": "100%",
          "props": { "variant": "Page" }
        },        
        {
          "id": "header",
          "type": "Container",
          "x": 0, "y": 0, "w": 980, "h": 72,
          "props": { "variant": "Header.glass", "sectionTemplate": "header" },
          "children": [
            {
              "id": "logo", "type": "Text", "parentId": "header",
              "x": 0, "y": 0, "w": 160, "h": 32,
              "props": { "role": "logo", "mix": ["h3","brand"], "children": "Cluely" }
            },
        
            {
              "id": "nav-pricing", "type": "Button", "parentId": "header",
              "x": 0, "y": 0, "w": 80, "h": 40,
              "props": { "role": "navItem", "children": "Pricing", "navigateTo": "pricing" }
            },
            {
              "id": "nav-enterprise", "type": "Button", "parentId": "header",
              "x": 0, "y": 0, "w": 110, "h": 40,
              "props": { "role": "navItem", "children": "Enterprise", "navigateTo": "enterprise" }
            },
            {
              "id": "nav-careers", "type": "Button", "parentId": "header",
              "x": 0, "y": 0, "w": 90, "h": 40,
              "props": { "role": "navItem", "children": "Careers", "navigateTo": "careers" }
            },
            {
              "id": "nav-help", "type": "Button", "parentId": "header",
              "x": 0, "y": 0, "w": 120, "h": 40,
              "props": { "role": "navItem", "children": "Help Center", "navigateTo": "help" }
            },
        
            {
              "id": "cta", "type": "Button", "parentId": "header",
              "x": 0, "y": 0, "w": 180, "h": 40,
              "props": { "role": "cta", "variant": "Button.primary", "children": "Get Started for Free" }
            }
          ]
        },        
        
        
        {
          "id": "hero-main",
          "type": "Container",
          "x": 0, "y": 88, "w": 980, "h": 480,
          "props": { "variant": "Section", "mix": ["brandBg","softGlow"], "sectionTemplate": "hero", "align": "center" },
          "children": [
            {
              "id": "hero-title",
              "type": "Text",
              "parentId": "hero-main",
              "props": { "role": "title", "mix": ["h1","text"], "children": "It's like Googling\nMid-Sentence" }
            },
            {
              "id": "hero-body",
              "type": "Text",
              "parentId": "hero-main",
              "props": {
                "role": "body",
                "mix": ["body","muted"],
                "children": "Cluely gives you the answers you didn’t study for in every conversation, without you even having to ask."
              }
            },
            {
              "id": "hero-cta",
              "type": "Button",
              "parentId": "hero-main",
              "props": { "role": "buttonPrimary", "variant": "Button.primary", "children": " Get for Mac" }
            },
            {
              "id": "hero-callout",
              "type": "Container",
              "parentId": "hero-main",
              "props": {
                "role": "callout",
                "className": "rounded-2xl bg-white/70 backdrop-blur shadow-[0_12px_32px_rgba(0,0,0,0.12)]"
              },
              "children": [
                {
                  "id": "callout-title",
                  "type": "Text",
                  "parentId": "hero-callout",
                  "props": { "role": "calloutTitle", "mix": ["eyebrow"], "children": "✦ Question: \"Why would I even use Cluely?\"" }
                },
                {
                  "id": "callout-body",
                  "type": "Text",
                  "parentId": "hero-callout",
                  "props": {
                    "role": "calloutBody",
                    "mix": ["body"],
                    "children": "Cluely is a real-time AI that gives you the power to search anything during meetings…"
                  }
                }
              ]
            }
          ]
          },
        
        
        {
          "id": "feature-1",
          "type": "Container",
          "x": 0, "y": 456, "w": 980, "h": 360,
          "props": { "variant": "Section.alt", "sectionTemplate": "featureRow" },
          "isSection": true, 
          "children": [
            { "id": "feat-eyebrow", "type": "Text", "parentId": "feature-1",
              "props": { "role": "eyebrow", "mix": ["eyebrow"], "children": "UNDETECTABLE IN MEETINGS" } },
            { "id": "feat-title", "type": "Text", "parentId": "feature-1",
              "props": { "role": "title", "mix": ["h2","text"], "children": "Feeds you answers without joining your calls" } },
            { "id": "feat-body", "type": "Text", "parentId": "feature-1",
              "props": { "role": "body", "mix": ["body","muted"], "children": "Cluely never appears in your meeting guest list and stays invisible on screen shares." } },
            { "id": "feat-bullets", "type": "Text", "parentId": "feature-1",
              "props": { "role": "bulletList", "mix": ["body"], "children": "• Doesn’t join meetings\n• Invisible to screen share\n• No bots on the guest list" } },
            { "id": "feat-cta", "type": "Button", "parentId": "feature-1",
              "props": { "role": "buttonPrimary", "variant": "Button.primary", "children": "Get Started" } },
            { "id": "feat-image", "type": "Container", "parentId": "feature-1",
              "props": { "role": "image", "className": "rounded-2xl bg-white/70 backdrop-blur shadow-[0_12px_32px_rgba(0,0,0,0.12)]" } }
          ]
        },
        {
          "id": "cards-3",
          "type": "Container",
          "x": 0,
          "y": 840,
          "w": 980,
          "h": 320,
          "props": { "variant": "Section", "sectionTemplate": "cards-3up" },
          "isSection": true,
          "children": [
            {
              "id": "cards3-title",
              "type": "Text",
              "parentId": "cards-3",
              "props": {
                "role": "title",
                "mix": ["h2", "text"],
                "children": "Why Teams Choose Cluely"
              }
            },
        
            {
              "id": "card-1",
              "type": "Container",
              "parentId": "cards-3",
              "props": { "role": "card", "mix": ["surface", "rounded-lg", "shadow-md"] },
              "children": [
                {
                  "id": "card-1-head",
                  "type": "Text",
                  "parentId": "card-1",
                  "props": { "role": "cardTitle", "mix": ["h4"], "children": "Fast Setup" }
                },
                {
                  "id": "card-1-body",
                  "type": "Text",
                  "parentId": "card-1",
                  "props": {
                    "role": "cardBody",
                    "mix": ["body", "muted"],
                    "children": "Get running in minutes without complex integrations."
                  }
                }
              ]
            },
        
            {
              "id": "card-2",
              "type": "Container",
              "parentId": "cards-3",
              "props": { "role": "card", "mix": ["surface", "rounded-lg", "shadow-md"] },
              "children": [
                {
                  "id": "card-2-head",
                  "type": "Text",
                  "parentId": "card-2",
                  "props": { "role": "cardTitle", "mix": ["h4"], "children": "Invisible" }
                },
                {
                  "id": "card-2-body",
                  "type": "Text",
                  "parentId": "card-2",
                  "props": {
                    "role": "cardBody",
                    "mix": ["body", "muted"],
                    "children": "Stays hidden in calls while delivering real-time answers."
                  }
                }
              ]
            },
        
            {
              "id": "card-3",
              "type": "Container",
              "parentId": "cards-3",
              "props": { "role": "card", "mix": ["surface", "rounded-lg", "shadow-md"] },
              "children": [
                {
                  "id": "card-3-head",
                  "type": "Text",
                  "parentId": "card-3",
                  "props": { "role": "cardTitle", "mix": ["h4"], "children": "Secure" }
                },
                {
                  "id": "card-3-body",
                  "type": "Text",
                  "parentId": "card-3",
                  "props": {
                    "role": "cardBody",
                    "mix": ["body", "muted"],
                    "children": "Enterprise-grade security built into every workflow."
                  }
                }
              ]
            }
          ]
        }
                
        

      ]  
    }
  ]      