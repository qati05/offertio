import { generateQrCodeDataUrl } from '../src/lib/qr-bill.ts';
const profil = {
  land: 'CH',
  iban: 'CH4431999123000889012',
  firmenname: 'Offertio Test GmbH',
  vorname: 'Max',
  nachname: 'Muster',
  adresse: 'Bahnhofstrasse 1',
  plz: '8001',
  ort: 'Zürich',
};
(async () => {
  const result = await generateQrCodeDataUrl(profil as any, 1234.5, 'RE-2026-001');
  console.log(result ? result.slice(0, 120) : 'null');
})();
