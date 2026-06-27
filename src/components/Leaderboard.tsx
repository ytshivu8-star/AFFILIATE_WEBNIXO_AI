import { Award, Trophy, ArrowUp, ArrowDown, ShieldCheck } from 'lucide-react';
import { LeaderboardEntry } from '../types';

interface LeaderboardProps {
  entries: LeaderboardEntry[];
  currentUserSales: number;
  currentUserCommission: number;
  currentUserName: string;
}

export default function Leaderboard({ 
  entries, 
  currentUserSales, 
  currentUserCommission,
  currentUserName
}: LeaderboardProps) {

  // Dynamically insert or update current user in the leaderboard based on simulated sales
  const getDynamicLeaderboard = (): LeaderboardEntry[] => {
    // Start with existing preset entries representing other active affiliates
    const basicEntries = entries.map(entry => ({ ...entry }));
    
    // Check if current user is already in the list
    const userIndex = basicEntries.findIndex(e => e.isCurrentUser);
    
    if (userIndex > -1) {
      basicEntries[userIndex].sales = currentUserSales;
      basicEntries[userIndex].commission = currentUserCommission;
      basicEntries[userIndex].name = currentUserName || 'You (Affiliate)';
    } else {
      basicEntries.push({
        rank: 99, // temporary rank
        name: currentUserName || 'You (Affiliate)',
        sales: currentUserSales,
        commission: currentUserCommission,
        isCurrentUser: true
      });
    }

    // Sort by sales descending, then by commission descending
    const sorted = [...basicEntries].sort((a, b) => {
      if (b.sales !== a.sales) return b.sales - a.sales;
      return b.commission - a.commission;
    });

    // Re-assign ranks 1 through N
    return sorted.map((entry, index) => ({
      ...entry,
      rank: index + 1
    }));
  };

  const dynamicEntries = getDynamicLeaderboard();
  
  // Extract top 3 for podium
  const top1 = dynamicEntries.find(e => e.rank === 1);
  const top2 = dynamicEntries.find(e => e.rank === 2);
  const top3 = dynamicEntries.find(e => e.rank === 3);
  
  // Extract ranks 4-10
  const remainingList = dynamicEntries.filter(e => e.rank > 3).slice(0, 7);

  return (
    <div className="space-y-6" id="leaderboard-tab">
      <div className="text-center max-w-xl mx-auto space-y-2">
        <h3 className="text-xl font-bold text-slate-900">Affiliate Referral Leaderboard</h3>
        <p className="text-xs text-slate-500">
          Compete with fellow WEBNIXO AI partners! The top-performing affiliates each month receive custom bonuses, pre-release feature access, and dedicated support.
        </p>
      </div>

      {/* Podium for Top 3 */}
      <div className="grid grid-cols-3 gap-3 max-w-2xl mx-auto items-end pt-12 pb-6 px-2">
        {/* 2nd Place */}
        {top2 && (
          <div className="flex flex-col items-center">
            <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full border-2 border-slate-300 flex items-center justify-center font-bold text-slate-800 text-sm relative bg-slate-50 ${top2.isCurrentUser ? 'ring-2 ring-indigo-500 ring-offset-2' : ''}`}>
              <span className="truncate max-w-[50px] px-1 text-[10px]">{top2.name.split(' ')[0]}</span>
              <div className="absolute -top-3 bg-slate-300 text-slate-800 text-[10px] h-5 px-1.5 rounded-full flex items-center justify-center font-bold">
                2nd
              </div>
            </div>
            <div className="w-full bg-slate-100 border border-slate-200/60 rounded-t-xl h-24 mt-3 flex flex-col items-center justify-center p-2 text-center">
              <span className="text-[10px] font-bold text-slate-600 truncate max-w-full">{top2.name}</span>
              <span className="text-xs font-black text-slate-800 mt-1">{top2.sales} sales</span>
              <span className="text-[9px] text-slate-400 font-mono">₹{top2.commission.toFixed(0)} earned</span>
            </div>
          </div>
        )}

        {/* 1st Place */}
        {top1 && (
          <div className="flex flex-col items-center transform -translate-y-4">
            <div className="absolute -top-8 animate-bounce">
              <Trophy className="h-7 w-7 text-amber-500 fill-amber-100" />
            </div>
            <div className={`w-16 h-16 sm:w-20 sm:h-20 rounded-full border-4 border-amber-400 flex items-center justify-center font-bold text-slate-800 text-sm relative bg-amber-50/50 ${top1.isCurrentUser ? 'ring-2 ring-indigo-500 ring-offset-2' : ''}`}>
              <span className="truncate max-w-[60px] px-1 text-[11px] font-extrabold">{top1.name.split(' ')[0]}</span>
              <div className="absolute -top-3.5 bg-amber-400 text-slate-900 text-[11px] h-5 px-2 rounded-full flex items-center justify-center font-black">
                Winner
              </div>
            </div>
            <div className="w-full bg-amber-50/40 border border-amber-200/60 rounded-t-2xl h-32 mt-3 flex flex-col items-center justify-center p-2 text-center ring-2 ring-amber-400/20">
              <span className="text-xs font-bold text-amber-800 truncate max-w-full">{top1.name}</span>
              <span className="text-sm font-black text-amber-900 mt-1">{top1.sales} sales</span>
              <span className="text-[10px] text-amber-600 font-mono font-bold">₹{top1.commission.toFixed(0)} earned</span>
            </div>
          </div>
        )}

        {/* 3rd Place */}
        {top3 && (
          <div className="flex flex-col items-center">
            <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full border-2 border-amber-700/50 flex items-center justify-center font-bold text-slate-800 text-sm relative bg-orange-50 ${top3.isCurrentUser ? 'ring-2 ring-indigo-500 ring-offset-2' : ''}`}>
              <span className="truncate max-w-[50px] px-1 text-[10px]">{top3.name.split(' ')[0]}</span>
              <div className="absolute -top-3 bg-amber-700/75 text-white text-[10px] h-5 px-1.5 rounded-full flex items-center justify-center font-bold">
                3rd
              </div>
            </div>
            <div className="w-full bg-orange-50/20 border border-orange-100/60 rounded-t-xl h-20 mt-3 flex flex-col items-center justify-center p-2 text-center">
              <span className="text-[10px] font-bold text-slate-600 truncate max-w-full">{top3.name}</span>
              <span className="text-xs font-black text-slate-800 mt-1">{top3.sales} sales</span>
              <span className="text-[9px] text-slate-400 font-mono">₹{top3.commission.toFixed(0)} earned</span>
            </div>
          </div>
        )}
      </div>

      {/* Main Leaderboard Table */}
      <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-sm">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Rankings 4 - 10</span>
          <span className="text-[11px] font-medium text-slate-500 flex items-center gap-1">
            <ShieldCheck className="h-4 w-4 text-emerald-500" />
            Verified Rankings
          </span>
        </div>

        <div className="divide-y divide-slate-100">
          {remainingList.map((entry) => (
            <div 
              key={entry.rank} 
              className={`px-5 py-3.5 flex items-center justify-between transition-colors ${
                entry.isCurrentUser 
                ? 'bg-indigo-50/40 hover:bg-indigo-50/60 font-semibold border-l-4 border-indigo-600' 
                : 'hover:bg-slate-50/50'
              }`}
            >
              <div className="flex items-center gap-4">
                <span className={`text-sm font-bold w-6 h-6 flex items-center justify-center rounded-lg ${
                  entry.isCurrentUser 
                  ? 'bg-indigo-600 text-white' 
                  : 'text-slate-400 bg-slate-100'
                }`}>
                  {entry.rank}
                </span>
                <div>
                  <span className={`text-xs text-slate-800 ${entry.isCurrentUser ? 'font-bold' : 'font-medium'}`}>
                    {entry.name}
                  </span>
                  {entry.isCurrentUser && (
                    <span className="ml-2 text-[10px] bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded font-bold">
                      You
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-8 font-mono text-xs">
                <div className="text-right">
                  <span className="text-slate-500 block text-[10px] uppercase font-bold tracking-wider">Sales</span>
                  <span className="font-extrabold text-slate-800">{entry.sales}</span>
                </div>
                <div className="text-right w-24">
                  <span className="text-slate-500 block text-[10px] uppercase font-bold tracking-wider">Commissions</span>
                  <span className="font-extrabold text-slate-800">₹{entry.commission.toFixed(2)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
