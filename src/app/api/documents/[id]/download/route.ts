import { prisma } from "@/lib/prisma";
import { getSupabase, STORAGE_BUCKET } from "@/lib/supabase";
import { NextResponse } from "next/server";

// GET /api/documents/[id]/download — Generate signed URL and redirect
export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    try {
        const document = await prisma.document.findUnique({ where: { id } });

        if (!document) {
            return NextResponse.json({ error: "Documento no encontrado" }, { status: 404 });
        }

        const { data, error } = await getSupabase().storage
            .from(STORAGE_BUCKET)
            .createSignedUrl(document.storagePath, 60 * 5); // 5 min

        if (error || !data?.signedUrl) {
            console.error("Signed URL error:", error);
            return NextResponse.json(
                { error: "Error al generar enlace de descarga" },
                { status: 500 }
            );
        }

        return NextResponse.redirect(data.signedUrl);
    } catch (error) {
        console.error("Download error:", error);
        return NextResponse.json({ error: "Error al descargar documento" }, { status: 500 });
    }
}

// DELETE /api/documents/[id]/download — Delete document from storage + DB
export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    try {
        const document = await prisma.document.findUnique({ where: { id } });

        if (!document) {
            return NextResponse.json({ error: "Documento no encontrado" }, { status: 404 });
        }

        // Delete from Supabase Storage
        const { error: deleteError } = await getSupabase().storage
            .from(STORAGE_BUCKET)
            .remove([document.storagePath]);

        if (deleteError) {
            console.error("Storage delete error:", deleteError);
            // Continue to delete DB record even if storage delete fails
        }

        // Delete DB record
        await prisma.document.delete({ where: { id } });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Delete error:", error);
        return NextResponse.json({ error: "Error al eliminar documento" }, { status: 500 });
    }
}
