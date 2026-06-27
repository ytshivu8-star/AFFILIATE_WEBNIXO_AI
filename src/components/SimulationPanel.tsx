import { useState } from 'react';
import { Sparkles, MousePointerClick, UserPlus, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';

interface SimulationPanelProps {
  onSimulateClick: () => void;
  onSimulateSignup: () => void;
  onSimulateSale: (amount: number) => void;
  onResetData: () => void;
}

export default function SimulationPanel({
  onSimulateClick,
  onSimulateSignup,
  onSimulateSale,
  onResetData
}: SimulationPanelProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [saleAmount, setSaleAmount] = useState<number>(199);

  const plan199Comm = Number(localStorage.getItem('webnixo_comm_199') || '39.80');
  const plan499Comm = Number(localStorage.getItem('webnixo_comm_499') || '99.80');
  const plan999Comm = Number(localStorage.getItem('webnixo_comm_999') || '199.80');

  const currentComm = saleAmount === 199 
    ? plan199Comm 
    : saleAmount === 499 
      ? plan499Comm 
      : saleAmount === 999 
        ? plan999Comm 
        : saleAmount * 0.2;

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-xs sm:max-w-sm w-full bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden transition-all duration-300">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-indigo-600 text-white px-4 py-3 flex items-center justify-between text-sm font-semibold hover:bg-indigo-700 transition-colors"
        id="toggle-sim-panel"
      >
        <span className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 animate-pulse" />
          Interactive Demo Simulator
        </span>
        {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
      </button>

      {isOpen && (
        <div className="p-4 space-y-3 bg-slate-950 text-slate-200">
          <p className="text-xs text-slate-400">
            Use these controls to simulate live affiliate activities. Your dashboard, charts, and activity logs will update instantly!
          </p>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={onSimulateClick}
              className="flex items-center justify-center gap-2 px-3 py-2 bg-slate-900 hover:bg-slate-800 text-xs border border-slate-800 rounded-lg text-indigo-400 hover:text-indigo-300 transition-all font-medium"
              id="sim-click-btn"
            >
              <MousePointerClick className="h-3.5 w-3.5" />
              +1 Link Click
            </button>
            <button
              onClick={onSimulateSignup}
              className="flex items-center justify-center gap-2 px-3 py-2 bg-slate-900 hover:bg-slate-800 text-xs border border-slate-800 rounded-lg text-emerald-400 hover:text-emerald-300 transition-all font-medium"
              id="sim-signup-btn"
            >
              <UserPlus className="h-3.5 w-3.5" />
              +1 Free Signup
            </button>
          </div>

          <div className="space-y-1.5 border-t border-slate-900 pt-3">
            <label className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block">
              Simulate Subscription Purchase
            </label>
            <div className="flex gap-2">
              <select
                value={saleAmount}
                onChange={(e) => setSaleAmount(Number(e.target.value))}
                className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value={199}>₹199 Plan (₹{plan199Comm.toFixed(2)} comm.)</option>
                <option value={499}>₹499 Plan (₹{plan499Comm.toFixed(2)} comm.)</option>
                <option value={999}>₹999 Plan (₹{plan999Comm.toFixed(2)} comm.)</option>
              </select>
              <button
                onClick={() => onSimulateSale(saleAmount)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-xs text-white rounded-lg font-medium transition-all"
                id="sim-sale-btn"
              >
                <span className="text-sm font-extrabold">₹</span>
                Buy
              </button>
            </div>
            <p className="text-[10px] text-slate-500 italic">
              Affiliates earn fixed recurring commission on every purchase (e.g. ₹{currentComm.toFixed(2)})
            </p>
          </div>

          <button
            onClick={onResetData}
            className="w-full mt-1 flex items-center justify-center gap-1.5 py-1.5 bg-slate-900/50 hover:bg-red-950/30 text-[11px] border border-slate-900 text-slate-400 hover:text-red-300 rounded-lg hover:border-red-900/50 transition-all"
            id="reset-sim-data-btn"
          >
            <RefreshCw className="h-3 w-3" />
            Reset Demo Dashboard Data
          </button>
        </div>
      )}
    </div>
  );
}
