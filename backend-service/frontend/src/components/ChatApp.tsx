import React, { useEffect, useRef, useState } from "react";
import { Menu, Send, X, MessageSquarePlus, Cpu, Trash2, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type Msg = { id: string; role: "user" | "assistant"; content: string; ts: number };
const uid = () => Math.random().toString(36).slice(2, 10);

const initialMessages: Msg[] = [
  { id: uid(), role: "assistant", content: "안녕하세요! 무엇을 도와드릴까요?", ts: Date.now() - 20000 },
  { id: uid(), role: "user", content: "사이드바 토글 되는 챗 UI 보여줘.", ts: Date.now() - 15000 },
  { id: uid(), role: "assistant", content: "좌측 사이드바 + 우측 채팅창 + 하단 입력창 레이아웃입니다.", ts: Date.now() - 12000 },
];

async function fakeAIResponse(prompt: string): Promise<string> {
  await new Promise((r) => setTimeout(r, 800));
  if (/hello|안녕/i.test(prompt)) return "반가워요! 무엇을 만들어 볼까요?";
  if (/help|도와줘/i.test(prompt)) return "원하는 기능을 구체적으로 알려주세요.";
  return `"${prompt}" 에 대한 응답 예시입니다. 실제 API를 연결하면 여기를 교체하세요.`;
}

function Bubble({ m }: { m: Msg }) {
  const isUser = m.role === "user";
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ type: "spring", stiffness: 300, damping: 22 }}
      className={`flex ${isUser ? "justify-end" : "justify-start"}`}
    >
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-3 shadow-sm whitespace-pre-wrap leading-relaxed text-sm md:text-base break-words border ${
          isUser
            ? "bg-black text-white border-black/10 rounded-tr-sm"
            : "bg-zinc-100 text-zinc-900 border-zinc-200 rounded-tl-sm"
        }`}
      >
        {m.content}
      </div>
    </motion.div>
  );
}

function SideItem({ icon: Icon, label, onClick }: { icon: any; label: string; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-zinc-800/10 dark:hover:bg-zinc-700/40 transition"
    >
      <Icon className="w-4 h-4" />
      <span className="text-sm">{label}</span>
    </button>
  );
}

export default function ChatApp() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [messages, setMessages] = useState<Msg[]>(initialMessages);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, isSending]);

  const canSend = input.trim().length > 0 && !isSending;

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const text = input.trim();
    if (!text) return;
    const userMsg: Msg = { id: uid(), role: "user", content: text, ts: Date.now() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");

    const typingMsg: Msg = { id: uid(), role: "assistant", content: "…", ts: Date.now() };
    setMessages((prev) => [...prev, typingMsg]);
    setIsSending(true);

    try {
      const reply = await fakeAIResponse(text);
      setMessages((prev) => prev.map((m) => (m.id === typingMsg.id ? { ...m, content: reply } : m)));
    } finally {
      setIsSending(false);
    }
  };

  const clearChat = () => setMessages([]);

  // lg 미만: 닫기, lg 이상: 열기
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 1024px)");
    const setByMQ = (ev: MediaQueryListEvent | MediaQueryList) => setSidebarOpen(!ev.matches);
    setByMQ(mq);
    const listener = (ev: MediaQueryListEvent) => setByMQ(ev);
    mq.addEventListener("change", listener);
    return () => mq.removeEventListener("change", listener);
  }, []);

  return (
    // 화면에 딱 붙게: h-dvh + w-full + overflow-x-hidden (w-screen 지양)
    <div className="fixed inset-0 overflow-hidden bg-white text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      {/* Top bar */}
      <div className="h-14 border-b border-zinc-200 dark:border-zinc-800 flex items-center px-3 gap-2">
        <button
          aria-label="Toggle sidebar"
          className="p-2 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800"
          onClick={() => setSidebarOpen((v) => !v)}
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="font-semibold">AI in SJ Studio🤖</div>
      </div>

      {/* 그리드: 갭 0 + 데스크톱에서만 2열, 사이드바 폭을 0↔280px 토글 */}
      <div
        className="grid gap-0 lg:[grid-template-columns:var(--cols)]"
        style={
          {
            // @ts-ignore
            "--cols": sidebarOpen ? "280px 1fr" : "0 1fr",
            height: "calc(100dvh - 3.5rem)",
            transition: "grid-template-columns 200ms ease",
          } as React.CSSProperties
        }
      >
        {/* Sidebar (DOM 유지, 폭만 0으로 줄어듦) */}
        <aside className="hidden lg:flex h-full min-w-0 overflow-y-auto border-r border-zinc-200 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-900/50 backdrop-blur-md">
          <div className="h-full flex flex-col p-3 gap-3 w-full">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-wide text-zinc-500">채팅</span>
            </div>
            <div className="flex-1 overflow-y-auto pr-1">
              <SideItem icon={MessageSquarePlus} label="새 채팅" onClick={() => setMessages([])} />
              <SideItem icon={Cpu} label="API 연결 자리" onClick={() => alert("여기에 실제 OpenAI/LLM 연결 메뉴를 붙이세요.")} />
            </div>
            <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800">
              <SideItem icon={Trash2} label="대화 전체 삭제" onClick={clearChat} />
            </div>
          </div>
        </aside>

        {/* Main */}
        <section className="relative flex flex-col min-h-0 min-w-0 w-full overflow-x-hidden">
          {/* 메시지 리스트 */}
          <div className="flex-1 min-w-0 w-full max-w-none overflow-y-auto px-3 sm:px-6 py-4 space-y-3">
            <AnimatePresence initial={false}>
              {messages.map((m) => (
                <Bubble key={m.id} m={m} />
              ))}
            </AnimatePresence>
            {isSending && (
              <div className="flex items-center gap-2 text-xs text-zinc-500">
                <Loader2 className="w-4 h-4 animate-spin" /> 응답 생성 중…
              </div>
            )}
            <div ref={endRef} />
          </div>

          {/* 입력 영역 (좌우 꽉 차게: mx-auto / max-w-* 없음) */}
          <form
            onSubmit={handleSubmit}
            className="sticky bottom-0 left-0 right-0 bg-white/80 dark:bg-zinc-950/80 backdrop-blur supports-[backdrop-filter]:bg-white/60"
          >
            <div className="px-3 sm:px-6 py-3">
              <div className="flex items-center gap-2">
                <div className="flex-1 flex items-center bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm px-3 py-2">
                  <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="무엇이든 물어보세요 (Shift+Enter 줄바꿈)"
                    rows={1}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSubmit();
                      }
                    }}
                    className="flex-1 resize-none bg-transparent outline-none text-sm md:text-base leading-6 max-h-40 self-center"
                    aria-label="메시지 입력"
                  />
                  <button
                    type="submit"
                    disabled={!canSend}
                    className={`ml-2 inline-flex items-center justify-center p-2 rounded-xl border transition shadow-sm ${
                      canSend
                        ? "bg-black text-white border-black hover:opacity-90"
                        : "bg-zinc-200 text-zinc-500 border-zinc-300 cursor-not-allowed"
                    }`}
                    aria-label="메시지 보내기"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <p className="mt-2 text-xs text-zinc-500">
                AI는 실수를 할 수 있습니다. 중요한 정보는 재차 확인하세요.
              </p>
            </div>
          </form>
        </section>
      </div>

      {/* 모바일 드로어 */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            key="drawer"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="lg:hidden fixed inset-0 z-40 pointer-events-none"
          >
            <div className="absolute inset-0 bg-black/20 pointer-events-auto" onClick={() => setSidebarOpen(false)} />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: "spring", stiffness: 260, damping: 26 }}
              className="pointer-events-auto absolute left-0 top-0 bottom-0 w-[80%] max-w-[300px] bg-zinc-50 dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800 p-3"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-semibold">메뉴</span>
                <button className="p-2 rounded-xl hover:bg-zinc-200/60" onClick={() => setSidebarOpen(false)}>
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-2">
                <SideItem icon={MessageSquarePlus} label="새 채팅" onClick={() => setMessages([])} />
                <SideItem icon={Cpu} label="API 연결 자리" onClick={() => alert("여기에 실제 OpenAI/LLM 연결 메뉴를 붙이세요.")} />
                <SideItem icon={Trash2} label="대화 전체 삭제" onClick={clearChat} />
              </div>
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
