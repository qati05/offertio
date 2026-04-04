import type { Position } from "./types";

export const DEFAULT_VORLAGEN: Record<string, { name: string; positionen: Position[] }[]> = {
  Elektriker: [
    {
      name: "Elektroinstallation Standard",
      positionen: [
        { bezeichnung: "Elektriker Arbeitsstunden", einheit: "Std.", menge: 1, preis: 120 },
        { bezeichnung: "Lernender Arbeitsstunden", einheit: "Std.", menge: 1, preis: 75 },
        { bezeichnung: "Anfahrt / Kilometer", einheit: "km", menge: 1, preis: 1.2 },
      ],
    },
  ],
  "Maler / Gipser": [
    {
      name: "Malerarbeiten Standard",
      positionen: [
        { bezeichnung: "Malerarbeiten innen", einheit: "m²", menge: 1, preis: 18 },
        { bezeichnung: "Malerarbeiten aussen", einheit: "m²", menge: 1, preis: 24 },
        { bezeichnung: "Arbeitsstunden", einheit: "Std.", menge: 1, preis: 95 },
      ],
    },
  ],
  "Sanitär / Heizung": [
    {
      name: "Sanitärarbeiten Standard",
      positionen: [
        { bezeichnung: "Sanitär Arbeitsstunden", einheit: "Std.", menge: 1, preis: 130 },
        { bezeichnung: "Anfahrtspauschale", einheit: "pauschal", menge: 1, preis: 60 },
      ],
    },
  ],
  "Schreiner / Zimmermann": [
    {
      name: "Schreinerarbeiten Standard",
      positionen: [
        { bezeichnung: "Schreinerarbeit", einheit: "Std.", menge: 1, preis: 110 },
        { bezeichnung: "Materialpauschale", einheit: "pauschal", menge: 1, preis: 0 },
      ],
    },
  ],
  "Maurer / Bau": [
    {
      name: "Maurerarbeiten Standard",
      positionen: [
        { bezeichnung: "Maurerarbeiten", einheit: "Std.", menge: 1, preis: 95 },
        { bezeichnung: "Maschinen/Geräte", einheit: "Tag", menge: 1, preis: 150 },
      ],
    },
  ],
  "Spengler / Dachdecker": [
    {
      name: "Dacharbeiten Standard",
      positionen: [
        { bezeichnung: "Arbeitsstunden", einheit: "Std.", menge: 1, preis: 105 },
        { bezeichnung: "Materialpauschale", einheit: "pauschal", menge: 1, preis: 0 },
      ],
    },
  ],
  "Gärtner / Landschaftsbau": [
    {
      name: "Gartenarbeiten Standard",
      positionen: [
        { bezeichnung: "Gartenarbeit", einheit: "Std.", menge: 1, preis: 85 },
        { bezeichnung: "Maschineneinsatz", einheit: "Std.", menge: 1, preis: 45 },
      ],
    },
  ],
  "Bodenleger / Fliesenleger": [
    {
      name: "Bodenarbeiten Standard",
      positionen: [
        { bezeichnung: "Verlegearbeiten", einheit: "m²", menge: 1, preis: 55 },
        { bezeichnung: "Arbeitsstunden", einheit: "Std.", menge: 1, preis: 95 },
      ],
    },
  ],
};
