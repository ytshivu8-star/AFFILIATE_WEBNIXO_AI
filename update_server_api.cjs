const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf-8');

const profileRegex = /app\.post\("\/api\/user\/profile", async \(req, res\) => \{[\s\S]*?res\.json\(\{ success: true \}\);\n\}\);/;
const newProfile = `app.post("/api/user/profile", async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: "Missing authorization header" });
  if (!supabaseAdmin) return res.status(500).json({ error: "Internal server error" });

  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
  if (authError || !user) return res.status(401).json({ error: "Invalid token" });

  const { profile, payoutDetails } = req.body;
  if (!profile || typeof profile !== 'object' || !payoutDetails || typeof payoutDetails !== 'object') {
     return res.status(400).json({ error: "Invalid payload" });
  }

  if (profile.email !== user.email) {
    return res.status(403).json({ error: "Cannot modify another user's profile" });
  }

  // Sanitize updates to prevent tampering with sensitive fields like stats or is_admin
  const updateData = {
    full_name: typeof profile.fullName === 'string' ? profile.fullName.slice(0, 100) : '',
    phone: typeof profile.phone === 'string' ? profile.phone.slice(0, 20) : '',
    company_name: typeof profile.companyName === 'string' ? profile.companyName.slice(0, 100) : '',
    website: typeof profile.website === 'string' ? profile.website.slice(0, 200) : '',
    promo_strategy: typeof profile.promoStrategy === 'string' ? profile.promoStrategy.slice(0, 1000) : '',
    country: typeof profile.country === 'string' ? profile.country.slice(0, 50) : '',
    custom_coupon_code: typeof profile.customCouponCode === 'string' ? profile.customCouponCode.slice(0, 50) : '',
    payout_details: typeof payoutDetails === 'object' ? payoutDetails : {},
    updated_at: new Date().toISOString()
  };

  const { error } = await supabaseAdmin.from('webnixo_profiles_affilate').update(updateData).eq('email', user.email);
  if (error) { console.error(error.message); return res.status(500).json({ error: "Internal server error" }); }
  
  res.json({ success: true });
});`;
code = code.replace(profileRegex, newProfile);

const settingsSyncRegex = /app\.post\("\/api\/admin\/settings\/sync", requireAdmin, async \(req, res\) => \{[\s\S]*?res\.json\(\{ success: true \}\);\n\}\);/;
const newSettingsSync = `app.post("/api/admin/settings/sync", requireAdmin, async (req, res) => {
  const { upserts } = req.body;
  if (!Array.isArray(upserts) || upserts.length > 50) return res.status(400).json({ error: "Invalid payload" });
  const { error } = await supabaseAdmin.from('webnixo_settings_affilate').upsert(upserts);
  if (error) { console.error(error.message); return res.status(500).json({ error: "Internal server error" }); }
  res.json({ success: true });
});`;
code = code.replace(settingsSyncRegex, newSettingsSync);

const adminProfilesRegex = /app\.get\("\/api\/admin\/profiles", requireAdmin, async \(req, res\) => \{[\s\S]*?res\.json\(\{ profiles: data \}\);\n\}\);/;
const newAdminProfiles = `app.get("/api/admin/profiles", requireAdmin, async (req, res) => {
  const { data, error } = await supabaseAdmin.from('webnixo_profiles_affilate').select('*').order('joined_at', { ascending: false });
  if (error) { console.error(error.message); return res.status(500).json({ error: "Internal server error" }); }
  res.json({ profiles: data });
});`;
code = code.replace(adminProfilesRegex, newAdminProfiles);

const adminPayoutsSyncRegex = /app\.post\("\/api\/admin\/payouts\/sync", requireAdmin, async \(req, res\) => \{[\s\S]*?res\.json\(\{ success: true \}\);\n\}\);/;
const newAdminPayoutsSync = `app.post("/api/admin/payouts/sync", requireAdmin, async (req, res) => {
  const { email, payouts } = req.body;
  if (!email || !Array.isArray(payouts)) return res.status(400).json({ error: "Invalid payload" });
  const { error } = await supabaseAdmin.from('webnixo_payout_history_affilate').upsert(payouts);
  if (error) { console.error(error.message); return res.status(500).json({ error: "Internal server error" }); }
  res.json({ success: true });
});`;
code = code.replace(adminPayoutsSyncRegex, newAdminPayoutsSync);

const adminPayoutsRegex = /app\.get\("\/api\/admin\/payouts", requireAdmin, async \(req, res\) => \{[\s\S]*?res\.json\(\{ payouts: data \}\);\n\}\);/;
const newAdminPayouts = `app.get("/api/admin/payouts", requireAdmin, async (req, res) => {
  const { data, error } = await supabaseAdmin.from('webnixo_payout_history_affilate').select('*').order('created_at', { ascending: false });
  if (error) { console.error(error.message); return res.status(500).json({ error: "Internal server error" }); }
  res.json({ payouts: data });
});`;
code = code.replace(adminPayoutsRegex, newAdminPayouts);

const adminPlanRegex = /app\.post\("\/api\/admin\/subscription-plans", requireAdmin, async \(req, res\) => \{[\s\S]*?res\.json\(\{ success: true \}\);\n\}\);/;
const newAdminPlan = `app.post("/api/admin/subscription-plans", requireAdmin, async (req, res) => {
  const plan = req.body;
  if (!plan || typeof plan !== 'object') return res.status(400).json({ error: "Invalid payload" });
  const { error } = await supabaseAdmin.from('subscription_plans').upsert(plan);
  if (error) { console.error(error.message); return res.status(500).json({ error: "Internal server error" }); }
  res.json({ success: true });
});`;
code = code.replace(adminPlanRegex, newAdminPlan);

const adminProfileUpdateRegex = /app\.post\("\/api\/admin\/profiles\/update", requireAdmin, async \(req, res\) => \{[\s\S]*?res\.json\(\{ success: true \}\);\n\}\);/;
const newAdminProfileUpdate = `app.post("/api/admin/profiles/update", requireAdmin, async (req, res) => {
  const { email, data } = req.body;
  if (!email || !data || typeof data !== 'object') return res.status(400).json({ error: "Invalid payload" });
  const { error } = await supabaseAdmin.from('webnixo_profiles_affilate').update(data).eq('email', email);
  if (error) { console.error(error.message); return res.status(500).json({ error: "Internal server error" }); }
  res.json({ success: true });
});`;
code = code.replace(adminProfileUpdateRegex, newAdminProfileUpdate);

fs.writeFileSync('server.ts', code);
