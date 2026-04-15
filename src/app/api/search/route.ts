import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

// GET /api/search?q=query — Global search across all entities
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const q = searchParams.get("q")?.trim();

        if (!q || q.length < 2) {
            return NextResponse.json({ results: [] });
        }

        const searchTerm = `%${q}%`;

        // Search in parallel
        const [clients, providers, invoices, quotes, purchases, services] = await Promise.all([
            // Clients
            prisma.client.findMany({
                where: {
                    deletedAt: null,
                    OR: [
                        { name: { contains: q, mode: "insensitive" } },
                        { taxId: { contains: q, mode: "insensitive" } },
                        { email: { contains: q, mode: "insensitive" } },
                    ],
                },
                select: { id: true, name: true, taxId: true, email: true },
                take: 5,
            }),

            // Providers
            prisma.provider.findMany({
                where: {
                    deletedAt: null,
                    OR: [
                        { name: { contains: q, mode: "insensitive" } },
                        { taxId: { contains: q, mode: "insensitive" } },
                        { email: { contains: q, mode: "insensitive" } },
                    ],
                },
                select: { id: true, name: true, taxId: true },
                take: 5,
            }),

            // Invoices
            prisma.invoice.findMany({
                where: {
                    deletedAt: null,
                    OR: [
                        { number: { contains: q, mode: "insensitive" } },
                        { client: { name: { contains: q, mode: "insensitive" } } },
                    ],
                },
                select: { id: true, number: true, status: true, totalCents: true, client: { select: { name: true } } },
                take: 5,
                orderBy: { createdAt: "desc" },
            }),

            // Quotes
            prisma.quote.findMany({
                where: {
                    deletedAt: null,
                    OR: [
                        { client: { name: { contains: q, mode: "insensitive" } } },
                    ],
                },
                select: { id: true, number: true, status: true, totalCents: true, client: { select: { name: true } } },
                take: 5,
                orderBy: { createdAt: "desc" },
            }),

            // Purchase invoices
            prisma.purchaseInvoice.findMany({
                where: {
                    deletedAt: null,
                    OR: [
                        { providerInvoiceNumber: { contains: q, mode: "insensitive" } },
                        { provider: { name: { contains: q, mode: "insensitive" } } },
                    ],
                },
                select: { id: true, providerInvoiceNumber: true, status: true, totalCents: true, provider: { select: { name: true } } },
                take: 5,
                orderBy: { createdAt: "desc" },
            }),

            // Services
            prisma.service.findMany({
                where: {
                    OR: [
                        { name: { contains: q, mode: "insensitive" } },
                        { description: { contains: q, mode: "insensitive" } },
                    ],
                },
                select: { id: true, name: true, unitPriceCents: true },
                take: 5,
            }),
        ]);

        type SearchResult = {
            type: string;
            id: string;
            title: string;
            subtitle: string;
            href: string;
            icon: string;
        };

        const results: SearchResult[] = [];

        clients.forEach((c) => results.push({
            type: "client",
            id: c.id,
            title: c.name,
            subtitle: [c.taxId, c.email].filter(Boolean).join(" · ") || "Cliente",
            href: `/clients/${c.id}`,
            icon: "👤",
        }));

        providers.forEach((p) => results.push({
            type: "provider",
            id: p.id,
            title: p.name,
            subtitle: p.taxId || "Proveedor",
            href: `/providers/${p.id}`,
            icon: "🏢",
        }));

        invoices.forEach((inv) => results.push({
            type: "invoice",
            id: inv.id,
            title: `Factura ${inv.number || "Borrador"}`,
            subtitle: `${inv.client.name} · ${(inv.totalCents / 100).toFixed(2)} €`,
            href: `/invoices/${inv.id}`,
            icon: "📄",
        }));

        quotes.forEach((q) => results.push({
            type: "quote",
            id: q.id,
            title: `Presupuesto ${q.number || "Borrador"}`,
            subtitle: `${q.client.name} · ${(q.totalCents / 100).toFixed(2)} €`,
            href: `/quotes/${q.id}`,
            icon: "📝",
        }));

        purchases.forEach((p) => results.push({
            type: "purchase",
            id: p.id,
            title: `Compra ${p.providerInvoiceNumber || "—"}`,
            subtitle: `${p.provider.name} · ${(p.totalCents / 100).toFixed(2)} €`,
            href: `/purchases/${p.id}`,
            icon: "📥",
        }));

        services.forEach((s) => results.push({
            type: "service",
            id: s.id,
            title: s.name,
            subtitle: `${(s.unitPriceCents / 100).toFixed(2)} €`,
            href: `/services`,
            icon: "⚙️",
        }));

        return NextResponse.json({ results });
    } catch (error: any) {
        console.error("Search error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
