import { useState, useRef, useEffect } from "react";
import { Message, UserInfo, PlayerStatus } from "../types";
import { motion, AnimatePresence } from "motion/react";
import { Send, CheckCircle2 } from "lucide-react";
import { cn } from "../lib/utils";

interface GameRoomProps {
  messages: Message[];
  onSendMessage: (text: string) => void;
  userInfo: UserInfo;
  isGMThinking: boolean;
  isGameStarted?: boolean;
  players?: PlayerStatus[];
  isDiceRolling?: boolean;
  diceResult?: number | null;
  targetNumber?: number | null;
  currentTarget?: { name: string; hp: number; maxHp: number } | null;
  playersReady?: string[]; // New prop to track who finished their action
}

export function GameRoom({ 
  messages, 
  onSendMessage, 
  userInfo, 
  isGMThinking,
  isGameStarted,
  players,
  isDiceRolling,
  diceResult,
  targetNumber,
  currentTarget,
  playersReady = [],
}: GameRoomProps) {
  const [inputText, setInputText] = useState("");
  const [showDiceResult, setShowDiceResult] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isDiceRolling) {
      if (diceResult === null) {
        setShowDiceResult(false);
      } else {
        // We have a result, wait for the mechanical slow-down animation (2.2s) to finish
        const timer = setTimeout(() => {
          setShowDiceResult(true);
        }, 2200); 
        return () => clearTimeout(timer);
      }
    } else {
      setShowDiceResult(false);
    }
  }, [isDiceRolling, diceResult]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isGMThinking]);

  const handleSend = () => {
    if (!inputText.trim()) return;
    onSendMessage(inputText);
    setInputText("");
  };

  const handleChoiceClick = (choice: string) => {
    if (choice.includes("직접 행동 입력")) {
      setInputText("당신의 행동을 입력해주세요");
      // Focus input
      const input = document.querySelector('input[type="text"]') as HTMLInputElement;
      if (input) {
        input.focus();
        input.select();
      }
    } else {
      onSendMessage(choice);
    }
  };

  return (
    <div className="flex flex-col h-full w-full relative">
      {/* Side Action Status: Turn Tracking */}
      {isGameStarted && (
        <div className="absolute top-6 right-6 z-30 pointer-events-none">
          <div className="flex flex-col items-end">
            <span className="text-[9px] text-editorial-gold opacity-40 uppercase tracking-[0.2em] font-serif mb-1">Active Destinies</span>
            <div className="flex flex-col gap-1.5 items-end">
              {(players || []).filter(p => !!p.name).map((player) => (
                <motion.div 
                  key={player.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className={cn(
                    "px-4 py-2 border backdrop-blur-md rounded-sm text-[12px] font-serif transition-all duration-500 flex items-center justify-between gap-4 w-44 shadow-lg",
                    player.isReady 
                      ? "bg-green-500/10 border-green-500/30 text-green-400 shadow-[0_0_15px_rgba(34,197,94,0.1)]" 
                      : "bg-black/60 border-editorial-gold/10 text-editorial-dim"
                  )}
                >
                  <span className="truncate">{player.name}</span>
                  {player.isReady ? (
                    <motion.div 
                      initial={{ scale: 0, rotate: -45 }} 
                      animate={{ scale: 1, rotate: 0 }}
                      className="flex items-center"
                    >
                      <CheckCircle2 size={13} strokeWidth={3} className="text-green-500" />
                    </motion.div>
                  ) : (
                    <motion.div 
                      animate={{ opacity: [0.3, 0.6, 0.3] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="w-1.5 h-1.5 rounded-full bg-white/20" 
                    />
                  )}
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div 
        ref={scrollRef}
        className={cn(
          "flex-1 bg-editorial-bg p-6 overflow-y-auto space-y-8 mask-fade-top scrollbar-hide ease-in-out transition-all pt-10",
          isGameStarted && "pr-64"
        )}
      >
        <AnimatePresence initial={false}>
          {messages.map((msg, idx) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn(
                "narrative-block font-serif text-lg leading-relaxed",
                msg.type === "user" ? "text-editorial-gold text-right pr-2 italic" : "text-editorial-main border-l border-white/10 pl-4"
              )}
            >
              <span className="speaker-label font-sans text-[10px] uppercase tracking-[0.2em] block mb-1 text-editorial-dim">
                {msg.user}
              </span>
              <div className="whitespace-pre-wrap">{msg.text}</div>
              
              {msg.choices && msg.choices.length > 0 && idx === messages.length - 1 && (
                <div className="mt-6 flex flex-col gap-2 max-w-md">
                  {msg.choices.map((choice, cIdx) => (
                    <motion.button
                      key={cIdx}
                      whileHover={{ x: 10, backgroundColor: "rgba(212, 175, 55, 0.1)" }}
                      onClick={() => handleChoiceClick(choice)}
                      className="text-left p-3 border border-editorial-gold/20 rounded-sm text-editorial-gold font-serif text-sm hover:border-editorial-gold transition-all flex items-center gap-3 group"
                    >
                      <span className="text-[10px] opacity-40 group-hover:opacity-100">{cIdx + 1}.</span>
                      {choice}
                    </motion.button>
                  ))}
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
        {isGMThinking && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="narrative-block font-serif text-lg text-editorial-dim border-l border-white/10 pl-5 italic"
          >
            <span className="speaker-label font-sans text-[10px] uppercase tracking-[0.2em] block mb-2">
              시스템
            </span>
            ...생각 중
          </motion.div>
        )}
        
        <AnimatePresence>
          {isDiceRolling && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-xl"
            >
              <div className="relative flex flex-col items-center">
                {/* Mechanical Scroll Reel */}
                <div className="relative w-32 h-[288px] bg-[#050505] border-y-4 border-editorial-gold shadow-[0_0_100px_rgba(0,0,0,1)] overflow-hidden">
                  {/* Heavy Glass Gradients & Structural Shadows */}
                  <div className="absolute inset-x-0 top-0 h-24 z-30 pointer-events-none bg-gradient-to-b from-black via-black/60 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 h-24 z-30 pointer-events-none bg-gradient-to-t from-black via-black/60 to-transparent" />
                  <div className="absolute inset-0 z-20 pointer-events-none bg-gradient-to-r from-black/20 via-transparent to-black/20" />
                  
                  {/* Target Slot Indicator (Glowing) */}
                  <div className="absolute top-1/2 left-0 right-0 h-24 -translate-y-1/2 bg-editorial-gold/10 border-y border-editorial-gold/60 z-10" />
                  
                  <motion.div
                    animate={diceResult !== null ? { 
                      y: -((40 + diceResult - 1) * 96) 
                    } : { 
                      y: [0, -1920] 
                    }}
                    transition={diceResult !== null ? { 
                      duration: 2.2,
                      ease: [0.16, 1, 0.3, 1] 
                    } : { 
                      duration: 0.35,
                      ease: "linear",
                      repeat: Infinity
                    }}
                    style={{ paddingTop: '96px' }} // Exactly one item height of padding
                    className="flex flex-col items-center"
                  >
                    {/* Consistent number height (96px) */}
                    {Array.from({ length: 100 }).map((_, i) => {
                      const num = (i % 20) + 1;
                      return (
                        <div 
                          key={i} 
                          className={cn(
                            "h-24 flex items-center justify-center font-mono text-5xl transition-all duration-700",
                            showDiceResult && num === diceResult 
                              ? "text-editorial-gold scale-125 drop-shadow-[0_0_15px_rgba(212,175,55,1)]" 
                              : "text-editorial-gold/5"
                          )}
                        >
                          {String(num).padStart(2, '0')}
                        </div>
                      );
                    })}
                  </motion.div>
                </div>

                {/* Big Result Display - Only after animation stops */}
                <AnimatePresence>
                  {showDiceResult && diceResult !== null && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="absolute -bottom-24 flex flex-col items-center gap-1"
                    >
                      <span className="text-8xl font-mono font-bold text-editorial-gold drop-shadow-[0_0_30px_rgba(212,175,55,1)]">
                        {diceResult}
                      </span>
                      <span className={cn(
                        "font-serif text-sm uppercase tracking-[0.4em] italic",
                        targetNumber !== null && diceResult !== null && diceResult >= targetNumber ? "text-green-400" : "text-red-400"
                      )}>
                        {targetNumber !== null && diceResult !== null && diceResult >= targetNumber ? "Success" : "Failure"}
                      </span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      
      <div className="h-[80px] bg-editorial-bg border-t editorial-border-gold flex items-center px-10 gap-6">
        {isGameStarted && (
          <button 
            onClick={() => {
              // Placeholder: Show skill usage dialogue
              onSendMessage("[기술 사용 요청]");
            }}
            className="flex flex-col items-center gap-1 group"
          >
            <div className="w-10 h-10 rounded-sm border border-editorial-gold/40 flex items-center justify-center group-hover:border-editorial-gold group-hover:bg-editorial-gold/10 transition-all">
              <Send size={18} className="text-editorial-gold rotate-[-45deg]" />
            </div>
            <span className="text-[8px] uppercase tracking-[0.2em] text-editorial-gold">SKILLS</span>
          </button>
        )}

        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyPress={(e) => e.key === "Enter" && handleSend()}
          placeholder="어떤 행동을 하시겠습니까?..."
          className="flex-1 bg-transparent border-none text-editorial-main font-serif text-lg outline-none placeholder:text-editorial-dim/50"
        />
        <button
          onClick={handleSend}
          className="font-serif text-editorial-gold uppercase tracking-[0.2em] text-xs hover:brightness-125 transition-all px-4 py-2 border border-editorial-gold/20 hover:border-editorial-gold/60"
        >
          Execute Action
        </button>
      </div>
    </div>
  );
}
