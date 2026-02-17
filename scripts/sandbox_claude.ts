/**
 * SANDBOX CLAUDE API — Web Interface v3 (STREAMING)
 *
 * Servidor local com UI para testar a integracao Claude API.
 * Features: SSE streaming ao vivo, live log, copy, download MD.
 *
 * Uso:
 *   npx tsx scripts/sandbox_claude.ts
 *   Abra http://localhost:3001
 */

import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { URL } from 'node:url';

// Force load .env / .env.local
try {
  for (const envFile of ['.env', '.env.local']) {
    const p = path.resolve(process.cwd(), envFile);
    if (fs.existsSync(p)) {
      fs.readFileSync(p, 'utf-8').split('\n').forEach(line => {
        const m = line.match(/^([^#=][^=]*)=(.*)$/);
        if (m) {
          const k = m[1].trim(), v = m[2].trim().replace(/^["'](.*)["']$/, '$1');
          if (envFile === '.env.local' || !process.env[k]) process.env[k] = v;
        }
      });
    }
  }
} catch { /* ignore */ }

import {
  generateClaudeResponseStreaming,
  CLAUDE_SYSTEM_PROMPT,
  buildCaseMessage,
  selectRelevantReferences,
  loadReferenceFiles,
} from '../src/adapters/anthropic/index';
import { applyTerminologyFixlistToReport } from '../src/core/reportGeneration/terminology-fixlist';
import { canonicalizeMarkdown } from '../src/core/reportGeneration/canonicalizer';

const PORT = 3001;

// ============================================================================
// HTML UI
// ============================================================================

const HTML_PAGE = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Radon - Sandbox Claude API (Streaming)</title>
  <style>
    :root {
      --bg: #0f0f1a;
      --surface: #1a1a2e;
      --surface2: #222240;
      --accent: #6c63ff;
      --accent-glow: rgba(108,99,255,0.3);
      --text: #e8e8f0;
      --muted: #8888aa;
      --green: #4ade80;
      --red: #f87171;
      --orange: #fb923c;
      --yellow: #fbbf24;
      --cyan: #22d3ee;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      background: var(--bg);
      color: var(--text);
      min-height: 100vh;
    }
    .header {
      background: linear-gradient(135deg, var(--surface) 0%, var(--surface2) 100%);
      border-bottom: 1px solid rgba(108,99,255,0.2);
      padding: 1rem 2rem;
      display: flex; align-items: center; gap: 1rem;
    }
    .header h1 { font-size: 1.3rem; font-weight: 700; }
    .header .badge {
      background: var(--accent);
      padding: 0.2rem 0.6rem;
      border-radius: 4px;
      font-size: 0.7rem;
      font-weight: 600;
    }
    .container {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1.2rem;
      padding: 1.2rem 2rem;
      max-width: 1600px;
      margin: 0 auto;
      min-height: calc(100vh - 60px);
    }
    @media (max-width: 1100px) {
      .container { grid-template-columns: 1fr; }
    }
    .panel {
      background: var(--surface);
      border: 1px solid rgba(255,255,255,0.06);
      border-radius: 12px;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }
    .panel-header {
      padding: 0.7rem 1rem;
      border-bottom: 1px solid rgba(255,255,255,0.06);
      font-weight: 600;
      font-size: 0.9rem;
      display: flex; align-items: center; gap: 0.5rem;
    }
    .panel-body { padding: 1rem; flex: 1; overflow-y: auto; }
    textarea {
      width: 100%;
      min-height: 280px;
      background: var(--bg);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 8px;
      color: var(--text);
      font-family: 'JetBrains Mono', 'Fira Code', monospace;
      font-size: 0.82rem;
      padding: 0.8rem;
      resize: vertical;
      outline: none;
      transition: border-color 0.2s;
    }
    textarea:focus { border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-glow); }
    .row { display: flex; gap: 0.6rem; margin-top: 0.6rem; flex-wrap: wrap; }
    label { font-size: 0.78rem; color: var(--muted); display: block; margin-bottom: 0.2rem; }
    select, input[type="text"] {
      background: var(--bg);
      border: 1px solid rgba(255,255,255,0.1);
      color: var(--text);
      padding: 0.4rem 0.6rem;
      border-radius: 6px;
      font-size: 0.82rem;
      outline: none;
    }
    .field { flex: 1; min-width: 100px; }
    .btn-generate {
      margin-top: 1rem;
      width: 100%;
      padding: 0.7rem;
      background: linear-gradient(135deg, var(--accent), #8b5cf6);
      border: none;
      color: white;
      font-size: 0.95rem;
      font-weight: 700;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.2s;
    }
    .btn-generate:hover { transform: translateY(-1px); box-shadow: 0 4px 20px var(--accent-glow); }
    .btn-generate:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
    .btn-generate.loading { animation: pulse 1.5s infinite; }
    @keyframes pulse { 0%,100% { opacity: 0.6; } 50% { opacity: 1; } }
    /* Output area with tabs */
    .output-tabs {
      display: flex; gap: 0; border-bottom: 1px solid rgba(255,255,255,0.06);
    }
    .tab-btn {
      padding: 0.5rem 1rem;
      background: none; border: none;
      color: var(--muted); font-size: 0.8rem; font-weight: 600;
      cursor: pointer; transition: all 0.2s;
      border-bottom: 2px solid transparent;
    }
    .tab-btn.active { color: var(--accent); border-bottom-color: var(--accent); }
    .tab-btn:hover { color: var(--text); }
    .output-area {
      background: var(--bg);
      border-radius: 0 0 8px 8px;
      padding: 1rem;
      min-height: 300px;
      font-family: 'JetBrains Mono', 'Fira Code', monospace;
      font-size: 0.8rem;
      line-height: 1.6;
      white-space: pre-wrap;
      overflow-y: auto;
      max-height: 60vh;
    }
    .output-area .cursor-blink {
      display: inline-block;
      width: 2px; height: 1em;
      background: var(--accent);
      animation: blink 0.8s infinite;
      vertical-align: text-bottom;
      margin-left: 1px;
    }
    @keyframes blink { 0%,100% { opacity: 1; } 50% { opacity: 0; } }
    /* Phase indicator */
    .phase-indicator {
      padding: 0.4rem 1rem;
      font-size: 0.72rem;
      color: var(--cyan);
      border-bottom: 1px solid rgba(255,255,255,0.04);
      display: none;
    }
    .phase-indicator.visible { display: block; }
    /* Log area */
    .log-area {
      background: #0a0a15;
      border: 1px solid rgba(255,255,255,0.06);
      border-radius: 8px;
      padding: 0.5rem 0.7rem;
      margin-top: 0.6rem;
      max-height: 100px;
      overflow-y: auto;
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.68rem;
      line-height: 1.4;
      color: var(--muted);
    }
    .log-ok { color: var(--green); }
    .log-warn { color: var(--orange); }
    .log-err { color: var(--red); }
    .log-info { color: var(--yellow); }
    /* Action buttons */
    .action-bar {
      display: flex; gap: 0.5rem; flex-wrap: wrap;
      padding: 0.5rem 1rem;
      border-top: 1px solid rgba(255,255,255,0.06);
    }
    .action-btn {
      background: var(--surface2);
      border: 1px solid rgba(255,255,255,0.1);
      color: var(--text);
      padding: 0.35rem 0.7rem;
      border-radius: 6px;
      font-size: 0.75rem;
      cursor: pointer;
      transition: all 0.2s;
    }
    .action-btn:hover { background: var(--accent); border-color: var(--accent); }
    .action-btn:disabled { opacity: 0.3; cursor: not-allowed; }
    /* Meta bar */
    .meta-bar {
      display: flex; gap: 0.8rem; flex-wrap: wrap;
      padding: 0.3rem 1rem;
      border-top: 1px solid rgba(255,255,255,0.06);
      font-size: 0.7rem;
      color: var(--muted);
    }
    .meta-bar .green { color: var(--green); }
    .meta-bar .orange { color: var(--orange); }
    .checkbox-row {
      display: flex; gap: 1rem; margin-top: 0.6rem;
      align-items: center; font-size: 0.82rem;
    }
    .checkbox-row input[type="checkbox"] {
      accent-color: var(--accent);
      width: 15px; height: 15px;
    }
    .checkbox-row label {
      margin: 0; display: flex; align-items: center; gap: 0.3rem; cursor: pointer;
      color: var(--text); font-size: 0.82rem;
    }
    .toast {
      position: fixed; bottom: 2rem; right: 2rem;
      background: var(--green); color: #000; padding: 0.5rem 1rem;
      border-radius: 8px; font-size: 0.82rem; font-weight: 600;
      opacity: 0; transition: opacity 0.3s;
      pointer-events: none; z-index: 100;
    }
    .toast.show { opacity: 1; }
    .empty-state {
      display: flex; flex-direction: column;
      align-items: center; justify-content: center;
      height: 100%; color: var(--muted); text-align: center;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>Radon - Sandbox Claude API</h1>
    <span class="badge">STREAMING + Extended Thinking</span>
  </div>

  <div class="container">
    <!-- INPUT PANEL -->
    <div class="panel">
      <div class="panel-header">Dados do Caso</div>
      <div class="panel-body">
        <label>Cole TUDO aqui (ditado + dados clinicos + laudo previo)</label>
        <textarea id="caseData" placeholder="Cole aqui todo o conteudo do caso em Markdown..."></textarea>

        <div class="row">
          <div class="field">
            <label>Modalidade</label>
            <select id="modality">
              <option value="TC">TC</option>
              <option value="RM">RM</option>
              <option value="USG">USG</option>
            </select>
          </div>
          <div class="field">
            <label>Regiao</label>
            <input type="text" id="region" value="abdome">
          </div>
          <div class="field">
            <label>Nome</label>
            <input type="text" id="patientName" value="TESTE">
          </div>
          <div class="field">
            <label>OS</label>
            <input type="text" id="patientOS" value="000001">
          </div>
        </div>

        <div class="checkbox-row">
          <label><input type="checkbox" id="enableRAG" checked> RAG</label>
          <label><input type="checkbox" id="enableGuards" checked> Guards</label>
          <label><input type="checkbox" id="enableThinking" checked> Thinking</label>
        </div>

        <button class="btn-generate" id="btnGenerate" onclick="generateReport()">
          Gerar Laudo via Claude API
        </button>

        <div class="log-area" id="logArea">
          <div class="log-ok">Sandbox pronto.</div>
        </div>
      </div>
    </div>

    <!-- OUTPUT PANEL -->
    <div class="panel">
      <div class="output-tabs" id="outputTabs">
        <button class="tab-btn active" onclick="switchTab('report')">Laudo</button>
        <button class="tab-btn" onclick="switchTab('thinking')">Thinking</button>
      </div>
      <div class="phase-indicator" id="phaseIndicator"></div>
      <div class="panel-body" style="padding: 0;">
        <div class="output-area" id="outputArea">
          <div class="empty-state">
            <div style="font-size:2.5rem; margin-bottom:0.8rem;">&#128300;</div>
            <div>Cole os dados e clique em <b>Gerar Laudo</b></div>
          </div>
        </div>
      </div>
      <div class="action-bar" id="actionBar" style="display: none;">
        <button class="action-btn" onclick="copyText('report')">Copiar Laudo</button>
        <button class="action-btn" onclick="downloadMD()">Baixar .md</button>
        <button class="action-btn" id="btnCopyThinking" onclick="copyText('thinking')" style="display:none;">Copiar Thinking</button>
      </div>
      <div class="meta-bar" id="metaBar" style="display: none;">
        <span id="metaDuration">-</span>
        <span id="metaTokens">-</span>
        <span id="metaCost" style="color:#4fc3f7;">-</span>
        <span id="metaGuards"></span>
      </div>
    </div>
  </div>

  <div class="toast" id="toast"></div>

  <script>
    var reportText = '';
    var thinkingText = '';
    var currentTab = 'report';
    var startTime = 0;

    function log(msg, type) {
      var area = document.getElementById('logArea');
      var line = document.createElement('div');
      if (type) line.className = 'log-' + type;
      var ts = new Date().toLocaleTimeString('pt-BR');
      line.textContent = '[' + ts + '] ' + msg;
      area.appendChild(line);
      area.scrollTop = area.scrollHeight;
    }

    function showToast(msg) {
      var t = document.getElementById('toast');
      t.textContent = msg;
      t.classList.add('show');
      setTimeout(function() { t.classList.remove('show'); }, 1500);
    }

    function switchTab(tab) {
      currentTab = tab;
      var tabs = document.querySelectorAll('.tab-btn');
      tabs.forEach(function(t) { t.classList.remove('active'); });
      if (tab === 'report') { tabs[0].classList.add('active'); }
      else { tabs[1].classList.add('active'); }
      var output = document.getElementById('outputArea');
      output.textContent = tab === 'report' ? reportText : thinkingText;
      if (!output.textContent) {
        output.textContent = tab === 'report' ? '(aguardando laudo...)' : '(sem thinking)';
      }
    }

    function setPhase(text) {
      var el = document.getElementById('phaseIndicator');
      el.textContent = text;
      el.classList.add('visible');
    }

    function copyText(what) {
      var text = what === 'report' ? reportText : thinkingText;
      if (!text) return;
      navigator.clipboard.writeText(text).then(function() {
        showToast(what === 'report' ? 'Laudo copiado!' : 'Thinking copiado!');
      });
    }

    function downloadMD() {
      if (!reportText) return;
      var content = reportText;
      var blob = new Blob([content], { type: 'text/markdown' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      var ts = new Date().toISOString().slice(0,19).replace(/[T:]/g, '-');
      a.download = 'laudo-claude-' + ts + '.md';
      a.click();
      URL.revokeObjectURL(url);
      log('MD baixado: ' + a.download, 'ok');
    }

    async function generateReport() {
      var btn = document.getElementById('btnGenerate');
      var output = document.getElementById('outputArea');

      var caseData = document.getElementById('caseData').value.trim();
      if (!caseData) {
        log('Cole os dados primeiro', 'err');
        return;
      }

      btn.disabled = true;
      btn.textContent = 'Gerando...';
      btn.classList.add('loading');
      reportText = '';
      thinkingText = '';
      currentTab = 'report';
      document.querySelectorAll('.tab-btn')[0].classList.add('active');
      document.querySelectorAll('.tab-btn')[1].classList.remove('active');
      output.textContent = '';
      document.getElementById('metaBar').style.display = 'none';
      document.getElementById('actionBar').style.display = 'none';
      document.getElementById('btnCopyThinking').style.display = 'none';

      startTime = Date.now();
      var thinking = document.getElementById('enableThinking').checked;
      log('Iniciando | ' + caseData.length + ' chars | Thinking: ' + (thinking ? 'ON' : 'OFF'), 'info');

      var bodyData = {
        caseData: caseData,
        modality: document.getElementById('modality').value,
        region: document.getElementById('region').value.trim(),
        patientName: document.getElementById('patientName').value.trim(),
        patientOS: document.getElementById('patientOS').value.trim(),
        enableRAG: document.getElementById('enableRAG').checked,
        enableGuards: document.getElementById('enableGuards').checked,
        enableThinking: thinking
      };

      log('Conectando ao Claude API...', 'warn');

      try {
        var res = await fetch('/api/stream', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(bodyData)
        });

        if (!res.ok) {
          var errData = await res.json();
          throw new Error(errData.error || 'Erro ' + res.status);
        }

        var reader = res.body.getReader();
        var decoder = new TextDecoder();
        var buffer = '';
        var phase = 'connecting';
        var thinkingStarted = false;
        var textStarted = false;

        while (true) {
          var result = await reader.read();
          if (result.done) break;

          buffer += decoder.decode(result.value, { stream: true });
          var lines = buffer.split('\\n');
          buffer = lines[lines.length - 1];

          for (var i = 0; i < lines.length - 1; i++) {
            var line = lines[i];
            if (!line.startsWith('data: ')) continue;
            var jsonStr = line.substring(6);
            if (!jsonStr) continue;

            try {
              var evt = JSON.parse(jsonStr);

              if (evt.type === 'thinking_delta') {
                if (!thinkingStarted) {
                  thinkingStarted = true;
                  phase = 'thinking';
                  setPhase('Claude esta pensando...');
                  log('Thinking iniciado', 'info');
                }
                thinkingText += evt.text;
                if (currentTab === 'thinking') {
                  output.textContent = thinkingText;
                  output.scrollTop = output.scrollHeight;
                }
              } else if (evt.type === 'text_delta') {
                if (!textStarted) {
                  textStarted = true;
                  phase = 'writing';
                  if (thinkingStarted) {
                    log('Thinking concluido (' + thinkingText.length + ' chars). Gerando laudo...', 'ok');
                    document.getElementById('btnCopyThinking').style.display = '';
                  }
                  setPhase('Escrevendo laudo...');
                  currentTab = 'report';
                  switchTab('report');
                }
                reportText += evt.text;
                if (currentTab === 'report') {
                  output.textContent = reportText;
                  output.scrollTop = output.scrollHeight;
                }
              } else if (evt.type === 'usage') {
                var u = evt.usage;
                var info = [];
                if (u.input_tokens) info.push(u.input_tokens + ' in');
                if (u.output_tokens) info.push(u.output_tokens + ' out');
                if (u.cache_creation_input_tokens) info.push('cache criado: ' + u.cache_creation_input_tokens);
                if (u.cache_read_input_tokens) info.push('cache lido: ' + u.cache_read_input_tokens);
                if (info.length > 0) log('Tokens: ' + info.join(' | '), 'info');
              } else if (evt.type === 'guards') {
                var g = evt.guards;
                var guardsEl = document.getElementById('metaGuards');
                var parts = [];
                if (g.fixlist !== undefined) {
                  if (g.fixlist > 0) {
                    parts.push('<span class="orange">' + g.fixlist + ' termos corrigidos</span>');
                    log('Fixlist: ' + g.fixlist + ' correcoes', 'warn');
                  } else {
                    parts.push('<span class="green">Terminologia OK</span>');
                  }
                }
                if (g.canon !== undefined) {
                  if (g.canon > 0) {
                    parts.push('<span class="orange">' + g.canon + ' formatacoes</span>');
                  }
                }
                guardsEl.innerHTML = parts.join(' ');
                // Update report with guarded version
                if (evt.report) {
                  reportText = evt.report;
                  if (currentTab === 'report') output.textContent = reportText;
                }
              } else if (evt.type === 'done') {
                var elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
                document.getElementById('metaDuration').textContent = elapsed + 's';
                var inTok = evt.inputTokens || 0;
                var outTok = evt.outputTokens || 0;
                var cacheCreated = evt.cacheCreationTokens || 0;
                var cacheRead = evt.cacheReadTokens || 0;
                var tokDetail = inTok + ' in / ' + outTok + ' out';
                if (cacheRead > 0) tokDetail += ' (cache: ' + cacheRead + ')';
                document.getElementById('metaTokens').textContent = tokDetail;

                // Cost calculation — Claude pricing per 1M tokens (2026)
                // Docs: https://docs.anthropic.com/en/docs/about-claude/pricing
                var model = evt.model || 'claude-opus-4-6';
                var priceIn, priceOut, priceCacheRead, priceCacheCreate;
                if (model.includes('opus')) {
                  // Opus 4.5/4.6: $5 in, $25 out
                  // Cache 1h: Write = 2x ($10), Read = 0.1x ($0.50)
                  priceIn = 5; priceOut = 25; priceCacheRead = 0.5; priceCacheCreate = 10.0;
                } else if (model.includes('sonnet')) {
                  // Sonnet 4/4.5: $3 in, $15 out
                  priceIn = 3; priceOut = 15; priceCacheRead = 0.3; priceCacheCreate = 3.75;
                } else if (model.includes('haiku')) {
                  // Haiku 4.5: $1 in, $5 out
                  priceIn = 1; priceOut = 5; priceCacheRead = 0.1; priceCacheCreate = 1.25;
                } else {
                  priceIn = 3; priceOut = 15; priceCacheRead = 0.3; priceCacheCreate = 3.75;
                }
                var regularIn = Math.max(0, inTok - cacheRead - cacheCreated);
                var costIn = (regularIn / 1e6) * priceIn;
                var costOut = (outTok / 1e6) * priceOut;
                var costCacheRead = (cacheRead / 1e6) * priceCacheRead;
                var costCacheCreate = (cacheCreated / 1e6) * priceCacheCreate;
                var totalCost = costIn + costOut + costCacheRead + costCacheCreate;
                var costWithoutCache = ((inTok / 1e6) * priceIn) + costOut;
                var savings = costWithoutCache > 0 ? ((1 - totalCost / costWithoutCache) * 100).toFixed(0) : '0';

                var costStr = '$' + totalCost.toFixed(4);
                if (cacheRead > 0) costStr += ' (economia cache: ' + savings + '%)';
                document.getElementById('metaCost').textContent = costStr;

                document.getElementById('metaBar').style.display = 'flex';
                document.getElementById('actionBar').style.display = 'flex';
                setPhase('Concluido em ' + elapsed + 's');
                log('Laudo completo! ' + reportText.length + ' chars em ' + elapsed + 's | Custo: ' + costStr, 'ok');
              } else if (evt.type === 'error') {
                throw new Error(evt.error);
              } else if (evt.type === 'log') {
                log(evt.message, evt.level || 'info');
              }
            } catch (parseErr) {
              if (parseErr.message && !parseErr.message.includes('JSON')) throw parseErr;
            }
          }
        }

      } catch (err) {
        output.textContent = 'Erro: ' + err.message;
        log('ERRO: ' + err.message, 'err');
        document.getElementById('phaseIndicator').classList.remove('visible');
      } finally {
        btn.disabled = false;
        btn.textContent = 'Gerar Laudo via Claude API';
        btn.classList.remove('loading');
      }
    }
  </script>
</body>
</html>`;

// ============================================================================
// SERVER
// ============================================================================

function sseWrite(res: http.ServerResponse, data: any) {
  res.write('data: ' + JSON.stringify(data) + '\n\n');
}

async function handleStream(body: any, res: http.ServerResponse) {
  // SSE headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
  });

  if (!process.env.ANTHROPIC_API_KEY) {
    sseWrite(res, { type: 'error', error: 'ANTHROPIC_API_KEY nao configurada' });
    res.end();
    return;
  }

  if (!body.caseData) {
    sseWrite(res, { type: 'error', error: 'Dados do caso sao obrigatorios' });
    res.end();
    return;
  }

  console.log(`[API] Stream | ${body.caseData.length} chars | thinking: ${body.enableThinking}`);

  const startTime = Date.now();
  let fullText = '';
  let fullThinking = '';
  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let cacheCreationTokens = 0;
  let cacheReadTokens = 0;

  // RAG
  let referencesContent: string | undefined;
  const refIndices: number[] = [];
  if (body.enableRAG !== false) {
    refIndices.push(...selectRelevantReferences(body.caseData));
    if (refIndices.length > 0) {
      referencesContent = loadReferenceFiles(refIndices);
      sseWrite(res, { type: 'log', message: `RAG: ${refIndices.length} referencias encontradas`, level: 'info' });
      console.log(`[API] RAG: ${refIndices.length} refs`);
    }
  }

  // Build message
  const userMessage = buildCaseMessage({
    transcription: body.caseData,
    modality: body.modality,
    region: body.region,
    patientName: body.patientName,
    patientOS: body.patientOS,
    selectedReferences: referencesContent,
  });

  sseWrite(res, { type: 'log', message: 'Conectado. Streaming iniciado...', level: 'ok' });

  try {
    const stream = generateClaudeResponseStreaming({
      systemPrompt: CLAUDE_SYSTEM_PROMPT,
      userMessage,
      maxTokens: 16384,
      enableThinking: body.enableThinking !== false,
      thinkingBudget: 10000,
    });

    for await (const chunk of stream) {
      if (chunk.type === 'thinking_delta') {
        fullThinking += chunk.text;
        sseWrite(res, chunk);
      } else if (chunk.type === 'text_delta') {
        fullText += chunk.text;
        sseWrite(res, chunk);
      } else if (chunk.type === 'usage') {
        if (chunk.usage.input_tokens) totalInputTokens = chunk.usage.input_tokens;
        if (chunk.usage.output_tokens) totalOutputTokens += chunk.usage.output_tokens;
        if (chunk.usage.cache_creation_input_tokens) cacheCreationTokens = chunk.usage.cache_creation_input_tokens;
        if (chunk.usage.cache_read_input_tokens) cacheReadTokens = chunk.usage.cache_read_input_tokens;
        sseWrite(res, chunk);
      } else if (chunk.type === 'error') {
        sseWrite(res, chunk);
        res.end();
        return;
      }
    }

    // Apply guards
    if (body.enableGuards !== false) {
      const fixResult = applyTerminologyFixlistToReport(fullText);
      fullText = fixResult.text;

      const canonResult = canonicalizeMarkdown(fullText);
      fullText = canonResult.text;

      sseWrite(res, {
        type: 'guards',
        guards: { fixlist: fixResult.totalFixes, canon: canonResult.corrections.length },
        report: fullText,
      });
      console.log(`[API] Guards: fix=${fixResult.totalFixes} canon=${canonResult.corrections.length}`);
    }

    const elapsed = Date.now() - startTime;
    const model = process.env.CLAUDE_MODEL || 'claude-opus-4-6';
    sseWrite(res, {
      type: 'done',
      durationMs: elapsed,
      inputTokens: totalInputTokens,
      outputTokens: totalOutputTokens,
      cacheCreationTokens,
      cacheReadTokens,
      model,
    });

    console.log(`[API] Streaming completo em ${elapsed}ms | text=${fullText.length} thinking=${fullThinking.length}`);

  } catch (err: any) {
    console.error(`[API] ERRO: ${err.message}`);
    sseWrite(res, { type: 'error', error: err.message });
  }

  res.end();
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || '/', `http://localhost:${PORT}`);

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  // HTML
  if (url.pathname === '/' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(HTML_PAGE);
    return;
  }

  // SSE streaming endpoint
  if (url.pathname === '/api/stream' && req.method === 'POST') {
    let bodyStr = '';
    req.on('data', chunk => { bodyStr += chunk; });
    req.on('end', async () => {
      try {
        const body = JSON.parse(bodyStr);
        await handleStream(body, res);
      } catch (error: any) {
        if (!res.headersSent) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: error.message }));
        }
      }
    });
    return;
  }

  res.writeHead(404);
  res.end('Not Found');
});

server.listen(PORT, () => {
  console.log('');
  console.log('  Radon - Sandbox Claude API v3 (STREAMING)');
  console.log('  ------------------------------------------');
  console.log(`  Servidor: http://localhost:${PORT}`);
  console.log(`  Modelo: ${process.env.CLAUDE_MODEL || 'claude-opus-4-6'}`);
  console.log(`  API Key: ${process.env.ANTHROPIC_API_KEY ? '****' + process.env.ANTHROPIC_API_KEY.slice(-4) : 'NAO ENCONTRADA'}`);
  console.log(`  System prompt: ${CLAUDE_SYSTEM_PROMPT.length} chars`);
  console.log('');
});
