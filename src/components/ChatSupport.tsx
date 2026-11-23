import React, { useState, useEffect, useRef } from "react";
import { ICONS } from "../constants";
import { User } from "../types";
import { motion, AnimatePresence } from "motion/react";
import { apiFetch } from "../lib/apiClient";

import { tr, getTrLanguage } from "../lib/tr";
import { useLanguage } from "../contexts/LanguageContext";
interface ChatSupportProps {
  user: User;
}

const ChatSupport: React.FC<ChatSupportProps> = ({ user }) => {
  useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<
    { role: "user" | "ai"; text: string }[]
  >([
    {
      role: "ai",
      text: `Olá ${user.nome}! Sou o seu Concierge Cookr. Como posso elevar a sua experiência gastronómica hoje?`,
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", text: userMessage }]);
    setIsLoading(true);

    try {
      const response = await apiFetch("/api/gemini/chat-support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userName: user.nome,
          userRole: user.role,
          userLocation: user.localizacao,
          userMessage,
          history: messages.slice(-10),
          language: getTrLanguage(),
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to call chat-support api");
      }

      const resData = await response.json();
      const aiText = resData.text || tr("Desculpe, tive um pequeno precalço na cozinha. Pode repetir?");
      setMessages((prev) => [...prev, { role: "ai", text: aiText }]);
    } catch (error) {
      console.error("AI Error:", error);
      setMessages((prev) => [
        ...prev,
        {
          role: "ai",
          text: tr("Lamento, estou com dificuldades técnicas. Por favor, tente mais tarde."),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-[1000] flex flex-col items-end">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="mb-4 w-[320px] md:w-[380px] h-[500px] bg-white rounded-[2.5rem] shadow-3xl border border-slate-100 flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="p-6 bg-slate-950 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-500 rounded-2xl flex items-center justify-center shadow-lg shadow-orange-500/20">
                  <ICONS.Zap size={20} className="text-white" />
                </div>
                <div className="text-left">
                  <h4 className="text-xs font-black uppercase tracking-widest">
                    {tr("Concierge Cookr")}
                  </h4>
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                    <span className="text-[8px] font-black text-white/40 uppercase tracking-widest">
                      {tr("Online Agora")}
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-white/20 hover:text-white transition-colors"
              >
                <ICONS.XCircle size={20} />
              </button>
            </div>

            {/* Messages */}
            <div
              ref={scrollRef}
              className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-hide"
            >
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] p-4 rounded-2xl text-left ${
                      msg.role === "user"
                        ? "bg-orange-500 text-white rounded-tr-none shadow-lg shadow-orange-500/10"
                        : "bg-slate-50 text-slate-950 rounded-tl-none border border-slate-100"
                    }`}
                  >
                    <p className="text-xs font-medium leading-relaxed">
                      {tr(msg.text as any) as any}
                    </p>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-slate-50 p-4 rounded-2xl rounded-tl-none border border-slate-100">
                    <div className="flex gap-1">
                      <div className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-bounce" />
                      <div className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-bounce [animation-delay:0.2s]" />
                      <div className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-bounce [animation-delay:0.4s]" />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Input */}
            <div className="p-4 bg-slate-50 border-t border-slate-100">
              <div className="relative flex items-center">
                <input
                  type="text"
                  placeholder={tr("Como posso ajudar?")}
                  className="w-full h-12 pl-6 pr-14 bg-white rounded-xl border border-slate-200 outline-none focus:border-orange-500 font-bold text-xs transition-all"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleSend()}
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || isLoading}
                  className="absolute right-2 w-8 h-8 bg-slate-950 text-white rounded-lg flex items-center justify-center hover:bg-orange-500 transition-all disabled:opacity-20"
                >
                  <ICONS.Send size={14} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-16 h-16 rounded-[1.5rem] flex items-center justify-center shadow-3xl transition-all duration-500 active:scale-90 group ${
          isOpen
            ? "bg-slate-950 text-white rotate-90"
            : "bg-orange-500 text-white hover:scale-110"
        }`}
      >
        {isOpen ? (
          <ICONS.XCircle size={24} />
        ) : (
          <ICONS.MessageSquare
            size={24}
            className="group-hover:rotate-12 transition-transform"
          />
        )}
        {!isOpen && (
          <div className="absolute -top-1 -right-1 w-5 h-5 bg-slate-950 text-white text-[8px] font-black rounded-full flex items-center justify-center border-2 border-white animate-bounce">
            1
          </div>
        )}
      </button>
    </div>
  );
};

export default ChatSupport;
