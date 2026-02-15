/**
 * Convert logo.svg → base64 PNG for jsPDF embedding
 * Run: npx tsx scripts/generate-logo-base64.ts
 */
import sharp from "sharp";
import fs from "fs";
import path from "path";

async function main() {
    const svgPath = path.resolve(__dirname, "../public/logo.svg");
    const svgBuffer = fs.readFileSync(svgPath);

    // Render SVG to PNG at 400px width (good quality for PDF headers)
    const pngBuffer = await sharp(svgBuffer)
        .resize(400, 400, { fit: "contain", background: { r: 255, g: 255, b: 255, alpha: 0 } })
        .png()
        .toBuffer();

    const base64 = pngBuffer.toString("base64");

    const output = `// Auto-generated — do not edit manually
// Run: npx tsx scripts/generate-logo-base64.ts
export const LOGO_BASE64 = "data:image/png;base64,${base64}";
`;

    const outPath = path.resolve(__dirname, "../src/lib/logo-base64.ts");
    fs.writeFileSync(outPath, output);
    console.log(`✅ Logo base64 written to ${outPath} (${Math.round(base64.length / 1024)} KB)`);
}

main().catch(console.error);
