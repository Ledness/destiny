import { motion } from "motion/react";

interface TitleScreenProps {
  onStart: () => void;
}

export function TitleScreen({ onStart }: TitleScreenProps) {
  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center bg-[#0a0502] overflow-hidden">
      {/* Atmospheric Background (CSS-only, won't break) */}
      <div className="absolute inset-0 overflow-hidden opacity-60">
        <div className="absolute inset-[-20%] bg-[radial-gradient(circle_at_50%_30%,#3a1510_0%,transparent_60%),radial-gradient(circle_at_10%_80%,#ff4e00_0%,transparent_50%)] blur-[80px]" />
      </div>
      
      {/* Subtle Grain/Noise for texture */}
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-10 pointer-events-none" />
      
      {/* Medieval Frame */}
      <div className="absolute inset-8 border border-editorial-gold/10 pointer-events-none z-20" />
      
      <div className="relative z-10 flex flex-col items-center gap-12 w-full h-full justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          className="text-center"
        >
          <span className="text-editorial-gold text-lg md:text-xl uppercase tracking-[0.6em] mb-8 block drop-shadow-lg font-serif font-medium opacity-90">미지의 다크 판타지 TRPG</span>
          <h1 className="font-serif text-8xl md:text-[12rem] text-editorial-main tracking-tighter drop-shadow-[0_20px_50px_rgba(0,0,0,1)] leading-none select-none">
            운명의 길
          </h1>
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: "24rem" }}
            transition={{ delay: 1, duration: 1 }}
            className="h-px bg-gradient-to-r from-transparent via-editorial-gold to-transparent mx-auto mt-12" 
          />
        </motion.div>
        
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2, duration: 0.8 }}
          whileHover={{ 
            scale: 1.05,
            boxShadow: "0 0 30px rgba(196, 164, 132, 0.3)",
            backgroundColor: "rgba(196, 164, 132, 0.1)"
          }}
          whileTap={{ scale: 0.98 }}
          onClick={onStart}
          className="relative group px-16 py-6 overflow-hidden border border-editorial-gold/50"
        >
          {/* Decorative corners */}
          <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-editorial-gold" />
          <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-editorial-gold" />
          <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-editorial-gold" />
          <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-editorial-gold" />
          
          <span className="relative z-10 text-editorial-gold font-serif text-2xl md:text-3xl uppercase tracking-[0.4em] transition-colors group-hover:text-editorial-main">
            운 명 의 시작
          </span>
          
          {/* Hover glow effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-editorial-gold/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
        </motion.button>
      </div>
    </div>
  );
}
