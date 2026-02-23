// Quick SMTP test — sends a test email to verify SMTP config
import "dotenv/config";
import nodemailer from "nodemailer";

async function main() {
    const host = process.env.SMTP_HOST!;
    const port = parseInt(process.env.SMTP_PORT || "465");
    const user = process.env.SMTP_USER!;
    const pass = process.env.SMTP_PASS!;
    const from = process.env.SMTP_FROM || "info@automatio.es";

    console.log(`Connecting to ${host}:${port} as ${user}...`);

    const transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass },
        tls: { rejectUnauthorized: false },
    });

    // Verify connection
    try {
        await transporter.verify();
        console.log("✅ SMTP connection verified!");
    } catch (err) {
        console.error("❌ SMTP connection failed:", err);
        process.exit(1);
    }

    // Send test email
    const info = await transporter.sendMail({
        from,
        to: "borjina@gmail.com",
        subject: "Test desde Automatio CRM",
        html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #1e1e32; padding: 20px; border-radius: 8px 8px 0 0;">
                <h1 style="color: #fff; margin: 0; font-size: 20px;">Automatio solutions S.L</h1>
                <p style="color: #a0a0c0; margin: 4px 0 0;">Email de prueba</p>
            </div>
            <div style="padding: 24px; background: #f8f9fa; border: 1px solid #e0e0e0; border-radius: 0 0 8px 8px;">
                <p>¡Hola Borja!</p>
                <p>Este es un email de prueba enviado desde <strong>Automatio CRM</strong> via SMTP (<code>mail.automatio.es</code>).</p>
                <p>Si recibes esto, el envío de facturas por email ya funciona correctamente. 🎉</p>
                <br>
                <p style="color: #888; font-size: 12px;">
                    Automatio solutions S.L · info@automatio.es
                </p>
            </div>
        </div>`,
    });

    console.log("✅ Email sent! MessageId:", info.messageId);
}

main().catch(console.error);
