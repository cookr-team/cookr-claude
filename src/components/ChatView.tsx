import React, { useState, useEffect, useRef, useCallback } from "react";
import { User } from "../types";
import { ICONS } from "../constants";
import { supabase, isSupabaseConfigured, isSupabaseReachable } from "../lib/supabaseClient";
import { supabaseService, toValidUUID, ADMIN_SUPPORT_UUID } from "../services/supabaseService";

import { tr } from "../lib/tr";
import { useLanguage } from "../contexts/LanguageContext";
interface ChatViewProps {
  currentUser: User;
  partnerId: string;
  onBack: () => void;
  isReadOnly?: boolean;
}

const ChatView: React.FC<ChatViewProps> = ({
  currentUser,
  partnerId,
  onBack,
  isReadOnly,
}) => {
  useLanguage();
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [partner, setPartner] = useState<User | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const effectivePartnerId = partnerId === "admin-support" ? ADMIN_SUPPORT_UUID : toValidUUID(partnerId);
  const effectiveCurrentUserId = toValidUUID(currentUser.id);

  const fetchMessages = useCallback(async () => {
    if (!isSupabaseConfigured() || !isSupabaseReachable()) {
      return;
    }
    try {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .or(
          `and(sender_id.eq.${effectiveCurrentUserId},receiver_id.eq.${effectivePartnerId}),and(sender_id.eq.${effectivePartnerId},receiver_id.eq.${effectiveCurrentUserId})`
        )
        .order("created_at", { ascending: true });

      if (!error && data) {
        setMessages(data);
      }
    } catch (err) {
      console.warn("[Supabase Chat] Could not fetch messages:", err);
    }
  }, [effectiveCurrentUserId, effectivePartnerId]);

  useEffect(() => {
    const loadPartner = async () => {
      try {
        if (partnerId === "admin-support") {
          setPartner({
            id: ADMIN_SUPPORT_UUID,
            nome: "Suporte Cookr",
            email: "suporte@cookr.pt",
            role: "admin",
            status: "active",
            avatar_url: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=100&auto=format&fit=crop&q=80",
          } as any);
          return;
        }
        const profile = await supabaseService.getProfileById(effectivePartnerId);
        if (profile) {
          setPartner(profile);
        }
      } catch (err) {
        console.warn("Note loading chat partner:", err);
      }
    };
    loadPartner();
    fetchMessages();

    if (!isSupabaseConfigured() || !isSupabaseReachable()) {
      return;
    }

    const channel = supabase
      .channel(`chat-${effectiveCurrentUserId}-${effectivePartnerId}-${Date.now()}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "messages",
        },
        (payload) => {
          if (payload.new) {
            const m = payload.new as any;
            const isRelevant =
              (m.sender_id === effectiveCurrentUserId && m.receiver_id === effectivePartnerId) ||
              (m.sender_id === effectivePartnerId && m.receiver_id === effectiveCurrentUserId);
            if (isRelevant) {
              setMessages((prev) => {
                if (prev.some((existing) => existing.id === m.id)) return prev;
                return [...prev, m];
              });
            }
          }
          fetchMessages();
        }
      )
      .subscribe((status) => {
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          try {
            supabase.removeChannel(channel);
          } catch {
            // ignore cleanup
          }
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [effectiveCurrentUserId, effectivePartnerId, partnerId, fetchMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!newMessage.trim()) return;
    const text = newMessage.trim();
    const msg = {
      id: crypto.randomUUID(),
      sender_id: effectiveCurrentUserId,
      receiver_id: effectivePartnerId,
      content: text,
      created_at: new Date().toISOString(),
    };
    
    // Optimistic instant append
    setMessages((prev) => [...prev, msg]);
    setNewMessage("");

    try {
      const { error } = await supabase.from("messages").insert(msg);
      if (error) {
        console.warn("Note inserting chat message:", error.message || error);
      }
    } catch (error) {
      console.warn("Note sending chat message:", error);
    }
  };

  return (
    <div className="fixed inset-0 z-[500] bg-white flex flex-col animate-in slide-in-from-bottom-8 duration-500">
      {/* Header */}
      <header className="px-4 pt-[calc(env(safe-area-inset-top,0px)+0.75rem)] pb-3 border-b border-slate-100 flex justify-between items-center bg-white/80 backdrop-blur-md sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="w-8 h-8 bg-slate-50 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-950 transition-all shadow-sm"
          >
            <ICONS.ChevronLeft size={16} />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-slate-100 overflow-hidden border border-slate-200">
              {partner?.avatar_url && partner.avatar_url !== "" ? (
                <img
                  src={partner.avatar_url}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center font-bold text-slate-300 text-[10px]">
                  {(partner?.nome || "U").charAt(0)}
                </div>
              )}
            </div>
            <div className="text-left">
              <h4 className="text-xs font-bold text-slate-950 uppercase tracking-tight leading-none">
                {partner?.nome}
              </h4>
              <div className="flex items-center gap-1 mt-0.5">
                <div className="w-1 h-1 bg-emerald-500 rounded-full animate-pulse" />
                <span className="text-[7px] font-bold text-slate-400 uppercase tracking-wider">
                  {tr("Online")}
                </span>
              </div>
            </div>
          </div>
        </div>
        <button className="w-8 h-8 bg-slate-50 rounded-lg flex items-center justify-center text-slate-400 hover:text-orange-500 transition-all shadow-sm">
          <ICONS.Phone size={14} />
        </button>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide">
        {messages.map((msg, idx) => {
          const isMe = msg.sender_id === currentUser.id;
          return (
            <div
              key={idx}
              className={`flex ${isMe ? "justify-end" : "justify-start"} animate-in fade-in slide-in-from-bottom-2`}
            >
              <div
                className={`max-w-[85%] md:max-w-[65%] p-3.5 rounded-2xl text-left ${isMe ? "bg-slate-950 text-white rounded-tr-none shadow-md" : "bg-slate-50 text-slate-950 rounded-tl-none border border-slate-100"}`}
              >
                <p className="text-xs font-normal leading-relaxed">
                  {msg.content}
                </p>
                <p
                  className={`text-[6px] font-bold uppercase tracking-wider mt-1.5 ${isMe ? "text-white/30" : "text-slate-300"}`}
                >
                  {new Date(msg.created_at).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-3 sm:p-4 pb-[calc(env(safe-area-inset-bottom,0px)+0.75rem)] bg-white border-t border-slate-100">
        {isReadOnly ? (
          <div className="max-w-2xl mx-auto p-3 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-center">
            <p className="text-[8px] font-bold text-slate-400 uppercase tracking-wider italic">
              {tr("O Ritual terminou. Esta conversa está em modo de visualização.")}
            </p>
          </div>
        ) : (
          <div className="max-w-2xl mx-auto flex gap-2">
            <div className="flex-1 relative">
              <input
                className="w-full h-10 px-4 pr-10 bg-slate-50 rounded-xl font-medium text-xs outline-none border border-transparent focus:border-orange-500 transition-all text-slate-800 placeholder-slate-400"
                placeholder={tr("Escreve a tua mensagem...")}
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleSend()}
              />
              <button className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 text-slate-400 hover:text-orange-500 transition-colors flex items-center justify-center">
                <ICONS.Paperclip size={14} />
              </button>
            </div>
            <button
              onClick={handleSend}
              className="w-10 h-10 bg-slate-950 text-white rounded-xl flex items-center justify-center shadow-md hover:bg-orange-500 transition-all active:scale-95"
            >
              <ICONS.Send size={15} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatView;
