// ============================================================
// POST /api/purchases/scan
// Receives a PDF or image and uses Google Gemini to extract
// structured purchase invoice data for auto-fill.
// ============================================================

import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export const maxDuration = 60; // Allow up to 60s for AI processing

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";

interface ScannedLineItem {
    description: string;
    details: string;
    quantity: number;
    unitPriceEuros: number;   // price in euros (NOT cents)
    taxRatePercent: number;   // e.g. 21
}

interface ScannedInvoice {
    providerName: string;
    providerTaxId: string;     // NIF / CIF
    invoiceNumber: string;
    issueDate: string;         // YYYY-MM-DD
    dueDate: string;           // YYYY-MM-DD
    lines: ScannedLineItem[];
    notes: string;
    confidence: number;        // 0-100
}

export async function POST(request: Request) {
    try {
        if (!GEMINI_API_KEY) {
            return NextResponse.json(
                { error: "Clave API de Gemini no configurada. Añade GEMINI_API_KEY en las variables de entorno." },
                { status: 500 }
            );
        }

        const formData = await request.formData();
        const file = formData.get("file") as File | null;

        if (!file) {
            return NextResponse.json({ error: "No se ha proporcionado ningún archivo" }, { status: 400 });
        }

        // Validate file type
        const allowedTypes = [
            "application/pdf",
            "image/png",
            "image/jpeg",
            "image/jpg",
            "image/webp",
            "image/heic",
        ];
        if (!allowedTypes.includes(file.type)) {
            return NextResponse.json(
                { error: "Formato no soportado. Sube un PDF o imagen (PNG, JPG, WebP)." },
                { status: 400 }
            );
        }

        // Max 20MB
        if (file.size > 20 * 1024 * 1024) {
            return NextResponse.json(
                { error: "El archivo es demasiado grande. Máximo 20 MB." },
                { status: 400 }
            );
        }

        const arrayBuffer = await file.arrayBuffer();
        const base64Data = Buffer.from(arrayBuffer).toString("base64");

        // Map MIME types for Gemini
        let mimeType = file.type;
        if (mimeType === "image/jpg") mimeType = "image/jpeg";

        // ── Call Google Gemini ──────────────────────────────
        const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

        const prompt = `Eres un experto en contabilidad española. Analiza esta factura y extrae TODA la información en formato JSON.

REGLAS IMPORTANTES:
- Las cantidades monetarias deben estar en EUROS (no céntimos). Ejemplo: 100.50, no 10050
- La fecha debe estar en formato YYYY-MM-DD
- El taxRatePercent debe ser el porcentaje de IVA (ej: 21, 10, 4, 0)
- Si no puedes identificar un campo, pon una cadena vacía ""
- El campo "confidence" debe ser un número del 0 al 100 indicando tu confianza en la extracción
- El campo "notes" puede incluir cualquier información relevante que no encaje en los otros campos
- Si hay varias líneas de factura, extrae CADA una por separado
- El "unitPriceEuros" es el precio unitario SIN IVA
- Si el precio incluye IVA, calcula el precio sin IVA

Devuelve SOLO un JSON válido con esta estructura exacta, SIN markdown, SIN backticks, SIN explicaciones:

{
  "providerName": "Nombre del proveedor/empresa que emite la factura",
  "providerTaxId": "NIF o CIF del proveedor",
  "invoiceNumber": "Número de factura del proveedor",
  "issueDate": "YYYY-MM-DD",
  "dueDate": "YYYY-MM-DD",
  "lines": [
    {
      "description": "Concepto o descripción de la línea",
      "details": "Detalles adicionales",
      "quantity": 1,
      "unitPriceEuros": 100.00,
      "taxRatePercent": 21
    }
  ],
  "notes": "Información adicional relevante",
  "confidence": 85
}`;

        const result = await model.generateContent([
            prompt,
            {
                inlineData: {
                    mimeType,
                    data: base64Data,
                },
            },
        ]);

        const responseText = result.response.text();

        // Parse the JSON response — Gemini sometimes wraps in markdown
        let jsonStr = responseText.trim();

        // Remove markdown code fences if present
        if (jsonStr.startsWith("```")) {
            jsonStr = jsonStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
        }

        let scannedData: ScannedInvoice;
        try {
            scannedData = JSON.parse(jsonStr);
        } catch {
            console.error("Failed to parse Gemini response:", responseText);
            return NextResponse.json(
                { error: "No se pudo interpretar la respuesta de la IA. Intenta con otra imagen o PDF más claro." },
                { status: 422 }
            );
        }

        // Validate and sanitize the response
        const sanitized: ScannedInvoice = {
            providerName: String(scannedData.providerName || ""),
            providerTaxId: String(scannedData.providerTaxId || ""),
            invoiceNumber: String(scannedData.invoiceNumber || ""),
            issueDate: String(scannedData.issueDate || ""),
            dueDate: String(scannedData.dueDate || ""),
            notes: String(scannedData.notes || ""),
            confidence: Number(scannedData.confidence) || 0,
            lines: Array.isArray(scannedData.lines)
                ? scannedData.lines.map((line) => ({
                    description: String(line.description || ""),
                    details: String(line.details || ""),
                    quantity: Number(line.quantity) || 1,
                    unitPriceEuros: Number(line.unitPriceEuros) || 0,
                    taxRatePercent: Number(line.taxRatePercent) || 0,
                }))
                : [],
        };

        return NextResponse.json(sanitized);
    } catch (err) {
        console.error("Invoice scan error:", err);
        return NextResponse.json(
            { error: "Error al escanear la factura. Inténtalo de nuevo." },
            { status: 500 }
        );
    }
}
