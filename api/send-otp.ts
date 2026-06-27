import type { IncomingMessage, ServerResponse } from "http";

// Utility to parse JSON body from Node.js requests
const parseJsonBody = (req: IncomingMessage): Promise<any> => {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk.toString();
    });
    req.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (e) {
        reject(new Error("Invalid JSON body"));
      }
    });
    req.on("error", (err) => reject(err));
  });
};

export default async function handler(req: IncomingMessage & { body?: any }, res: ServerResponse) {
  // Set CORS headers
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS,PATCH,DELETE,POST,PUT");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version"
  );

  if (req.method === "OPTIONS") {
    res.statusCode = 200;
    res.end();
    return;
  }

  if (req.method !== "POST") {
    res.statusCode = 405;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ success: false, error: "Method Not Allowed" }));
    return;
  }

  try {
    // Parse JSON body if not already parsed (some environments auto-parse)
    const body = req.body || (await parseJsonBody(req).catch(() => ({})));
    const { toEmail, otpCode, purpose } = body;

    if (!toEmail || !otpCode || !purpose) {
      res.statusCode = 400;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ success: false, error: "Missing required fields (toEmail, otpCode, purpose)" }));
      return;
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

    // Auto-fallback 1: Strip display name if 422 validation error
    if (resendResponse.status === 422 && fromEmail.includes("<")) {
      const emailMatch = fromEmail.match(/<([^>]+)>/);
      if (emailMatch && emailMatch[1]) {
        const rawEmailOnly = emailMatch[1].trim();
        resendResponse = await sendWithFrom(rawEmailOnly);
      }
    }

    // Auto-fallback 2: Fallback to onboarding sandbox
    if (resendResponse.status === 422 && !fromEmail.includes("onboarding@resend.dev")) {
      resendResponse = await sendWithFrom("WEBNIXO AI <onboarding@resend.dev>");
    }

    if (resendResponse.ok) {
      const resData = await resendResponse.json();
      res.statusCode = 200;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ success: true, messageId: resData.id }));
      return;
    } else {
      const errText = await resendResponse.text();
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
        // Not JSON
      }
      res.statusCode = 422;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ success: false, error: parsedError }));
      return;
    }
  } catch (err: any) {
    console.error("Error in serverless API send-otp:", err);
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ success: false, error: err?.message || "Internal server error" }));
    return;
  }
}
