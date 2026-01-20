import { useState } from 'react';
import RadonV3Tester from './components/RadonV3Tester';
import ReviewPage from './components/ReviewPage';

function App() {
    const [view, setView] = useState<'tester' | 'review'>('tester');

    return (
        <div>
            <nav className="bg-slate-900 text-white p-4 flex gap-6 items-center border-b border-slate-700 shadow-lg">
                <div className="font-bold tracking-widest text-slate-500 mr-4">RADON V3</div>
                <button
                    onClick={() => setView('tester')}
                    className={`flex items-center gap-2 px-3 py-1 rounded transition-all ${view === 'tester' ? 'bg-blue-900/50 text-blue-400 font-bold border border-blue-800' : 'text-slate-400 hover:text-white'}`}
                >
                    🧪 Playground
                </button>
                <button
                    onClick={() => setView('review')}
                    className={`flex items-center gap-2 px-3 py-1 rounded transition-all ${view === 'review' ? 'bg-indigo-900/50 text-indigo-400 font-bold border border-indigo-800' : 'text-slate-400 hover:text-white'}`}
                >
                    🧬 Reviewer (RLHF)
                </button>
            </nav>

            <div className="bg-slate-50 min-h-screen">
                {view === 'tester' ? <RadonV3Tester /> : <ReviewPage />}
            </div>
        </div>
    )
}
export default App;
