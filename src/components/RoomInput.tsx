import { useState } from "react";
import { motion } from "motion/react";

interface RoomInputProps {
  mode: "create" | "join";
  onConfirm: (roomNumber: string) => void;
  onBack: () => void;
}

export function RoomInput({ mode, onConfirm, onBack }: RoomInputProps) {
  const [roomNumber, setRoomNumber] = useState("");

  const handleConfirm = () => {
    if (roomNumber.length !== 4) {
      // Use a custom modal or just update the alert for now as per instructions
      return;
    }
    onConfirm(roomNumber);
  };

  return (
    <div className="flex flex-col items-center justify-center h-full gap-10 bg-editorial-bg">
      <div className="text-center">
        <span className="text-editorial-gold text-[10px] uppercase tracking-[0.3em] mb-2 block">Fate Connection</span>
        <h2 className="font-serif text-4xl text-editorial-main italic">
          {mode === "create" ? "생성할 운명의 번호" : "참가할 운명의 번호"}
        </h2>
      </div>
      
      <input
        type="number"
        value={roomNumber}
        onChange={(e) => setRoomNumber(e.target.value.slice(0, 4))}
        placeholder="0000"
        className="bg-transparent border-b-2 border-editorial-gold/30 text-editorial-gold p-4 text-6xl text-center w-64 focus:outline-none focus:border-editorial-gold transition-all font-serif placeholder:text-editorial-gold/10 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
      />
      
      <div className="flex gap-8">
        <button
          onClick={handleConfirm}
          className="px-12 py-3 border border-editorial-gold text-editorial-gold font-serif uppercase tracking-widest hover:bg-editorial-gold hover:text-black transition-all"
        >
          입장
        </button>
        <button
          onClick={onBack}
          className="px-12 py-3 text-editorial-dim font-serif uppercase tracking-widest hover:text-editorial-main transition-all"
        >
          이전
        </button>
      </div>
    </div>
  );
}
