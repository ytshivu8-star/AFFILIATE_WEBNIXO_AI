const fs = require('fs');
let code = fs.readFileSync('src/components/AffiliateRegistration.tsx', 'utf-8');

if (!code.includes('Turnstile')) {
  // Add import
  code = code.replace("import { UserProfile } from '../types';", "import { UserProfile } from '../types';\\nimport { Turnstile, TurnstileInstance } from '@marsidev/react-turnstile';\\nimport { useRef, useState } from 'react';");
  
  // Add state to component
  code = code.replace("export default function AffiliateRegistration({ user, setUser, onComplete }: AffiliateRegistrationProps) {", "export default function AffiliateRegistration({ user, setUser, onComplete }: AffiliateRegistrationProps) {\\n  const [turnstileToken, setTurnstileToken] = useState<string>('');\\n  const turnstileRef = useRef<TurnstileInstance>(null);");
  
  // Add logic to handleSubmit
  code = code.replace("const handleSubmit = async (e: React.FormEvent) => {\\n    e.preventDefault();", "const handleSubmit = async (e: React.FormEvent) => {\\n    e.preventDefault();\\n    if (!turnstileToken) { alert('Please complete the security check.'); return; }");
  
  // Add Turnstile UI just before the submit button
  code = code.replace('<button\\n              type="submit"', '<div className="flex justify-center my-4">\\n                <Turnstile siteKey="0x4AAAAAAD0Yhl8ycnaCVDbt" onSuccess={setTurnstileToken} ref={turnstileRef} />\\n              </div>\\n              <button\\n              type="submit"');
  
  // We should also reset Turnstile on error/success, but since onComplete hides the form, we can just reset on error if we want.
  // Actually, AffiliateRegistration is completely frontend currently in the provided snippet. If there is an API call for it, we should add turnstileToken to it.
}

fs.writeFileSync('src/components/AffiliateRegistration.tsx', code);
