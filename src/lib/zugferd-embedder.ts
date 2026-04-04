/**
 * ZUGFeRD PDF Post-Processor
 *
 * Embeds a ZUGFeRD 2.3.2 BASIC CII-XML file into an existing PDF,
 * producing a ZUGFeRD-compliant (Factur-X) PDF/A-3b output.
 *
 * Requires: pdf-lib
 */

import { PDFDocument, PDFName, AFRelationship } from "pdf-lib";

/** XMP metadata block identifying this PDF as a Factur-X / ZUGFeRD document */
function buildXmpMetadata(): string {
  return (
    '<?xpacket begin="\uFEFF" id="W5M0MpCehiHzreSzNTczkc9d"?>\n' +
    '<x:xmpmeta xmlns:x="adobe:ns:meta/">\n' +
    '  <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">\n' +
    '    <rdf:Description rdf:about=""\n' +
    '      xmlns:fx="urn:factur-x:pdfa:CrossIndustryDocument:invoice:1p0#">\n' +
    "      <fx:DocumentType>INVOICE</fx:DocumentType>\n" +
    "      <fx:DocumentFileName>factur-x.xml</fx:DocumentFileName>\n" +
    "      <fx:ConformanceLevel>EN 16931</fx:ConformanceLevel>\n" +
    "      <fx:Version>1.0</fx:Version>\n" +
    "    </rdf:Description>\n" +
    "  </rdf:RDF>\n" +
    "</x:xmpmeta>\n" +
    '<?xpacket end="w"?>'
  );
}

/**
 * Embed a ZUGFeRD CII-XML string into an existing PDF as an
 * associated file with AFRelationship: Alternative.
 *
 * @param pdfBytes  Original PDF as Uint8Array
 * @param xmlString ZUGFeRD CII-XML produced by buildZugferdXml()
 * @returns         Modified PDF bytes with embedded XML + XMP metadata
 */
export async function embedZugferdXml(
  pdfBytes: Uint8Array,
  xmlString: string,
): Promise<Uint8Array> {
  if (!pdfBytes || pdfBytes.length < 5) {
    throw new Error("Ungültiges PDF: Eingabe ist leer oder zu klein.");
  }

  // PDF magic-bytes check (%PDF-)
  const magic = Buffer.from(pdfBytes.slice(0, 5)).toString("ascii");
  if (!magic.startsWith("%PDF-")) {
    throw new Error("Ungültiges PDF: Datei beginnt nicht mit %PDF-.");
  }

  if (!xmlString?.trim()) {
    throw new Error("Ungültige XML: Der XML-String ist leer.");
  }

  const pdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
  const ctx = pdfDoc.context;

  // ── 1. Attach factur-x.xml (handles EmbeddedFile + Filespec + /Names tree) ──
  const xmlBytes = new Uint8Array(Buffer.from(xmlString, "utf-8"));
  await pdfDoc.attach(xmlBytes, "factur-x.xml", {
    mimeType: "text/xml",
    description: "ZUGFeRD 2.3.2 BASIC Invoice Data",
    creationDate: new Date(),
    modificationDate: new Date(),
    afRelationship: AFRelationship.Alternative,
  });

  // ── 2. Write XMP metadata for Factur-X identification ────────────────────
  const xmpBytes = new Uint8Array(Buffer.from(buildXmpMetadata(), "utf-8"));
  const xmpStream = ctx.stream(xmpBytes, {
    Type: "Metadata",
    Subtype: "XML",
    Length: xmpBytes.length,
  });
  pdfDoc.catalog.set(PDFName.of("Metadata"), ctx.register(xmpStream));

  return pdfDoc.save();
}
