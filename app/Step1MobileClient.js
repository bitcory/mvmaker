'use client';

import { useState, useEffect, useMemo } from 'react';
import { ArrowRight, Check, Copy, ExternalLink, FileJson, Film, Sparkles, X } from 'lucide-react';

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
      <header className="tbm-hero">
        <div className="tbm-wrap">
          <div className="tbm-brand" aria-label="한컷 AI">
            <span className="tbm-logo" aria-hidden="true">
              <Film />
              <Sparkles />
            </span>
            <span>한컷 AI</span>
          </div>

          <div className="tbm-hero-card">
            <div className="tbm-hero-copy">
              <span className="tbm-eyebrow">AI 영상 만들기 · 첫걸음</span>
              <h1 className="tbm-title">대사만 고치면<br />영상 준비 끝!</h1>
              <p className="tbm-subtitle">어려운 기능 없이, 아래 순서대로 천천히 따라 해보세요.</p>
            </div>
            <img
              className="tbm-hero-image"
              src="/images/ai-video-guide-hero.webp"
              alt="태블릿으로 영상을 만드는 어르신 일러스트"
            />
          </div>
        </div>
      </header>

      <div className="tbm-actionbar">
        <div className="tbm-wrap">
          <div className="tbm-step-heading">
            <div>
              <span className="tbm-kicker">쉬운 4단계</span>
              <h2>어디서부터 시작할까요?</h2>
            </div>
            <span className="tbm-step-time">약 5분</span>
          </div>
          <div className="tbm-actionrow">
          <a href={GUIDE_URL} target="_blank" rel="noreferrer" className="tbm-btn tbm-btn-outline">
            <span className="tbm-step-number">1</span>
            <span className="tbm-btn-copy"><small>먼저</small>지침 열기</span>
            <ExternalLink className="tbm-action-icon" />
          </a>
          <button
            onClick={() => { setUploadOpen(true); setPasteError(''); setPasteInput(''); }}
            className="tbm-btn tbm-btn-primary"
          >
            <span className="tbm-step-number">2</span>
            <span className="tbm-btn-copy"><small>JSON 붙여넣기</small>내용 불러오기</span>
            <FileJson className="tbm-action-icon" />
          </button>
          <button
            onClick={copyPrompt}
            disabled={!promptText}
            className={`tbm-btn ${copied ? 'tbm-btn-done' : 'tbm-btn-secondary'}`}
          >
            <span className="tbm-step-number">3</span>
            <span className="tbm-btn-copy"><small>{promptText ? '수정이 끝나면' : '불러온 다음'}</small>{copied ? '복사 완료' : '프롬프트 복사'}</span>
            {copied ? <Check className="tbm-action-icon" /> : <Copy className="tbm-action-icon" />}
          </button>
          <a href={FLOW_URL} target="_blank" rel="noreferrer" className="tbm-btn tbm-btn-dark">
            <span className="tbm-step-number">4</span>
            <span className="tbm-btn-copy"><small>마지막</small>영상 만들기</span>
            <ArrowRight className="tbm-action-icon" />
          </a>
          </div>
        </div>
        {copied && (
          <p className="tbm-copied-banner tbm-wrap">복사했어요! 이제 4번 ‘영상 만들기’를 눌러 붙여넣으세요.</p>
        )}
      </div>

      <main className="tbm-main tbm-wrap">
        <div className="tbm-section-head">
          <span className="tbm-section-icon" aria-hidden="true">가</span>
          <div>
            <span className="tbm-kicker">내 영상의 목소리</span>
            <h2 className="tbm-section-title">대사를 고쳐보세요</h2>
          </div>
        </div>

        {dialogues.length === 0 ? (
          <div className="tbm-empty">
            <span className="tbm-empty-icon"><FileJson /></span>
            <strong>{parseError ? '내용을 다시 확인해 주세요' : '아직 불러온 내용이 없어요'}</strong>
            <p>{parseError ? 'JSON 형식이 올바르지 않습니다.' : <>위의 2번 ‘내용 불러오기’를 누르면<br />여기에 대사가 나타납니다.</>}</p>
            {!parseError && (
              <button
                onClick={() => { setUploadOpen(true); setPasteError(''); setPasteInput(''); }}
                className="tbm-empty-cta"
              >
                지금 내용 불러오기 <ArrowRight />
              </button>
            )}
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
              <button aria-label="업로드 창 닫기" className="tbm-modal-close" onClick={() => setUploadOpen(false)}>
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
