// Resend email integration for OTP verification codes
const RESEND_API_KEY = ((import.meta as any).env?.VITE_RESEND_API_KEY as string) || "re_KANKrYPv_NCYbaoLUnEauu2TbhyCnnMKj";

export interface SendEmailResponse {
  success: boolean;
  messageId?: string;
  error?: string;
  corsBlocked?: boolean;
}

/**
 * Sends a real email with the OTP code using Resend's REST API.
 */
export const sendOTPEmail = async (
  toEmail: string,
  otpCode: string,
  purpose: 'register' | 'forgot_password'
): Promise<SendEmailResponse> => {
  try {
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

    // Resend's API endpoint is CORS-restricted on browsers, but let's try calling it.
    // In case the browser triggers CORS error, we fail gracefully to a simulated mode.
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "WEBNIXO AI <onboarding@resend.dev>",
        to: [toEmail],
        subject: subject,
        html: htmlBody,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      return { success: true, messageId: data.id };
    } else {
      const errText = await response.text();
      return { success: false, error: errText };
    }
  } catch (err: any) {
    console.warn("Resend API fetch error (likely browser CORS restriction):", err);
    return { 
      success: false, 
      error: err?.message || "CORS/Network restriction", 
      corsBlocked: true 
    };
  }
};
