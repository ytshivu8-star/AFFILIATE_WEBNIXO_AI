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
      const responseText = await response.text().catch(() => "");
      let errorMessage = `HTTP ${response.status}`;
      try {
        const errData = JSON.parse(responseText);
        if (errData && errData.error) {
          errorMessage = errData.error;
        } else if (errData && errData.message) {
          errorMessage = errData.message;
        }
      } catch (e) {
        // Not valid JSON
        const trimmedText = responseText.trim();
        if (trimmedText.startsWith("<!DOCTYPE") || trimmedText.startsWith("<html") || trimmedText.includes("<body") || trimmedText.includes("NOT_FOUND")) {
          errorMessage = `Hosting Routing Error (Vercel returned a 404 NOT_FOUND page). 
This means your serverless api route is not active or hasn't finished deploying. 
Please ensure you have set your RESEND_API_KEY and VITE_RESEND_FROM_EMAIL inside your Vercel Project Dashboard under "Settings" -> "Environment Variables", and redeployed your Vercel project to activate the functions.`;
        } else if (trimmedText) {
          errorMessage = trimmedText.substring(0, 150);
        } else {
          errorMessage = `HTTP ${response.status}: Empty error response from server`;
        }
      }
      return { success: false, error: errorMessage };
    }
  } catch (err: any) {
    console.warn("Error calling /api/send-otp:", err);
    return { 
      success: false, 
      error: err?.message || "Server connection error"
    };
  }
};
