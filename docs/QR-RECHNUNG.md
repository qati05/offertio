# Schweizer QR-Code — was geprüft ist und was nicht

Stand 29.08.2026. Diese Datei beantwortet die Frage: **Ist der QR-Code-Payload
selbst regelkonform — und ist das geprüft oder nur angenommen?**

Bis hierher war die Antwort „sollte durch die Bibliothek stimmen". Das ist keine
Prüfung. Jetzt ist es eine.

## Wie geprüft wurde

`src/__tests__/qr-payload-conformance.test.ts` erzeugt den echten SVG, den
Offertio in die PDFs einbettet, rechnet aus den SVG-Rechtecken die Modulmatrix
zurück, rastert sie und **liest sie mit einem unabhängigen QR-Decoder (jsQR)
wieder aus**. Geprüft wird also das, was der Scanner einer Banking-App
tatsächlich sieht — nicht das, was die Bibliothek zu tun behauptet.

## Ergebnis: der Payload ist korrekt

Dekodiert, Feld für Feld, für eine normale CH-IBAN:

```
 0: "SPC"                      Header
 1: "0200"                     Version
 2: "1"                        Zeichensatz UTF-8 (ECI 26)
 3: "CH5604835012345678009"    IBAN
 4: "S"                        Adresstyp strukturiert
 5: "Muster Reinigung GmbH"    Name
 6: "Bahnhofstrasse"           Strasse
 7: "12"                       Hausnummer
 8: "8001"  9: "Zürich"  10: "CH"
11–17: ""                      Endempfänger — muss leer bleiben
18: "1234.55"  19: "CHF"       Betrag, Währung
20–26: ""                      Endzahler — leer, kein Debitor
27: "NON"  28: ""  29: "RE-2026-0001"
30: "EPD"                      Ende der Zahlungsdaten
31: ""                         Rechnungsinformationen
```

32 Felder, exakt in der Reihenfolge des Swiss Payments Code.

| Punkt | Befund |
| --- | --- |
| Header `SPC` / `0200` / `1` | korrekt |
| Zeichensatz | UTF-8 über ECI 26; Umlaute und Akzente kommen unverfälscht zurück (`Zürcher Gebäudereinigung AG`, `Genève`) |
| Adresstyp | **`S`** — strukturiert. Der auslaufende Typ `K` wird nie erzeugt, die Fristen 11/2025 und 11/2026 sind für Offertio kein Thema |
| Fehlerkorrektur | Level **M**, wie vorgeschrieben |
| QR-Version | 10 (57×57 Module), Obergrenze der Norm ist 25 |
| Betragsformat | `1234.55` — zwei Nachkommastellen, keine Tausendertrennung |
| `EPD`-Trailer | an Position 30, korrekt |

**Referenzarten**, ebenfalls gemessen:

- Normale CH-IBAN → `NON`, Referenzfeld leer, Dokumentnummer als unstrukturierte
  Mitteilung. Korrekt.
- QR-IBAN → `QRR` mit 27-stelliger Referenz. Korrekt.

Und die Bibliothek weist die von der Norm verbotenen Kombinationen wirklich ab —
nachgemessen, nicht angenommen:

- QRR mit falscher Prüfziffer → abgelehnt
- QR-IBAN ohne Referenz → abgelehnt
- QRR auf einer normalen IBAN → abgelehnt

## Behoben: die Druckgrösse — und der Grund dahinter

Die Bibliothek liefert den Code korrekt mit `width="46mm" height="46mm"`.
Offertio überschrieb das mit `qrImage: { width: 80, height: 80 }` — 80 pt =
**28,22 mm** statt 46 mm, Modulgrösse 0,495 statt 0,807 mm.

**Beim Beheben zeigte sich, dass der QR-Code nur das sichtbarste Symptom war.**
Alle fünf Templates führten den Zahlteil so:

```ts
qrReceipt: { width: 175 }   // 62 mm, korrekt nach Punkt umgerechnet
qrSection: { height: 105 }  // 105 aus "105 mm" übernommen — 105 pt sind 37 mm
```

Die Breite wurde umgerechnet, die Höhe abgeschrieben. Der ganze Zahlteil war
damit auf **ein Drittel** der Normhöhe geschrumpft, und der QR-Code musste
klein bleiben, weil er sonst gar nicht hineingepasst hätte.

Die Geometrie liegt jetzt in `src/lib/qr-bill-layout.ts`: Millimeter als
Norm-Einheit, eine einzige Umrechnung nach Punkt, alle fünf Templates lesen von
dort. Streifen 105 mm hoch, Empfangsschein 62 mm, Zahlteil 148 mm, QR 46 mm —
62 + 148 = 210 = A4-Breite. Das Seiten-Padding unten wurde entsprechend
vergrössert, damit die Positionstabelle nicht unter den Streifen läuft.

**Was daran geprüft ist und was nicht:** Die Umrechnung ist getestet, die
Templates nutzen nachweislich die Konstanten, und die PDFs rendern fehlerfrei.
**Niemand hat die PDFs angesehen.** Ob der Umbruch bei langen Positionslisten
gut aussieht, ist ungeprüft — das braucht einen Blick auf ein echtes Dokument.

## Was weiterhin ungeprüft ist

Ehrlich benannt, statt überspielt:

1. **Kein offizieller Validator gelaufen.** Die Implementation Guidelines und
   das Validierungsportal liegen auf `six-group.com`; diese Umgebung kommt dort
   nicht hin. Geprüft ist der Payload gegen die Feldstruktur, nicht gegen SIX.
2. **Ob `0200` die aktuelle IG-Revision ist**, konnte aus derselben Ursache
   nicht an einer offiziellen Quelle bestätigt werden.
3. **Kein Druck-und-Scan-Test** mit einer echten Banking-App auf Papier.
4. **Der Zahlteil ist selbst gebaut, nicht von der Bibliothek erzeugt.**
   Offertio nutzt `swissqrbill/svg` nur für den Code und zeichnet Empfangsschein
   und Zahlteil selbst — deshalb konnte sich der Höhenfehler oben überhaupt
   einschleichen. Die Masse stimmen jetzt, aber Feldanordnung, Schriftgrössen
   und Beschriftungen sind gegen die Norm **ungeprüft**. Der Debitor steht
   weiterhin nicht im Code.
5. **Hausnummer.** Das Profil hat ein einziges Adressfeld, die strukturierte
   Adresse trennt Strasse und Hausnummer. „Hauptstrasse 12" landet komplett im
   Strassenfeld. Behebbar nur mit einer Änderung am Profil-Datenmodell.
6. **Negativer Betrag.** Die Bibliothek akzeptiert ihn. Offertio reicht
   `Math.round(total * 100) / 100` durch, ein Rabatt über 100 % ergäbe einen
   negativen Betrag im QR-Code. Bisher unmöglich zu erzeugen, aber ungeprüft.

## So würde man es endgültig schliessen

1. Den dekodierten Payload einmal in das SIX-Validierungsportal einfügen
   (`https://validation.iso-payments.ch/`, von einem Rechner mit Netzzugang).
2. **Ein PDF ansehen** — die Masse stimmen jetzt rechnerisch, aber niemand hat
   geprüft, wie der Umbruch bei einer langen Positionsliste aussieht.
3. Dasselbe PDF ausdrucken und mit zwei echten Banking-Apps scannen.
