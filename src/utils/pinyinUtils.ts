import { pinyin } from 'pinyin-pro';
import { word } from '../assets/word/word';

export interface PinyinInfo {
  origin: string;
  pinyin: string;
  initial: string;
  final: string;
  num: number;
}

export interface IdiomInfo {
  word: string;
  pinyinInfo: PinyinInfo[];
}

// 将成语转换为带拼音信息的结构
export function parseIdiom(word: string): IdiomInfo {
  const pinyinResult = pinyin(word, { type: 'all' });
  return {
    word,
    pinyinInfo: pinyinResult.map(info => ({
      origin: info.origin,
      pinyin: info.pinyin,
      initial: info.initial,
      final: info.final,
      num: info.num
    }))
  };
}

// 检查拼音是否匹配
export function isPinyinMatch(
  target: PinyinInfo,
  input: {
    pinyin?: string;
    tone?: number;
    initial?: string;
  }
): boolean {
  if (!input.pinyin && !input.tone && !input.initial) return true;
  
  // 检查声母匹配
  if (input.initial && !target.initial.toLowerCase().startsWith(input.initial.toLowerCase())) {
    return false;
  }
  
  // 检查拼音匹配（不含声调）
  if (input.pinyin) {
    // 移除声调标记后比较
    const normalizedTargetPinyin = target.pinyin.normalize('NFD').replace(/[\u0300-\u036f]/g, "");
    if (!normalizedTargetPinyin.startsWith(input.pinyin.toLowerCase())) {
      return false;
    }
  }
  
  // 检查声调匹配
  if (input.tone !== undefined && target.num !== input.tone) {
    return false;
  }
  
  return true;
}

// 添加新的类型定义
export enum MatchStatus {
  EXACT = 'exact',    // 绿色：字符和位置都匹配
  PARTIAL = 'partial', // 黄色：字符匹配但位置不对
  NONE = 'none'       // 灰色：不匹配
}

export interface GuessResult {
  character: string;
  status: MatchStatus;
}

// 添加拼音匹配状态接口
export interface PinyinMatchInfo {
  initial: string;
  final: string;
  tone: number;
  initialStatus: MatchStatus;
  finalStatus: MatchStatus;
  toneStatus: MatchStatus;
}

// 修改 checkGuess 函数以支持拼音匹配
export function checkGuess(guess: string, target: string): {
  result: GuessResult[];
  pinyinInfo: PinyinMatchInfo[];
} {
  const result: GuessResult[] = [];
  const pinyinInfo: PinyinMatchInfo[] = [];
  
  const targetChars = target.split('');
  const usedPositions = new Set<number>();
  
  // 获取目标词和猜测词的拼音信息
  const targetPinyin = pinyin(target, { type: 'all' });
  const guessPinyin = pinyin(guess, { type: 'all' });

  // 首先检查完全匹配（绿色）
  for (let i = 0; i < 4; i++) {
    if (guess[i] === target[i]) {
      result[i] = { character: guess[i], status: MatchStatus.EXACT };
      usedPositions.add(i);
    }
  }

  // 然后检查部分匹配（黄色）
  for (let i = 0; i < 4; i++) {
    if (result[i]) continue;

    const remainingChars = targetChars.filter((_, index) => !usedPositions.has(index));
    if (remainingChars.includes(guess[i])) {
      result[i] = { character: guess[i], status: MatchStatus.PARTIAL };
    } else {
      result[i] = { character: guess[i], status: MatchStatus.NONE };
    }
  }

  // 检查拼音匹配
  for (let i = 0; i < 4; i++) {
    const targetInfo = targetPinyin[i];
    const guessInfo = guessPinyin[i];
    
    // 移除声调标记
    const normalizedTargetFinal = targetInfo.final.normalize('NFD').replace(/[\u0300-\u036f]/g, "");
    const normalizedGuessFinal = guessInfo.final.normalize('NFD').replace(/[\u0300-\u036f]/g, "");

    pinyinInfo[i] = {
      initial: guessInfo.initial,
      final: normalizedGuessFinal,
      tone: guessInfo.num,
      initialStatus: guessInfo.initial === targetInfo.initial ? MatchStatus.EXACT :
        targetPinyin.some(p => p.initial === guessInfo.initial) ? MatchStatus.PARTIAL : MatchStatus.NONE,
      finalStatus: normalizedGuessFinal === normalizedTargetFinal ? MatchStatus.EXACT :
        targetPinyin.some(p => p.final.normalize('NFD').replace(/[\u0300-\u036f]/g, "") === normalizedGuessFinal) ? 
        MatchStatus.PARTIAL : MatchStatus.NONE,
      toneStatus: guessInfo.num === targetInfo.num ? MatchStatus.EXACT :
        targetPinyin.some(p => p.num === guessInfo.num) ? MatchStatus.PARTIAL : MatchStatus.NONE
    };
  }

  return { result, pinyinInfo };
}

// 修改 findMatchingIdioms 函数
export function findMatchingIdioms(
  inputs: Array<{
    pinyin?: string;
    tone?: number;
    initial?: string;
  }>,
  guessHistory?: Array<{ 
    guess: string; 
    result: GuessResult[];
    pinyinInfo: PinyinMatchInfo[];
  }>
): IdiomInfo[] {
  const cache = new Map<string, IdiomInfo>();

  return word
    .filter(idiom => {
      // 首先检查拼音匹配
      let idiomInfo: IdiomInfo;
      if (cache.has(idiom)) {
        idiomInfo = cache.get(idiom)!;
      } else {
        idiomInfo = parseIdiom(idiom);
        cache.set(idiom, idiomInfo);
      }

      if (!idiomInfo.pinyinInfo.every((info, index) => 
        isPinyinMatch(info, inputs[index] || {}))
      ) {
        return false;
      }

      // 然后根据历史猜测进行过滤
      if (guessHistory && guessHistory.length > 0) {
        return guessHistory.every(({ guess, result, pinyinInfo }) => {
          const guessPinyinInfo = pinyin(guess, { type: 'all' });
          
          // 检查每个字符的匹配状态
          for (let i = 0; i < 4; i++) {
            // 检查汉字匹配
            if (result[i].status === MatchStatus.EXACT) {
              if (idiom[i] !== guess[i]) return false;
            } else if (result[i].status === MatchStatus.PARTIAL) {
              if (!idiom.includes(guess[i]) || idiom[i] === guess[i]) return false;
            } else if (result[i].status === MatchStatus.NONE) {
              if (idiom.includes(guess[i]) && 
                  !result.some((r, idx) => 
                    idx !== i && 
                    r.character === guess[i] && 
                    (r.status === MatchStatus.EXACT || r.status === MatchStatus.PARTIAL)
                  )) {
                return false;
              }
            }

            // 检查声母匹配
            const targetInitial = idiomInfo.pinyinInfo[i].initial;
            const guessInitial = guessPinyinInfo[i].initial;
            if (pinyinInfo[i].initialStatus === MatchStatus.EXACT) {
              if (targetInitial !== guessInitial) return false;
            } else if (pinyinInfo[i].initialStatus === MatchStatus.PARTIAL) {
              if (!idiomInfo.pinyinInfo.some(p => p.initial === guessInitial) || 
                  targetInitial === guessInitial) return false;
            } else if (pinyinInfo[i].initialStatus === MatchStatus.NONE) {
              if (idiomInfo.pinyinInfo.some(p => p.initial === guessInitial)) return false;
            }

            // 检查韵母匹配（需要移除声调标记）
            const targetFinal = idiomInfo.pinyinInfo[i].final.normalize('NFD').replace(/[\u0300-\u036f]/g, "");
            const guessFinal = guessPinyinInfo[i].final.normalize('NFD').replace(/[\u0300-\u036f]/g, "");
            if (pinyinInfo[i].finalStatus === MatchStatus.EXACT) {
              if (targetFinal !== guessFinal) return false;
            } else if (pinyinInfo[i].finalStatus === MatchStatus.PARTIAL) {
              if (!idiomInfo.pinyinInfo.some(p => 
                p.final.normalize('NFD').replace(/[\u0300-\u036f]/g, "") === guessFinal) || 
                targetFinal === guessFinal) return false;
            } else if (pinyinInfo[i].finalStatus === MatchStatus.NONE) {
              if (idiomInfo.pinyinInfo.some(p => 
                p.final.normalize('NFD').replace(/[\u0300-\u036f]/g, "") === guessFinal)) return false;
            }

            // 检查声调匹配
            const targetTone = idiomInfo.pinyinInfo[i].num;
            const guessTone = guessPinyinInfo[i].num;
            if (pinyinInfo[i].toneStatus === MatchStatus.EXACT) {
              if (targetTone !== guessTone) return false;
            } else if (pinyinInfo[i].toneStatus === MatchStatus.PARTIAL) {
              if (!idiomInfo.pinyinInfo.some(p => p.num === guessTone) || 
                  targetTone === guessTone) return false;
            } else if (pinyinInfo[i].toneStatus === MatchStatus.NONE) {
              if (idiomInfo.pinyinInfo.some(p => p.num === guessTone)) return false;
            }
          }
          return true;
        });
      }

      return true;
    })
    .map(idiom => cache.get(idiom)!)
    .slice(0, 100);
} 