import React, { useState } from 'react';
import { User, Shield, Key, Check, AlertCircle, Info, Sparkles } from 'lucide-react';
import { UserProfile } from '../types';

interface ProfileSettingsProps {
  user: UserProfile;
  onUpdateUser: (data: Partial<UserProfile>) => void;
}

export default function ProfileSettings({ user, onUpdateUser }: ProfileSettingsProps) {
  const [fullName, setFullName] = useState(user.fullName || '');
  const [phone, setPhone] = useState(user.phone || '');
  const [companyName, setCompanyName] = useState(user.companyName || '');
  const [website, setWebsite] = useState(user.website || '');
  const [country, setCountry] = useState(user.country || '');
  
  // Mock password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [profileSuccess, setProfileSuccess] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  const handleProfileSave = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateUser({
      fullName,
      phone,
      companyName,
      website,
      country
    });
    setProfileSuccess(true);
    setTimeout(() => setProfileSuccess(false), 3000);
  };

  const handlePasswordSave = (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess(false);

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError('Please fill in all password fields');
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters long');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }

    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setPasswordSuccess(true);
    setTimeout(() => setPasswordSuccess(false), 3000);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6" id="profile-settings-tab">
      <div className="space-y-1.5">
        <h3 className="text-xl font-bold text-slate-900">Account Settings</h3>
        <p className="text-xs text-slate-500">
          Manage your personal settings, password configuration, and partner identity.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Hand: Quick Navigation / Summary Card */}
        <div className="md:col-span-1 space-y-4">
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm text-center space-y-4">
            <div className="mx-auto h-16 w-16 bg-indigo-50 border border-indigo-100 rounded-full flex items-center justify-center text-indigo-600 font-bold text-xl uppercase shadow-inner">
              {fullName ? fullName.slice(0, 2) : 'A'}
            </div>
            <div>
              <h4 className="font-bold text-slate-900 text-sm">{fullName || 'Affiliate Partner'}</h4>
              <p className="text-[10px] font-mono text-slate-400 mt-0.5">{user.email}</p>
            </div>
            <div className="pt-2 border-t border-slate-50">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-indigo-50 text-indigo-700 rounded-full text-[10px] font-bold">
                <Sparkles className="h-3 w-3" />
                Active Partner
              </span>
              <p className="text-[9px] text-slate-400 mt-2">Joined {user.joinedAt || '2026'}</p>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 text-white shadow-sm space-y-2">
            <h5 className="text-xs font-bold uppercase tracking-wider text-indigo-400">Security Note</h5>
            <p className="text-[10px] text-slate-300 leading-relaxed">
              We encrypt payout databases. Your account complies with standard anti-fraud policies. To modify your registered bank details, use the Payout Config tab.
            </p>
          </div>
        </div>

        {/* Right Hand: Editing Forms */}
        <div className="md:col-span-2 space-y-6">
          {/* Form 1: Profile Information */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm space-y-4">
            <h4 className="font-bold text-slate-900 text-sm flex items-center gap-1.5 border-b border-slate-50 pb-2">
              <User className="h-4 w-4 text-indigo-500" />
              Personal Profile Info
            </h4>

            <form onSubmit={handleProfileSave} className="space-y-4">
              {profileSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-xs flex items-center gap-2 font-semibold">
                  <Check className="h-4 w-4 shrink-0" />
                  Your profile has been saved!
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                  Full Name
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full bg-white border border-slate-200 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium text-slate-800"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                    Contact Phone
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-white border border-slate-200 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-700"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                    Country
                  </label>
                  <input
                    type="text"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    className="w-full bg-white border border-slate-200 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-700"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                    Company Name
                  </label>
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="w-full bg-white border border-slate-200 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-700"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                    Website URL
                  </label>
                  <input
                    type="text"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    className="w-full bg-white border border-slate-200 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-700"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm py-2.5 rounded-xl transition-all shadow-sm cursor-pointer"
                id="save-profile-btn"
              >
                Save Profile Details
              </button>
            </form>
          </div>

          {/* Form 2: Password Change */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm space-y-4">
            <h4 className="font-bold text-slate-900 text-sm flex items-center gap-1.5 border-b border-slate-50 pb-2">
              <Key className="h-4 w-4 text-indigo-500" />
              Update Account Password
            </h4>

            <form onSubmit={handlePasswordSave} className="space-y-4">
              {passwordError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-600 rounded-xl text-xs flex items-center gap-2 font-medium">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {passwordError}
                </div>
              )}

              {passwordSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-xs flex items-center gap-2 font-semibold">
                  <Check className="h-4 w-4 shrink-0" />
                  Password updated successfully!
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                  Current Password
                </label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full bg-white border border-slate-200 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono text-slate-700"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                    New Password
                  </label>
                  <input
                    type="password"
                    placeholder="Min 6 characters"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full bg-white border border-slate-200 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono text-slate-700"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    placeholder="Confirm new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full bg-white border border-slate-200 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono text-slate-700"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm py-2.5 rounded-xl transition-all shadow-sm cursor-pointer"
                id="update-password-btn"
              >
                Change Password
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
