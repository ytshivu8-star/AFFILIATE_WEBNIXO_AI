const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

code = code.replace(
  /{activeTab === 'leaderboard' && <Leaderboard user={user} leaderboard={leaderboard} \/>}/,
  "{activeTab === 'leaderboard' && <Leaderboard entries={leaderboard.map((e,i) => ({rank: i+1, name: e.name, sales: e.referrals, commission: e.earnings}))} currentUserSales={stats.sales} currentUserCommission={stats.commissionEarned} currentUserName={user.fullName} />}"
);

fs.writeFileSync('src/App.tsx', code);
