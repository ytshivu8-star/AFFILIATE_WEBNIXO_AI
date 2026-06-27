import type { IncomingMessage, ServerResponse } from "http";

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  // Set CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.statusCode = 200;
    res.end();
    return;
  }

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

  res.statusCode = 200;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify({
    isCustomKey,
    maskedKey,
    fromEmail,
  }));
}
