'use client';

import { useState, useEffect, useMemo } from 'react';
import { Check, Copy, ExternalLink, FileJson, Film, X } from 'lucide-react';

const CACHE_KEY = 'toolb_step1_json_talking';
const GUIDE_URL = 'https://chatgpt.com/g/g-6a6ddb87eca88191bea109d550a06b8a-aiyeongsanggicodajigi';
const FLOW_URL = 'https://labs.google/fx/tools/flow';

function humanize(key) {
  return String(key).replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function renderValue(v) {
  if (Array.isArray(v)) {
    return v.map((x) => (x && typeof x === 'object' ? JSON.stringify(x) : String(x))).join(', ');
  }
  return String(v);
}

// JSON 프롬프트를 값 중심의 읽기 좋은 프롬프트 텍스트로 변환 (Step1Client.js 와 동일 로직)
function renderPrompt(obj) {
  if (!obj || typeof obj !== 'object') return '';
  const lines = [];
  for (const [key, val] of Object.entries(obj)) {
    if (val === '' || val == null) continue;

    if (key === 'timeline' && Array.isArray(val)) {
      lines.push('');
      lines.push('■ Timeline');
      val.forEach((sc, i) => {
        if (!sc || typeof sc !== 'object') return;
        const time = sc.time || `#${i + 1}`;
        const title = sc.scene_title ? ` ${sc.scene_title}` : '';
        lines.push('');
        lines.push(`[${time}]${title}`);
        for (const [k, v] of Object.entries(sc)) {
          if (k === 'time' || k === 'scene_title') continue;
          if (v === '' || v == null) continue;
          lines.push(`  · ${humanize(k)}: ${renderValue(v)}`);
        }
      });
      continue;
    }

    if (typeof val === 'object' && !Array.isArray(val)) {
      lines.push('');
      lines.push(`■ ${humanize(key)}`);
      for (const [k, v] of Object.entries(val)) {
        if (v === '' || v == null) continue;
        lines.push(`  · ${humanize(k)}: ${renderValue(v)}`);
      }
      continue;
    }

    lines.push(`${humanize(key)}: ${renderValue(val)}`);
  }
  return lines.join('\n').trim();
}

function parseJsonText(text) {
  const raw = (text || '').trim();
  if (!raw) return { ok: false, error: 'JSON을 입력해 주세요.' };
  const cleaned = raw.replace(/^```(?:json|JSON)?\s*\n?/, '').replace(/\n?```\s*$/, '').trim();
  for (const cand of [raw, cleaned]) {
    try {
      const o = JSON.parse(cand);
      if (o && typeof o === 'object') return { ok: true, obj: o };
    } catch (e) { /* try next candidate */ }
  }
  return { ok: false, error: '올바른 JSON 형식이 아니에요. 다시 확인해 주세요.' };
}

export default function Step1MobileClient() {
  const [rawJson, setRawJson] = useState('');
  const [hydrated, setHydrated] = useState(false);
  const [toast, setToast] = useState(null); // { msg, type: 'success' | 'error' }
  const [copied, setCopied] = useState(false);

  const [uploadOpen, setUploadOpen] = useState(false);
  const [pasteInput, setPasteInput] = useState('');
  const [pasteError, setPasteError] = useState('');

  useEffect(() => {
    let initial = '';
    try {
      const saved = localStorage.getItem(CACHE_KEY);
      initial = saved != null ? saved : '';
    } catch (e) { /* localStorage unavailable */ }
    setRawJson(initial);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try { localStorage.setItem(CACHE_KEY, rawJson); } catch (e) { /* localStorage unavailable */ }
  }, [rawJson, hydrated]);

  const { parsed, parseError } = useMemo(() => {
    const raw = (rawJson || '').trim();
    if (!raw) return { parsed: null, parseError: '' };
    const result = parseJsonText(raw);
    return result.ok ? { parsed: result.obj, parseError: '' } : { parsed: null, parseError: result.error };
  }, [rawJson]);

  const dialogues = useMemo(() => {
    const tl = parsed && Array.isArray(parsed.timeline) ? parsed.timeline : [];
    const out = [];
    tl.forEach((e, i) => {
      if (e && typeof e === 'object' && 'dialogue' in e) {
        out.push({
          index: i,
          time: e.time || `#${i + 1}`,
          dialogue: typeof e.dialogue === 'string' ? e.dialogue : String(e.dialogue ?? ''),
          sceneTitle: typeof e.scene_title === 'string' ? e.scene_title : '',
          action: typeof e.action === 'string' ? e.action : '',
        });
      }
    });
    return out;
  }, [parsed]);

  const promptText = useMemo(() => renderPrompt(parsed), [parsed]);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2600);
  };

  const onDialogueChange = (index, val) => {
    if (!parsed) return;
    const next = JSON.parse(JSON.stringify(parsed));
    if (Array.isArray(next.timeline) && next.timeline[index]) {
      next.timeline[index].dialogue = val;
      setRawJson(JSON.stringify(next, null, 2));
    }
  };

  const copyPrompt = () => {
    if (!promptText) return;
    navigator.clipboard.writeText(promptText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2600);
    }).catch(() => showToast('복사에 실패했어요. 다시 시도해 주세요.', 'error'));
  };

  const applyJsonText = (text) => {
    const result = parseJsonText(text);
    if (!result.ok) { setPasteError(result.error); return; }
    setRawJson(JSON.stringify(result.obj, null, 2));
    setUploadOpen(false);
    setPasteError('');
    setPasteInput('');
    showToast('불러오기 완료! 아래에서 대사를 수정해 주세요.', 'success');
  };

  return (
    <div className="tbm-page auth-scroll">
      <style jsx global>{`
        html, body {
          scrollbar-width: none;
          -ms-overflow-style: none;
        }
        html::-webkit-scrollbar, body::-webkit-scrollbar {
          display: none;
          width: 0;
          height: 0;
        }
        .tbm-page {
          --tbm-bg: #ffffff;
          --tbm-fg: #18181b;
          --tbm-muted: #f4f4f5;
          --tbm-muted-fg: #52525b;
          --tbm-border: #d4d4d8;
          --tbm-primary: #ea580c;
          --tbm-primary-hover: #c2410c;
          --tbm-primary-fg: #ffffff;
          --tbm-done-bg: #f0fdf4;
          --tbm-done-border: #86efac;
          --tbm-done-fg: #15803d;
          --tbm-danger-bg: #fef2f2;
          --tbm-danger-border: #fecaca;
          --tbm-danger-fg: #b91c1c;

          min-height: 100vh;
          background: var(--tbm-bg);
          color: var(--tbm-fg);
          font-size: 18px;
          line-height: 1.7;
          word-break: keep-all;
          -webkit-text-size-adjust: 100%;
        }
        .tbm-page :focus-visible {
          outline: 3px solid color-mix(in srgb, var(--tbm-primary) 55%, transparent);
          outline-offset: 2px;
        }
        .tbm-wrap {
          max-width: 560px;
          margin: 0 auto;
        }
        .tbm-title {
          font-size: 34px; font-weight: 900; line-height: 1.35;
          padding: 24px 16px 18px;
          letter-spacing: -0.01em;
          text-align: center;
        }
        .tbm-actionbar {
          position: sticky; top: 0; z-index: 40;
          display: flex; flex-direction: column; gap: 10px;
          padding: 14px 16px;
          background: var(--tbm-bg);
          border-bottom: 2px solid var(--tbm-border);
        }
        .tbm-btn {
          display: flex; align-items: center; justify-content: center; gap: 10px;
          width: 100%;
          min-height: 58px;
          padding: 14px 18px;
          border-radius: 14px;
          font-size: 18px; font-weight: 700;
          border: 2px solid transparent;
          cursor: pointer;
          transition: transform 0.15s ease, background-color 0.15s ease, opacity 0.15s ease;
        }
        .tbm-btn:active { transform: scale(0.97); }
        .tbm-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .tbm-actionrow {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 6px;
          width: 100%;
        }
        .tbm-actionrow .tbm-btn {
          flex-direction: row;
          gap: 4px;
          width: 100%;
          min-height: 76px;
          padding: 10px 2px;
          font-size: 15px;
          font-weight: 800;
          border-radius: 12px;
          text-align: center;
          line-height: 1.2;
          white-space: normal;
        }
        .tbm-actionrow .tbm-btn svg {
          width: 18px; height: 18px;
          flex-shrink: 0;
        }
        @media (max-width: 380px) {
          .tbm-actionrow .tbm-btn {
            font-size: 13px;
            padding: 10px 2px;
          }
          .tbm-actionrow .tbm-btn svg {
            width: 16px; height: 16px;
          }
        }
        .tbm-btn-outline {
          color: var(--tbm-fg);
          background: #fff;
          border-color: var(--tbm-border);
        }
        .tbm-btn-outline:hover { background: var(--tbm-muted); }
        .tbm-btn-primary {
          color: var(--tbm-primary-fg);
          background: var(--tbm-primary);
        }
        .tbm-btn-primary:hover { background: var(--tbm-primary-hover); }
        .tbm-btn-dark {
          color: #fff;
          background: var(--tbm-fg);
        }
        .tbm-btn-ghost {
          color: var(--tbm-fg);
          background: var(--tbm-muted);
          border-color: var(--tbm-border);
        }
        .tbm-copied-banner {
          margin-top: -2px;
          padding: 12px 14px;
          border-radius: 12px;
          background: var(--tbm-done-bg);
          border: 2px solid var(--tbm-done-border);
          color: var(--tbm-done-fg);
          font-size: 15px;
          font-weight: 700;
          text-align: center;
        }
        .tbm-main {
          padding: 20px 16px 60px;
        }
        .tbm-section-title {
          font-size: 22px; font-weight: 900;
          margin-bottom: 6px;
        }
        .tbm-empty {
          text-align: center;
          padding: 32px 18px;
          background: var(--tbm-muted);
          border: 2px dashed var(--tbm-border);
          border-radius: 16px;
        }
        .tbm-empty p {
          font-size: 16px; font-weight: 700;
          color: var(--tbm-muted-fg);
        }
        .tbm-card {
          background: #fff;
          border: 2px solid var(--tbm-border);
          border-radius: 18px;
          margin-bottom: 16px;
          overflow: hidden;
        }
        .tbm-card-head {
          display: flex; align-items: center; gap: 10px;
          padding: 12px 16px;
          background: var(--tbm-muted);
          border-bottom: 2px solid var(--tbm-border);
        }
        .tbm-card-body {
          padding: 16px;
        }
        .tbm-badge {
          font-size: 15px; font-weight: 800;
          color: #fff;
          background: var(--tbm-primary);
          padding: 4px 12px;
          border-radius: 8px;
        }
        .tbm-time {
          font-size: 14px; font-weight: 700;
          color: var(--tbm-muted-fg);
        }
        .tbm-textarea {
          width: 100%;
          resize: none;
          font-size: 19px;
          line-height: 1.7;
          padding: 14px;
          border-radius: 12px;
          background: #fff;
          border: 2px solid var(--tbm-border);
          color: var(--tbm-fg);
        }
        .tbm-textarea:focus {
          outline: none;
          border-color: var(--tbm-primary);
          box-shadow: 0 0 0 4px color-mix(in srgb, var(--tbm-primary) 18%, transparent);
        }
        .tbm-hint {
          margin-top: 8px;
          font-size: 14px;
          color: var(--tbm-muted-fg);
        }
        .tbm-scene-desc {
          margin-top: 12px;
          padding: 14px 16px;
          border-radius: 12px;
          background: var(--tbm-muted);
          font-size: 20px;
          line-height: 1.75;
          color: var(--tbm-muted-fg);
        }
        .tbm-scene-desc b {
          color: var(--tbm-fg);
          font-weight: 800;
        }
        .tbm-modal-overlay {
          position: fixed; inset: 0; z-index: 300;
          background: rgba(24,24,27,0.45);
          display: flex; align-items: flex-end; justify-content: center;
        }
        .tbm-modal {
          width: 100%; max-width: 560px;
          max-height: 88vh;
          background: #fff;
          border-top-left-radius: 22px;
          border-top-right-radius: 22px;
          border: 2px solid var(--tbm-border);
          border-bottom: none;
          display: flex; flex-direction: column;
          overflow: hidden;
        }
        .tbm-modal-head {
          display: flex; align-items: center; justify-content: space-between;
          padding: 16px 18px;
          border-bottom: 2px solid var(--tbm-border);
        }
        .tbm-modal-title {
          font-size: 19px; font-weight: 900;
          display: flex; align-items: center; gap: 8px;
        }
        .tbm-modal-close {
          width: 40px; height: 40px;
          display: flex; align-items: center; justify-content: center;
          border-radius: 100px;
          background: var(--tbm-muted);
          color: var(--tbm-muted-fg);
          border: none;
        }
        .tbm-modal-body {
          padding: 18px;
          overflow-y: auto;
          scrollbar-width: none;
          -ms-overflow-style: none;
        }
        .tbm-modal-body::-webkit-scrollbar {
          display: none;
        }
        .tbm-modal-desc {
          font-size: 16px;
          color: var(--tbm-muted-fg);
          line-height: 1.7;
          margin-bottom: 12px;
        }
        .tbm-paste-textarea {
          width: 100%; height: 200px; resize: vertical;
          font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
          font-size: 14px; line-height: 1.6;
          padding: 12px;
          border-radius: 12px;
          background: var(--tbm-muted);
          border: 2px solid var(--tbm-border);
          color: var(--tbm-fg);
          margin-bottom: 12px;
        }
        .tbm-paste-textarea:focus {
          outline: none;
          border-color: var(--tbm-primary);
        }
        .tbm-error {
          font-size: 15px; font-weight: 700;
          color: var(--tbm-danger-fg);
          background: var(--tbm-danger-bg);
          border: 2px solid var(--tbm-danger-border);
          border-radius: 12px;
          padding: 10px 12px;
          margin-bottom: 12px;
        }
        .tbm-toast {
          position: fixed;
          bottom: 20px; left: 50%;
          transform: translateX(-50%);
          z-index: 400;
          padding: 12px 20px;
          border-radius: 12px;
          font-size: 16px; font-weight: 700;
          box-shadow: 0 12px 28px rgba(0,0,0,0.15);
          max-width: 90vw;
          text-align: center;
        }
        .tbm-toast-success {
          background: var(--tbm-done-bg);
          border: 2px solid var(--tbm-done-border);
          color: var(--tbm-done-fg);
        }
        .tbm-toast-error {
          background: var(--tbm-danger-bg);
          border: 2px solid var(--tbm-danger-border);
          color: var(--tbm-danger-fg);
        }
      `}</style>

      <h1 className="tbm-title tbm-wrap">AI 영상기초 다지기</h1>

      {/* Sticky action bar */}
      <div className="tbm-actionbar">
        <div className="tbm-wrap tbm-actionrow">
          <a href={GUIDE_URL} target="_blank" rel="noreferrer" className="tbm-btn tbm-btn-outline">
            <ExternalLink className="w-5 h-5" />
            지침열기
          </a>
          <button
            onClick={() => { setUploadOpen(true); setPasteError(''); setPasteInput(''); }}
            className="tbm-btn tbm-btn-primary"
          >
            <FileJson className="w-5 h-5" />
            업로드
          </button>
          <button
            onClick={copyPrompt}
            disabled={!promptText}
            className={`tbm-btn ${copied ? 'tbm-btn-dark' : 'tbm-btn-primary'}`}
          >
            {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
            {copied ? '복사완료' : '복사'}
          </button>
          <a href={FLOW_URL} target="_blank" rel="noreferrer" className="tbm-btn tbm-btn-dark">
            <Film className="w-5 h-5" />
            영상제작
          </a>
        </div>
        {copied && (
          <p className="tbm-copied-banner tbm-wrap" style={{ marginTop: 10 }}>이제 대사 수정을 마친 뒤 붙여넣을 곳에 붙여넣으세요.</p>
        )}
      </div>

      <main className="tbm-main tbm-wrap">
        <h2 className="tbm-section-title">🗣️ 대사 수정하기</h2>

        {dialogues.length === 0 ? (
          <div className="tbm-empty">
            <p>{parseError ? 'JSON 형식이 올바르지 않아요.' : '위의 JSON 업로드 버튼을 눌러 내용을 불러와 주세요.'}</p>
          </div>
        ) : (
          dialogues.map((d) => (
            <div key={d.index} className="tbm-card">
              <div className="tbm-card-head">
                <span className="tbm-badge">장면 {d.index + 1}</span>
                <span className="tbm-time">{d.time}</span>
              </div>
              <div className="tbm-card-body">
                <textarea
                  rows={3}
                  value={d.dialogue}
                  placeholder="대사를 입력하세요..."
                  onChange={(e) => onDialogueChange(d.index, e.target.value)}
                  className="tbm-textarea"
                />
                <p className="tbm-scene-desc">
                  <b>장면 설명 · </b>
                  {d.sceneTitle || d.action
                    ? [d.sceneTitle, d.action].filter(Boolean).join(' — ')
                    : '설명이 없는 장면이에요.'}
                </p>
                {!d.dialogue && (
                  <p className="tbm-hint">지금은 대사 없이 지나가는 장면이에요. 필요하면 적어주세요.</p>
                )}
              </div>
            </div>
          ))
        )}
      </main>

      {/* Upload modal */}
      {uploadOpen && (
        <div className="tbm-modal-overlay" onClick={() => setUploadOpen(false)}>
          <div className="tbm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="tbm-modal-head">
              <span className="tbm-modal-title">
                <FileJson className="w-5 h-5" style={{ color: 'var(--tbm-primary)' }} />
                JSON 업로드
              </span>
              <button className="tbm-modal-close" onClick={() => setUploadOpen(false)}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="tbm-modal-body">
              <p className="tbm-modal-desc">GPT 화면에서 복사한 JSON 내용을 아래에 붙여넣어 주세요.</p>
              <textarea
                value={pasteInput}
                onChange={(e) => setPasteInput(e.target.value)}
                spellCheck={false}
                className="tbm-paste-textarea"
                placeholder='{"project_title": "...", "timeline": [ ... ]}'
              />
              {pasteError && <div className="tbm-error">{pasteError}</div>}

              <button onClick={() => applyJsonText(pasteInput)} className="tbm-btn tbm-btn-primary" style={{ marginBottom: 10 }}>
                불러오기
              </button>
              <button onClick={() => setUploadOpen(false)} className="tbm-btn tbm-btn-ghost">
                취소
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className={`tbm-toast ${toast.type === 'error' ? 'tbm-toast-error' : 'tbm-toast-success'}`}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}
