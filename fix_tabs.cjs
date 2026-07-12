const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

// Add Leaderboard and Terms buttons to sidebar
const sidebarResources = `<button onClick={() => setActiveTab('resources')} className={\\\`w-full text-left px-4 py-2 rounded-lg flex items-center gap-3 \${activeTab === 'resources' ? 'bg-indigo-600' : 'hover:bg-slate-800'}\\\`}><Sparkles size={18}/> Resources</button>`;
const newSidebar = `<button onClick={() => setActiveTab('leaderboard')} className={\`w-full text-left px-4 py-2 rounded-lg flex items-center gap-3 \${activeTab === 'leaderboard' ? 'bg-indigo-600' : 'hover:bg-slate-800'}\`}><Award size={18}/> Leaderboard</button>
              <button onClick={() => setActiveTab('resources')} className={\`w-full text-left px-4 py-2 rounded-lg flex items-center gap-3 \${activeTab === 'resources' ? 'bg-indigo-600' : 'hover:bg-slate-800'}\`}><Sparkles size={18}/> Resources</button>`;

code = code.replace(/<button onClick=\{\(\) => setActiveTab\('resources'\)\}.*?<\/button>/, newSidebar);

const profileBtn = `<button onClick={() => setActiveTab('profile')} className={\\\`w-full text-left px-4 py-2 rounded-lg flex items-center gap-3 \${activeTab === 'profile' ? 'bg-indigo-600' : 'hover:bg-slate-800'}\\\`}><Settings size={18}/> Profile</button>`;
const withTerms = `<button onClick={() => setActiveTab('profile')} className={\`w-full text-left px-4 py-2 rounded-lg flex items-center gap-3 \${activeTab === 'profile' ? 'bg-indigo-600' : 'hover:bg-slate-800'}\`}><Settings size={18}/> Profile</button>
              <button onClick={() => setActiveTab('terms')} className={\`w-full text-left px-4 py-2 rounded-lg flex items-center gap-3 \${activeTab === 'terms' ? 'bg-indigo-600' : 'hover:bg-slate-800'}\`}><FileText size={18}/> Terms & Conditions</button>`;

code = code.replace(/<button onClick=\{\(\) => setActiveTab\('profile'\)\}.*?<\/button>/, withTerms);

// Add activeTab rendering in the main view
const resourcesView = `{activeTab === 'resources' && <MarketingResources user={user} />}`;
const newViews = `{activeTab === 'leaderboard' && <Leaderboard user={user} leaderboard={leaderboard} />}
          {activeTab === 'resources' && <MarketingResources user={user} />}`;
code = code.replace("{activeTab === 'resources' && <MarketingResources user={user} />}", newViews);

const profileView = `{activeTab === 'profile' && <ProfileSettings user={user} setUser={setUser} saveState={() => {}} />}`;
const termsView = `{activeTab === 'profile' && <ProfileSettings user={user} setUser={setUser} saveState={() => {}} />}
          {activeTab === 'terms' && <TermsAndConditions />}`;
code = code.replace("{activeTab === 'profile' && <ProfileSettings user={user} setUser={setUser} saveState={() => {}} />}", termsView);

fs.writeFileSync('src/App.tsx', code);
