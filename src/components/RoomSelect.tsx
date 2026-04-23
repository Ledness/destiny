import { motion } from "motion/react";

interface RoomSelectProps {
  onSelect: (mode: "create" | "join") => void;
  onBack: () => void;
}

export function RoomSelect({ onSelect, onBack }: RoomSelectProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-12 bg-editorial-bg">
      <h1 className="font-serif text-5xl text-editorial-main italic">어디로 떠나시겠습니까?</h1>
      <div className="flex flex-col md:flex-row gap-12">
        <motion.button
          whileHover={{ scale: 1.02, y: -5 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => onSelect("create")}
          className="w-72 h-72 flex flex-col items-center justify-center gap-4 bg-editorial-paper border border-editorial-gold/30 hover:border-editorial-gold transition-all group"
        >
          <span className="text-editorial-gold text-[10px] uppercase tracking-[0.3em]">New Journey</span>
          <span className="font-serif text-2xl text-editorial-main group-hover:text-editorial-gold transition-colors">새로운 운명 개척</span>
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.02, y: -5 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => onSelect("join")}
          className="w-72 h-72 flex flex-col items-center justify-center gap-4 bg-editorial-paper border border-editorial-gold/30 hover:border-editorial-gold transition-all group"
        >
          <span className="text-editorial-gold text-[10px] uppercase tracking-[0.3em]">Existing Path</span>
          <span className="font-serif text-2xl text-editorial-main group-hover:text-editorial-gold transition-colors">다른 운명에 합류</span>
        </motion.button>
      </div>
      <button 
        onClick={onBack}
        className="font-serif text-xs uppercase tracking-widest text-editorial-dim hover:text-editorial-main transition-all"
      >
        로비로 돌아가기
      </button>
    </div>
  );
}
