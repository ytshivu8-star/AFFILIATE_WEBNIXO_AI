const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

// Update Tab Switch Statements
const oldTabs = `          {activeTab === 'dashboard' && (isAdminMode ? <div>Admin Dashboard (Select Admin Portal Tab)</div> : <Dashboard user={user} stats={stats} chartData={chartData} events={events} />)}
          {activeTab === 'leaderboard' && <Leaderboard user={user} leaderboard={leaderboard} />}
          {activeTab === 'resources' && <MarketingResources user={user} />}
          {activeTab === 'payout' && <PayoutDetailsComponent user={user} payout={payout} setPayout={setPayout} payoutHistory={payoutHistory} saveState={() => {}} />}
          {activeTab === 'profile' && <ProfileSettings user={user} setUser={setUser} saveState={() => {}} />}
          {activeTab === 'terms' && <TermsAndConditions />}
          {activeTab === 'admin' && isAdminMode && <AdminPortal />}`;

const newTabs = `          {activeTab === 'dashboard' && (isAdminMode ? <div>Admin Dashboard (Select Admin Portal Tab)</div> : <Dashboard user={user} stats={stats} chartData={chartData} events={events} onUpdateUser={(data) => setUser({ ...user, ...data })} onNavigate={setActiveTab as any} />)}
          {activeTab === 'leaderboard' && <Leaderboard user={user} leaderboard={leaderboard} />}
          {activeTab === 'resources' && <MarketingResources referralCode={user.referralCode} />}
          {activeTab === 'payout' && <PayoutDetailsComponent initialDetails={payout} onSave={setPayout} unpaidCommission={stats.unpaidCommission} payoutHistory={payoutHistory} onRequestPayout={() => alert("Payout request submitted. WEBNIXO team will process it shortly.")} />}
          {activeTab === 'profile' && <ProfileSettings user={user} onUpdateUser={(data) => setUser({ ...user, ...data })} />}
          {activeTab === 'terms' && <TermsAndConditions />}
          {activeTab === 'admin' && isAdminMode && <AdminPortal />}`;

code = code.replace(oldTabs, newTabs);

// Update login screen background and logo presentation
const oldLoginStart = `  if (!isLoggedIn) {
    return (
      <div className="min-h-screen flex bg-slate-50">
        {/* Left Side Visual Panel */}
        <div className="hidden lg:flex lg:w-[45%] relative overflow-hidden bg-slate-900">`;

// Let's replace the whole login block up to the </form> tags if needed, or simply replace the wrapper.
// Instead of replacing just a string, let's inject a complete new login design that uses a background image.

fs.writeFileSync('src/App.tsx', code);
