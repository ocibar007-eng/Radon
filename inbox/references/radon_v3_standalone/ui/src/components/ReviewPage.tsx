import { useState, useEffect } from 'react';

export default function ReviewPage() {
    const [entries, setEntries] = useState<any[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [loading, setLoading] = useState(true);
    const [correction, setCorrection] = useState("");
    const [actionLog, setActionLog] = useState<string[]>([]);
    const [criticFeedback, setCriticFeedback] = useState<any>(null);
    const [criticLoading, setCriticLoading] = useState(false);

    useEffect(() => {
        fetch('http://localhost:3005/v3/dataset')
            .then(res => res.json())
            .then(data => {
                setEntries(data.entries);
                if (data.entries.length > 0) {
                    setCorrection(data.entries[0].outputs.layer3_final);
                }
                setLoading(false);
            })
            .catch(err => console.error(err));
    }, []);

    useEffect(() => {
        // Reset state on entry change
        setCriticFeedback(null);
    }, [currentIndex]);

    const currentEntry = entries[currentIndex];

    // Handle Approve/Edit/Reject
    const handleAction = async (action: 'approve' | 'edit' | 'reject', tags: string[] = []) => {
        if (!currentEntry) return;

        try {
            const payload = {
                action,
                entry: currentEntry,
                correction: action === 'edit' ? correction : undefined,
                tags: tags // Send tags to backend
            };

            const res = await fetch('http://localhost:3005/v3/dataset/feedback', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                setActionLog(prev => [`✅ [${action.toUpperCase()}] Case ${currentEntry.case_id.slice(0, 8)} processed.`, ...prev]);
                // Move to next
                if (currentIndex < entries.length - 1) {
                    const nextIdx = currentIndex + 1;
                    setCurrentIndex(nextIdx);
                    setCorrection(entries[nextIdx].outputs.layer3_final);
                    setCriticFeedback(null); // Clear critic
                } else {
                    alert("No more cases to review!");
                }
            }
        } catch (e) {
            alert("Failed to save feedback");
        }
    };

    // Call AI Shadow Critic
    const askCritic = async () => {
        setCriticLoading(true);
        try {
            const res = await fetch('http://localhost:3005/v3/dataset/critic', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ entry: currentEntry })
            });
            const data = await res.json();
            setCriticFeedback(data.feedback);
        } catch (e) {
            alert("Critic Failed");
        } finally {
            setCriticLoading(false);
        }
    };

    if (loading) return <div className="p-10 text-center">Loading Dataset...</div>;
    if (!currentEntry) return <div className="p-10 text-center">No logs found in dataset.jsonl. Run some tests first!</div>;

    return (
        <div className="min-h-screen bg-slate-100 p-6 font-sans">
            <header className="mb-6 flex justify-between items-center bg-white p-4 rounded-xl shadow-sm">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">🧬 Radon Evolutionary Reviewer</h1>
                    <p className="text-sm text-slate-500">Fine-Tuning Dataset Curator</p>
                </div>
                <div className="flex gap-4 items-center">
                    {currentEntry.risk_level && (
                        <div className={`px-3 py-1 rounded-full font-bold text-xs flex gap-2 items-center
                            ${currentEntry.risk_level === 'S1' ? 'bg-red-600 text-white animate-pulse' :
                                currentEntry.risk_level === 'S2' ? 'bg-orange-500 text-white' :
                                    'bg-slate-200 text-slate-500'}
                        `}>
                            <span>{currentEntry.risk_level} QUEUE</span>
                            {currentEntry.risk_flags && currentEntry.risk_flags.length > 0 && (
                                <span className="text-[10px] opacity-80 border-l border-white/30 pl-2">
                                    {currentEntry.risk_flags.join(", ")}
                                </span>
                            )}
                        </div>
                    )}

                    <button
                        onClick={askCritic}
                        disabled={criticLoading || criticFeedback}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold transition-all shadow-sm
                            ${criticFeedback ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-purple-600 hover:bg-purple-700 text-white'}
                        `}
                    >
                        {criticLoading ? "Analysing..." : "🤖 Ask Shadow Critic"}
                    </button>
                    <div className="text-right text-xs text-slate-400">
                        Case {currentIndex + 1} of {entries.length} <br />
                        ID: {currentEntry.case_id.slice(0, 8)}...
                    </div>
                </div>
            </header>

            {/* CRITIC FEEDBACK BANNER */}
            {criticFeedback && (
                <div className={`mb-6 p-4 rounded-xl border-l-4 shadow-sm animate-fade-in
                    ${criticFeedback.status === 'APPROVED' ? 'bg-emerald-50 border-emerald-500 text-emerald-900' :
                        criticFeedback.status === 'WARNING' ? 'bg-amber-50 border-amber-500 text-amber-900' :
                            'bg-red-50 border-red-500 text-red-900'}
                `}>
                    <div className="flex justify-between items-start">
                        <div>
                            <h3 className="font-bold flex items-center gap-2">
                                🕵️ Shadow Critic Verdict: {criticFeedback.status} (Score: {criticFeedback.score}/100)
                            </h3>
                            <p className="mt-1 text-sm">{criticFeedback.summary}</p>
                            {criticFeedback.issues && criticFeedback.issues.length > 0 && (
                                <ul className="mt-2 list-disc list-inside text-sm opacity-80">
                                    {criticFeedback.issues.map((issue: string, i: number) => (
                                        <li key={i}>{issue}</li>
                                    ))}
                                </ul>
                            )}
                        </div>
                        <button onClick={() => setCriticFeedback(null)} className="text-xs opacity-50 hover:opacity-100">Dismiss</button>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-3 gap-6 h-[70vh]">
                {/* COL 1: INPUTS */}
                <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 overflow-y-auto">
                    <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 border-b pb-2">1. Inputs & Context</h2>

                    <div className="mb-4">
                        <span className="badge bg-blue-100 text-blue-800 px-2 py-0.5 rounded text-xs">Dictation</span>
                        <div className="mt-2 p-3 bg-slate-50 rounded text-sm whitespace-pre-wrap font-mono text-slate-700">
                            {currentEntry.inputs.dictation}
                        </div>
                    </div>

                    <div className="mb-4">
                        <span className="badge bg-amber-100 text-amber-800 px-2 py-0.5 rounded text-xs">Calculator Tools</span>
                        <pre className="mt-2 p-3 bg-slate-50 rounded text-xs overflow-x-auto text-slate-600">
                            {JSON.stringify(currentEntry.inputs.calculator_results, null, 2)}
                        </pre>
                    </div>
                </div>

                {/* COL 2: THOUGHT PROCESS (GLASS BOX) */}
                <div className="bg-indigo-50 p-4 rounded-xl shadow-sm border border-indigo-200 overflow-y-auto">
                    <h2 className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-4 border-b border-indigo-200 pb-2">2. AI Reasoning (CoT)</h2>

                    <div className="prose prose-sm text-indigo-900 leading-relaxed whitespace-pre-wrap font-serif">
                        {currentEntry.thinking_process.layer2_cot}
                    </div>

                    <div className="mt-6 pt-4 border-t border-indigo-200 text-xs text-indigo-500">
                        <p>Model: {currentEntry.telemetry.layer2_model}</p>
                        <p>Latency: {currentEntry.telemetry.layer2_latency_ms}ms</p>
                    </div>
                </div>

                {/* COL 3: OUTPUT & ACTION */}
                <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col">
                    <div className="flex justify-between items-center mb-4 border-b pb-2">
                        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">3. Final Output (Editable)</h2>
                        <div className="flex gap-2">
                            <button
                                onClick={() => {
                                    navigator.clipboard.writeText(correction);
                                    alert("Copied to clipboard!");
                                }}
                                className="text-xs px-2 py-1 bg-slate-100 hover:bg-slate-200 rounded text-slate-600 font-bold"
                            >
                                📋 Copy
                            </button>
                            <button
                                onClick={() => {
                                    const blob = new Blob([JSON.stringify(currentEntry, null, 2)], { type: 'application/json' });
                                    const url = URL.createObjectURL(blob);
                                    const a = document.createElement('a');
                                    a.href = url;
                                    a.download = `radon_case_${currentEntry.case_id.slice(0, 8)}.json`;
                                    a.click();
                                }}
                                className="text-xs px-2 py-1 bg-slate-100 hover:bg-slate-200 rounded text-slate-600 font-bold"
                            >
                                💾 JSON
                            </button>
                        </div>
                    </div>

                    <textarea
                        className="flex-1 w-full p-4 bg-slate-50 border border-slate-200 rounded-lg font-serif text-slate-800 focus:ring-2 focus:ring-green-500 mb-4 text-sm leading-relaxed"
                        value={correction}
                        onChange={(e) => setCorrection(e.target.value)}
                    />

                    <div className="flex flex-col gap-2 mt-auto">

                        {/* Power-Up 2: Smart Feedback Tags */}
                        {correction !== currentEntry.outputs.layer3_final && (
                            <div className="bg-yellow-50 p-2 rounded border border-yellow-200 text-xs">
                                <p className="font-bold text-yellow-800 mb-1">Motivo da Edição (Treino):</p>
                                <div className="flex flex-wrap gap-2">
                                    {['Terminologia', 'Lateralidade', 'Medidas', 'Meta-Texto', 'Formatação', 'Outro'].map(tag => (
                                        <label key={tag} className="flex items-center gap-1 cursor-pointer">
                                            <input type="checkbox" id={`tag-${tag}`} className="accent-yellow-600" />
                                            {tag}
                                        </label>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-3 gap-2">
                            <button
                                onClick={() => handleAction('reject')}
                                className="p-3 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg font-bold text-sm transition-colors"
                            >
                                ❌ Reject
                            </button>

                            <button
                                onClick={() => {
                                    // Collect selected tags
                                    const tags = Array.from(document.querySelectorAll('input[type="checkbox"]:checked'))
                                        .map((el: any) => el.parentElement.textContent);

                                    // Hacky pass tags via specific handler logic
                                    // Ideally handleAction handles this arg, but I'll patch it here
                                    handleAction('edit', tags);
                                }}
                                className="p-3 bg-yellow-100 hover:bg-yellow-200 text-yellow-700 rounded-lg font-bold text-sm transition-colors"
                            >
                                ✏️ Approve Edit
                            </button>

                            <button
                                onClick={() => handleAction('approve')}
                                className="p-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold text-sm shadow-md hover:shadow-lg transition-colors"
                            >
                                ✅ Approve Perfect
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* ACTION LOG */}
            <div className="mt-6 p-4 bg-slate-800 text-slate-300 rounded-lg font-mono text-xs h-32 overflow-y-auto">
                <div className="font-bold text-slate-500 mb-2">Session Audit Log</div>
                {actionLog.map((log, i) => <div key={i}>{log}</div>)}
            </div>
        </div>
    );
}
