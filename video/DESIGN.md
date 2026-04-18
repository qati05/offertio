# Design System — Offertio

## Overview

Offertio has a warm, cinematic dark identity. The canvas is near-black (`#09090B`), offset by a rich amber-orange brand color and warm off-white text. Typography pairs Fraunces — a high-contrast serif used for hero statements in italic — with DM Sans for interface and body copy. The overall feel is craft-first, precision-Swiss, and human: built for tradespeople, not corporations. App screens (dashboard, documents) flip to a clean white surface, which provides strong visual contrast in demo sections.

## Colors

- **Void** `#09090B` — primary canvas background
- **Brand Orange** `#C8793D` — CTAs, accent highlights, italic hero words
- **Orange Strong** `#A8622E` — hover states, deeper orange moments
- **Warm Off-White** `#F0EDE8` — primary text on dark surfaces
- **Muted Text** `#918A80` — secondary labels, captions
- **App Surface** `#FFFFFF` — dashboard / document UI screens
- **App Background** `#FAFAFA` — sidebar and card backgrounds
- **App Text** `#1A1916` — dark text on light app surfaces
- **Green** `#1A7F42` — "Bezahlt" (paid) status badges
- **Surface Muted** `#F0EDE6` — light card backgrounds

## Typography

- **Fraunces** — Display serif (italic). Hero headlines, brand identity statements, emotional impact phrases. Weights: 400-700. Use italic for maximum brand personality.
- **DM Sans** — Sans-serif. All interface text, body copy, labels, pricing. Weights: 400-500-700. Clean, humanist, readable at any size.
- Sizing hierarchy: Hero 96-140px · Section heading 56-80px · Sub-head 36-48px · Body 18-22px · Label 13-16px

## Elevation

Flat dark surfaces with warm orange glows and subtle card borders. No harsh drop shadows. App UI cards use `box-shadow: 0 1px 4px rgba(26,20,10,0.04), 0 12px 40px rgba(26,20,10,0.08)`. Brand glow: `0 4px 16px rgba(168,98,46,0.20)`. Dark sections use radial orange glow from center to create depth.

## Components

- **Hero Type Block** — oversized Fraunces italic stacked on three lines, last word in `#C8793D`
- **Dashboard Card** — white surface, sidebar left, activity feed right, status badges (Gesendet/Bezahlt/Entwurf)
- **Step Cards (01/02/03)** — dark rounded cards with large step numbers, icon top-left, country badge
- **Feature Grid Cards** — light warm surface (`#F0EDE6`), orange icon, short description
- **Pricing Cards** — dark, three-column, "Meister" highlighted with orange border
- **Marquee Ticker** — customer names scrolling left continuously
- **CTA Button** — orange fill, rounded, "Kostenlos starten"

## Do's and Don'ts

### Do's
- Use Fraunces italic for any moment that needs emotional weight
- End key phrases with an orange-colored word — that's the brand signature
- Layer dark backgrounds with a soft centered radial orange glow (`rgba(200,121,61,0.12)`)
- Show real app UI screenshots — they anchor credibility
- Keep pacing tight: one strong idea per beat, no visual clutter

### Don'ts
- Do not use blue, purple, or cool tones — this is a warm brand
- Do not use standard drop shadows — use brand glow or nothing
- Do not use light backgrounds for cinematics — keep it dark for drama, only flip to white for app demo screens
- Do not mix Fraunces roman (non-italic) for hero text — italic only
- Do not add animations that feel corporate or stiff — everything should feel human and alive
