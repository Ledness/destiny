import { useState, useRef, useEffect } from "react";
import { Message, UserInfo, PlayerStatus } from "../types";
import { motion, AnimatePresence } from "motion/react";
import { Send, CheckCircle2, Zap } from "lucide-react";
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
  combatTarget?: { name: string; count: number } | null;
  isSelectingSkill?: boolean;
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
  combatTarget,
  isSelectingSkill,
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
              <div className="whitespace-pre-wrap">
                {msg.text.includes("🎲 주사위 판정") ? (
                  <div className="dice-result-container my-4">
                    <div className="text-editorial-dim text-sm mb-2">{msg.text.split('\n\n')[0]}</div>
                    <div className="flex items-center gap-6">
                      <motion.div 
                        initial={{ scale: 0, rotate: -20 }}
                        animate={{ scale: 1, rotate: 0 }}
                        className={cn(
                          "w-20 h-20 border-2 flex items-center justify-center text-4xl font-mono font-bold bg-black/40",
                          msg.text.includes("성공") ? "border-green-500 text-green-500 shadow-[0_0_20px_rgba(34,197,94,0.3)]" : "border-red-500 text-red-500 shadow-[0_0_20px_rgba(239,68,68,0.3)]"
                        )}
                      >
                        {msg.text.match(/\((\d+)\s*>=/)?.[1] || msg.text.match(/\((\d+)\s*</)?.[1] || "?"}
                      </motion.div>
                      <div className="flex-1 border-l border-white/10 pl-4 py-2 italic text-editorial-main">
                        {msg.text.split('\n\n').slice(1).join('\n\n').split('\n').map((line, lIdx) => {
                          const rewardMatch = line.match(/(성공 시 획득:)\s*(.+?)\((.+?)\)/);
                          if (rewardMatch) {
                            const [full, label, itemName, colorName] = rewardMatch;
                            const colorMap: Record<string, string> = {
                              "일반색": "text-editorial-main",
                              "초록색": "text-green-400",
                              "파랑색": "text-blue-400",
                              "보라색": "text-purple-400",
                              "주황색": "text-orange-400",
                              "빨강색": "text-red-500 font-bold",
                            };
                            const colorClass = colorMap[colorName] || "text-editorial-gold";
                            
                            return (
                              <div key={lIdx} className="mb-2">
                                <span className="text-editorial-dim">🎁 {label} </span>
                                <span className={cn("inline-block px-1", colorClass)}>
                                  {itemName}
                                </span>
                              </div>
                            );
                          }
                          return <div key={lIdx}>{line}</div>;
                        })}
                      </div>
                    </div>
                  </div>
                ) : (
                  msg.text.split('\n').map((line, lIdx) => {
                    const rewardMatch = line.match(/(성공 시 획득:)\s*(.+?)\((.+?)\)/);
                    if (rewardMatch) {
                      const [full, label, itemName, colorName] = rewardMatch;
                      const colorMap: Record<string, string> = {
                        "일반색": "text-editorial-main",
                        "초록색": "text-green-400",
                        "파랑색": "text-blue-400",
                        "보라색": "text-purple-400",
                        "주황색": "text-orange-400",
                        "빨강색": "text-red-500 font-bold",
                      };
                      const colorClass = colorMap[colorName] || "text-editorial-gold";
                      
                      return (
                        <div key={lIdx} className="my-2 p-2 border border-white/5 bg-white/5 rounded-sm">
                          <span className="text-editorial-dim">🎁 {label} </span>
                          <span className={cn("inline-block px-1 ml-1", colorClass)}>
                            {itemName}
                          </span>
                        </div>
                      );
                    }
                    return <div key={lIdx}>{line}</div>;
                  })
                )}
              </div>
              
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
          {isDiceRolling && diceResult === null && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="absolute bottom-24 left-1/2 -translate-x-1/2 z-50 px-6 py-3 bg-black/80 border border-editorial-gold/50 backdrop-blur-md rounded-full flex items-center gap-4 shadow-2xl"
            >
              <motion.div 
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="w-5 h-5 border-2 border-editorial-gold border-t-transparent rounded-full"
              />
              <span className="text-editorial-gold font-serif text-sm tracking-[0.3em] uppercase">
                Destiny is rolling...
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      
      <div className="h-[80px] bg-editorial-bg border-t editorial-border-gold flex items-center px-10 gap-6 relative">
        {isSelectingSkill && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute -top-12 left-10 right-10 bg-indigo-900/40 border border-indigo-500/50 backdrop-blur-md px-4 py-2 flex items-center justify-between rounded-t-sm"
          >
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-indigo-400 rounded-full animate-pulse" />
              <span className="text-xs text-indigo-100 font-serif italic">사용할 스킬을 왼쪽 메뉴에서 선택해주세요...</span>
            </div>
            <button 
              onClick={() => onSendMessage("[기술 사용 취소]")}
              className="text-[10px] text-white/60 hover:text-white uppercase tracking-widest"
            >
              [취소]
            </button>
          </motion.div>
        )}
        
        {isGameStarted && (
          <button 
            onClick={() => {
              onSendMessage("[기술 사용 요청]");
            }}
            className={cn(
              "flex flex-col items-center gap-1 group relative",
              isSelectingSkill && "animate-pulse"
            )}
          >
            <div className={cn(
              "w-10 h-10 rounded-sm border flex items-center justify-center transition-all",
              isSelectingSkill 
                ? "border-indigo-500 bg-indigo-500/20 shadow-[0_0_15px_rgba(99,102,241,0.5)]" 
                : "border-editorial-gold/40 group-hover:border-editorial-gold group-hover:bg-editorial-gold/10"
            )}>
              <Zap size={18} className={cn(isSelectingSkill ? "text-indigo-400" : "text-editorial-gold")} />
            </div>
            <span className={cn(
              "text-[8px] uppercase tracking-[0.2em]",
              isSelectingSkill ? "text-indigo-400 font-bold" : "text-editorial-gold"
            )}>SKILLS</span>
            {isSelectingSkill && (
              <motion.div 
                layoutId="sparkle"
                className="absolute inset-0 border border-indigo-400 rounded-sm"
                animate={{ scale: [1, 1.2, 1], opacity: [1, 0, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              />
            )}
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
