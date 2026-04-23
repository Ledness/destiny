export type GameState = "TITLE" | "LOBBY" | "ROOM_SELECT" | "ROOM_INPUT" | "CHAR_PATH" | "MANUAL_CHAR" | "GAME";

export type ItemRarity = "NORMAL" | "RARE" | "UNIQUE" | "EPIC" | "LEGENDARY" | "MYTHIC";

export interface Item {
  name: string;
  rarity: ItemRarity;
  atk?: number;
  stats?: {
    str?: number;
    dex?: number;
    int?: number;
    vit?: number;
  };
  effect?: string;
  description?: string;
}

export interface UserInfo {
  name: string;
  race: string;
  job: string;
  level: number;
  exp: number;
  maxExp: number;
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  stats: {
    str: number;
    dex: number;
    int: number;
    vit: number;
  };
  statPoints: number;
  equipment: {
    weapon: Item | null;
    armor: Item | null;
    gloves: Item | null;
    boots: Item | null;
    sub: Item | null;
    artifact: Item | null;
  };
  fateKeywords: string[];
  normalKeywords: string[];
  ownedFateKeywords: string[];
  ownedNormalKeywords: string[];
}

export interface PlayerStatus {
  id: string;
  name: string;
  isReady: boolean;
  userInfo: UserInfo;
}

export interface Message {
  id: string;
  user: string;
  text: string;
  type: "user" | "system" | "gm";
  timestamp: string;
  choices?: string[];
}

export interface RoomInfo {
  id: string;
  name: string;
}
