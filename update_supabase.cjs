const fs = require('fs');
let code = fs.readFileSync('src/lib/supabase.ts', 'utf-8');

const oldVerify = /export const verifyOTPFromSupabase = async \([\s\S]*?\}\n\};\n/m;
const newVerify = `export const verifyOTPFromSupabase = async (
  email: string,
  otpCode: string,
  purpose: string,
  turnstileToken: string = ''
): Promise<{ success: boolean; error?: string }> => {
  try {
    const res = await fetch("/api/auth/verify-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, otpCode, purpose, turnstileToken })
    });
    const data = await res.json();
    if (!res.ok) return { success: false, error: data.error || "Verification failed" };
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
};
`;

code = code.replace(oldVerify, newVerify);
fs.writeFileSync('src/lib/supabase.ts', code);
