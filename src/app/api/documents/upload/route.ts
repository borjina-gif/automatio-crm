import { prisma } from "@/lib/prisma";
import { getSupabase, STORAGE_BUCKET } from "@/lib/supabase";
import { NextResponse } from "next/server";

// POST /api/documents/upload — Upload file to Supabase Storage
export async function POST(request: Request) {
    try {
        const formData = await request.formData();
        const file = formData.get("file") as File | null;
        const entityType = formData.get("entityType") as string;
        const entityId = formData.get("entityId") as string;

        if (!file || !entityType || !entityId) {
            return NextResponse.json(
                { error: "Faltan campos: file, entityType, entityId" },
                { status: 400 }
            );
        }

        const company = await prisma.company.findFirst();
        if (!company) {
            return NextResponse.json({ error: "Empresa no configurada" }, { status: 500 });
        }

        // Build storage path: company/{companyId}/{entityType}/{entityId}/{timestamp}_{filename}
        const timestamp = Date.now();
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        const storagePath = `company/${company.id}/${entityType.toLowerCase()}/${entityId}/${timestamp}_${safeName}`;

        // Upload to Supabase Storage
        const buffer = Buffer.from(await file.arrayBuffer());
        const { error: uploadError } = await getSupabase().storage
            .from(STORAGE_BUCKET)
            .upload(storagePath, buffer, {
                contentType: file.type,
                upsert: false,
            });

        if (uploadError) {
            console.error("Supabase upload error:", uploadError);
            return NextResponse.json(
                { error: `Error al subir archivo: ${uploadError.message}` },
                { status: 500 }
            );
        }

        // Create DB record
        const document = await prisma.document.create({
            data: {
                companyId: company.id,
                entityType: entityType as any,
                entityId,
                filename: file.name,
                mimeType: file.type || "application/octet-stream",
                sizeBytes: file.size,
                storagePath,
            },
        });

        return NextResponse.json(document, { status: 201 });
    } catch (error) {
        console.error("Upload error:", error);
        return NextResponse.json({ error: "Error al subir archivo" }, { status: 500 });
    }
}

// GET /api/documents/upload?entityType=INVOICE&entityId=xxx — List documents
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const entityType = searchParams.get("entityType");
        const entityId = searchParams.get("entityId");

        if (!entityType || !entityId) {
            return NextResponse.json(
                { error: "Faltan parámetros: entityType, entityId" },
                { status: 400 }
            );
        }

        const documents = await prisma.document.findMany({
            where: {
                entityType: entityType as any,
                entityId,
            },
            orderBy: { createdAt: "desc" },
        });

        return NextResponse.json(documents);
    } catch (error) {
        console.error("Documents list error:", error);
        return NextResponse.json({ error: "Error al listar documentos" }, { status: 500 });
    }
}
