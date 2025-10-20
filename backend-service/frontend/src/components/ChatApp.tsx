import React, { useEffect, useRef, useState, useMemo } from "react";

/**
 * RAG 프론트 MVP (+ 모바일/태블릿에서 우측 패널 토글)
 * - lg 미만에서는 버튼으로 패널을 오버레이/드로어로 표시
 * - lg 이상에서는 기존처럼 고정 우측 패널
 *
 * 2025-10-14 업데이트 v2
 * - 긴 입력 시 컨테이너를 벗어나지 않도록 textarea max-height + 내부 스크롤 유지
 * - 입력창 컨테이너: 그림자 제거, 테두리(border) 적용
 * - 모서리 둥근 정도: 첨부 예시 수준으로 조정 (rounded-[18px])
 */

// 타입들
 type Phase =
  | "queued"
  | "parsing"
  | "chunking"
  | "embedding"
  | "indexing"
  | "done"
  | "error"
  | "unknown";

 type Citation = {
  docId: string;
  title?: string;
  page?: number;
  chunkId?: string;
  score?: number; // 0~1
  text?: string;
  url?: string;
 };

 type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  citations?: Citation[];
  confidence?: number;
  createdAt: number;
 };

 type Session = {
  id: string;
  title: string;
  collections: string[]; // 선택한 보관함 목록
 };

 // 색상 매핑
 type NSColor = { badge: string; dot: string };
 function nsColor(name: string): NSColor {
  const palettes = [
    { badge: "bg-rose-100 text-rose-800", dot: "bg-rose-500" },
    { badge: "bg-amber-100 text-amber-800", dot: "bg-amber-500" },
    { badge: "bg-emerald-100 text-emerald-800", dot: "bg-emerald-500" },
    { badge: "bg-sky-100 text-sky-800", dot: "bg-sky-500" },
    { badge: "bg-indigo-100 text-indigo-800", dot: "bg-indigo-500" },
    { badge: "bg-fuchsia-100 text-fuchsia-800", dot: "bg-fuchsia-500" },
  ];
  let h = 0; for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return palettes[h % palettes.length];
 }

// 유틸
 const uid = () => Math.random().toString(36).slice(2, 10);
 const fmtTime = (t: number) => new Date(t).toLocaleTimeString();

// 샘플 데이터
 const SAMPLE_CITATIONS: Citation[] = [
  { docId: "d1", title: "모바일 2024", page: 8, score: 0.82, text: "…스마트폰 출하량…" },
  { docId: "d2", title: "글로벌 스마트폰 동향", page: 15, score: 0.71 },
  { docId: "d3", title: "표시 2023", page: 4, score: 0.66 },
 ];

// 인덱싱 단계 뱃지
 function IndexingSteps({ phase }: { phase: Phase | null }) {
  if (!phase) return null;
  if (phase === "error") return (
    <div className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs text-rose-600">
      <span className="h-2 w-2 rounded-full bg-rose-500" /> 처리 실패
    </div>
  );
  if (phase === "done") return (
    <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs text-emerald-700">
      <span className="h-2 w-2 rounded-full bg-emerald-600" /> 처리 완료
    </div>
  );
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs text-gray-700">
      <span className="h-2 w-2 animate-pulse rounded-full bg-gray-900" /> 처리 중…
    </div>
  );
 }

 // 오른쪽 패널
 type RightTab = "근거" | "출처" | "신뢰도";
 function RightPanel({ citations, confidence, tab, setTab }: {
  citations: Citation[]; confidence?: number; tab: RightTab; setTab: (t: RightTab) => void;
 }) {
  return (
    <div className="flex h-full flex-col p-3">
      <div className="flex gap-2 border-b border-gray-200">
        {["근거", "출처", "신뢰도"].map((t) => (
          <button key={t} onClick={() => setTab(t as RightTab)}
            className={`-mb-px rounded-t-lg px-3 py-1.5 text-sm ${tab === t ? "border-x border-t border-gray-200 bg-white font-semibold" : "border border-transparent bg-gray-100 text-gray-600 hover:bg-gray-50"}`}>{t}</button>
        ))}
      </div>
      <div className="mt-3 flex-1 overflow-auto">
        {tab !== "신뢰도" ? (
          <ul className="space-y-3">
            {citations?.length ? citations.map((c, i) => (
              <li key={i} className="rounded-lg border border-gray-200 p-3">
                <div className="flex items-center justify-between">
                  <div className="font-medium text-gray-900">{c.title || c.docId}</div>
                  {typeof c.score === "number" && (<div className="text-xs text-gray-500">score {c.score.toFixed(2)}</div>)}
                </div>
                <div className="text-xs text-gray-500">{c.page ? `페이지 ${c.page}` : "페이지 정보 없음"}</div>
                {c.text && (<p className="mt-2 line-clamp-3 text-sm text-gray-700">{c.text}</p>)}
                {c.url && (<a className="mt-2 inline-block text-xs text-blue-600 underline" href={c.url} target="_blank" rel="noreferrer">원문 열기</a>)}
              </li>
            )) : (<div className="text-sm text-gray-500">표시할 근거가 없습니다.</div>)}
          </ul>
        ) : (
          <div>
            <div className="mb-2 text-sm font-medium text-gray-900">신뢰도</div>
            <div className="h-2 w-full rounded-full bg-gray-200"><div className="h-2 rounded-full bg-gray-900" style={{ width: `${Math.round((confidence ?? 0) * 100)}%` }} /></div>
            <div className="mt-1 text-xs text-gray-600">{(confidence ?? 0).toFixed(2)} / 1.00</div>
          </div>
        )}
      </div>
    </div>
  );
 }

 // 보관함 셀렉트 (검색+생성)
 function NamespaceSelect({
  options, value, onChange, onCreate, placeholder = "문서 보관함 선택 또는 생성",
 }: { options: string[]; value?: string; onChange: (v?: string) => void; onCreate: (name: string) => void; placeholder?: string; }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    function onDoc(e: MouseEvent) { if (!ref.current) return; if (!ref.current.contains(e.target as Node)) setOpen(false); }
    document.addEventListener("mousedown", onDoc); return () => document.removeEventListener("mousedown", onDoc);
  }, []);
  const filtered = useMemo(() => { const k = q.trim().toLowerCase(); return !k ? options : options.filter((o) => o.toLowerCase().includes(k)); }, [options, q]);
  const showCreate = q.trim().length > 0 && !options.some((o) => o.toLowerCase() === q.trim().toLowerCase());
  return (
    <div className="relative" ref={ref}>
      <div className={`flex min-h-[40px] items-center gap-2 rounded-lg border px-2 py-1 ${open ? "ring-2 ring-gray-900" : "border-gray-300"}`} onClick={() => setOpen(true)}>
        {value ? (
          <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-sm ${nsColor(value).badge}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${nsColor(value).dot}`} />{value}
            <button className="ml-1 text-xs opacity-70 hover:opacity-100" onClick={(e) => { e.stopPropagation(); onChange(undefined); }} aria-label="clear">×</button>
          </span>
        ) : (
          <input className="flex-1 bg-transparent text-sm outline-none placeholder:text-gray-400" value={q} onChange={(e) => setQ(e.target.value)} placeholder={placeholder} />
        )}
      </div>
      {open && (
        <div className="absolute z-20 mt-1 w-full rounded-lg border border-gray-200 bg-white p-1 shadow-lg">
          <div className="px-2 py-1 text-xs font-medium text-gray-500">옵션 선택 또는 생성</div>
          <ul className="max-h-56 overflow-auto">
            {filtered.map((o) => (
              <li key={o}>
                <button onClick={() => { onChange(o); setOpen(false); setQ(""); }} className="flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left hover:bg-gray-50">
                  <span className={`inline-flex items-center gap-2 text-sm ${nsColor(o).badge} rounded px-2 py-0.5`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${nsColor(o).dot}`} />{o}
                  </span>
                </button>
              </li>
            ))}
          </ul>
          {showCreate && (
            <button onClick={() => { onCreate(q.trim()); onChange(q.trim()); setOpen(false); setQ(""); }} className="mt-1 w-full rounded-md bg-gray-900 px-2 py-1.5 text-sm text-white">“{q.trim()}” 새로 만들기</button>
          )}
        </div>
      )}
    </div>
  );
 }

 // 업로드 드롭존(파일 타입: PDF/TXT만)
 function UploadDropzone({
  onUpload, namespaces, onCreateNamespace, requireSelection = true,
 }: { onUpload: (file: File, namespace?: string) => void; namespaces: string[]; onCreateNamespace: (name: string) => void; requireSelection?: boolean; }) {
  const [dragOver, setDragOver] = useState(false);
  const [ns, setNs] = useState<string | undefined>(undefined);

  // 마지막 선택 보관함 기억
  useEffect(() => { const last = localStorage.getItem("last_ns"); if (last && namespaces.includes(last)) setNs(last); }, [namespaces]);
  useEffect(() => { if (ns) localStorage.setItem("last_ns", ns); }, [ns]);

  const stopIfNoNS = () => { if (requireSelection && !ns) { alert("먼저 문서 보관함을 선택하세요."); return true; } return false; };

  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault(); setDragOver(false); if (stopIfNoNS()) return;
    const f = e.dataTransfer.files?.[0]; if (!f) return;
    if (!allowFile(f)) { alert("PDF 또는 TXT만 업로드할 수 있습니다."); return; }
    onUpload(f, ns);
  };

  const pick = () => {
    if (stopIfNoNS()) return;
    const input = document.createElement("input"); input.type = "file"; input.accept = ".pdf,.txt,application/pdf,text/plain";
    input.onchange = () => { const f = input.files?.[0]; if (!f) return; if (!allowFile(f)) { alert("PDF 또는 TXT만 업로드할 수 있습니다."); return; } onUpload(f, ns); };
    input.click();
  };

  const disabled = requireSelection && !ns;

  return (
    <div className="space-y-3">
      {/* 문서 보관함 선택 (상단) */}
      <div className="grid grid-cols-1 gap-2">
        <div className="flex flex-col">
          <label className="mb-1 text-xs text-gray-500">문서 보관함{requireSelection ? "(필수)" : "(선택)"}</label>
          <NamespaceSelect options={namespaces} value={ns} onChange={setNs} onCreate={onCreateNamespace} placeholder="예: report-2025, plan-2026" />
          <p className="mt-1 text-[11px] text-gray-500">{requireSelection ? "보관함을 먼저 선택해야 업로드할 수 있어요." : "선택하지 않으면 기본 보관함에 저장됩니다."}</p>
        </div>
      </div>

      {/* 업로드 영역 (하단) */}
      <div onDragOver={(e) => { e.preventDefault(); if (!disabled) setDragOver(true); }} onDragLeave={() => setDragOver(false)} onDrop={onDrop} aria-disabled={disabled}
        className={`flex h-28 items-center justify-center rounded-xl border-2 border-dashed transition ${disabled ? "pointer-events-none border-gray-200 bg-gray-50 opacity-60" : dragOver ? "border-gray-900 bg-gray-50" : "border-gray-300"}`}>
        <div className="text-center text-sm text-gray-600">
          <div className="mb-1 font-medium text-gray-900">파일을 드래그하여 업로드</div>
          <div>PDF 또는 TXT만 허용됩니다.</div>
          <button onClick={pick} className="mt-2 rounded-lg border border-gray-300 px-2 py-1 text-xs hover:bg-gray-50">파일 선택</button>
        </div>
      </div>
    </div>
  );
 }

 function allowFile(f: File) {
  const okType = ["application/pdf", "text/plain"]; const ext = f.name.toLowerCase().slice(f.name.lastIndexOf(".") + 1); const okExt = ["pdf", "txt"]; return okType.includes(f.type) || okExt.includes(ext);
 }

// 메인 컴포넌트
 export default function App() {
  const [session] = useState<Session>({ id: uid(), title: "새 세션", collections: [] });
  const [collections, setCollections] = useState<string[]>([]);
  const [availableCollections, setAvailableCollections] = useState<string[]>(["mobile-2024", "ai-reports", "hr-policy"]);

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);

  const [jobId, setJobId] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase | null>(null);

  const [rightTab, setRightTab] = useState<RightTab>("근거");
  const [lastCitations, setLastCitations] = useState<Citation[]>([]);
  const [lastConfidence, setLastConfidence] = useState<number | undefined>(undefined);

  const [isRightOpen, setIsRightOpen] = useState(false); // ⬅ 모바일 패널 토글 상태

  const listRef = useRef<HTMLDivElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null); // ⬅ 입력창 참조(자동 높이)

  useEffect(() => { listRef.current?.scrollTo({ top: listRef.current.scrollHeight }); }, [messages]);

  // textarea 자동 높이 조절 (컨테이너를 넘지 않도록 최대 160px)
  useEffect(() => {
    const ta = taRef.current;
    if (!ta) return;
    const max = 160; // px, 약 6~7줄
    ta.style.height = "auto"; // 줄바꿈 시 먼저 리셋
    const newH = Math.min(ta.scrollHeight, max);
    ta.style.height = `${newH}px`;
    ta.style.overflowY = ta.scrollHeight > max ? "auto" : "hidden";
  }, [input]);

  const handleUpload = async (file: File, namespace?: string) => {
    setJobId("job_" + uid()); setPhase("parsing");
    const steps: Phase[] = ["parsing", "chunking", "embedding", "indexing", "done"]; let i = 0;
    const timer = setInterval(() => { setPhase(steps[i]); i++; if (i >= steps.length) clearInterval(timer); }, 900);
    console.log("upload", { name: file.name, namespace });
  };

  const send = async () => {
    if (!input.trim() || sending) return; const text = input.trim(); setInput("");
    const userMsg: Message = { id: uid(), role: "user", content: text, createdAt: Date.now() }; setMessages((m) => [...m, userMsg]);
    setSending(true);
    try {
      const demo = `요청: ${text}\n\n선택한 보관함(${collections.join(", ") || "미선택"})에서 검색 후 요약합니다.`;
      await new Promise((r) => setTimeout(r, 800));
      const aiMsg: Message = { id: uid(), role: "assistant", content: demo, citations: SAMPLE_CITATIONS, confidence: 0.76, createdAt: Date.now() };
      setMessages((m) => [...m, aiMsg]); setLastCitations(aiMsg.citations || []); setLastConfidence(aiMsg.confidence);
    } finally { setSending(false); }
  };

  const quicks = ["요약해줘", "FAQ 만들어줘", "표로 정리해줘"];
  const createNamespace = (name: string) => { setAvailableCollections((prev) => (prev.includes(name) ? prev : [...prev, name])); };

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden">
      {/* Topbar */}
      <header className="flex items-center justify-between border-b border-gray-200 px-4 py-2">
        <div className="flex items-center gap-2">
          <div className="font-bold">RAG Studio</div>
          <span className="rounded-md border border-gray-200 px-2 py-0.5 text-xs text-gray-600">tenant: demo</span>
        </div>
        <div className="flex items-center gap-2">
          {/* 모바일에서 우측 패널 열기 버튼 */}
          <button onClick={() => setIsRightOpen(true)} className="lg:hidden rounded-lg border border-gray-200 px-2 py-1 text-sm hover:bg-gray-50">
            근거/출처
          </button>
          {/* <button className="rounded-lg border border-gray-200 px-2 py-1 text-sm hover:bg-gray-50">Settings</button> */}
        </div>
      </header>

      <div className="grid h-[calc(100vh-49px)] w-full grid-cols-[260px_1fr] lg:grid-cols-[260px_1fr_320px] overflow-x-hidden">
        {/* Sidebar */}
        <aside className="flex h-full flex-col overflow-auto border-r border-gray-200 p-3">
          <div className="mb-3 text-xs font-semibold text-gray-500">채팅</div>
          <div className="space-y-1"><button className="w-full truncate rounded-lg px-2 py-1 text-left text-sm hover:bg-gray-50">새 세션</button></div>

          <div className="mt-5 text-xs font-semibold text-gray-500">문서 보관함</div>
          <div className="mt-2 flex flex-wrap gap-2">
            {availableCollections.map((c) => {
              const active = collections.includes(c);
              return (
                <button key={c} onClick={() => setCollections((prev) => prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c])}
                  className={`rounded-full border px-2 py-0.5 text-xs transition ${active ? "border-gray-900 bg-gray-900 text-white" : "border-gray-300 text-gray-700 hover:bg-gray-50"}`}>{c}</button>
              );
            })}
          </div>

          <div className="mt-6">
            <div className="mb-2 text-xs font-semibold text-gray-500">문서 업로드</div>
            <UploadDropzone onUpload={handleUpload} namespaces={availableCollections} onCreateNamespace={createNamespace} requireSelection={true} />
            <div className="mt-3">{jobId && <IndexingSteps phase={phase} />}</div>
          </div>
        </aside>

        {/* Main */}
        <main className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-gray-200 px-4 py-2">
            <div className="flex items-center gap-2">
              <div className="text-sm text-gray-600">세션:</div>
              <div className="text-sm font-medium text-gray-900">{session.title}</div>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-600">
              {collections.length ? (
                collections.map((c) => (<span key={c} className="rounded-full border border-gray-300 px-2 py-0.5">{c}</span>))
              ) : (
                <span className="rounded-md bg-amber-50 px-2 py-0.5 text-amber-700">검색 범위를 선택하세요</span>
              )}
            </div>
          </div>

          <div ref={listRef} className="flex-1 overflow-auto p-4">
            {!messages.length && (
              <div className="mx-auto max-w-xl rounded-2xl border border-dashed border-gray-300 p-6 text-center text-gray-600">
                질문을 입력하거나 파일을 업로드해 시작하세요.
                <div className="mt-3 flex flex-wrap justify-center gap-2">
                  {quicks.map((q) => (<button key={q} onClick={() => setInput(q)} className="rounded-full border border-gray-300 px-3 py-1 text-xs hover:bg-gray-50">{q}</button>))}
                </div>
              </div>
            )}

            <div className="mx-auto flex max-w-3xl flex-col gap-3">
              {messages.map((m) => (
                <div key={m.id} className={`rounded-2xl border px-4 py-3 ${m.role === "user" ? "border-gray-300" : "border-gray-200 bg-white"}`}>
                  <div className="mb-1 text-xs text-gray-500">{m.role === "user" ? "You" : "Assistant"} · {fmtTime(m.createdAt)}</div>
                  <div className="whitespace-pre-wrap text-sm text-gray-900">{m.content}</div>
                  {m.role === "assistant" && m.citations?.length ? (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {m.citations.slice(0, 3).map((c, i) => (<span key={i} className="rounded bg-gray-100 px-1.5 py-0.5 text-[11px] text-gray-700">[{i + 1}] {c.title || c.docId}</span>))}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </div>

          {/* 입력 영역 (상단 줄 제거 / 캡슐형 컨테이너 → 예시 수준 라운딩) */}
          <div className="p-3">
            <div className="mx-auto flex max-w-3xl items-center gap-2 rounded-[18px] border border-gray-300 bg-white px-3 py-2">
              {/* textarea (멀티라인 + 자동 높이, 컨테이너 초과 방지) */}
              <textarea
                ref={taRef}
                className="flex-1 min-h-[44px] resize-none bg-transparent text-sm text-gray-900 outline-none placeholder:text-gray-400"
                placeholder="무엇이든 물어보세요"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send();
                  }
                }}
              />

              {/* 전송 버튼 (블랙 원형 + 위쪽 화살표) */}
              <button
                onClick={send}
                disabled={sending || !input.trim()}
                aria-label="전송"
                className={`flex h-9 w-9 items-center justify-center rounded-full bg-black text-white transition ${
                  sending || !input.trim() ? "opacity-50 cursor-not-allowed" : "hover:bg-gray-800"
                }`}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  className="h-5 w-5"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 19V5m0 0l-7 7m7-7l7 7" />
                </svg>
              </button>
            </div>
          </div>
        </main>

        {/* Right Panel (고정) */}
        <div className="hidden min-w-0 border-l border-gray-200 lg:block">
          <RightPanel citations={lastCitations} confidence={lastConfidence} tab={rightTab} setTab={setRightTab} />
        </div>
      </div>

      {/* 모바일/태블릿 오버레이 패널 */}
      {isRightOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/30" onClick={() => setIsRightOpen(false)} />
          <div className="absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-200 px-3 py-2">
              <div className="text-sm font-medium">근거/출처</div>
              <button onClick={() => setIsRightOpen(false)} className="rounded-md border border-gray-300 px-2 py-1 text-xs hover:bg-gray-50">닫기</button>
            </div>
            <RightPanel citations={lastCitations} confidence={lastConfidence} tab={rightTab} setTab={setRightTab} />
          </div>
        </div>
      )}
    </div>
  );
 }
