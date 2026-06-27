import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";

// Load environment variables
dotenv.config();

const app = express();
const PORT = 3000;

// Middleware for parsing JSON requests
app.use(express.json());

// API: Send OTP email proxy route (Server-side bypasses browser CORS and secures the API Key)
app.post("/api/send-otp", async (req, res) => {
  try {
    const { toEmail, otpCode, purpose } = req.body;

    if (!toEmail || !otpCode || !purpose) {
      return res.status(400).json({ success: false, error: "Missing required fields (toEmail, otpCode, purpose)" });
    }

    const apiKey = process.env.VITE_RESEND_API_KEY || process.env.RESEND_API_KEY || "re_KANKrYPv_NCYbaoLUnEauu2TbhyCnnMKj";
    const fromEmailOverride = process.env.VITE_RESEND_FROM_EMAIL || process.env.RESEND_FROM_EMAIL;

    // Determine the sender email
    let fromEmail = "WEBNIXO AI <onboarding@resend.dev>";
    if (fromEmailOverride) {
      fromEmail = fromEmailOverride;
    } else if (apiKey !== "re_KANKrYPv_NCYbaoLUnEauu2TbhyCnnMKj") {
      // If they provided their own key and haven't explicitly set a custom from email,
      // default to their verified domain auth.webnixo.in!
      fromEmail = "WEBNIXO AI <no-reply@auth.webnixo.in>";
    }

    const subject = purpose === 'register' 
      ? `[WEBNIXO AI] Confirm Your Affiliate Registration` 
      : `[WEBNIXO AI] Reset Your Affiliate Account Password`;

    const htmlBody = `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 550px; margin: 0 auto; padding: 30px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff; color: #1e293b;">
        <div style="text-align: center; margin-bottom: 25px;">
          <h2 style="color: #4f46e5; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">WEBNIXO AI</h2>
          <p style="color: #64748b; font-size: 12px; margin-top: 5px; text-transform: uppercase; tracking: 1px;">Affiliate Partner Network</p>
        </div>
        
        <div style="border-top: 1px solid #f1f5f9; padding-top: 20px;">
          <p style="font-size: 15px; line-height: 1.6; color: #334155;">Hello,</p>
          <p style="font-size: 15px; line-height: 1.6; color: #334155;">
            ${purpose === 'register' 
              ? 'Thank you for registering to join the WEBNIXO AI Affiliate Partner network. To complete your account verification, please use the 6-digit verification code below:' 
              : 'We received a request to reset the password for your WEBNIXO AI Affiliate Partner account. Use the 6-digit security code below to set a new password:'}
          </p>
          
          <div style="text-align: center; margin: 30px 0;">
            <div style="display: inline-block; background-color: #f5f3ff; border: 2px dashed #818cf8; border-radius: 12px; padding: 15px 35px; font-size: 32px; font-weight: 800; letter-spacing: 5px; color: #4f46e5;">
              ${otpCode}
            </div>
            <p style="font-size: 11px; color: #94a3b8; margin-top: 10px;">This security code is valid for the next 10 minutes.</p>
          </div>
          
          <p style="font-size: 14px; line-height: 1.6; color: #64748b; margin-top: 25px;">
            If you did not make this request, you can safely ignore this email.
          </p>
        </div>
        
        <div style="border-top: 1px solid #f1f5f9; margin-top: 30px; padding-top: 15px; text-align: center;">
          <p style="font-size: 11px; color: #94a3b8; margin: 0;">&copy; 2026 WEBNIXO AI Partner Network. All rights reserved.</p>
          <p style="font-size: 9px; color: #cbd5e1; margin-top: 5px;">Sent securely via Resend API.</p>
        </div>
      </div>
    `;

    console.log(`Sending OTP Email via Resend. From: "${fromEmail}" | To: "${toEmail}" | Purpose: "${purpose}"`);

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [toEmail],
        subject: subject,
        html: htmlBody,
      }),
    });

    if (resendResponse.ok) {
      const resData = await resendResponse.json();
      return res.json({ success: true, messageId: resData.id });
    } else {
      const errText = await resendResponse.text();
      console.error("Resend API returned error:", errText);
      return res.status(500).json({ success: false, error: errText });
    }
  } catch (err: any) {
    console.error("Error in /api/send-otp endpoint:", err);
    return res.status(500).json({ success: false, error: err?.message || "Internal server error" });
  }
});

// Setup Vite or Static File serving depending on environment
async function init() {
  if (process.env.NODE_ENV !== "production") {
    console.log("Starting development mode with Vite middleware...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Starting production mode serving static dist files...");
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Full-stack server running on http://localhost:${PORT}`);
  });
}

init();
