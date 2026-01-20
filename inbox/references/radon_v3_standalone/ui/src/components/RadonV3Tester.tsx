
import { useState } from 'react';

export default function RadonV3Tester() {
    const [logs, setLogs] = useState<string[]>([]);
    const [report, setReport] = useState<string>('');
    const [loading, setLoading] = useState(false);
    const [calcStatus, setCalcStatus] = useState<string>('Unknown');
    const [telemetry, setTelemetry] = useState<any>(null); // New state
    const [dictation, setDictation] = useState("Paciente com nódulo adrenal de 3.5 cm. Fase pré 10 UH, portal 80 UH, tardia 35 UH. Solicito cálculo de washout.");

    const runTest = async () => {
        setLoading(true);
        setLogs(["🚀 Iniciando pipeline V3..."]);
        setReport("");
        setTelemetry(null);

        try {
            // ... (payload creation same as before) ...
            const payload = {
                meta: {
                    case_id: crypto.randomUUID(),
                    trace_id: crypto.randomUUID(),
                    patient: { age_bracket: "adult", sex: "F" },
                    modality: "CT",
                    study_description: "CT Adrenal Protocol",
                    timestamp: new Date().toISOString()
                },
                inputs: {
                    dictation_raw: dictation
                },
                flags: {
                    has_contrast: true
                }
            };

            const res = await fetch('http://localhost:3005/v3/process-case', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await res.json();
            setLogs(data.logs || []);

            if (data.success) {
                setReport(data.final_report);
                setCalcStatus(data.calculator_data ? "✅ Python Service Connected" : "⚠️ Python Service Unused/Failed");
                setTelemetry(data.telemetry); // Capture telemetry
            } else {
                setReport("ERROR: " + data.error);
                setCalcStatus("❌ Failed");
            }

        } catch (e: any) {
            setLogs(prev => [...prev, `🔥 Network Error: ${e.message}`]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6 max-w-4xl mx-auto bg-gray-50 min-h-screen font-sans">
            <header className="mb-8 border-b pb-4">
                <h1 className="text-3xl font-bold text-slate-800">Radon V3 Architecture Playground</h1>
                <p className="text-slate-500">Multi-Agent Orchestrator + Python Calculator Service Debugger</p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                {/* Input Column */}
                <div className="space-y-6">
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                        <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-2">Input Simulation</h2>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Dictation / Context</label>
                        <textarea
                            value={dictation}
                            onChange={(e) => setDictation(e.target.value)}
                            className="w-full h-32 p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono text-sm text-slate-800"
                        />

                        <div className="mt-4 p-3 bg-blue-50 text-blue-800 rounded-lg text-xs">
                            <strong>Scenario:</strong> Adrenal Washout.<br />
                            Orchestrator will detect "washout" intention, call Python Service (port 8001), insert result, and run QA.
                        </div>


                        <div className="flex gap-2 mt-2 mb-4">
                            <button
                                onClick={() => setDictation("Paciente com nódulo adrenal de 3.5 cm. Fase pré 10 UH, portal 80 UH, tardia 35 UH. Solicito cálculo de washout.")}
                                className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-xs text-slate-600 rounded border border-slate-300 transition-colors"
                            >
                                Adrenal Simple
                            </button>
                            <button
                                onClick={() => setDictation(`Paciente refere dor abdominal difusa.
Fígado: Atenuação do parênquima hepático medida em 35 UH. Baço aumentado, medindo 14 cm de comprimento, com volume estimado. Altura do paciente: 175 cm, Sexo: Masculino.
Rins: Cistos simples em ambos os rins.
Adrenais: Nódulo na adrenal esquerda de 2.0 cm. Pré: 40 UH, Portal: 120 UH, Tardia: 60 UH. Calcular washout.
Solicito avaliação de esteatose, esplenomegalia e adrenal.`)}
                                className="px-3 py-1 bg-purple-100 hover:bg-purple-200 text-xs text-purple-700 rounded border border-purple-300 transition-colors"
                            >
                                🔥 Complex Stress Test
                            </button>
                            <button
                                onClick={() => setDictation("")}
                                className="px-3 py-1 bg-red-50 hover:bg-red-100 text-xs text-red-600 rounded border border-red-200 transition-colors ml-auto"
                            >
                                Clear
                            </button>
                        </div>

                        <button
                            onClick={runTest}
                            disabled={loading}
                            className={`mt-4 w-full py-2.5 px-4 rounded-lg font-semibold text-white transition-all
                ${loading ? 'bg-slate-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 shadow-md hover:shadow-lg'}
              `}
                        >
                            {loading ? 'Processing Agent Chain...' : '▶ Run Radon V3 Pipeline'}
                        </button>
                    </div>

                    <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                        <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-2">System Status</h2>
                        <div className="flex items-center justify-between py-2 border-b border-slate-100">
                            <span className="text-slate-600">Calculator Svc (Python)</span>
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${calcStatus.includes('✅') ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                {calcStatus}
                            </span>
                        </div>
                        <div className="flex items-center justify-between py-2">
                            <span className="text-slate-600">QA Banlist</span>
                            <span className="px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                                Active
                            </span>
                        </div>
                    </div>
                </div>

                {/* Output Column */}
                <div className="space-y-6">
                    <div className="bg-slate-900 text-slate-200 p-4 rounded-xl shadow-lg border border-slate-700 font-mono text-xs h-64 overflow-y-auto">
                        <h3 className="text-slate-400 font-bold mb-2 sticky top-0 bg-slate-900 pb-2 border-b border-slate-700">Execution Logs</h3>
                        {logs.length === 0 && <span className="text-slate-600 italic">Waiting for execution...</span>}
                        {logs.map((L, i) => (
                            <div key={i} className="mb-1 border-l-2 border-slate-700 pl-2">
                                {L}
                            </div>
                        ))}
                    </div>

                    <div className="bg-white p-6 rounded-xl shadow-md border border-slate-200 min-h-[16rem]">
                        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4 border-b pb-2">Final Generated Report</h3>
                        {report ? (
                            <pre className="whitespace-pre-wrap font-serif text-slate-800 leading-relaxed">
                                {report}
                            </pre>
                        ) : (
                            <div className="h-full flex items-center justify-center text-slate-300 italic">
                                Report will appear here...
                            </div>
                        )}
                    </div>

                    {/* AI Insights Panel */}
                    {telemetry && (
                        <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-200">
                            <h3 className="text-sm font-semibold text-indigo-800 uppercase tracking-wider mb-2 flex items-center gap-2">
                                🧠 AI Insights (Glass Box)
                            </h3>
                            <div className="grid grid-cols-2 gap-4 text-xs mb-4">
                                <div className="bg-white p-2 rounded border border-indigo-100">
                                    <span className="block text-slate-500">Medical Reasoner</span>
                                    <span className="font-mono font-bold text-indigo-600">{telemetry.layer2_latency_ms}ms</span>
                                    <span className="block text-[10px] text-slate-400">{telemetry.layer2_model}</span>
                                </div>
                                <div className="bg-white p-2 rounded border border-indigo-100">
                                    <span className="block text-slate-500">Style Editor</span>
                                    <span className="font-mono font-bold text-indigo-600">{telemetry.layer3_latency_ms}ms</span>
                                    <span className="block text-[10px] text-slate-400">{telemetry.layer3_model}</span>
                                </div>
                            </div>

                            <div className="bg-white p-3 rounded border border-indigo-100">
                                <span className="block text-slate-500 text-xs mb-1 font-semibold">Chain of Thought (Layer 2):</span>
                                <pre className="whitespace-pre-wrap font-mono text-xs text-slate-700 bg-slate-50 p-2 rounded max-h-40 overflow-y-auto">
                                    {telemetry.reasoner_thoughts || "No internal monologue captured."}
                                </pre>
                            </div>
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
}
