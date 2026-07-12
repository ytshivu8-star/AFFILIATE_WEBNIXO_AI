const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

// 1. Rewrite handleAuth
const oldAuthStart = code.indexOf('const handleAuth = async (e: React.FormEvent) => {');
const oldAuthEnd = code.indexOf('const handleGoogleSignIn = () => {');
const oldAuthContent = code.slice(oldAuthStart, oldAuthEnd);

const newAuthContent = `const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!turnstileToken) {
      alert("Please complete the security check.");
      return;
    }
    
    // Check for admin credentials
    const storedAdminPass = localStorage.getItem('webnixo_admin_password') || '123456';
    const cleanEmail = emailInput.trim();

    if (cleanEmail === 'shiva@webnixo.in' && passwordInput === storedAdminPass) {
      setIsAdminMode(true);
      setIsLoggedIn(true);
      localStorage.setItem('wwebnixo_isAdmin', 'true');
      localStorage.setItem('wwebnixo_isLoggedIn', 'true');
      resetTurnstile();
      return;
    }

    if (cleanEmail && passwordInput.length >= 6) {
      if (authMode === 'signup') {
        const signupRes = await fetch('/api/auth/signup', { 
          method: 'POST', 
          headers: { 'Content-Type': 'application/json' }, 
          body: JSON.stringify({ email: cleanEmail, turnstileToken }) 
        });
        if (!signupRes.ok) {
          const errData = await signupRes.json();
          alert(errData.error || "Signup blocked.");
          resetTurnstile();
          return;
        }
        
        // Trigger registration OTP verification
        setVerificationMode('signup_otp');
        handleSendOTP(cleanEmail, 'register', turnstileToken);
        resetTurnstile();
        return;
      }

      const password = passwordInput;
      
      const authenticateUser = async () => {
        let finalUser: UserProfile = {
          id: user.id || \`user_\${Math.floor(1000 + Math.random() * 9000)}\`,
          email: cleanEmail,
          password: password,
          fullName: user.fullName || cleanEmail.split('@')[0],
          phone: user.phone || '',
          companyName: user.companyName || '',
          website: user.website || '',
          promoStrategy: user.promoStrategy || '',
          country: user.country || 'India',
          isRegisteredAffiliate: false,
          referralCode: user.referralCode || '',
          joinedAt: user.joinedAt || new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
        };
        let finalStats = stats;
        let finalPayout = payout;
        let finalEvents = events;
        let finalHistory = payoutHistory;

        if (isSupabaseConfigured()) {
          try {
            const loginRes = await fetch('/api/auth/login', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email: cleanEmail, password: password, turnstileToken })
            });
            if (!loginRes.ok) {
              const errData = await loginRes.json();
              alert(errData.error || "Login failed");
              resetTurnstile();
              return;
            }
            
            const remoteData = await loadProfileFromSupabase(cleanEmail);
            if (remoteData) {
              finalUser = remoteData.profile;
              finalStats = remoteData.stats;
              finalPayout = remoteData.payout;
              const remoteEvents = await loadEventsFromSupabase(cleanEmail);
              if (remoteEvents) finalEvents = remoteEvents;
              const remotePayouts = await loadPayoutsFromSupabase(cleanEmail);
              if (remotePayouts) finalHistory = remotePayouts;
              
              localStorage.setItem('webnixo_user', JSON.stringify(finalUser));
            } else {
              alert("No affiliate account found with this email on Supabase. Please sign up.");
              resetTurnstile();
              return;
            }
          } catch (err: any) {
            console.error("Supabase auth error:", err);
            resetTurnstile();
            return;
          }
        } else {
          // Local storage check
          const globalUsersStr = localStorage.getItem('webnixo_global_users');
          if (globalUsersStr) {
            const globalUsersList: any[] = JSON.parse(globalUsersStr);
            const foundUser = globalUsersList.find(u => u.email === cleanEmail);
            if (foundUser) {
              if (foundUser.password !== password) {
                alert("The password entered is incorrect.");
                resetTurnstile();
                return;
              }
              finalUser = { ...finalUser, ...foundUser };
            } else {
              alert("No affiliate account found locally. Please sign up.");
              resetTurnstile();
              return;
            }
          } else {
            if (cleanEmail !== user.email || password !== user.password) {
              alert("No local fallback account found. Please sign up.");
              resetTurnstile();
              return;
            }
          }
        }

        setUser(finalUser);
        setStats(finalStats);
        setPayout(finalPayout);
        setEvents(finalEvents);
        setPayoutHistory(finalHistory);
        setIsLoggedIn(true);
        localStorage.setItem('wwebnixo_isLoggedIn', 'true');
        resetTurnstile();
      };
      
      authenticateUser();
    }
  };
`;
code = code.replace(oldAuthContent, newAuthContent + '\n  ');


// 2. Rewrite handleSendOTP
const oldSendOTPStart = code.indexOf('const handleSendOTP = async (email: string, purpose: \'register\' | \'forgot_password\') => {');
const oldSendOTPEnd = code.indexOf('const [activeTab, setActiveTab] = useState');
const oldSendOTPContent = code.slice(oldSendOTPStart, oldSendOTPEnd);

const newSendOTPContent = `const handleSendOTP = async (email: string, purpose: 'register' | 'forgot_password', currentTurnstileToken?: string) => {
    setOtpLoading(true);
    setOtpError('');
    setOtpStatusMsg('');
    const code = generateOTP();
    setOtpCode(code);
    
    // Simulate sending real email via server (with turnstile)
    try {
      const res = await fetch("/api/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          toEmail: email, 
          otpCode: code, 
          purpose,
          turnstileToken: currentTurnstileToken || turnstileToken 
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setOtpStatusMsg("Verification email sent securely.");
      } else {
        console.error("Failed to send OTP email:", data.error);
        if (data.error && data.error.includes("Turnstile")) {
          setOtpError("Security check failed. Please refresh the page and try again.");
        } else {
          setBackupOtpDelivery({
            visible: true,
            otp: code,
            type: 'simulated',
            email
          });
          setOtpError("Email delivery system failed. We've provided your code locally as a fallback.");
        }
      }
    } catch (err: any) {
      console.error("Error calling /api/send-otp", err);
      setBackupOtpDelivery({
        visible: true,
        otp: code,
        type: 'simulated',
        email
      });
      setOtpError("Network error. We've provided your code locally as a fallback.");
    }
    
    setResendCooldown(60);
    setOtpLoading(false);
  };
`;
code = code.replace(oldSendOTPContent, newSendOTPContent + '\n  ');


// 3. Rewrite completePasswordReset
const oldResetStart = code.indexOf('const completePasswordReset = async () => {');
const oldResetEnd = code.indexOf('return (', oldResetStart);
const oldResetContent = code.slice(oldResetStart, oldResetEnd);

const newResetContent = `const completePasswordReset = async () => {
    if (!turnstileToken) {
      setOtpError("Please complete the security check.");
      return;
    }
    if (newPasswordInput.length < 6) {
      setOtpError("Password must be at least 6 characters.");
      return;
    }
    if (newPasswordInput !== confirmNewPasswordInput) {
      setOtpError("Passwords do not match.");
      return;
    }

    const emailToReset = forgotEmailInput.trim();

    if (isSupabaseConfigured()) {
      try {
        const resetRes = await fetch('/api/auth/reset-password', { 
          method: 'POST', 
          headers: { 'Content-Type': 'application/json' }, 
          body: JSON.stringify({ email: emailToReset, password: newPasswordInput, turnstileToken }) 
        });
        if (!resetRes.ok) {
          const errData = await resetRes.json();
          setOtpError(errData.error || "Reset blocked");
          resetTurnstile();
          return;
        }
        const error = null; 
        if (error) {
          console.error("Supabase password reset error:", error);
        }
      } catch (err: any) {
         setOtpError(err.message);
         resetTurnstile();
         return;
      }
    } else {
        const globalUsersStr = localStorage.getItem('webnixo_global_users');
        if (globalUsersStr) {
          const globalUsersList: any[] = JSON.parse(globalUsersStr);
          const updatedGlobalUsers = globalUsersList.map(u => {
            if (u.email === emailToReset) {
              return { ...u, password: newPasswordInput };
            }
            return u;
          });
          localStorage.setItem('webnixo_global_users', JSON.stringify(updatedGlobalUsers));
        }
        if (user.email === emailToReset) {
          setUser(prev => ({ ...prev, password: newPasswordInput }));
        }
    }

    setVerificationMode('none');
    setAuthMode('login');
    setEmailInput(emailToReset);
    setPasswordInput(newPasswordInput);
    setOtpInput('');
    setOtpCode('');
    setNewPasswordInput('');
    setConfirmNewPasswordInput('');
    setBackupOtpDelivery(null);
    setOtpError('');
    setOtpStatusMsg('');
    resetTurnstile();
  };
`;
code = code.replace(oldResetContent, newResetContent + '\n  ');

fs.writeFileSync('src/App.tsx', code);
