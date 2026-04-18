# Storyboard — Offertio Product Video

**Format:** 1920×1080
**Duration:** ~39 Sekunden
**Audio:** TTS Voiceover (Deutsch, weiblich) + subtile Underscore
**VO direction:** Warm, direkt, selbstbewusst. Klingt wie eine Kollegin aus der Branche. Kein Werbe-Speak. Pausen zwischen den Sätzen sind beabsichtigt.
**Style:** DESIGN.md (Fraunces italic, DM Sans, #09090B dark canvas, #C8793D brand orange)

---

## Asset Audit

| Asset | Type | Beat | Rolle |
|-------|------|------|-------|
| screenshots/scroll-000.png | Hero Screenshot | Beat 1, 2 | App UI background reference |
| screenshots/scroll-045.png | Features Screenshot | Beat 3, 4 | Feature cards reference |
| screenshots/scroll-076.png | Pricing Screenshot | Beat 5 | Pricing reference |
| svgs/icon-0.svg | Icon | Beat 2 | Dokument-Icon |
| svgs/icon-2.svg | Icon | Beat 3 | QR-Icon |
| svgs/icon-4.svg | Icon | Beat 3 | SEPA-Icon |
| svgs/icon-5.svg | Icon | Beat 4 | CH/DE/AT marker |

---

## BEAT 1 — HOOK (0:00–0:04s)

**VO:** "Die Offerte. Noch vor der Heimfahrt."

**Concept:** Das Video beginnt mit einer Aussage, die sich anfühlt wie ein Versprechen. Kein Fade-in, keine Intro. Der Screen ist schwarz. Dann erscheint der Text — erst ruhig, dann mit Gewicht. "Heimfahrt." brennt sich in Orange auf dem Bildschirm ein. Das ist der Moment wo der Handwerker denkt: "Das bin ich."

**Visual:** Reines Dunkel (`#09090B`). Leichtes, warmes Radial-Glow aus der Mitte (orange, 60% opacity, 800px radius). "Die Offerte," kommt als Fraunces Italic, groß, Warm-Weiß. "noch vor der" — eine Spur kleiner, leicht abgedimmt. "Heimfahrt." — Fraunces Italic, gleich groß wie Zeile 1, in `#C8793D` Brand Orange. Das Wort glüht kurz auf (scale 1→1.02→1, warmth pulse). Offertio Logo klein oben links, fades in bei 1.5s. Feines Körner-Overlay über dem gesamten Frame (Noise texture, 4% opacity).

**Animation choreography:**
- BG radial glow: EXPANDS von center (opacity 0 → 0.6) over 2.0s ease.out
- "Die Offerte," DRIFTS in von y:40→0, opacity 0→1, 0.7s power3.out, bei 0.3s
- "noch vor der" DRIFTS in, y:30→0, opacity 0→1, 0.5s power2.out, bei 0.7s
- "Heimfahrt." SLAMS in y:50→0, opacity 0→1, 0.6s power3.out, bei 1.1s — dann PULSE: scale 1→1.03→1, 0.4s power2.inOut
- Orange glow behind "Heimfahrt.": radial, 600px, opacity 0→0.25→0.15 over 1.2s
- Logo: fades in opacity 0→1 bei 1.5s, 0.4s

**Mood:** Cinematic title sequence. Das Gefühl von einem Bergfilm-Abspann. Still. Kraftvoll. Meinend.

**Depth layers:**
- BG: `#09090B` + radial orange glow
- MG: Typo-Block mit 3 Zeilen
- FG: Logo top-left, Noise-Overlay

**Transition OUT:** Blur-through + fade → scale 1→1.05, blur 0→16px, opacity 1→0, 0.35s power2.in

---

## BEAT 2 — APP DEMO (0:04–0:17s)

**VO:** "Termin fertig — Offertio öffnen. Positionen aus deinen Vorlagen, Stundensatz schon hinterlegt. Senden. Unterschrift per Link. Kund:in entscheidet noch heute."

**Concept:** Wir befinden uns jetzt im Cockpit. Das App-Dashboard schwebt auf dunklem Hintergrund, leicht perspektivisch geneigt — wie ein Profi der seinen Laptop aufklappt. Während die VO spricht, sehen wir Live-Aktionen: neue Offerte wird erstellt, Positionen erscheinen, der "Senden"-Button leuchtet auf. Es fühlt sich schnell an, aber nie gehetzt.

**Visual:** Dunkler Hintergrund (`#0D0C0A`). Dashboard-UI schwebt zentriert, leicht perspektivisch (perspective: 1200px, rotateX: 3°, rotateY: -2°). UI ist ein realistisches Mockup des Offertio-Dashboards: Sidebar links, Aktivitätsliste rechts, Status-Badges (Gesendet/Bezahlt). Über der VO erscheinen drei Action-Callouts als floating Labels: "Vorlage wählen", "Senden", "Signatur-Link" — die jeweils zur richtigen Zeit aufleuchten. Leichte Schatten unter dem Dashboard-Frame. Orange Accent-Line am oberen Rand des Mockup-Fensters.

**Dashboard-Mockup Inhalt (coded, nicht Screenshot):**
- Sidebar: Offertio Logo, Navigation (Übersicht, Dokumente, Kunden), Free Plan Badge
- Main: "Guten Tag, Muster GmbH" Greeting, Aktivitätsliste mit 3 Einträgen:
  - "Baumann Elektro AG — OF-2026-019 — CHF 2'340.00 — Gesendet" (orange badge)
  - "Müller Haustechnik — RG-2026-018 — CHF 1'378.80 — Bezahlt" (green badge)
  - "Schneider Garten — OF-2026-017 — CHF 890.00 — Entwurf" (gray badge)

**Animation choreography:**
- Entry: Dashboard SLIDES in von y:60→0, scale 0.92→1, opacity 0→1, 0.8s expo.out
- Perspective tilt: rotateX 8°→3° over 1.0s ease.out (settling into place)
- Floating label "Vorlage wählen": APPEARS bei 1.5s, y:0→-8→0 floating loop
- "Gesendet" Badge: GLOWS orange pulse bei 2.5s
- Floating label "Senden": APPEARS bei 5.0s, orange background, scale 0→1 bouncy
- Floating label "Unterschrift per Link": APPEARS bei 8.0s, fades in
- "Bezahlt" Badge: COLOR FILLS green at 10.0s, subtle scale bump

**Mood:** Warm workspace energy. Professionell aber nicht steril. Fühlt sich an wie ein gutes Werkzeug in der Hand.

**Depth layers:**
- BG: `#0D0C0A` + sehr feines Körner-Overlay
- MG: Dashboard-UI-Mockup mit perspective transform, box-shadow
- FG: Floating Action Labels, Status-Glow-Effekte

**Transition OUT:** Whip pan left — x:-300, blur 20px, opacity 0.5, 0.3s power3.in

---

## BEAT 3 — ONE CLICK (0:17–0:25s)

**VO:** "Ein Klick: Offerte wird zur Rechnung. QR-Code, ZUGFeRD, SEPA — je nach Land automatisch."

**Concept:** Drei Feature-Karten erscheinen in Sequenz — wie Karten die auf einen Tisch gelegt werden. Jede trägt ihr eigenes Land und seine Methode. Das "Ein Klick" Versprechen wird visuell belegt: ein animierter Pfeil transformiert OF → RG. Dieser Beat ist die "tech credibility" des Videos.

**Visual:** Dunkler Hintergrund (`#09090B`), warmere Mitte mit leichtem Glow. Oben: "Ein Klick." in Fraunces Italic, groß, Warm-Weiß. Darunter: ein animierter Transform — "OF-2026-019" MORPHS zu "RG-2026-019" mit einem kurzen Shimmer-Effekt. Dann: drei Feature-Cards CAСКADEN ein von unten, gestaffelt 0.15s:
- Card 1: 🇨🇭 Swiss QR-Rechnung — QR-Code Grafik, "Automatisch auf jeder CH-Rechnung"
- Card 2: 🇩🇪 ZUGFeRD — XML-Icon, "Eingebettet als XML. Für den Steuerberater."
- Card 3: 🇦🇹 SEPA — Bank-Icon, "Nummer, IBAN, Zahlungsziel — fertig."

Cards haben: `#1A1916` dark surface, orange 1px border, orange Icon, DM Sans text.

**Animation choreography:**
- "Ein Klick." SLAMS in y:50→0, opacity 0→1, 0.5s power3.out bei 0.0s
- Document number SHIMMERS: shimmer-sweep overlay left→right 0.4s bei 0.8s
- "OF" → "RG" text morph: opacity 0.5→1 crossfade + slight scale bump
- Card 1 DROPS in y:60→0, opacity 0→1, 0.4s power2.out, bei 1.4s
- Card 2 DROPS in, stagger 0.15s, bei 1.55s
- Card 3 DROPS in, stagger 0.15s, bei 1.70s
- Each card: orange border DRAWS in (width 0→100%) on entry
- Country flags pulse gently with scale 1→1.05→1

**Mood:** Präzise. Effizient. Swiss-engineered feel. Josef Müller-Brockmann trifft auf modernes SaaS.

**Depth layers:**
- BG: Dark + centered warm glow
- MG: "Ein Klick." headline + document transform
- FG: Three cascading feature cards

**Transition OUT:** Velocity-matched upward — y:-120, blur 20px, 0.3s power2.in

---

## BEAT 4 — DACH + HANDWERK (0:25–0:31s)

**VO:** "Für Schweiz, Deutschland und Österreich. Für Handwerk und Selbständige."

**Concept:** Drei Länderflaggen schweben nebeneinander, dann kondensiert alles zu einem klaren Statement. Dieser Beat ist Vertrauen durch Klarheit — "das ist für mich gebaut." Das Bild ist warm und direkt, ohne Ablenkung.

**Visual:** Dunkel (`#09090B`). Drei große Flaggen-Emoji/Badges — 🇨🇭 🇩🇪 🇦🇹 — schweben horizontal zentriert, in sanften Karten (rounded, subtle border). Darunter: "Für Handwerk und Selbständige." in Fraunces Italic, warm-weiß, mittelgroß. Leichte Partikel-Punkte im Hintergrund (statisch, weiß, 2% opacity, seeded positions). Offertio Logo bleibt oben links sichtbar.

**Animation choreography:**
- CH Flag-Card: DRIFTS in von links, x:-80→0, opacity 0→1, 0.5s, bei 0.0s
- DE Flag-Card: DRIFTS in von unten, y:40→0, opacity 0→1, 0.5s, bei 0.15s
- AT Flag-Card: DRIFTS in von rechts, x:80→0, opacity 0→1, 0.5s, bei 0.30s
- "Für Handwerk und Selbständige." TYPES on (character by character), 0.8s, bei 1.2s
- Alle drei Cards: leichte hover-float loop, y:-4→4→-4, 3s ease.inOut, versetzt

**Mood:** Warm und klar. Kein Tech-Brimborium. Das Gefühl einer Handwerker-Empfehlung von einem, dem man vertraut.

**Depth layers:**
- BG: Dark + soft scattered particle dots
- MG: Three flag cards floating in row
- FG: "Für Handwerk..." text below

**Transition OUT:** Blur through — blur 0→18px, opacity 1→0, 0.3s power2.in

---

## BEAT 5 — CTA (0:31–0:39s)

**VO:** "Gratis starten. Upgrade wenn's sich lohnt. / Offertio."

**Concept:** Der finale Beat ist ruhig und selbstbewusst. Kein Schreien. Die Preiskarte für "Werkbank — CHF 0 — für immer" erscheint sauber. Darunter der CTA-Button. Dann: alles faded bis auf den Namen. "Offertio." — allein, groß, in Orange. Das ist der Abschluss.

**Visual:** Dunkler Hintergrund. Zentral: Pricing-Card mit weißem Hintergrund, "Werkbank", "CHF 0" in sehr großem Fraunces-Serif, "für immer" darunter klein in DM Sans. Dann ein oranger "Kostenlos starten" Button. "Keine Kreditkarte · DSG & DSGVO" als Trust-Badges darunter. Nach 3s: Pricing Card faded aus. "Offertio." erscheint groß, Fraunces Italic, `#C8793D` — pulsiert warm einmal — dann freeze auf letztem Frame.

**Animation choreography:**
- Pricing Card: RISES in y:40→0, opacity 0→1, scale 0.96→1, 0.7s expo.out bei 0.0s
- "CHF 0": COUNTS UP (0→0 sofort, kein Counter — direct reveal) mit scale 1.1→1 bump
- Button "Kostenlos starten": BOUNCES in scale 0→1.05→1, 0.5s power2.out, bei 1.0s
- Button: orange glow pulse, 2s loop
- Trust badges: DRIFT in opacity 0→0.7, bei 1.5s
- Bei 3.0s: Card + Button FADE OUT, y:-20, 0.4s power2.in
- "Offertio." RISES aus dem Dunkel: y:30→0, opacity 0→1, scale 0.9→1, 0.8s expo.out
- "Offertio." in `#C8793D`, Fraunces Italic, 120px
- Warm pulse glow behind "Offertio.": opacity 0→0.3→0.15, 1.0s
- Final frame: "Offertio." allein, warm glow, freeze

**Mood:** Selbstbewusst. Klar. Das Gefühl eines starken Abschlusses — wie der letzte Schnitt eines Apple-Spots.

**Depth layers:**
- BG: Dark, barely-there centered glow
- MG: Pricing card → (swap) → "Offertio." brand name
- FG: Button + Trust badges

---

## Production Architecture

```
video/
├── index.html                    # Root — VO + all beats orchestrated
├── DESIGN.md                     # Brand reference
├── SCRIPT.md                     # Narration text
├── STORYBOARD.md                 # THIS FILE
├── narration.wav                 # TTS audio (Step 5)
├── transcript.json               # Word timestamps (Step 5)
├── captures/offertio/            # Captured website data
└── compositions/
    ├── beat-1-hook.html
    ├── beat-2-demo.html
    ├── beat-3-one-click.html
    ├── beat-4-dach.html
    └── beat-5-cta.html
```
