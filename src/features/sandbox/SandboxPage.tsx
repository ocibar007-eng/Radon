import React, { useMemo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { AlertTriangle, Clipboard, Download, Play, RefreshCw } from 'lucide-react';
import { runPipeline } from '../../services/pipeline-client';

const TOKEN_STORAGE_KEY = 'radon_pipeline_token';

export function SandboxPage() {
  const [inputType, setInputType] = useState<'markdown' | 'json'>('markdown');
  const [rawInput, setRawInput] = useState('');
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_STORAGE_KEY) || '');
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);
  const [outputView, setOutputView] = useState<'visual' | 'markdown'>('visual');

  const auditView = useMemo(() => {
    if (!result) return null;
    const report = result.report || {};
    const qa = result.qa || {};
    const risk = result.risk || {};

    const markdown = typeof result.markdown === 'string' ? result.markdown : '';
    const auditIndex = markdown.indexOf('AUDITORIA INTERNA');
    const cleanMarkdown = auditIndex >= 0 ? markdown.slice(0, auditIndex).trim() : markdown;

    const verifyLines = cleanMarkdown
      .split('\n')
      .filter((line: string) => line.includes('<VERIFICAR>'))
      .map((line: string) => line.trim())
      .filter(Boolean);

    const computeRequests = Array.isArray(report.findings)
      ? report.findings.flatMap((finding: any) =>
        Array.isArray(finding.compute_requests)
          ? finding.compute_requests.map((req: any) => ({
            formula: req.formula,
            ref_id: req.ref_id,
          }))
          : []
      )
      : [];

    return {
      cleanMarkdown,
      gates: {
        qaPassed: qa.passed === true,
        hardGateFailed: report.flags?.hard_gate_failed === true,
        banlistViolations: qa.banlist?.violations || [],
        blacklistCorrections: qa.blacklist?.corrections || [],
      },
      qaIssues: qa.issues || [],
      missingSections: qa.structure?.missing_sections || [],
      verifyLines,
      computeRequests,
      auditEntries: report.audit?.entries || [],
      comparison: report.comparison || {},
      risk,
      modelUsed: report.metadata?.model_used,
      consultAssist: report.consult_assist || [],
    };
  }, [result]);

  const placeholder = useMemo(() => {
    if (inputType === 'markdown') {
      return '# CADASTRO DO ATENDIMENTO\n**Exame:** TC abdome\n\n# RESUMO CLINICO\nTexto clínico...\n\n# TRANSCRICOES DE DITADO\nDitado aqui...\n';
    }
    return JSON.stringify({
      case_id: 'case_demo',
      case_metadata: { fields: { Exame: 'TC abdome' }, raw_markdown: '' },
      clinical_context: { raw_markdown: 'Dor abdominal.' },
      dictation_raw: 'Sem achados.',
      exam_data: { raw_markdown: '', notes: '' },
      prior_reports: { raw_markdown: '' },
    }, null, 2);
  }, [inputType]);

  const onRun = async () => {
    setError(null);
    setResult(null);
    setIsRunning(true);

    try {
      const payload = inputType === 'json'
        ? JSON.parse(rawInput)
        : rawInput;

      const response = await runPipeline({
        inputType: inputType === 'json' ? 'casebundle' : 'markdown',
        payload,
        token: token || undefined,
      });

      setResult(response);
    } catch (err: any) {
      setError(err?.message || 'Erro ao rodar pipeline');
    } finally {
      setIsRunning(false);
    }
  };

  const onCopy = async () => {
    if (!result?.markdown) return;
    await navigator.clipboard.writeText(result.markdown);
  };

  const onCopyClean = async () => {
    if (!auditView?.cleanMarkdown) return;
    await navigator.clipboard.writeText(auditView.cleanMarkdown);
  };

  const onDownload = (mode: 'clean' | 'full') => {
    const content = mode === 'clean' ? auditView?.cleanMarkdown : result?.markdown;
    if (!content) return;
    const caseId = result?.report?.case_id || 'laudo';
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${caseId}-${mode}.md`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const onSaveToken = (value: string) => {
    setToken(value);
    localStorage.setItem(TOKEN_STORAGE_KEY, value);
  };

  return (
    <div className="app-container">
      <div className="header">
        <div>
          <h1 className="header-title">Sandbox<span>Testar Pipeline</span></h1>
          <p className="header-exam-type">Cole um texto ou JSON e gere o laudo.</p>
        </div>
      </div>

      <div className="sandbox-grid">
        <section className="card-base sandbox-panel">
          <div className="sandbox-panel-header">
            <h3>Entrada</h3>
            <div className="sandbox-toggle">
              <button
                className={`btn btn-sm ${inputType === 'markdown' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setInputType('markdown')}
                type="button"
              >
                Texto
              </button>
              <button
                className={`btn btn-sm ${inputType === 'json' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setInputType('json')}
                type="button"
              >
                JSON
              </button>
            </div>
          </div>

          <label className="sandbox-label">Token (se configurado)</label>
          <input
            className="sandbox-input"
            value={token}
            onChange={(e) => onSaveToken(e.target.value)}
            placeholder="Cole o token aqui"
          />

          <label className="sandbox-label">Conteúdo</label>
          <textarea
            className="sandbox-textarea"
            value={rawInput}
            onChange={(e) => setRawInput(e.target.value)}
            placeholder={placeholder}
          />

          <div className="sandbox-actions">
            <button className="btn btn-primary btn-md" onClick={onRun} disabled={isRunning || !rawInput.trim()}>
              {isRunning ? <RefreshCw className="icon-spin" size={16} /> : <Play size={16} />}
              Rodar
            </button>
            <button className="btn btn-secondary btn-md" onClick={() => setRawInput('')} disabled={isRunning}>
              Limpar
            </button>
          </div>

          {error && (
            <div className="sandbox-error">
              <AlertTriangle size={16} />
              <span>{error}</span>
            </div>
          )}
        </section>

        <section className="card-base sandbox-panel">
          <div className="sandbox-panel-header">
            <h3>Saída</h3>
            <div className="sandbox-actions-inline">
              <div className="sandbox-toggle">
                <button
                  className={`btn btn-sm ${outputView === 'visual' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setOutputView('visual')}
                  type="button"
                >
                  Visual
                </button>
                <button
                  className={`btn btn-sm ${outputView === 'markdown' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setOutputView('markdown')}
                  type="button"
                >
                  Markdown
                </button>
              </div>
              <button className="btn btn-secondary btn-sm" onClick={onCopyClean} disabled={!auditView?.cleanMarkdown}>
                <Clipboard size={14} />
                Copiar (sem auditoria)
              </button>
              <button className="btn btn-secondary btn-sm" onClick={() => onDownload('clean')} disabled={!auditView?.cleanMarkdown}>
                <Download size={14} />
                Baixar (sem auditoria)
              </button>
              <button className="btn btn-secondary btn-sm" onClick={onCopy} disabled={!result?.markdown}>
                <Clipboard size={14} />
                Copiar completo
              </button>
              <button className="btn btn-secondary btn-sm" onClick={() => onDownload('full')} disabled={!result?.markdown}>
                <Download size={14} />
                Baixar completo
              </button>
            </div>
          </div>

          <div className="sandbox-metrics">
            <div>
              <span>QA</span>
              <strong>{result?.qa?.passed ? 'OK' : result ? 'Falhou' : '-'}</strong>
            </div>
            <div>
              <span>Risco</span>
              <strong>{result?.risk?.level || '-'}</strong>
            </div>
            <div>
              <span>Modelo</span>
              <strong>{result?.report?.metadata?.model_used || '-'}</strong>
            </div>
          </div>

          <label className="sandbox-label">Markdown do laudo</label>
          {outputView === 'markdown' ? (
            <textarea
              className="sandbox-textarea"
              value={result?.markdown || ''}
              readOnly
              placeholder="O laudo aparecerá aqui..."
            />
          ) : (
            <div className="sandbox-rendered">
              {result?.markdown ? (
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {result.markdown}
                </ReactMarkdown>
              ) : (
                <p className="sandbox-muted">O laudo aparecerá aqui...</p>
              )}
            </div>
          )}

          <div className="sandbox-audit">
            <div className="sandbox-panel-header">
              <h3>Auditoria Interna (não copiar)</h3>
            </div>

            {!auditView ? (
              <p className="sandbox-muted">Rode a pipeline para ver a auditoria.</p>
            ) : (
              <>
                {auditView.consultAssist.length > 0 && (
                  <div className="sandbox-web-block">
                    <h4>Consulta Web (verificar)</h4>
                    {auditView.consultAssist.map((entry: any, idx: number) => (
                      <div key={`${entry.title}-${idx}`} className="sandbox-web-entry">
                        <p className="sandbox-web-title">{entry.title}</p>
                        <p className="sandbox-muted">{entry.summary}</p>
                        {Array.isArray(entry.suggested_actions) && entry.suggested_actions.length > 0 && (
                          <ul>
                            {entry.suggested_actions.map((action: string) => (
                              <li key={action}>{action}</li>
                            ))}
                          </ul>
                        )}
                        {Array.isArray(entry.sources) && entry.sources.length > 0 && (
                          <div className="sandbox-web-sources">
                            <p className="sandbox-muted">Fontes (citação)</p>
                            {entry.sources.map((source: any, sourceIdx: number) => (
                              <p key={`${entry.title}-source-${sourceIdx}`} className="sandbox-web-source">
                                {source.organization_or_journal} — {source.title} ({source.year})
                              </p>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                <div className="sandbox-audit-grid">
                  <div>
                    <h4>Gates acionados</h4>
                    <ul>
                      <li>QA: {auditView.gates.qaPassed ? 'OK' : 'Falhou'}</li>
                      <li>Hard gate: {auditView.gates.hardGateFailed ? 'Falhou' : 'OK'}</li>
                      <li>Banlist: {auditView.gates.banlistViolations.length} violação(ões)</li>
                      <li>Blacklist: {auditView.gates.blacklistCorrections.length} correção(ões)</li>
                    </ul>
                  </div>
                  <div>
                    <h4>Problemas detectados (QA)</h4>
                    {auditView.qaIssues.length > 0 ? (
                      <ul>
                        {auditView.qaIssues.map((issue: string, idx: number) => (
                          <li key={`${issue}-${idx}`}>{issue}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="sandbox-muted">Nenhum problema detectado.</p>
                    )}
                  </div>
                  <div>
                    <h4>Dados ausentes relevantes</h4>
                    {auditView.missingSections.length > 0 ? (
                      <ul>
                        {auditView.missingSections.map((item: string) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="sandbox-muted">Nenhum item ausente detectado.</p>
                    )}
                  </div>
                  <div>
                    <h4>Itens com &lt;VERIFICAR&gt;</h4>
                    {auditView.verifyLines.length > 0 ? (
                      <ul>
                        {auditView.verifyLines.map((line: string, idx: number) => (
                          <li key={`${line}-${idx}`}>{line}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="sandbox-muted">Nenhum marcador encontrado.</p>
                    )}
                  </div>
                  <div>
                    <h4>Requests de cálculo</h4>
                    {auditView.computeRequests.length > 0 ? (
                      <ul>
                        {auditView.computeRequests.map((req: any, idx: number) => (
                          <li key={`${req.ref_id || 'calc'}-${idx}`}>{req.formula} ({req.ref_id || 'sem ref'})</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="sandbox-muted">Nenhum cálculo solicitado.</p>
                    )}
                  </div>
                  <div>
                    <h4>Auditoria de inferência</h4>
                    {auditView.auditEntries.length > 0 ? (
                      <ul>
                        {auditView.auditEntries.map((entry: any, idx: number) => (
                          <li key={`${entry.ref_id}-${idx}`}>{entry.type}: {entry.formula} ({entry.ref_id})</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="sandbox-muted">Nenhuma inferência registrada.</p>
                    )}
                  </div>
                  <div>
                    <h4>Resumo técnico</h4>
                    <ul>
                      <li>Risco: {auditView.risk?.level || '-'}</li>
                      <li>Modelo: {auditView.modelUsed || '-'}</li>
                      <li>Comparação: {auditView.comparison?.available ? 'Disponível' : 'Não disponível'}</li>
                    </ul>
                  </div>
                </div>
              </>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
