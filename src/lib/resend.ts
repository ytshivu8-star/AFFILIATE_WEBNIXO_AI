// Resend email integration for OTP verification codes
export interface SendEmailResponse {
  success: boolean;
  messageId?: string;
  error?: string;
  corsBlocked?: boolean;
}

/**
 * Sends a real email with the OTP code by proxying through our server-side API.
 * This secures the API key and completely circumvents browser CORS blocks.
 */
export const sendOTPEmail = async (
  toEmail: string,
  otpCode: string,
  purpose: 'register' | 'forgot_password'
): Promise<SendEmailResponse> => {
  try {
    const response = await fetch("/api/send-otp", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        toEmail,
        otpCode,
        purpose,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      return { success: true, messageId: data.messageId };
    } else {
      const errData = await response.json().catch(() => ({ error: "Failed to parse error response" }));
      return { success: false, error: errData.error || `HTTP ${response.status}` };
    }
  } catch (err: any) {
    console.warn("Error calling /api/send-otp:", err);
    return { 
      success: false, 
      error: err?.message || "Server connection error"
    };
  }
};
