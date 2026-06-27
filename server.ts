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

// API: Check Resend connection and configuration status
app.get("/api/resend-status", (req, res) => {
  let rawApiKey = (process.env.VITE_RESEND_API_KEY || process.env.RESEND_API_KEY || "re_KANKrYPv_NCYbaoLUnEauu2TbhyCnnMKj").trim();
  rawApiKey = rawApiKey.replace(/^["']|["']$/g, "").trim();

  let rawFromEmail = (process.env.VITE_RESEND_FROM_EMAIL || process.env.RESEND_FROM_EMAIL || "").trim();
  rawFromEmail = rawFromEmail.replace(/^["']|["']$/g, "").trim();

  const isCustomKey = rawApiKey !== "re_KANKrYPv_NCYbaoLUnEauu2TbhyCnnMKj" && rawApiKey.length > 10;
  
  let fromEmail = "WEBNIXO AI <onboarding@resend.dev>";
  if (rawFromEmail) {
    fromEmail = rawFromEmail;
  } else if (isCustomKey) {
    fromEmail = "WEBNIXO AI <no-reply@auth.webnixo.in>";
  }

  // Mask the API Key for security: re_abcd...wxyz
  let maskedKey = "None";
  if (isCustomKey) {
    if (rawApiKey.length > 8) {
      maskedKey = `${rawApiKey.substring(0, 5)}...${rawApiKey.substring(rawApiKey.length - 4)}`;
    } else {
      maskedKey = "Custom key (too short)";
    }
  } else {
    maskedKey = "Default demo key";
  }

  res.json({
    isCustomKey,
    maskedKey,
    fromEmail,
  });
});

// API: Send OTP email proxy route (Server-side bypasses browser CORS and secures the API Key)
app.post("/api/send-otp", async (req, res) => {
  try {
    const { toEmail, otpCode, purpose } = req.body;

    if (!toEmail || !otpCode || !purpose) {
      return res.status(400).json({ success: false, error: "Missing required fields (toEmail, otpCode, purpose)" });
    }

    let rawApiKey = (process.env.VITE_RESEND_API_KEY || process.env.RESEND_API_KEY || "re_KANKrYPv_NCYbaoLUnEauu2TbhyCnnMKj").trim();
    rawApiKey = rawApiKey.replace(/^["']|["']$/g, "").trim();

    let rawFromEmail = (process.env.VITE_RESEND_FROM_EMAIL || process.env.RESEND_FROM_EMAIL || "").trim();
    rawFromEmail = rawFromEmail.replace(/^["']|["']$/g, "").trim();

    // Determine the sender email
    let fromEmail = "WEBNIXO AI <onboarding@resend.dev>";
    if (rawFromEmail) {
      fromEmail = rawFromEmail;
    } else if (rawApiKey !== "re_KANKrYPv_NCYbaoLUnEauu2TbhyCnnMKj") {
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

    const sendWithFrom = async (fromAddress: string) => {
      console.log(`Sending OTP Email via Resend. From: "${fromAddress}" | To: "${toEmail}" | Purpose: "${purpose}"`);
      return await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${rawApiKey}`,
        },
        body: JSON.stringify({
          from: fromAddress,
          to: [toEmail],
          subject: subject,
          html: htmlBody,
        }),
      });
    };

    let resendResponse = await sendWithFrom(fromEmail);

    // Auto-fallback 1: If 422 validation error and display name was used, strip display name and try raw email
    if (resendResponse.status === 422 && fromEmail.includes("<")) {
      const emailMatch = fromEmail.match(/<([^>]+)>/);
      if (emailMatch && emailMatch[1]) {
        const rawEmailOnly = emailMatch[1].trim();
        console.warn(`Resend 422 validation error with display name. Retrying with raw email only: "${rawEmailOnly}"`);
        resendResponse = await sendWithFrom(rawEmailOnly);
      }
    }

    // Auto-fallback 2: If still 422 and we are using a custom domain, try falling back to onboarding@resend.dev sandbox address
    // just in case they haven't finished verifying the domain in their Resend dashboard
    if (resendResponse.status === 422 && !fromEmail.includes("onboarding@resend.dev")) {
      console.warn(`Resend 422 validation error with custom domain. Retrying with onboarding@resend.dev sandbox address`);
      resendResponse = await sendWithFrom("WEBNIXO AI <onboarding@resend.dev>");
    }

    if (resendResponse.ok) {
      const resData = await resendResponse.json();
      return res.json({ success: true, messageId: resData.id });
    } else {
      const errText = await resendResponse.text();
      console.error("Resend API returned error after all fallback attempts:", errText);
      
      let parsedError = errText;
      try {
        const jsonErr = JSON.parse(errText);
        if (jsonErr) {
          if (jsonErr.message) {
            parsedError = jsonErr.message;
          } else if (jsonErr.error && typeof jsonErr.error === 'object' && jsonErr.error.message) {
            parsedError = jsonErr.error.message;
          } else if (jsonErr.error && typeof jsonErr.error === 'string') {
            parsedError = jsonErr.error;
          } else if (jsonErr.description) {
            parsedError = jsonErr.description;
          } else if (jsonErr.name) {
            parsedError = `${jsonErr.name}${jsonErr.message ? ': ' + jsonErr.message : ''}`;
          }
        }
      } catch (e) {
        // Fallback to raw response text if not valid JSON
      }
      
      return res.status(422).json({ success: false, error: parsedError });
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

    // Dynamic catch-all router for SPA page refreshes in development mode
    app.get("*", async (req, res, next) => {
      if (req.originalUrl.startsWith("/api")) {
        return next();
      }
      try {
        const fs = await import("fs");
        const templatePath = path.resolve(process.cwd(), "index.html");
        let html = fs.readFileSync(templatePath, "utf-8");
        html = await vite.transformIndexHtml(req.originalUrl, html);
        res.status(200).set({ "Content-Type": "text/html" }).end(html);
      } catch (e) {
        next(e);
      }
    });
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
