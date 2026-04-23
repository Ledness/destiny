import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { UserInfo } from "../types";

interface CharacterCreationProps {
  onComplete: (info: UserInfo) => void;
  onBack: () => void;
}

type Step = "PATH" | "IDENTITY_TYPE" | "NAME_INPUT" | "MOD_INPUT" | "RACE_INPUT" | "JOB_INPUT";

export function CharacterCreation({ onComplete, onBack }: CharacterCreationProps) {
  const [step, setStep] = useState<Step>("PATH");
  const [name, setName] = useState("");
  const [race, setRace] = useState("");
  const [job, setJob] = useState("");
  const [identityType, setIdentityType] = useState<"NAME" | "MOD">("NAME");
  const [mod1, setMod1] = useState("");
  const [mod2, setMod2] = useState("");

  const startAutoPath = () => {
    const names = [
      "카엘", "베른", "리안", "타르", "아이린", "제논", "루카스", "에스더", "실라스", "노아",
      "엘라", "카이", "렌", "미라", "솔", "아델", "바론", "세드릭", "다프네", "펠릭스",
      "가이아", "휴고", "아이리스", "주드", "키라", "레오", "마야", "니코", "오리온", "파이퍼"
    ];
    const races = [
      "인간", "엘프", "드워프", "오크", "드래곤본", "하프엘프", "하프오크", "노움", "할플링", "티플링",
      "아시마르", "고블린", "홉고블린", "리자드포크", "타바시", "켄쿠", "펄볼그", "겐나시", "토르틀", "트리턴",
      "창질링", "칼라쉬타르", "쉬프터", "워포지드", "미노타우르스", "센타우르스", "사티로스", "레오닌", "루가루", "다크엘프"
    ];
    const jobs = [
      "전사", "마법사", "도적", "사제", "성기사", "바드", "레인저", "몽크", "워록", "드루이드",
      "바바리안", "소서러", "아티피서", "암살자", "기사", "궁수", "소환사", "흑마법사", "연금술사", "현자",
      "무사", "사무라이", "닌자", "해적", "음유시인", "퇴마사", "주술사", "무희", "기공사", "검사"
    ];
    
    const randomInfo: UserInfo = {
      name: names[Math.floor(Math.random() * names.length)],
      race: races[Math.floor(Math.random() * races.length)],
      job: jobs[Math.floor(Math.random() * jobs.length)],
      level: 1,
      exp: 0,
      maxExp: 100,
      hp: 170,
      maxHp: 170,
      mp: 160,
      maxMp: 160,
      stats: { str: 15, dex: 15, int: 15, vit: 15 },
      statPoints: 0,
      equipment: {
        weapon: null,
        armor: null,
        gloves: null,
        boots: null,
        sub: null,
        artifact: null
      },
      fateKeywords: [],
      normalKeywords: [],
      ownedFateKeywords: [],
      ownedNormalKeywords: []
    };
    
    alert(`운명이 결정되었습니다!\n\n이름: ${randomInfo.name}\n종족: ${randomInfo.race}\n직업: ${randomInfo.job}`);
    onComplete(randomInfo);
  };

  const handleIdentityConfirm = () => {
    const finalName = identityType === "NAME" ? name : `${mod1} ${mod2}`;
    if (!finalName.trim()) {
      alert("입력값이 없습니다.");
      return;
    }
    setName(finalName);
    setStep("RACE_INPUT");
  };

  const handleRaceConfirm = () => {
    if (!race.trim()) {
      alert("종족을 입력하세요.");
      return;
    }
    setStep("JOB_INPUT");
  };

  const handleJobConfirm = () => {
    if (!job.trim()) {
      alert("직업을 입력하세요.");
      return;
    }
    onComplete({ 
      name, 
      race, 
      job,
      level: 1,
      exp: 0,
      maxExp: 100,
      hp: 170,
      maxHp: 170,
      mp: 160,
      maxMp: 160,
      stats: { str: 15, dex: 15, int: 15, vit: 15 },
      statPoints: 0,
      equipment: {
        weapon: null,
        armor: null,
        gloves: null,
        boots: null,
        sub: null,
        artifact: null
      },
      fateKeywords: [],
      normalKeywords: [],
      ownedFateKeywords: [],
      ownedNormalKeywords: []
    });
  };

  return (
    <div className="flex flex-col items-center justify-center h-full w-full max-w-2xl mx-auto bg-editorial-bg">
      <AnimatePresence mode="wait">
        {step === "PATH" && (
          <motion.div
            key="path"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="flex flex-col items-center gap-12"
          >
            <div className="text-center">
              <span className="text-editorial-gold text-[10px] uppercase tracking-[0.3em] mb-2 block">The Beginning</span>
              <h1 className="font-serif text-5xl text-editorial-main italic">어떤 길을 걷겠습니까?</h1>
            </div>
            <div className="flex gap-12">
              <button
                onClick={() => setStep("IDENTITY_TYPE")}
                className="px-12 py-4 border border-editorial-gold text-editorial-gold font-serif text-xl uppercase tracking-widest hover:bg-editorial-gold hover:text-black transition-all"
              >
                정해진 길
              </button>
              <button
                onClick={startAutoPath}
                className="px-12 py-4 border border-editorial-gold text-editorial-gold font-serif text-xl uppercase tracking-widest hover:bg-editorial-gold hover:text-black transition-all"
              >
                미지의 길
              </button>
            </div>
            <button onClick={onBack} className="font-serif text-xs uppercase tracking-widest text-editorial-dim hover:text-editorial-main transition-all underline underline-offset-8">취소</button>
          </motion.div>
        )}

        {step === "IDENTITY_TYPE" && (
          <motion.div
            key="identity"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="flex flex-col items-center gap-10"
          >
            <div className="text-center">
              <span className="text-editorial-gold text-[10px] uppercase tracking-[0.3em] mb-2 block">Identity</span>
              <h2 className="font-serif text-4xl text-editorial-main italic">아이덴티티를 선택하세요</h2>
            </div>
            <div className="flex gap-8">
              <button
                onClick={() => { setIdentityType("NAME"); setStep("NAME_INPUT"); }}
                className="px-10 py-3 border border-editorial-gold/30 text-editorial-main font-serif uppercase tracking-widest hover:border-editorial-gold transition-all"
              >
                이름
              </button>
              <button
                onClick={() => { setIdentityType("MOD"); setStep("MOD_INPUT"); }}
                className="px-10 py-3 border border-editorial-gold/30 text-editorial-main font-serif uppercase tracking-widest hover:border-editorial-gold transition-all"
              >
                수식어
              </button>
            </div>
            <button onClick={() => setStep("PATH")} className="font-serif text-xs uppercase tracking-widest text-editorial-dim hover:text-editorial-main transition-all">이전</button>
          </motion.div>
        )}

        {step === "NAME_INPUT" && (
          <motion.div
            key="name"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="flex flex-col items-center gap-10"
          >
            <div className="text-center">
              <span className="text-editorial-gold text-[10px] uppercase tracking-[0.3em] mb-2 block">Naming</span>
              <h2 className="font-serif text-4xl text-editorial-main italic">이름을 입력하세요</h2>
            </div>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="이름 입력"
              className="bg-transparent border-b-2 border-editorial-gold/30 text-editorial-gold p-4 text-4xl text-center w-80 focus:outline-none focus:border-editorial-gold transition-all font-serif placeholder:text-editorial-gold/10"
            />
            <div className="flex gap-8">
              <button onClick={handleIdentityConfirm} className="px-12 py-3 border border-editorial-gold text-editorial-gold font-serif uppercase tracking-widest hover:bg-editorial-gold hover:text-black transition-all">다음</button>
              <button onClick={() => setStep("IDENTITY_TYPE")} className="px-12 py-3 text-editorial-dim font-serif uppercase tracking-widest hover:text-editorial-main transition-all">이전</button>
            </div>
          </motion.div>
        )}

        {step === "MOD_INPUT" && (
          <motion.div
            key="mod"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="flex flex-col items-center gap-10"
          >
            <div className="text-center">
              <span className="text-editorial-gold text-[10px] uppercase tracking-[0.3em] mb-2 block">Epithet</span>
              <h2 className="font-serif text-4xl text-editorial-main italic">수식어를 입력하세요</h2>
            </div>
            <div className="flex gap-4">
              <input
                type="text"
                value={mod1}
                onChange={(e) => setMod1(e.target.value)}
                maxLength={4}
                placeholder="수식어1"
                className="bg-transparent border-b-2 border-editorial-gold/30 text-editorial-gold p-4 text-3xl text-center w-40 focus:outline-none focus:border-editorial-gold transition-all font-serif placeholder:text-editorial-gold/10"
              />
              <input
                type="text"
                value={mod2}
                onChange={(e) => setMod2(e.target.value)}
                maxLength={4}
                placeholder="수식어2"
                className="bg-transparent border-b-2 border-editorial-gold/30 text-editorial-gold p-4 text-3xl text-center w-40 focus:outline-none focus:border-editorial-gold transition-all font-serif placeholder:text-editorial-gold/10"
              />
            </div>
            <div className="flex gap-8">
              <button onClick={handleIdentityConfirm} className="px-12 py-3 border border-editorial-gold text-editorial-gold font-serif uppercase tracking-widest hover:bg-editorial-gold hover:text-black transition-all">다음</button>
              <button onClick={() => setStep("IDENTITY_TYPE")} className="px-12 py-3 text-editorial-dim font-serif uppercase tracking-widest hover:text-editorial-main transition-all">이전</button>
            </div>
          </motion.div>
        )}

        {step === "RACE_INPUT" && (
          <motion.div
            key="race"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="flex flex-col items-center gap-10"
          >
            <div className="text-center">
              <span className="text-editorial-gold text-[10px] uppercase tracking-[0.3em] mb-2 block">Origin</span>
              <h2 className="font-serif text-4xl text-editorial-main italic">당신의 종족은 무엇입니까?</h2>
            </div>
            <input
              type="text"
              value={race}
              onChange={(e) => setRace(e.target.value)}
              placeholder="종족 입력"
              className="bg-transparent border-b-2 border-editorial-gold/30 text-editorial-gold p-4 text-4xl text-center w-80 focus:outline-none focus:border-editorial-gold transition-all font-serif placeholder:text-editorial-gold/10"
            />
            <div className="flex gap-8">
              <button onClick={handleRaceConfirm} className="px-12 py-3 border border-editorial-gold text-editorial-gold font-serif uppercase tracking-widest hover:bg-editorial-gold hover:text-black transition-all">다음</button>
              <button onClick={() => setStep("IDENTITY_TYPE")} className="px-12 py-3 text-editorial-dim font-serif uppercase tracking-widest hover:text-editorial-main transition-all">이전</button>
            </div>
          </motion.div>
        )}

        {step === "JOB_INPUT" && (
          <motion.div
            key="job"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="flex flex-col items-center gap-10"
          >
            <div className="text-center">
              <span className="text-editorial-gold text-[10px] uppercase tracking-[0.3em] mb-2 block">Calling</span>
              <h2 className="font-serif text-4xl text-editorial-main italic">당신의 직업은 무엇입니까?</h2>
            </div>
            <input
              type="text"
              value={job}
              onChange={(e) => setJob(e.target.value)}
              placeholder="직업 입력"
              className="bg-transparent border-b-2 border-editorial-gold/30 text-editorial-gold p-4 text-4xl text-center w-80 focus:outline-none focus:border-editorial-gold transition-all font-serif placeholder:text-editorial-gold/10"
            />
            <div className="flex gap-8">
              <button onClick={handleJobConfirm} className="px-12 py-3 border border-editorial-gold text-editorial-gold font-serif uppercase tracking-widest hover:bg-editorial-gold hover:text-black transition-all">완료</button>
              <button onClick={() => setStep("RACE_INPUT")} className="px-12 py-3 text-editorial-dim font-serif uppercase tracking-widest hover:text-editorial-main transition-all">이전</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
