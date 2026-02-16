import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

// POST /api/settings/email/test — send test email
export async function POST(request: Request) {
    try {
        const { to } = await request.json();

        if (!to) {
            return NextResponse.json({ error: "Destinatario requerido" }, { status: 400 });
        }

        const host = process.env.SMTP_HOST;
        const port = parseInt(process.env.SMTP_PORT || "587");
        const user = process.env.SMTP_USER;
        const pass = process.env.SMTP_PASS;
        const from = process.env.SMTP_FROM || "Automatio CRM <info@automatio.es>";

        if (!host || !user || !pass) {
            return NextResponse.json({
                configured: false,
                error: "SMTP no configurado. Variables de entorno requeridas: SMTP_HOST, SMTP_USER, SMTP_PASS",
            }, { status: 400 });
        }

        const transporter = nodemailer.createTransport({
            host,
            port,
            secure: process.env.SMTP_SECURE === "true",
            auth: { user, pass },
        });

        await transporter.sendMail({
            from,
            to,
            subject: "🧪 Email de prueba — Automatio CRM",
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 30px;">
                    <div style="background: #1B1660; padding: 20px; border-radius: 8px 8px 0 0; text-align: center;">
                        <h1 style="color: #fff; margin: 0; font-size: 18px;">✅ SMTP Configurado Correctamente</h1>
                    </div>
                    <div style="padding: 24px; background: #f8f9fa; border: 1px solid #e0e0e0; border-radius: 0 0 8px 8px;">
                        <p>Este es un email de prueba enviado desde <strong>Automatio CRM</strong>.</p>
                        <p>Si recibes este mensaje, la configuración SMTP está funcionando correctamente.</p>
                        <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 20px 0;" />
                        <p style="color: #888; font-size: 12px;">Enviado el ${new Date().toLocaleString("es-ES")}</p>
                    </div>
                </div>
            `,
        });

        return NextResponse.json({ success: true, message: `Email de prueba enviado a ${to}` });
    } catch (err: any) {
        console.error("Email test error:", err);
        return NextResponse.json({
            success: false,
            error: err.message || "Error al enviar email de prueba",
        }, { status: 500 });
    }
}
