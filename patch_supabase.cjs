const fs = require('fs');
let code = fs.readFileSync('src/lib/supabase.ts', 'utf-8');

// Replace verifyOTPFromSupabase
const verifyRegex = /export const verifyOTPFromSupabase = async \([\s\S]*?\} catch \(err\) \{[\s\S]*?return \{ success: false, error: err[^}]* \};\n  \}\n\};/m;
const newVerify = `export const verifyOTPFromSupabase = async (
  email: string,
  otpCode: string,
  purpose: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const res = await fetch("/api/auth/verify-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, otpCode, purpose })
    });
    const data = await res.json();
    if (!res.ok) return { success: false, error: data.error || "Verification failed" };
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
};`;

code = code.replace(verifyRegex, newVerify);

// Append rate limits SQL to getSQLInitializationScript
const sqlInjection = `
-- 6. Create Rate Limits Table (using settings table for this feature instead to avoid DDL issues)
`;
// Wait, I am using the settings table so I don't need to append anything!

fs.writeFileSync('src/lib/supabase.ts', code);
