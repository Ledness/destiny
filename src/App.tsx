import { useState, useEffect, useCallback, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { GameState, UserInfo, Message, PlayerStatus, Item, ItemRarity } from "./types";
import { TitleScreen } from "./components/TitleScreen";
import { RoomSelect } from "./components/RoomSelect";
import { RoomInput } from "./components/RoomInput";
import { CharacterCreation } from "./components/CharacterCreation";
import { GameRoom } from "./components/GameRoom";
import { askGM } from "./services/gemini";
import { motion, AnimatePresence } from "motion/react";
import { Volume2, VolumeX, LogOut, UserPlus, Sword, Star, CheckCircle2, Shield, Footprints, Hand, Gem, Zap, Trophy, Info, X, User, Shirt } from "lucide-react";
import { cn } from "./lib/utils";

const GLOBAL_LOBBY = "GLOBAL_LOBBY";

export default function App() {
  const [gameState, setGameState] = useState<GameState>("TITLE");
  const [userInfo, setUserInfo] = useState<UserInfo>({
    name: "",
    race: "종족불명",
    job: "모험가",
    level: 1,
    exp: 0,
    maxExp: 100,
    hp: 100,
    maxHp: 100,
    mp: 50,
    maxMp: 50,
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
  const [currentRoom, setCurrentRoom] = useState(GLOBAL_LOBBY);
  const [isOwner, setIsOwner] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [hasCreatedChar, setHasCreatedChar] = useState(false);
  const [isGameStarted, setIsGameStarted] = useState(false);
  const [showStartOverlay, setShowStartOverlay] = useState(false);
  const [activeModal, setActiveModal] = useState<"RACE" | "JOB" | "FATE_KEYWORDS" | "NORMAL_KEYWORDS" | "EQUIPPED_KEYWORDS" | "ITEM_INFO" | "SKILLS" | null>(null);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [currentLocation, setCurrentLocation] = useState("안개 낀 경계선");
  const [gameDay, setGameDay] = useState(1);
  const [gameTime, setGameTime] = useState(6); // Start at 6 AM
  const [isDaytime, setIsDaytime] = useState(true);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [players, setPlayers] = useState<PlayerStatus[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isDiceRolling, setIsDiceRolling] = useState(false);
  const [diceResult, setDiceResult] = useState<number | null>(null);
  const [targetNumber, setTargetNumber] = useState<number | null>(null);
  const [isFading, setIsFading] = useState(false);
  const [pendingEquipment, setPendingEquipment] = useState<{slot: keyof UserInfo["equipment"], item: Item} | null>(null);
  const [isGMThinking, setIsGMThinking] = useState(false);
  
  // New States for Resources and Combat
  const [currentTarget, setCurrentTarget] = useState<{name: string, hp: number, maxHp: number} | null>(null);
  const [screenEffect, setScreenEffect] = useState<"DAMAGE" | "HEAL" | "LEVEL_UP" | null>(null);
  const [roomInputMode, setRoomInputMode] = useState<"create" | "join">("create");
  const audioRef = useRef<HTMLAudioElement>(null);
  const prologueTriggeredRef = useRef(false);

  // Initialize socket
  useEffect(() => {
    const newSocket = io();
    setSocket(newSocket);

    newSocket.on("room-history", (history: Message[]) => {
      setMessages(history);
    });

    newSocket.on("room-owner", (ownerId: string) => {
      setIsOwner(newSocket.id === ownerId);
    });

    newSocket.on("players-update", (updatedPlayers: PlayerStatus[]) => {
      setPlayers(updatedPlayers);
    });

    newSocket.on("action-reset", () => {
      setIsReady(false);
    });

    newSocket.on("all-ready-start", () => {
      // Lock ready status
      setIsReady(true);
      
      // Start countdown
      let count = 3;
      setCountdown(count);
      
      const timer = setInterval(() => {
        count -= 1;
        if (count > 0) {
          setCountdown(count);
        } else {
          clearInterval(timer);
          setCountdown(null);
          setIsGameStarted(true);
          setShowStartOverlay(true);
          
          // Hide overlay after 8 seconds (6 seconds of display + animation)
          setTimeout(() => {
            setShowStartOverlay(false);
          }, 8000);
          
          // System message for start
          setMessages(prev => [...prev, {
            id: "start-msg-" + Date.now(),
            user: "시스템",
            text: "이곳에 있는 전원이 운명의 길로 들어설 준비를 마쳤습니다. 운명의 길을 시작합니다.",
            type: "system",
            timestamp: new Date().toISOString()
          }]);
        }
      }, 1000);
    });

    newSocket.on("new-message", (msg: Message) => {
      setMessages((prev) => [...prev, msg]);
    });

    return () => {
      newSocket.close();
    };
  }, []);

  // Join room when currentRoom changes
  useEffect(() => {
    if (socket) {
      socket.emit("join-room", currentRoom);
    }
  }, [socket, currentRoom]);

  const generateRandomName = () => {
    const mods = [
      "굶주린", "강력한", "비겁한", "졸린", "광기어린", "불타는", 
      "고독한", "용맹한", "영리한", "어리석은", "신비로운", "타락한", 
      "고귀한", "냉혹한", "따뜻한", "날렵한", "둔중한", "빛나는", 
      "어두운", "침묵하는", "방황하는", "전설적인", "저주받은", "축복받은",
      "잊혀진", "깨어난", "무자비한", "찬란한", "공포의", "은밀한",
      "거대한", "날카로운", "부드러운", "단단한", "공허한", "심연의",
      "하늘의", "대지의", "폭풍의", "안개의", "새벽의", "황혼의"
    ];
    const monsters = [
      "슬라임", "고블린", "오크", "드래곤", "미믹", 
      "스켈레톤", "좀비", "가고일", "하피", "켄타우로스", 
      "그리핀", "키메라", "고스트", "뱀파이어", "웨어울프", 
      "리치", "골렘", "바실리스크", "히드라", "만티코어",
      "피닉스", "유니콘", "켈피", "밴시", "와이번", "베히모스",
      "리바이어던", "크라켄", "가고일", "듀라한", "서큐버스",
      "임프", "오우거", "트롤", "사이클롭스", "미노타우로스"
    ];
    // Use crypto for better randomness if available, otherwise Math.random
    const getRandomIndex = (max: number) => {
      const array = new Uint32Array(1);
      window.crypto.getRandomValues(array);
      return array[0] % max;
    };
    return mods[getRandomIndex(mods.length)] + " " + monsters[getRandomIndex(monsters.length)];
  };

  const getRarityColor = (rarity: ItemRarity) => {
    switch (rarity) {
      case "NORMAL": return "#4ade80";
      case "RARE": return "#a855f7";
      case "UNIQUE": return "#ec4899";
      case "EPIC": return "#eab308";
      case "LEGENDARY": return "#f97316";
      case "MYTHIC": return "#991b1b";
      default: return "#9ca3af";
    }
  };

  const calculateCP = (u: UserInfo) => {
    const baseStats = u.stats.str * 2 + u.stats.dex * 1.5 + u.stats.int * 1.5 + u.stats.vit * 1;
    let equipAtk = 0;
    let equipStats = 0;
    
    Object.values(u.equipment).forEach(item => {
      if (item) {
        if (item.atk) equipAtk += item.atk;
        if (item.stats) {
          equipStats += (item.stats.str || 0) * 2 + (item.stats.dex || 0) * 1.5 + (item.stats.int || 0) * 1.5 + (item.stats.vit || 0) * 1;
        }
      }
    });
    
    return Math.floor(baseStats + equipAtk + equipStats);
  };

  const createItem = (slot: string, name: string): Item => {
    const rarities: ItemRarity[] = ["NORMAL", "RARE", "UNIQUE", "EPIC", "LEGENDARY", "MYTHIC"];
    const rarityWeights = [50, 25, 15, 7, 2, 1];
    
    let rand = Math.random() * 100;
    let rarity: ItemRarity = "NORMAL";
    let sum = 0;
    for (let i = 0; i < rarityWeights.length; i++) {
      sum += rarityWeights[i];
      if (rand <= sum) {
        rarity = rarities[i];
        break;
      }
    }

    const item: Item = {
      name,
      rarity,
      atk: slot === "weapon" ? Math.floor(Math.random() * 20) + 10 : undefined,
      stats: {
        str: Math.floor(Math.random() * 5),
        dex: Math.floor(Math.random() * 5),
        int: Math.floor(Math.random() * 5),
        vit: Math.floor(Math.random() * 5),
      },
      description: `${name} - ${rarity} 등급의 장비입니다.`
    };

    if (["EPIC", "LEGENDARY", "MYTHIC"].includes(rarity)) {
      const effects = ["공격 시 추가 피해", "치명타 확률 증가", "모든 스탯 보너스", "체력 회복 속도 증가"];
      item.effect = effects[Math.floor(Math.random() * effects.length)] + ` (${Math.floor(Math.random() * 10) + 5}%)`;
    }

    return item;
  };

  const processRewards = useCallback((fullText: string) => {
    let cleanText = fullText;
    let overrideChoices: string[] | null = null;

    // 1. Equipment
    const equipMatch = cleanText.match(/\[EQUIP_AWARD:(.+?):(.+?)\]/);
    if (equipMatch) {
      const slot = equipMatch[1] as keyof UserInfo["equipment"];
      const itemName = equipMatch[2];
      const isDuplicate = Object.values(userInfo.equipment).some(item => (item as Item | null)?.name === itemName);
      
      if (!isDuplicate) {
        const newItem = createItem(slot, itemName);
        setPendingEquipment({ slot, item: newItem });
        cleanText = cleanText.replace(equipMatch[0], "").trim();
        cleanText += `\n\n🎁 **새로운 장비 발견: [${itemName}] (${newItem.rarity})**\n이 장비를 장착하시겠습니까?`;
        overrideChoices = [`[${itemName}] 장착하기`, "장착하지 않기"];
      } else {
        cleanText = cleanText.replace(equipMatch[0], "").trim();
        cleanText += `\n\n(이미 동일한 장비 [${itemName}]을(를) 보유하고 있습니다.)`;
      }
    }

    // 2. Keywords
    const fateAwardMatch = cleanText.match(/\[AWARD_FATE:(.+?)\]/);
    if (fateAwardMatch) {
      const newKeyword = fateAwardMatch[1];
      setUserInfo(prev => ({
        ...prev,
        ownedFateKeywords: Array.from(new Set([...prev.ownedFateKeywords, newKeyword]))
      }));
      cleanText = cleanText.replace(fateAwardMatch[0], `\n\n✨ 새로운 운명 키워드 획득: [${newKeyword}]`);
    }

    const normalAwardMatch = cleanText.match(/\[AWARD_NORMAL:(.+?)\]/);
    if (normalAwardMatch) {
      const newKeyword = normalAwardMatch[1];
      setUserInfo(prev => ({
        ...prev,
        ownedNormalKeywords: Array.from(new Set([...prev.ownedNormalKeywords, newKeyword]))
      }));
      cleanText = cleanText.replace(normalAwardMatch[0], `\n\n📜 새로운 일반 키워드 획득: [${newKeyword}]`);
    }

    // 3. EXP
    const expMatch = cleanText.match(/\[EXP_AWARD:(\d+)\]/);
    if (expMatch) {
      const expAmount = parseInt(expMatch[1]);
      setUserInfo(prev => {
        let newExp = prev.exp + expAmount;
        let newLevel = prev.level;
        let newStatPoints = prev.statPoints;
        let newMaxExp = prev.maxExp;
    while (newExp >= newMaxExp) {
      newExp -= newMaxExp;
      newLevel += 1;
      newStatPoints += 5;
      newMaxExp = Math.floor(newMaxExp * 1.5);
      setScreenEffect("LEVEL_UP");
      setTimeout(() => setScreenEffect(null), 2000);
    }
    return { ...prev, level: newLevel, exp: newExp, maxExp: newMaxExp, statPoints: newStatPoints };
  });
  cleanText = cleanText.replace(expMatch[0], "").trim();
  cleanText += `\n\n✨ 경험치 획득: +${expAmount} EXP`;
}

// 4. Damage / Heal / Cost
const damageMatch = cleanText.match(/\[DAMAGE:(\d+)\]/);
if (damageMatch) {
  const dmg = parseInt(damageMatch[1]);
  setUserInfo(prev => ({ ...prev, hp: Math.max(0, prev.hp - dmg) }));
  setScreenEffect("DAMAGE");
  setTimeout(() => setScreenEffect(null), 500);
  cleanText = cleanText.replace(damageMatch[0], "").trim();
  cleanText += `\n\n💥 피해를 입었습니다! (-${dmg} HP)`;
}

const healMatch = cleanText.match(/\[HEAL:(\d+)(?::(HP|MP))?\]/);
if (healMatch) {
  const amount = parseInt(healMatch[1]);
  const type = healMatch[2] || "HP";
  if (type === "HP") {
    setUserInfo(prev => ({ ...prev, hp: Math.min(prev.maxHp, prev.hp + amount) }));
    setScreenEffect("HEAL");
    setTimeout(() => setScreenEffect(null), 500);
    cleanText = cleanText.replace(healMatch[0], "").trim();
    cleanText += `\n\n💚 체력을 회복했습니다! (+${amount} HP)`;
  } else {
    setUserInfo(prev => ({ ...prev, mp: Math.min(prev.maxMp, prev.mp + amount) }));
    cleanText = cleanText.replace(healMatch[0], "").trim();
    cleanText += `\n\n🔷 마력을 회복했습니다! (+${amount} MP)`;
  }
}

const costMatch = cleanText.match(/\[COST:(\d+)\]/);
if (costMatch) {
  const cost = parseInt(costMatch[1]);
  setUserInfo(prev => ({ ...prev, mp: Math.max(0, prev.mp - cost) }));
  cleanText = cleanText.replace(costMatch[0], "").trim();
  cleanText += `\n\n🌀 마력을 소모했습니다. (-${cost} MP)`;
}

// 5. Target Tracker
const targetMatch = cleanText.match(/\[TARGET:(.+?):(\d+):(\d+)\]/);
if (targetMatch) {
  const name = targetMatch[1];
  const hp = parseInt(targetMatch[2]);
  const maxHp = parseInt(targetMatch[3]);
  if (hp <= 0) {
    setCurrentTarget(null);
  } else {
    setCurrentTarget({ name, hp, maxHp });
  }
  cleanText = cleanText.replace(targetMatch[0], "").trim();
}

return { text: cleanText, choices: overrideChoices };
  }, [userInfo.equipment, userInfo.ownedFateKeywords, userInfo.ownedNormalKeywords]);

  const handleStart = () => {
    setIsFading(true);
    setTimeout(() => {
      const randomName = generateRandomName();
      
      const startLocations = [
        "안개 낀 경계선",
        "버려진 성채의 입구",
        "끝없는 모래의 사막",
        "침묵하는 숲의 오솔길",
        "얼어붙은 호수의 가장자리",
        "타오르는 화산의 기슭",
        "무너진 신전의 지하",
        "폭풍우 치는 해안가",
        "잊혀진 고대 도시의 광장",
        "하늘 위에 떠 있는 부유섬",
        "심연으로 통하는 동굴 입구",
        "거대한 세계수 아래의 뿌리",
        "차원의 틈새가 벌어진 황무지",
        "영원한 밤이 계속되는 그림자 계곡",
        "황금빛 밀밭이 끝없이 펼쳐진 평원",
        "구름 속에 숨겨진 용의 둥지",
        "기계 태엽이 돌아가는 강철 도시",
        "정령들이 속삭이는 수정 동굴",
        "피로 물든 고대 전장의 폐허",
        "별빛이 쏟아지는 천공의 제단"
      ];
      const getRandomIndex = (max: number) => {
        const array = new Uint32Array(1);
        window.crypto.getRandomValues(array);
        return array[0] % max;
      };
      const randomLocation = startLocations[getRandomIndex(startLocations.length)];
      setCurrentLocation(randomLocation);

      setUserInfo((prev) => ({ 
        ...prev, 
        name: randomName,
        race: "종족불명",
        job: "모험가",
        level: 1,
        exp: 0,
        maxExp: 100,
        stats: { str: 15, dex: 15, int: 15, vit: 15 },
        statPoints: 0,
        equipment: {
          weapon: null,
          armor: null,
          gloves: null,
          boots: null,
          sub: null,
          artifact: null
        }
      }));
      setHasCreatedChar(false);
      setIsReady(false);
      setGameState("GAME");
      setIsFading(false);
      
      socket?.emit("send-message", {
        room: GLOBAL_LOBBY,
        message: {
          user: "시스템",
          text: "운명의 길에 오신 것을 환영합니다.",
          type: "system",
        },
      });
    }, 1000);
  };

  const handleEquipKeyword = (keyword: string, type: "fate" | "normal") => {
    setUserInfo(prev => {
      if (type === "fate") {
        if (prev.fateKeywords.includes(keyword)) {
          return { ...prev, fateKeywords: prev.fateKeywords.filter(k => k !== keyword) };
        }
        if (prev.fateKeywords.length >= 2) return prev;
        return { ...prev, fateKeywords: [...prev.fateKeywords, keyword] };
      } else {
        if (prev.normalKeywords.includes(keyword)) {
          return { ...prev, normalKeywords: prev.normalKeywords.filter(k => k !== keyword) };
        }
        if (prev.normalKeywords.length >= 4) return prev;
        return { ...prev, normalKeywords: [...prev.normalKeywords, keyword] };
      }
    });
  };

  const getRaceDescription = (race: string) => {
    const descriptions: Record<string, string> = {
      "인간": "대륙에서 가장 번성한 종족으로, 뛰어난 적응력과 불굴의 의지를 지녔습니다. 특별한 신체적 강점은 없으나 마법, 검술, 기술 등 모든 분야에서 잠재력을 발휘할 수 있는 유일한 종족입니다. 그들의 짧은 수명은 오히려 매 순간을 치열하게 살아가게 만드는 원동력이 됩니다.",
      "엘프": "태초의 숲 '실베리아'에서 기원한 장수 종족입니다. 자연의 마나와 공명하는 능력이 탁월하여 마법 친화력이 매우 높으며, 수백 년의 세월 동안 연마한 궁술과 검술은 예술의 경지에 달해 있습니다. 인간보다 감각이 예민하며 고결한 정신을 중시합니다.",
      "드워프": "지하 왕국 '아이언포지'의 주인들이자 대지의 아들들입니다. 바위처럼 단단한 피부와 지치지 않는 체력을 지녔으며, 금속을 다루는 기술과 세공 능력은 신의 영역에 닿아 있다고 칭송받습니다. 명예와 약속을 목숨보다 소중히 여기며, 그들이 벼려낸 무기는 전설이 됩니다.",
      "오크": "거친 황야와 전장의 함성 속에서 태어난 투사들입니다. 압도적인 근력과 고통을 견디는 강인한 정신력을 지녔으며, 부족의 명예를 위해 싸우는 것을 최고의 가치로 여깁니다. 야만적으로 보일 수 있으나, 그들만의 엄격한 전사의 규율을 따르며 동료애가 매우 깊습니다.",
      "드래곤본": "고대 용의 혈통을 이어받은 긍지 높은 종족입니다. 온몸이 단단한 비늘로 덮여 있으며, 입에서 뿜어내는 브레스는 일격에 전장을 뒤엎을 위력을 지닙니다. 용의 지혜와 힘을 동시에 물려받아 태생적으로 지도자의 자질을 갖춘 자들이 많습니다.",
      "하프엘프": "인간의 진취성과 엘프의 섬세함이 결합된 종족입니다. 두 세계 사이에서 방황하기도 하지만, 오히려 그 경계에 서 있기에 양쪽의 장점을 모두 흡수할 수 있습니다. 뛰어난 사교성과 다재다능함으로 외교관이나 모험가로서 큰 두각을 나타냅니다.",
      "하프오크": "인간의 지략과 오크의 완력을 동시에 지닌 혼혈 종족입니다. 거친 외모 속에 숨겨진 뜨거운 심장을 지녔으며, 한 번 목표를 정하면 끝까지 밀어붙이는 돌파력이 일품입니다. 차별을 이겨내고 증명해낸 그들의 힘은 전장에서 누구보다 든든한 방패가 됩니다.",
      "노움": "호기심과 창의력이 폭발하는 작은 거인들입니다. 마법 공학에 천부적인 재능을 보이며, 세상의 모든 원리를 파헤치고 싶어 하는 탐구심을 지녔습니다. 작지만 민첩한 몸놀림과 기발한 발명품들로 적을 교란하는 데 능숙합니다.",
      "할플링": "작은 체구와 달리 누구보다 큰 용기를 지닌 종족입니다. 타고난 낙천성과 행운을 지녔으며, 조용히 움직이는 은신 능력은 타의 추종을 불허합니다. 평화를 사랑하지만 동료가 위험에 처하면 그 어떤 거구보다 용감하게 맞섭니다.",
      "티플링": "고대 악마의 혈통이 발현된 신비롭고 고독한 종족입니다. 머리의 뿔과 꼬리 때문에 오해를 받기도 하지만, 그 내면에는 강력한 비전 마력과 어둠에 대한 저항력이 깃들어 있습니다. 타인의 시선에 굴하지 않고 자신만의 정의를 관철하는 강한 정신력을 지녔습니다.",
      "아시마르": "천상의 존재로부터 축복받은 혈통을 지닌 자들입니다. 그들의 눈동자에는 신성한 빛이 서려 있으며, 치유의 권능과 악을 심판하는 빛의 힘을 다룹니다. 정의를 수호하려는 본능적인 사명감을 지니고 있으며 전장에서 희망의 상징이 됩니다.",
      "고블린": "교활함과 생존력을 바탕으로 어디서든 살아남는 종족입니다. 작고 약해 보이지만 집단 전술과 기습에 능하며, 기계 장치나 폭발물을 다루는 데 기괴한 천재성을 보입니다. 세상의 밑바닥에서 다져진 생존 기술은 극한의 상황에서 빛을 발합니다.",
      "리자드포크": "늪지와 정글을 지배하는 냉철한 사냥꾼들입니다. 감정에 휘둘리지 않는 이성적인 판단력과 수중에서도 자유로운 신체 능력을 지녔습니다. 자연의 섭리를 따르며, 그들의 비늘 갑옷과 뼈 창은 정글의 공포 그 자체입니다.",
      "타바시": "고양이의 유연함과 호기심을 지닌 수인 종족입니다. 폭발적인 순발력과 나무를 타는 등 지형을 활용하는 능력이 뛰어납니다. 새로운 지식과 보물을 찾는 여행을 즐기며, 그들의 기민한 움직임은 적의 눈으로 쫓기조차 힘듭니다.",
      "켄쿠": "날개 잃은 조인족으로, 타인의 목소리와 소리를 완벽하게 흉내 내는 능력을 지녔습니다. 뛰어난 관찰력과 모방 능력을 바탕으로 위조, 잠입, 정보 수집에 특화되어 있습니다. 비록 자신의 목소리는 잃었지만, 세상의 모든 소리를 자신의 무기로 삼습니다.",
      "센타우르스": "반인반마의 신체를 지닌 대초원의 질주자들입니다. 말의 강력한 하체 힘과 인간의 지혜를 동시에 갖추어, 전장을 종횡무진 누비는 기동력은 타의 추종을 불허합니다. 자연과 조화를 이루며 살아가는 긍지 높은 숲의 파수꾼들입니다.",
      "워포지드": "전투를 위해 마법과 강철로 빚어진 인조 생명체입니다. 지치지 않는 신체와 질병에 걸리지 않는 강철의 몸을 지녔으며, 창조된 목적을 넘어 자아를 찾아가는 철학적인 종족이기도 합니다. 그들의 충성심과 방어력은 파티의 가장 단단한 보루가 됩니다.",
      "다크엘프": "지하 세계 '언더다크'의 지배자들입니다. 어둠 속에서도 선명히 볼 수 있는 눈과 치명적인 독을 다루는 기술을 지녔습니다. 냉혹하고 계산적이지만, 한 번 인정한 동료에게는 그 누구보다 강력한 어둠의 조력자가 되어줍니다."
    };
    return descriptions[race] || `${race} 종족은 세상에 널리 알려지지 않은 신비로운 혈통입니다. 그들은 자신들만의 독특한 문화와 고유한 능력을 지니고 있으며, 모험을 통해 그 잠재력을 증명해 나갑니다.`;
  };

  const getJobDescription = (job: string) => {
    const descriptions: Record<string, string> = {
      "전사": "강인한 체력과 숙련된 무기 기술로 전장의 최전선을 지키는 자들입니다. 적의 공격을 온몸으로 받아내며 동료를 보호하고, 묵직한 일격으로 적의 진형을 파괴합니다. 전술적 안목과 용맹함이 그들의 상징입니다.",
      "마법사": "비전 마력의 근원을 탐구하여 현실을 재구성하는 지식인들입니다. 원소의 힘을 빌려 파괴적인 마법을 구사하거나, 시공간을 뒤트는 신비로운 현상을 일으킵니다. 육체는 연약하나 그들의 지혜는 신의 영역에 도전합니다.",
      "도적": "그림자와 소음 속에 숨어 적의 숨통을 조이는 기민한 전문가들입니다. 함정 해제, 잠입, 암살에 특화되어 있으며, 적이 눈치채기도 전에 상황을 종료시킵니다. 치명적인 독과 단검은 그들의 가장 친한 친구입니다.",
      "사제": "신성한 권능을 대행하여 상처를 치유하고 부정한 것을 정화하는 성직자들입니다. 신념의 힘으로 동료들에게 축복을 내리며, 죽음의 문턱에 선 자를 다시 일으켜 세우는 기적을 행합니다. 파티의 정신적 지주이자 생명줄입니다.",
      "성기사": "굳건한 맹세와 신성한 빛으로 무장한 성스러운 기사들입니다. 방패로는 약자를 보호하고, 검에는 신성한 심판의 힘을 담아 악을 멸합니다. 도덕적 결단력과 압도적인 방어력으로 전장의 등불이 됩니다.",
      "바드": "음악과 언어에 깃든 마력을 다루는 예술가이자 이야기꾼들입니다. 노래로 아군의 사기를 드높이고 적의 정신을 혼란에 빠뜨립니다. 다방면의 지식과 재주를 갖추어 어떤 상황에서도 해결책을 찾아내는 다재다능한 모험가입니다.",
      "레인저": "문명과 야생의 경계를 지키는 추적자이자 사냥꾼들입니다. 지형지물을 활용한 매복과 원거리 사격에 능하며, 야수와 교감하여 함께 전투를 치르기도 합니다. 자연의 흐름을 읽어 적을 추적하는 능력이 탁월합니다.",
      "몽크": "자신의 신체를 극한까지 단련하여 그 자체를 무기로 삼는 무술가들입니다. 내면의 기(Ki)를 운용하여 초인적인 속도와 파괴력을 발휘하며, 무기 없이도 적의 급소를 정확히 타격합니다. 정신과 신체의 완벽한 조화를 추구합니다.",
      "워록": "강력한 초자연적 존재와 계약을 맺어 금지된 힘을 빌려 쓰는 자들입니다. 일반적인 마법과는 궤를 달리하는 기괴하고 강력한 주문을 구사하며, 계약의 대가로 얻은 어둠의 권능으로 적을 파멸로 이끕니다.",
      "드루이드": "대자연의 섭리를 수호하며 그 힘을 직접 현신시키는 파수꾼들입니다. 야수로 변신하여 전장을 휩쓸거나, 폭풍과 대지의 분노를 불러일으킵니다. 생명의 순환을 존중하며 자연과 하나 되어 싸웁니다.",
      "바바리안": "내면의 야수 같은 분노를 폭발시켜 전장을 피로 물들이는 광전사들입니다. 고통을 느낄수록 더 강해지는 생존 본능과 거침없는 파괴력을 지녔습니다. 규격화된 무술보다는 본능적인 감각과 압도적인 힘으로 적을 압도합니다.",
      "소서러": "학습이 아닌 혈통 속에 흐르는 타고난 마력을 발현시키는 천재들입니다. 마법의 구조를 본능적으로 이해하여 주문을 변형하거나 강화하는 능력이 탁월합니다. 그들의 몸 자체가 마력의 통로이며 폭발적인 화력을 자랑합니다.",
      "퇴마사": "부정한 영혼과 요괴를 사냥하기 위해 특화된 영능력자들입니다. 부적과 영력을 담은 무기로 보이지 않는 위협에 맞서며, 결계를 쳐서 공간을 보호합니다. 영적인 통찰력으로 사건의 이면을 꿰뚫어 봅니다.",
      "주술사": "정령과 조상의 혼령을 불러내어 현실에 간섭하는 영매들입니다. 토템을 세워 전장을 장악하거나, 저주를 걸어 적의 힘을 갉아먹습니다. 자연의 영적인 힘을 다루는 데 능숙하며 기묘한 비술을 사용합니다.",
      "연금술사": "물질의 성질을 변화시키고 신비로운 시약을 제조하는 과학자들입니다. 전장에서 즉석으로 폭발물을 던지거나, 동료의 신체 능력을 비약적으로 높이는 영약을 제공합니다. 치밀한 계산과 실험 정신으로 승리를 설계합니다.",
      "무사": "일격필살의 검술과 정교한 움직임을 추구하는 동방의 검객들입니다. 화려함보다는 실전적인 효율성을 중시하며, 찰나의 순간에 승부를 결정짓는 집중력이 놀랍습니다. 자신의 검에 명예와 영혼을 담아 싸웁니다."
    };
    return descriptions[job] || `${job} 직업은 자신만의 독특한 기술과 철학을 가진 숙련자의 길입니다. 수많은 실전을 통해 다듬어진 당신의 능력은 예측 불허의 모험에서 결정적인 차이를 만들어낼 것입니다.`;
  };
  const handleIncreaseStat = useCallback((stat: keyof UserInfo['stats']) => {
    if (userInfo.statPoints <= 0) return;
    
    setUserInfo(prev => {
      const nextStats = { ...prev.stats, [stat]: prev.stats[stat] + 1 };
      const nextMaxHp = nextStats.vit * 10 + prev.level * 20;
      const nextMaxMp = nextStats.int * 10 + prev.level * 10;
      return {
        ...prev,
        statPoints: prev.statPoints - 1,
        stats: nextStats,
        maxHp: nextMaxHp,
        maxMp: nextMaxMp,
        hp: stat === "vit" ? prev.hp + 10 : prev.hp,
        mp: stat === "int" ? prev.mp + 10 : prev.mp
      };
    });
  }, [userInfo.statPoints]);

  const handleSendMessage = useCallback(async (text: string, isInternal: boolean = false) => {
    if (!socket) return;

    if (text === "[기술 사용 요청]") {
      setActiveModal("SKILLS");
      return;
    }

    // Handle equipment decision
    if (pendingEquipment) {
      if (text.includes("장착하기")) {
        setUserInfo(prev => ({
          ...prev,
          equipment: {
            ...prev.equipment,
            [pendingEquipment.slot]: pendingEquipment.item
          }
        }));
        setPendingEquipment(null);
        // After equipping, we should probably trigger a small confirmation message or just proceed
        socket.emit("send-message", {
          room: currentRoom,
          message: {
            user: userInfo.name,
            text: `[${pendingEquipment.item.name}]을(를) 장착했습니다.`,
            type: "user",
          },
        });
        // Trigger next turn
        handleSendMessage("장비를 장착했습니다. 계속 진행해주세요.", true);
        return;
      } else if (text === "장착하지 않기") {
        setPendingEquipment(null);
        socket.emit("send-message", {
          room: currentRoom,
          message: {
            user: userInfo.name,
            text: "장비를 장착하지 않기로 했습니다.",
            type: "user",
          },
        });
        // Trigger next turn
        handleSendMessage("장비를 장착하지 않았습니다. 계속 진행해주세요.", true);
        return;
      }
    }

    const userMessage = {
      user: userInfo.name,
      text: text,
      type: "user" as const,
    };

    if (!isInternal) {
      socket.emit("send-message", {
        room: currentRoom,
        message: userMessage,
      });

      // After game starts, sending a message (making a choice) marks the player as ready
      if (isGameStarted) {
        setIsReady(true);
        socket.emit("action-ready-player", { room: currentRoom, ready: true });
      }
    }

    // If in a dungeon (not lobby), trigger AI GM
    if (currentRoom !== GLOBAL_LOBBY) {
      // Advance game time (each turn takes 1 hour)
      setGameTime(prev => {
        const nextTime = (prev + 1) % 24;
        if (nextTime === 0) setGameDay(d => d + 1);
        setIsDaytime(nextTime >= 6 && nextTime < 18);
        return nextTime;
      });

      setIsGMThinking(true);
      try {
        const history = messages.map(m => `${m.user}: ${m.text}`).join("\n");
        const prompt = `
          당신은 미지의 다크 판타지 TRPG의 숙련된 '시스템'입니다.
          
          현재 상황:
          - 장소: ${currentLocation}
          - 시간: ${gameDay}일차 ${isDaytime ? "낮" : "밤"}
          - 플레이어: ${userInfo.name} (${userInfo.race}/${userInfo.job})
          - 장착 중인 키워드: [운명] ${userInfo.fateKeywords.join(", ") || "없음"}, [일반] ${userInfo.normalKeywords.join(", ") || "없음"}
          - 장비 상태: ${JSON.stringify(userInfo.equipment)}
          - 파티원: ${JSON.stringify(players.map(p => ({ name: p.name, job: p.job, race: p.race })))}
          
          출력 규칙 (이 규칙을 어기면 시스템 오류가 발생합니다):
          1. **접두사 금지**: "시스템:", "GM:" 등을 절대 쓰지 마세요.
          2. **상황 묘사**: 상황 묘사는 최대 3문장 이내로 간결하게 하세요.
          3. **선택지 형식**: 답변의 마지막에 반드시 4개의 선택지를 아래 형식으로 작성하세요. 4번 선택지는 항상 "[4] 직접 행동 입력"으로 고정하세요.
          4. **장비 보상 (엄격 제한)**: 
             - 장비는 매우 희귀하게 부여해야 합니다. 연속으로 장비를 주지 마세요.
             - 장비는 반드시 **전투 승리 후** 또는 **매우 특별한 이벤트 성공 후**에만 보상으로 제공하세요.
             - 일반적인 상황 묘사나 선택지 제시와 동시에 장비를 주지 마세요. (전투가 시작되기도 전에 템부터 주는 행위 절대 금지)
             - 장비를 보상으로 줄 때는 반드시 "[EQUIP_AWARD:슬롯:아이템이름]" 형식을 포함하세요.
             - 슬롯 종류: weapon(무기), armor(방어구), gloves(장갑), boots(신발), sub(보조장비), artifact(유물)
             - 예: [EQUIP_AWARD:weapon:강철 롱소드]
             - 답변 본문에는 전투 승리 후 전리품을 챙기거나 보상을 받는 상황을 묘사하세요.
          5. **주사위 판정 (중요)**: 
             - 주사위 판정은 남발하지 마세요. 정말 중요하고 극적인 순간(치명적인 전투, 복잡한 함정 해제, 중요한 설득 등)에만 선택지에 포함시키세요.
             - 주사위 판정이 필요한 경우, 선택지 중 하나를 "[주사위 판정: 목표수치 이상] ..." 형식으로 제시하세요. (예: [주사위 판정: 12 이상] 거대한 문을 힘껏 밀어본다.)
             - 플레이어가 주사위 판정 선택지를 골랐을 때만, 답변 안에 "[DICE_ROLL:목표수치]" 형식을 포함하세요. (예: [DICE_ROLL:12])
             - 답변 본문에는 주사위를 굴리기 전의 긴장감 넘치는 상황 묘사만 작성하세요.
             - **성공/실패 결과**는 반드시 "[SUCCESS:성공 시 내용]", "[FAILURE:실패 시 내용]" 태그를 사용하여 답변 끝에 포함하세요.
             - 주사위 판정은 20면체 주사위(D20)를 기준으로 합니다.
          6. **키워드 활용**: 장착 중인 키워드와 연관된 특수 선택지를 제공할 때, 반드시 개연성을 유지하세요.
          7. **경험치 지급 (엄격 제한)**: 
             - 경험치는 반드시 **전투 승리** 또는 **부탁/퀘스트를 완전히 해결한 후**에만 지급하세요.
             - 부탁을 수락하거나 대화를 시작하는 시점에는 절대 경험치를 주지 마세요. (선불 지급 금지)
             - 전투 승리나 퀘스트 완료 시 반드시 "[EXP_AWARD:수치]" 형식을 포함하세요.
             - 일반적인 성공은 10~30, 힘든 전투는 50~100, 보스나 특별한 성취는 200 이상으로 조절하세요.
          8. **키워드 획득 (엄격 제한)**: 
             - 키워드는 매우 희귀하게 부여해야 합니다. 1일차에는 절대 부여하지 마세요.
             - 보스 처치, 전설적 유물 발견 등 정말 특별한 업적 달성 시에만 [AWARD_FATE:키워드] 또는 [AWARD_NORMAL:키워드] 태그를 사용하세요.
             - 한 번의 답변에 키워드 부여는 최대 1개로 제한합니다.
          
          대화 기록:
          ${history}
          
          플레이어의 행동: ${text}
        `;
        
        let gmResponse = await askGM(prompt);
        
        // Extract choices using a more robust regex that handles both single-line and multi-line formats
        const choices: string[] = [];
        const choiceRegex = /(\d+)\.\s+(.+?)(?=\s*\d+\.\s+|$)/g;
        let match;
        while ((match = choiceRegex.exec(gmResponse)) !== null) {
          choices.push(match[2].trim());
        }
        
        // Clean text (remove choice lines)
        let cleanText = gmResponse.replace(/(\d+)\.\s+(.+?)(?=\s*\d+\.\s+|$)/g, "").trim();

        // Check for dice roll keyword in the cleaned text
        const diceMatch = cleanText.match(/\[DICE_ROLL:(\d+)\]/);
        const successMatch = cleanText.match(/\[SUCCESS:(.+?)\]/);
        const failureMatch = cleanText.match(/\[FAILURE:(.+?)\]/);

        if (diceMatch) {
          const target = parseInt(diceMatch[1]);
          setTargetNumber(target);
          setDiceResult(null); // Clear previous result
          setIsDiceRolling(true);
          
          const result = Math.floor(Math.random() * 20) + 1;
          
          // Remove tags from initial message
          cleanText = cleanText.replace(diceMatch[0], "").replace(/\[SUCCESS:.+?\]/, "").replace(/\[FAILURE:.+?\]/, "").trim();

          // Decision phase: set result after some time of fast spinning
          setTimeout(() => {
            setDiceResult(result);
          }, 1500); 

          setTimeout(() => {
            setIsDiceRolling(false);
            setDiceResult(null);
            const goal = target; // Use closure variable
            setTargetNumber(null);

            const isSuccess = result >= goal;
            const rawOutcome = isSuccess 
              ? successMatch ? successMatch[1] : "성공했습니다!"
              : failureMatch ? failureMatch[1] : "실패했습니다...";
            
            const processed = processRewards(rawOutcome);
            const finalChoices = processed.choices || (choices.length > 0 ? choices : undefined);

            const outcomeText = isSuccess 
              ? `🎲 주사위 판정 성공! (${result} >= ${goal})\n\n${processed.text}`
              : `🎲 주사위 판정 실패... (${result} < ${goal})\n\n${processed.text}`;

            // Send outcome as a separate message
            socket.emit("send-message", {
              room: currentRoom,
              message: {
                user: "시스템",
                text: outcomeText,
                type: "gm",
              },
            });

            // Delay showing choices for better pacing
            setTimeout(() => {
              socket.emit("send-message", {
                room: currentRoom,
                message: {
                  user: "시스템",
                  text: "어떠한 행보를 취하시겠습니까?",
                  type: "gm",
                  choices: finalChoices,
                },
              });
              setIsGMThinking(false);
            }, 1200); 
          }, 5000); 

          // Send initial message
          socket.emit("send-message", {
            room: currentRoom,
            message: {
              user: "시스템",
              text: cleanText,
              type: "gm",
            },
          });
        } else {
          // Check for equip confirmation
          if (text.includes("장착하기") && pendingEquipment) {
            setUserInfo(prev => ({
              ...prev,
              equipment: {
                ...prev.equipment,
                [pendingEquipment.slot]: pendingEquipment.item
              }
            }));
            cleanText = `[${pendingEquipment.item.name}]을(를) 성공적으로 장착했습니다.`;
            setPendingEquipment(null);
          } else if (text.includes("장착하지 않기")) {
            cleanText = "장비를 장착하지 않고 보관하거나 버렸습니다.";
            setPendingEquipment(null);
          }

          const processed = processRewards(cleanText);
          const finalChoices = processed.choices || (choices.length > 0 ? choices : undefined);

          socket.emit("send-message", {
            room: currentRoom,
            message: {
              user: "시스템",
              text: processed.text,
              type: "gm",
              choices: finalChoices,
            },
          });
        }
      } catch (error) {
        console.error("GM Error:", error);
      } finally {
        setIsGMThinking(false);
      }
    }
  }, [socket, currentRoom, userInfo, messages, currentLocation, players]);

  const handleHome = () => {
    setGameState("TITLE");
    setMessages([]); // Clear chat history when going home
    setHasCreatedChar(false);
    setIsReady(false);
    setIsGameStarted(false);
    setCountdown(null);
    prologueTriggeredRef.current = false;
  };

  // Handle auto-play on first interaction
  useEffect(() => {
    const startAudio = () => {
      if (audioRef.current && !isMuted) {
        audioRef.current.play().catch(err => console.log("Audio play failed:", err));
      }
      window.removeEventListener("click", startAudio);
      window.removeEventListener("touchstart", startAudio);
      window.removeEventListener("keydown", startAudio);
    };
    window.addEventListener("click", startAudio);
    window.addEventListener("touchstart", startAudio);
    window.addEventListener("keydown", startAudio);
    return () => {
      window.removeEventListener("click", startAudio);
      window.removeEventListener("touchstart", startAudio);
      window.removeEventListener("keydown", startAudio);
    };
  }, [isMuted]);

  // Sync mute state and handle manual play
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.muted = isMuted;
      if (!isMuted) {
        audioRef.current.play().catch(() => {});
      }
    }
  }, [isMuted]);

  return (
    <div className="w-screen h-screen flex items-center justify-center bg-editorial-bg">
      <audio 
        ref={audioRef}
        autoPlay 
        loop 
        muted={isMuted} 
        src="https://www.chosic.com/wp-content/uploads/2021/07/The-Legend-of-The-King.mp3"
      />
      <div className="w-full h-full max-w-7xl bg-editorial-bg border-editorial-border-gold relative flex flex-col overflow-hidden">
        
        {/* Fade Overlay for Transitions */}
        <AnimatePresence>
          {isFading && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-[200] bg-black"
            />
          )}
        </AnimatePresence>

        {/* Header */}
        <header className="h-20 border-b editorial-border-gold flex items-center justify-between px-10 bg-editorial-bg z-[110] relative">
          {/* Left Section: Location & Status */}
          <div className="flex items-center gap-6 w-[400px]">
            {isGameStarted ? (
              <div className="flex flex-col">
                <span className="text-[10px] text-editorial-gold/40 uppercase tracking-[0.3em] mb-0.5">Current Realm</span>
                <div className="flex items-center gap-2">
                  <span className="font-serif text-xl text-editorial-gold tracking-widest leading-none whitespace-nowrap">{currentLocation || "Unknown Realm"}</span>
                  <div className="w-1.5 h-1.5 bg-editorial-gold rounded-full animate-pulse shadow-[0_0_8px_rgba(212,175,55,0.4)]" />
                </div>
              </div>
            ) : (
              <div className="logo font-serif text-2xl tracking-[0.2em] uppercase text-editorial-gold">
                운명의 길
              </div>
            )}
          </div>

          {/* Center Section: Clock HUD only */}
          <div className="flex-1 flex items-center justify-center">
            {isGameStarted && (
              <div className="bg-editorial-paper/80 backdrop-blur-md px-10 py-2 rounded-sm border border-editorial-gold/30 shadow-[0_0_30px_rgba(212,175,55,0.1)] flex flex-col items-center justify-center min-w-[170px] h-[68px] relative z-10">
                <div className="flex items-center gap-2 mb-1 opacity-80">
                  <span className="text-[11px] text-editorial-gold font-serif uppercase tracking-[0.2em]">{gameDay}일차</span>
                  <span className="text-[11px] text-editorial-main/60 font-mono tracking-wider">
                    {gameTime % 12 === 0 ? 12 : gameTime % 12}:00 {gameTime >= 12 ? "PM" : "AM"}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <AnimatePresence mode="wait">
                    {isDaytime ? (
                      <motion.div
                        key="sun"
                        initial={{ scale: 0, rotate: -45, opacity: 0 }}
                        animate={{ scale: 1, rotate: 0, opacity: 1 }}
                        exit={{ scale: 0, rotate: 45, opacity: 0 }}
                        className="text-orange-400 drop-shadow-[0_0_10px_rgba(251,146,60,0.5)]"
                      >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zM2 13h2c.55 0 1-.45 1-1s-.45-1-1-1H2c-.55 0-1 .45-1 1s.45 1 1 1zm18 0h2c.55 0 1-.45 1-1s-.45-1-1-1h-2c-.55 0-1 .45-1 1s.45 1 1 1zM11 2v2c0 .55.45 1 1 1s1-.45 1-1V2c0-.55-.45-1-1-1s-1 .45-1 1zm0 18v2c0 .55.45 1 1 1s1-.45 1-1v-2c0-.55-.45-1-1-1s-1 .45-1 1zM5.99 4.58c-.39-.39-1.03-.39-1.41 0s-.39 1.03 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0s.39-1.03 0-1.41L5.99 4.58zm12.37 12.37c-.39-.39-1.03-.39-1.41 0s-.39 1.03 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0s.39-1.03 0-1.41l-1.06-1.06zm1.06-12.37c-.39-.39-1.03-.39-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41s1.03.39 1.41 0l1.06-1.06c.39-.39.39-1.03 0-1.41zm-12.37 12.37c-.39-.39-1.03-.39-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41s1.03.39 1.41 0l1.06-1.06c.39-.39.39-1.03 0-1.41z" />
                        </svg>
                      </motion.div>
                    ) : (
                      <motion.div
                        key="moon"
                        initial={{ scale: 0, rotate: -45, opacity: 0 }}
                        animate={{ scale: 1, rotate: 0, opacity: 1 }}
                        exit={{ scale: 0, rotate: 45, opacity: 0 }}
                        className="text-blue-200 drop-shadow-[0_0_10px_rgba(191,219,254,0.5)]"
                      >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9 9-4.03 9-9c0-.46-.04-.92-.1-1.36-.98 1.37-2.58 2.26-4.4 2.26-3.03 0-5.5-2.47-5.5-5.5 0-1.82.89-3.42 2.26-4.4-.44-.06-.9-.1-1.36-.1z" />
                        </svg>
                      </motion.div>
                    )}
                  </AnimatePresence>
                  <span className="font-serif text-lg text-editorial-main tracking-[0.2em] uppercase font-bold drop-shadow-sm">
                    {isDaytime ? "Daytime" : "Nightfall"}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Right Section: Compact Stacked HP & MP HUDs */}
          <div className="flex items-center justify-end gap-6 w-[320px]">
            {isGameStarted && (
              <div className="flex flex-col gap-1 w-full relative">
                {/* Target Tracker (Overlay style or pushed to side) */}
                {currentTarget && (
                  <motion.div 
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="absolute -left-[160px] top-1/2 -translate-y-1/2 flex bg-red-950/40 backdrop-blur-md border border-red-500/30 rounded-sm overflow-hidden shadow-2xl h-[48px]"
                  >
                    <div className="px-2 border-r border-red-500/20 bg-red-900/20 flex flex-col justify-center items-center">
                      <span className="text-[7px] text-red-500 uppercase tracking-[0.1em] font-bold">Target</span>
                      <div className="w-1 h-1 bg-red-500 rounded-full animate-pulse mt-0.5" />
                    </div>
                    <div className="px-4 flex flex-col justify-center min-w-[100px]">
                      <div className="flex justify-between items-baseline gap-3 mb-0.5">
                        <span className="text-[9px] text-red-400 font-serif truncate max-w-[70px] italic font-bold tracking-wider">{currentTarget.name}</span>
                        <span className="text-[8px] font-mono text-white/40">{currentTarget.hp}/{currentTarget.maxHp}</span>
                      </div>
                      <div className="h-1 w-full bg-black/60 rounded-full overflow-hidden border border-red-500/10">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${(currentTarget.hp / currentTarget.maxHp) * 100}%` }}
                          className="h-full bg-red-700 rounded-full shadow-[0_0_10px_rgba(185,28,28,0.3)]"
                        />
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* HP Row */}
                <motion.div 
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="bg-editorial-gold/5 px-4 py-1.5 rounded-sm border border-editorial-gold/20 shadow-xl flex flex-col justify-center h-[34px]"
                >
                  <div className="flex justify-between items-center h-full">
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] text-editorial-gold uppercase tracking-[0.1em] font-bold opacity-60">HP</span>
                      <div className="h-1 w-32 bg-black/60 rounded-full overflow-hidden border border-white/5 relative">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${(userInfo.hp / userInfo.maxHp) * 100}%` }}
                          className={cn(
                            "h-full rounded-full transition-all duration-700 relative",
                            userInfo.hp / userInfo.maxHp < 0.3 ? "bg-red-600 shadow-[0_0_10px_rgba(220,38,38,0.7)]" : "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.3)]"
                          )}
                        />
                      </div>
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className={cn(
                        "text-sm font-mono font-bold tracking-tight",
                        userInfo.hp / userInfo.maxHp < 0.3 ? "text-red-500" : "text-white"
                      )}>{userInfo.hp}</span>
                      <span className="text-[8px] text-white/30 font-mono">/ {userInfo.maxHp}</span>
                    </div>
                  </div>
                </motion.div>

                {/* MP Row */}
                <motion.div 
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="bg-blue-900/10 px-4 py-1.5 rounded-sm border border-blue-500/20 shadow-xl flex flex-col justify-center h-[34px]"
                >
                  <div className="flex justify-between items-center h-full">
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] text-blue-400 uppercase tracking-[0.1em] font-bold opacity-60">MP</span>
                      <div className="h-1 w-32 bg-black/60 rounded-full overflow-hidden border border-white/5 relative">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${(userInfo.mp / userInfo.maxHp) * 100}%` }}
                          className="h-full bg-blue-500 rounded-full shadow-[0_0_8px_rgba(59,130,246,0.3)]"
                        />
                      </div>
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-sm font-mono text-blue-400 font-bold tracking-tight">{userInfo.mp}</span>
                      <span className="text-[8px] text-white/30 font-mono">/ {userInfo.maxMp}</span>
                    </div>
                  </div>
                </motion.div>
              </div>
            )}
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 flex overflow-hidden">
          {/* Sidebar (Only in GAME state) */}
          {gameState === "GAME" && (
            <aside className="w-64 bg-editorial-paper border-r editorial-border-gold-dim p-6 flex flex-col gap-4 overflow-y-auto">
              <div className="character-info">
                <div className={`relative px-4 bg-editorial-gold/5 border border-editorial-gold/20 rounded-sm text-center flex flex-col justify-center transition-all duration-500 ${
                  !hasCreatedChar ? "py-6 min-h-[100px]" : "pt-6 pb-4 min-h-[450px]"
                }`}>
                  {/* Subtle decorative corners */}
                  <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-editorial-gold/40" />
                  <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-editorial-gold/40" />
                  <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-editorial-gold/40" />
                  <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-editorial-gold/40" />
                  
                  {isOwner && currentRoom !== GLOBAL_LOBBY && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-editorial-paper px-3">
                      <Star size={20} className="text-editorial-gold fill-editorial-gold" />
                    </div>
                  )}

                  <AnimatePresence mode="wait">
                    {!hasCreatedChar ? (
                      <motion.h2 
                        key="random-name"
                        initial={{ opacity: 1 }}
                        exit={{ 
                          opacity: 0, 
                          scale: 1.5, 
                          filter: "blur(8px) brightness(3)",
                          color: "#ff4d00" 
                        }}
                        transition={{ duration: 1.0, ease: "easeOut" }}
                        className="font-serif text-2xl italic text-editorial-gold tracking-widest flex flex-col gap-1"
                      >
                        {userInfo.name ? (
                          <>
                            <span className="text-lg opacity-60">{userInfo.name.split(" ")[0]}</span>
                            <span>{userInfo.name.split(" ")[1]}</span>
                          </>
                        ) : (
                          "이름 없는 자"
                        )}
                      </motion.h2>
                    ) : (
                      <motion.div
                        key="char-info"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="flex flex-col gap-2"
                      >
                        <div className="name-section relative">
                          {userInfo.fateKeywords.length > 0 && (
                            <div className="flex justify-center gap-1 mb-1">
                              {userInfo.fateKeywords.map((kw, i) => (
                                <span key={i} className="text-[9px] text-editorial-gold font-serif italic border border-editorial-gold/30 px-1.5 py-0.5 rounded-full bg-editorial-gold/5 animate-pulse">
                                  {kw}
                                </span>
                              ))}
                            </div>
                          )}
                          <h2 className="font-serif text-2xl font-bold text-editorial-gold tracking-widest uppercase">
                            [{userInfo.name}]
                          </h2>
                          <div className="flex items-center justify-center gap-2 mt-1">
                            <div className="h-[1px] w-6 bg-editorial-gold/20" />
                            <div className="flex flex-col items-center">
                              <p className="text-[10px] text-editorial-dim tracking-[0.3em] uppercase font-serif">
                                Level {userInfo.level}
                              </p>
                              {/* EXP Bar */}
                              <div className="w-16 h-2.5 mt-1 bg-black/40 rounded-full overflow-hidden border border-editorial-gold/10">
                                <motion.div 
                                  initial={{ width: 0 }}
                                  animate={{ width: `${(userInfo.exp / userInfo.maxExp) * 100}%` }}
                                  className="h-full bg-editorial-gold shadow-[0_0_5px_rgba(212,175,55,0.8)]"
                                />
                              </div>
                            </div>
                            <div className="h-[1px] w-6 bg-editorial-gold/20" />
                          </div>
                        </div>

                        <div className="combat-power-section py-1 border-b border-editorial-gold/10">
                          <div className="flex items-center justify-center gap-2">
                            <Trophy size={16} className="text-editorial-gold" />
                            <span className="text-xs text-editorial-gold font-serif uppercase tracking-widest">전투력</span>
                            <span className="text-lg text-editorial-main font-bold font-mono">{calculateCP(userInfo)}</span>
                          </div>
                        </div>

                        <div className="keywords-section relative">
                          <div className="flex items-center justify-center gap-2 mb-1">
                            <div className="h-[1px] w-6 bg-editorial-gold/20" />
                            <button 
                              onClick={() => setActiveModal("EQUIPPED_KEYWORDS")}
                              className="text-[10px] text-editorial-gold/60 hover:text-editorial-gold transition-colors uppercase tracking-[0.2em] font-serif"
                            >
                              Keywords
                            </button>
                            <div className="h-[1px] w-6 bg-editorial-gold/20" />
                          </div>
                          
                          <div className="flex items-center justify-center gap-4 mb-1">
                            <button 
                              onClick={() => setActiveModal("RACE")}
                              className="p-2 rounded-sm bg-editorial-gold/5 border border-editorial-gold/20 hover:border-editorial-gold transition-all"
                              title="종족 정보"
                            >
                              <User size={16} className="text-editorial-gold" />
                            </button>
                            <button 
                              onClick={() => setActiveModal("JOB")}
                              className="p-2 rounded-sm bg-editorial-gold/5 border border-editorial-gold/20 hover:border-editorial-gold transition-all"
                              title="직업 정보"
                            >
                              <Sword size={16} className="text-editorial-gold" />
                            </button>
                          </div>
                        </div>

                        <div className="flex items-center justify-center gap-2 mb-1">
                          <button 
                            onClick={() => setActiveModal("FATE_KEYWORDS")}
                            className="p-1.5 rounded-full bg-gradient-to-br from-indigo-900 via-purple-900 to-black border border-indigo-500/50 shadow-[0_0_10px_rgba(139,92,246,0.3)] hover:scale-110 transition-transform"
                            title="운명 키워드"
                          >
                            <Star size={14} className="text-indigo-200" />
                          </button>
                          <button 
                            onClick={() => setActiveModal("NORMAL_KEYWORDS")}
                            className="p-1.5 rounded-full bg-editorial-paper border border-editorial-gold/30 hover:border-editorial-gold transition-all hover:scale-110"
                            title="일반 키워드"
                          >
                            <CheckCircle2 size={14} className="text-editorial-gold/60" />
                          </button>
                        </div>

                        <div className="stats-section flex flex-col gap-1">
                          <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm text-editorial-dim font-mono uppercase">
                            <div className="flex justify-between border-b border-editorial-gold/5 pb-1">
                              <button 
                                onClick={() => handleIncreaseStat("str")}
                                disabled={userInfo.statPoints <= 0}
                                className={`text-editorial-gold/60 transition-all ${userInfo.statPoints > 0 ? "hover:text-editorial-gold hover:drop-shadow-[0_0_8px_rgba(212,175,55,0.8)] cursor-pointer" : "cursor-default"}`}
                              >
                                STR
                              </button> 
                              <span className="text-editorial-main font-bold">{userInfo.stats.str}</span>
                            </div>
                            <div className="flex justify-between border-b border-editorial-gold/5 pb-1">
                              <button 
                                onClick={() => handleIncreaseStat("dex")}
                                disabled={userInfo.statPoints <= 0}
                                className={`text-editorial-gold/60 transition-all ${userInfo.statPoints > 0 ? "hover:text-editorial-gold hover:drop-shadow-[0_0_8px_rgba(212,175,55,0.8)] cursor-pointer" : "cursor-default"}`}
                              >
                                DEX
                              </button> 
                              <span className="text-editorial-main font-bold">{userInfo.stats.dex}</span>
                            </div>
                            <div className="flex justify-between border-b border-editorial-gold/5 pb-1">
                              <button 
                                onClick={() => handleIncreaseStat("int")}
                                disabled={userInfo.statPoints <= 0}
                                className={`text-editorial-gold/60 transition-all ${userInfo.statPoints > 0 ? "hover:text-editorial-gold hover:drop-shadow-[0_0_8px_rgba(212,175,55,0.8)] cursor-pointer" : "cursor-default"}`}
                              >
                                INT
                              </button> 
                              <span className="text-editorial-main font-bold">{userInfo.stats.int}</span>
                            </div>
                            <div className="flex justify-between border-b border-editorial-gold/5 pb-1">
                              <button 
                                onClick={() => handleIncreaseStat("vit")}
                                disabled={userInfo.statPoints <= 0}
                                className={`text-editorial-gold/60 transition-all ${userInfo.statPoints > 0 ? "hover:text-editorial-gold hover:drop-shadow-[0_0_8px_rgba(212,175,55,0.8)] cursor-pointer" : "cursor-default"}`}
                              >
                                VIT
                              </button> 
                              <span className="text-editorial-main font-bold">{userInfo.stats.vit}</span>
                            </div>
                          </div>
                          <div className="mt-1 py-1 px-2 bg-editorial-gold/10 rounded-sm flex justify-between items-center">
                            <span className="text-[10px] text-editorial-gold font-serif uppercase tracking-wider">남은 포인트</span>
                            <span className="text-xs text-editorial-main font-bold font-mono">{userInfo.statPoints}</span>
                          </div>
                        </div>

                        <div className="equipment-section border-t border-editorial-gold/10 pt-2 flex flex-col gap-1">
                          <span className="text-[10px] text-editorial-dim uppercase tracking-[0.2em] font-serif mb-1">Equipment</span>
                          <div className="grid grid-cols-3 gap-2">
                            {Object.entries(userInfo.equipment).map(([slot, item]) => {
                              const typedItem = item as Item | null;
                              return (
                                <button
                                  key={slot}
                                  onClick={() => {
                                    if (typedItem) {
                                      setSelectedItem(typedItem);
                                      setActiveModal("ITEM_INFO");
                                    }
                                  }}
                                  className={`aspect-square flex flex-col items-center justify-center border rounded-sm transition-all ${
                                    typedItem 
                                      ? "bg-editorial-gold/10 border-editorial-gold/40 hover:border-editorial-gold" 
                                      : "bg-black/20 border-editorial-gold/10 opacity-40 cursor-default"
                                  }`}
                                  title={typedItem ? typedItem.name : "비어있음"}
                                >
                                  {slot === "weapon" && <Sword size={18} style={{ color: typedItem ? getRarityColor(typedItem.rarity) : undefined }} />}
                                  {slot === "armor" && <Shirt size={18} style={{ color: typedItem ? getRarityColor(typedItem.rarity) : undefined }} />}
                                  {slot === "gloves" && <Hand size={18} style={{ color: typedItem ? getRarityColor(typedItem.rarity) : undefined }} />}
                                  {slot === "boots" && <Footprints size={18} style={{ color: typedItem ? getRarityColor(typedItem.rarity) : undefined }} />}
                                  {slot === "sub" && <Shield size={18} style={{ color: typedItem ? getRarityColor(typedItem.rarity) : undefined }} />}
                                  {slot === "artifact" && <Zap size={18} style={{ color: typedItem ? getRarityColor(typedItem.rarity) : undefined }} />}
                                  <span className="text-[8px] mt-1 uppercase opacity-60">{slot}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              <div className="flex-1 flex flex-col justify-end gap-3">
                {gameState !== "TITLE" && (
                  <>
                    {gameState === "GAME" && currentRoom === GLOBAL_LOBBY && (
                      <motion.button 
                        whileHover={{ scale: 1.02, backgroundColor: "rgba(212, 175, 55, 0.1)" }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setGameState("ROOM_SELECT")}
                        className="w-full py-3 px-4 border border-editorial-gold/30 rounded-sm font-serif text-sm uppercase tracking-[0.2em] text-editorial-gold flex items-center justify-center gap-2 transition-colors hover:border-editorial-gold shadow-sm"
                      >
                        <Sword size={14} className="mb-0.5" />
                        모험 시작
                      </motion.button>
                    )}
                    
                    {gameState === "GAME" && currentRoom !== GLOBAL_LOBBY && (
                      <>
                        {!hasCreatedChar ? (
                          <motion.button 
                            whileHover={{ scale: 1.02, backgroundColor: "rgba(212, 175, 55, 0.1)" }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => setGameState("CHAR_PATH")}
                            className="w-full py-3 px-4 border border-editorial-gold/30 rounded-sm font-serif text-sm uppercase tracking-[0.2em] text-editorial-gold flex items-center justify-center gap-2 transition-colors hover:border-editorial-gold shadow-sm"
                          >
                            <UserPlus size={14} className="mb-0.5" />
                            캐릭터 생성
                          </motion.button>
                        ) : (
                          <motion.button 
                            whileHover={{ scale: isGameStarted ? 1 : 1.02, backgroundColor: isReady ? (isGameStarted ? "rgba(249, 115, 22, 0.1)" : "rgba(34, 197, 94, 0.1)") : "rgba(212, 175, 55, 0.1)" }}
                            whileTap={{ scale: isGameStarted ? 1 : 0.98 }}
                            disabled={isGameStarted}
                            onClick={() => {
                              if (isGameStarted) return;
                              const nextReady = !isReady;
                              setIsReady(nextReady);
                              if (socket) {
                                socket.emit("update-player-status", {
                                  room: currentRoom,
                                  userInfo,
                                  isReady: nextReady
                                });
                                
                                if (nextReady) {
                                  socket.emit("send-message", {
                                    room: currentRoom,
                                    message: {
                                      user: "시스템",
                                      text: `${userInfo.name}님이 운명의 길을 정했습니다.`,
                                      type: "system",
                                    },
                                  });
                                }
                              }
                            }}
                            className={`w-full py-3 px-4 border rounded-sm font-serif text-sm uppercase tracking-[0.2em] flex items-center justify-center gap-2 transition-all shadow-sm ${
                              isReady 
                                ? (isGameStarted ? "border-orange-500/50 text-orange-500 bg-orange-500/5" : "border-green-500/50 text-green-500 bg-green-500/5")
                                : "border-editorial-gold/30 text-editorial-gold"
                            } ${isGameStarted ? "cursor-default" : ""}`}
                          >
                            {isReady ? <CheckCircle2 size={14} className="mb-0.5" /> : <Sword size={14} className="mb-0.5" />}
                            {isReady ? (isGameStarted ? "운명 진행중" : "준비완료") : "준비"}
                          </motion.button>
                        )}
                      </>
                    )}

                    <motion.button 
                      whileHover={{ scale: 1.02, backgroundColor: "rgba(255, 255, 255, 0.05)" }}
                      whileTap={{ scale: 0.98 }}
                      onClick={currentRoom === GLOBAL_LOBBY ? handleHome : () => {
                        setCurrentRoom(GLOBAL_LOBBY);
                        setHasCreatedChar(false);
                        setIsReady(false);
                      }}
                      className="w-full py-3 px-4 border border-editorial-dim/20 rounded-sm font-serif text-sm uppercase tracking-[0.2em] text-editorial-dim flex items-center justify-center gap-2 transition-colors hover:text-editorial-main hover:border-editorial-dim shadow-sm"
                    >
                      <LogOut size={14} className="mb-0.5 rotate-180" />
                      {currentRoom === GLOBAL_LOBBY ? "홈으로" : "퇴장"}
                    </motion.button>
                  </>
                )}
              </div>
            </aside>
          )}

          <div className="flex-1 relative overflow-hidden flex flex-col">
            <AnimatePresence mode="wait">
              {gameState === "TITLE" && (
                <motion.div key="title" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full">
                  <TitleScreen onStart={handleStart} />
                </motion.div>
              )}
              
              {gameState === "GAME" && (
                <motion.div key="game" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full relative overflow-hidden">
                  {/* Screen Effects Overlay */}
                  <AnimatePresence>
                    {screenEffect === "DAMAGE" && (
                      <motion.div 
                        initial={{ opacity: 0 }} 
                        animate={{ opacity: 0.3 }} 
                        exit={{ opacity: 0 }} 
                        className="absolute inset-0 z-[150] bg-red-600 pointer-events-none"
                      />
                    )}
                    {screenEffect === "HEAL" && (
                      <motion.div 
                        initial={{ opacity: 0 }} 
                        animate={{ opacity: 0.2 }} 
                        exit={{ opacity: 0 }} 
                        className="absolute inset-0 z-[150] bg-green-400 pointer-events-none"
                      />
                    )}
                    {screenEffect === "LEVEL_UP" && (
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.8, y: 50 }} 
                        animate={{ opacity: 1, scale: 1, y: 0 }} 
                        exit={{ opacity: 0, scale: 1.2 }} 
                        className="absolute inset-0 z-[151] flex items-center justify-center pointer-events-none"
                      >
                        <div className="bg-editorial-gold text-black px-8 py-4 font-serif text-4xl tracking-[0.5em] uppercase shadow-[0_0_50px_rgba(212,175,55,0.5)]">
                          Level Up
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <GameRoom 
                    messages={messages} 
                    onSendMessage={handleSendMessage} 
                    userInfo={userInfo}
                    isGMThinking={isGMThinking}
                    isGameStarted={isGameStarted}
                    players={players}
                    isDiceRolling={isDiceRolling}
                    diceResult={diceResult}
                    targetNumber={targetNumber}
                    currentTarget={currentTarget}
                  />
                  
                  {/* Countdown Overlay */}
                  <AnimatePresence>
                    {countdown !== null && (
                      <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md"
                      >
                        <motion.div
                          key={countdown}
                          initial={{ scale: 4, opacity: 0, filter: "blur(20px)" }}
                          animate={{ scale: 1, opacity: 1, filter: "blur(0px)" }}
                          exit={{ scale: 0.2, opacity: 0, filter: "blur(10px)" }}
                          transition={{ duration: 0.8, ease: "easeOut" }}
                          className="text-[15rem] font-serif text-editorial-gold drop-shadow-[0_0_50px_rgba(197,160,89,0.8)] relative"
                        >
                          {countdown}
                          {/* Outer Glow Ring */}
                          <motion.div 
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1.5, opacity: [0, 0.5, 0] }}
                            transition={{ duration: 0.8, repeat: Infinity }}
                            className="absolute inset-0 border-4 border-editorial-gold rounded-full blur-2xl"
                          />
                        </motion.div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Start Message Overlay */}
                  <AnimatePresence>
                    {showStartOverlay && (
                      <motion.div 
                        initial={{ opacity: 0, backdropFilter: "blur(0px)" }}
                        animate={{ opacity: 1, backdropFilter: "blur(20px)" }}
                        exit={{ opacity: 0, backdropFilter: "blur(0px)" }}
                        onAnimationComplete={() => {
                          // Reset ready status when game actually starts
                          setIsReady(false);
                          if (socket) {
                            socket.emit("action-ready-player", { room: currentRoom, ready: false });
                          }

                          // Trigger GM prologue after a short delay
                          if (showStartOverlay && !prologueTriggeredRef.current) {
                            prologueTriggeredRef.current = true;
                            setTimeout(() => {
                              if (isOwner) {
                                // Use a more specific internal command to avoid redundant initial scenes
                                handleSendMessage("게임이 시작되었습니다. 현재 장소의 분위기를 묘사하고 플레이어들에게 첫 번째 선택지를 3개 주세요. 반드시 상황 묘사 뒤에 1. 2. 3. 번호를 붙여 선택지를 작성하세요.", true);
                              }
                            }, 500);
                          }
                        }}
                        className="absolute inset-0 z-[100] flex items-center justify-center bg-black/70"
                      >
                        <motion.div
                          initial={{ opacity: 0, scale: 0.8, filter: "blur(30px)" }}
                          animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                          exit={{ opacity: 0, scale: 1.2, filter: "blur(20px)" }}
                          transition={{ duration: 1.5, ease: "circOut" }}
                          className="text-center px-6 w-full"
                        >
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: "60%" }}
                            transition={{ delay: 0.5, duration: 1.5 }}
                            className="h-[1px] bg-gradient-to-r from-transparent via-editorial-gold to-transparent mb-8 mx-auto" 
                          />
                          
                          <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 1, duration: 1 }}
                            className="mb-4 text-editorial-gold/60 font-serif text-sm tracking-[0.5em] uppercase"
                          >
                            — {currentLocation} —
                          </motion.div>
                          
                          <h2 className="text-5xl md:text-6xl font-serif text-editorial-gold tracking-[0.3em] mb-6 drop-shadow-[0_0_30px_rgba(197,160,89,0.4)] italic uppercase">
                            운명의 길을 시작합니다
                          </h2>
                          
                          <motion.p 
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 1.5, duration: 1 }}
                            className="text-editorial-main/70 font-serif text-lg tracking-[0.4em] italic"
                          >
                            당신의 선택이 곧 역사가 될 것입니다.
                          </motion.p>

                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: "60%" }}
                            transition={{ delay: 0.5, duration: 1.5 }}
                            className="h-[1px] bg-gradient-to-r from-transparent via-editorial-gold to-transparent mt-8 mx-auto" 
                          />
                        </motion.div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              )}

              {gameState === "ROOM_SELECT" && (
                <motion.div key="room-select" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.05 }} className="h-full">
                  <RoomSelect 
                    onSelect={(mode) => { setRoomInputMode(mode); setGameState("ROOM_INPUT"); }} 
                    onBack={() => setGameState("GAME")} 
                  />
                </motion.div>
              )}

              {gameState === "ROOM_INPUT" && (
                <motion.div key="room-input" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }} className="h-full">
                  <RoomInput 
                    mode={roomInputMode} 
                    onConfirm={(num) => { 
                      const roomName = `ROOM_${num}`;
                      
                      if (roomInputMode === "join") {
                        socket?.emit("check-room", roomName, (exists: boolean) => {
                          if (exists) {
                            setCurrentRoom(roomName); 
                            setGameState("GAME"); 
                            if (socket) {
                              socket.emit("send-message", {
                                room: roomName,
                                message: {
                                  user: "시스템",
                                  text: "운명의 길에 오신 것을 환영합니다.",
                                  type: "system",
                                },
                              });
                              socket.emit("send-message", {
                                room: roomName,
                                message: {
                                  user: "시스템",
                                  text: "캐릭터 생성을 완료하고 다른 플레이어를 기다려주세요.",
                                  type: "system",
                                },
                              });
                            }
                          } else {
                            alert("해당 숫자의 방은 존재하지 않습니다.");
                          }
                        });
                      } else {
                        // Create mode
                        setCurrentRoom(roomName); 
                        setGameState("GAME"); 
                        if (socket) {
                          socket.emit("send-message", {
                            room: roomName,
                            message: {
                              user: "시스템",
                              text: "운명의 길에 오신 것을 환영합니다.",
                              type: "system",
                            },
                          });
                          socket.emit("send-message", {
                            room: roomName,
                            message: {
                              user: "시스템",
                              text: "캐릭터 생성을 완료하고 다른 플레이어를 기다려주세요.",
                              type: "system",
                            },
                          });
                        }
                      }
                    }} 
                    onBack={() => setGameState("ROOM_SELECT")} 
                  />
                </motion.div>
              )}

              {gameState === "CHAR_PATH" && (
                <motion.div key="char-path" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full">
                  <CharacterCreation 
                    onComplete={(info) => { 
                      setUserInfo({
                        ...info,
                        level: 1,
                        stats: { str: 15, dex: 15, int: 15, vit: 15 },
                        statPoints: 0,
                        equipment: {
                          weapon: "없음",
                          armor: "없음",
                          gloves: "없음",
                          boots: "없음",
                          sub: "없음",
                          artifact: "없음"
                        },
                        fateKeywords: [],
                        normalKeywords: [],
                        ownedFateKeywords: [],
                        ownedNormalKeywords: []
                      }); 
                      setHasCreatedChar(true);
                      setGameState("GAME"); 
                    }} 
                    onBack={() => setGameState("GAME")} 
                  />
                  <AnimatePresence>
                    {activeModal && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-8"
                      >
                        <motion.div
                          initial={{ scale: 0.9, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          className="bg-editorial-paper border border-editorial-gold p-8 max-w-md w-full relative"
                        >
                          <h3 className="font-serif text-2xl text-editorial-gold mb-4 tracking-widest uppercase">
                            {activeModal === "RACE" ? userInfo.race : userInfo.job}
                          </h3>
                          <p className="text-editorial-main font-serif leading-relaxed mb-8">
                            {activeModal === "RACE" 
                              ? `${userInfo.race} 종족은 고유한 특성과 역사를 지니고 있습니다. 당신의 혈통은 이 험난한 운명의 길에서 강력한 힘이 되어줄 것입니다.`
                              : `${userInfo.job} 직업은 당신이 세상을 살아가는 방식입니다. 당신의 기술과 지식은 파티의 생존과 승리에 결정적인 역할을 할 것입니다.`
                            }
                          </p>
                          <button
                            onClick={() => setActiveModal(null)}
                            className="w-full py-3 border border-editorial-gold text-editorial-gold font-serif uppercase tracking-widest hover:bg-editorial-gold hover:text-black transition-all"
                          >
                            닫기
                          </button>
                        </motion.div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {activeModal && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-8"
                >
                  <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="bg-editorial-paper border border-editorial-gold p-8 max-w-md w-full relative"
                  >
                    <h3 className="font-serif text-2xl text-editorial-gold mb-4 tracking-widest uppercase text-center">
                      {activeModal === "RACE" && userInfo.race}
                      {activeModal === "JOB" && userInfo.job}
                      {activeModal === "FATE_KEYWORDS" && "[운명] 키워드 선택"}
                      {activeModal === "NORMAL_KEYWORDS" && "[일반] 키워드 선택"}
                      {activeModal === "EQUIPPED_KEYWORDS" && "장착 중인 키워드"}
                      {activeModal === "ITEM_INFO" && selectedItem?.name}
                    </h3>
                    
                    <div className="text-editorial-main font-serif leading-relaxed mb-8 text-center max-h-[300px] overflow-y-auto pr-2 scrollbar-hide">
                      {activeModal === "ITEM_INFO" && selectedItem && (
                        <div className="space-y-4">
                          <div className="flex flex-col items-center gap-2">
                            <div 
                              className="w-16 h-16 flex items-center justify-center border-2 rounded-sm bg-black/40 shadow-[0_0_15px_rgba(0,0,0,0.5)]"
                              style={{ borderColor: getRarityColor(selectedItem.rarity) }}
                            >
                              <Sword size={32} style={{ color: getRarityColor(selectedItem.rarity) }} />
                            </div>
                            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-editorial-gold/10" style={{ color: getRarityColor(selectedItem.rarity) }}>
                              {selectedItem.rarity}
                            </span>
                          </div>
                          
                          <div className="space-y-2 text-left bg-black/20 p-4 rounded-sm border border-editorial-gold/10">
                            {selectedItem.atk && (
                              <div className="flex justify-between text-sm">
                                <span className="text-editorial-dim">공격력</span>
                                <span className="text-editorial-main font-bold">+{selectedItem.atk}</span>
                              </div>
                            )}
                            {selectedItem.stats && Object.entries(selectedItem.stats).map(([stat, val]) => (val as number) > 0 && (
                              <div key={stat} className="flex justify-between text-sm">
                                <span className="text-editorial-dim uppercase">{stat}</span>
                                <span className="text-editorial-main font-bold">+{val}</span>
                              </div>
                            ))}
                            {selectedItem.effect && (
                              <div className="mt-4 pt-2 border-t border-editorial-gold/10">
                                <span className="text-[10px] text-editorial-gold/60 uppercase tracking-widest block mb-1">Special Effect</span>
                                <p className="text-sm text-editorial-gold italic">{selectedItem.effect}</p>
                              </div>
                            )}
                          </div>
                          <p className="text-xs text-editorial-dim italic leading-relaxed">
                            {selectedItem.description}
                          </p>
                        </div>
                      )}

                      {(activeModal === "RACE" || activeModal === "JOB") && (
                        <p className="whitespace-pre-wrap">
                          {activeModal === "RACE" ? getRaceDescription(userInfo.race) : getJobDescription(userInfo.job)}
                        </p>
                      )}

                      {activeModal === "FATE_KEYWORDS" && (
                        <div className="grid grid-cols-2 gap-2">
                          {userInfo.ownedFateKeywords.length > 0 ? userInfo.ownedFateKeywords.map(kw => (
                            <button
                              key={kw}
                              onClick={() => handleEquipKeyword(kw, "fate")}
                              className={cn(
                                "py-2 px-1 border text-xs transition-all",
                                userInfo.fateKeywords.includes(kw) 
                                  ? "bg-editorial-gold text-black border-editorial-gold" 
                                  : "border-editorial-gold/30 text-editorial-gold hover:border-editorial-gold"
                              )}
                            >
                              {kw}
                            </button>
                          )) : (
                            <p className="col-span-2 text-editorial-dim italic text-sm py-4">아직 획득한 운명 키워드가 없습니다.</p>
                          )}
                        </div>
                      )}

                      {activeModal === "NORMAL_KEYWORDS" && (
                        <div className="grid grid-cols-2 gap-2">
                          {userInfo.ownedNormalKeywords.length > 0 ? userInfo.ownedNormalKeywords.map(kw => (
                            <button
                              key={kw}
                              onClick={() => handleEquipKeyword(kw, "normal")}
                              className={cn(
                                "py-2 px-1 border text-xs transition-all",
                                userInfo.normalKeywords.includes(kw) 
                                  ? "bg-editorial-gold/40 text-editorial-main border-editorial-gold" 
                                  : "border-editorial-gold/20 text-editorial-dim hover:border-editorial-gold/50"
                              )}
                            >
                              {kw}
                            </button>
                          )) : (
                            <p className="col-span-2 text-editorial-dim italic text-sm py-4">아직 획득한 일반 키워드가 없습니다.</p>
                          )}
                        </div>
                      )}

                      {activeModal === "EQUIPPED_KEYWORDS" && (
                        <div className="space-y-4">
                          <div>
                            <h4 className="text-[10px] text-editorial-gold/60 uppercase tracking-widest mb-2">Fate (Max 2)</h4>
                            <div className="flex flex-wrap justify-center gap-2">
                              {userInfo.fateKeywords.length > 0 ? userInfo.fateKeywords.map(kw => (
                                <span key={kw} className="px-2 py-1 border border-editorial-gold text-editorial-gold text-xs italic">{kw}</span>
                              )) : <span className="text-editorial-dim italic text-xs">장착된 운명 키워드 없음</span>}
                            </div>
                          </div>
                          <div>
                            <h4 className="text-[10px] text-editorial-gold/60 uppercase tracking-widest mb-2">Normal (Max 4)</h4>
                            <div className="flex flex-wrap justify-center gap-2">
                              {userInfo.normalKeywords.length > 0 ? userInfo.normalKeywords.map(kw => (
                                <span key={kw} className="px-2 py-1 border border-editorial-gold/30 text-editorial-main text-xs">{kw}</span>
                              )) : <span className="text-editorial-dim italic text-xs">장착된 일반 키워드 없음</span>}
                            </div>
                          </div>
                        </div>
                      )}

                      {activeModal === "SKILLS" && (
                        <div className="flex flex-col gap-6">
                          <div className="border-b border-editorial-gold/20 pb-4">
                            <div className="flex justify-between items-end mb-1">
                              <h3 className="font-serif text-2xl text-editorial-gold tracking-widest uppercase">{userInfo.job} Skills</h3>
                              <span className="text-[10px] text-blue-400 font-mono">Current MP: {userInfo.mp}</span>
                            </div>
                            <p className="text-[10px] text-editorial-dim uppercase tracking-[0.1em]">자신의 기량을 발휘하여 불가능을 가능케 하세요.</p>
                          </div>
                          
                          <div className="flex flex-col gap-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                            {((): {name: string, cost: number, effect: string, desc: string}[] => {
                              const job = userInfo.job;
                              if (job.includes("전사") || job.includes("기사") || job.includes("검사")) {
                                return [
                                  { name: "전투 함성", cost: 15, effect: "STR 기반 판정 보너스", desc: "우렁찬 기합으로 자신의 잠재력을 끌어올립니다." },
                                  { name: "방패 가격", cost: 10, effect: "적의 자세 무너뜨리기 (VIT)", desc: "적의 방어 빈틈을 만들어냅니다." },
                                  { name: "회생의 기운", cost: 20, effect: "자신 및 아군 약간의 회복", desc: "강인한 정신력으로 상처를 잊습니다." }
                                ];
                              } else if (job.includes("무희") || job.includes("바드") || job.includes("음유시인")) {
                                return [
                                  { name: "격려의 춤", cost: 15, effect: "자신 및 아군 판정 보너스", desc: "우아한 몸짓으로 동료들의 사기를 북돋웁니다." },
                                  { name: "매혹의 눈길", cost: 12, effect: "적의 행동 지연 (INT)", desc: "아름다운 춤사위로 적의 시선을 분산시킵니다." },
                                  { name: "치유의 리듬", cost: 18, effect: "지속적인 생명력 회복", desc: "생동감 넘치는 비트로 상처를 치유합니다." }
                                ];
                              } else if (job.includes("마법사") || job.includes("현자") || job.includes("술사")) {
                                return [
                                  { name: "마법 화살", cost: 12, effect: "비전 피해 (INT)", desc: "순수한 마력의 화살을 날립니다." },
                                  { name: "마력 방벽", cost: 20, effect: "공격 1회 완전 방어", desc: "보이지 않는 힘의 장막을 형성합니다." },
                                  { name: "지능적 간섭", cost: 15, effect: "판정 난이도 하락", desc: "인과율에 개입하여 유리한 상황을 만듭니다." }
                                ];
                              } else if (job.includes("도적") || job.includes("암살자") || job.includes("궁수")) {
                                return [
                                  { name: "급소 찌르기", cost: 15, effect: "DEX 기반 치명타", desc: "눈 깜짝할 새 적의 심장을 겨냥합니다." },
                                  { name: "은신", cost: 10, effect: "적의 시야에서 사라짐", desc: "그림자 속으로 몸을 숨깁니다." },
                                  { name: "덫 설치", cost: 12, effect: "적 이동 불가", desc: "지형을 이용해 적을 함정에 빠뜨립니다." }
                                ];
                              } else if (job.includes("성직자") || job.includes("사제") || job.includes("팔라딘")) {
                                return [
                                  { name: "신성한 빛", cost: 15, effect: "아군 전체 회복", desc: "따스한 빛으로 모든 상처를 보듬습니다." },
                                  { name: "정화", cost: 10, effect: "해로운 효과 제거", desc: "부정한 기운을 몰아내고 영혼을 맑게 합니다." },
                                  { name: "신의 보호", cost: 20, effect: "방어력 대폭 상승", desc: "신성한 보호막으로 아군을 보호합니다." }
                                ];
                              }
                              // Default skills for other jobs
                              return [
                                { name: "집중", cost: 10, effect: "다음 판정 보너스", desc: "심호흡을 하며 정신을 집중합니다." },
                                { name: "전력 투구", cost: 15, effect: "강력한 일격", desc: "모든 힘을 다해 행동을 수행합니다." },
                                { name: "응급 처치", cost: 12, effect: "소량의 체력 회복", desc: "임시방편으로 상처를 봉합합니다." }
                              ];
                            })().map((skill, sIdx) => (
                              <button 
                                key={sIdx}
                                onClick={() => {
                                  if (userInfo.mp < skill.cost) {
                                    alert("마력이 부족합니다!");
                                    return;
                                  }
                                  handleSendMessage(`[기술 시전: ${skill.name}] - ${skill.desc}`);
                                  setActiveModal(null);
                                }}
                                className="text-left p-4 border border-editorial-gold/10 hover:border-editorial-gold/60 transition-all group flex flex-col gap-1"
                              >
                                <div className="flex justify-between items-center mb-1">
                                  <span className="font-serif text-lg text-editorial-gold group-hover:underline underline-offset-4">{skill.name}</span>
                                  <span className="text-[10px] font-mono text-blue-400">-{skill.cost} MP</span>
                                </div>
                                <p className="text-xs text-editorial-main/70 line-clamp-1 italic">"{skill.desc}"</p>
                                <p className="text-[9px] text-editorial-dim uppercase tracking-wider mt-1">{skill.effect}</p>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => setActiveModal(null)}
                      className="w-full py-3 border border-editorial-gold text-editorial-gold font-serif uppercase tracking-widest hover:bg-editorial-gold hover:text-black transition-all"
                    >
                      닫기
                    </button>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </main>
      </div>
    </div>
  );
}
