import idioms from '@/assets/word/idiom.csv?raw'

interface IdiomInfo {
  word: string
  pinyin: string[]
}

interface PinyinInput {
  value: string
  pinyinState: 'correct' | 'absent' | 'partial' | null
  toneState: 'correct' | 'absent' | 'partial' | null
}

export class IdiomFinder {
  private idiomList: IdiomInfo[] = []

  constructor() {
    this.parseIdioms()
  }

  private async parseIdioms() {
    const lines = idioms.trim().replace(/^\uFEFF/, '').split('\n')
    try {
      // 跳过标题行
      const dataLines = lines.slice(1)
      this.idiomList = dataLines.map(line => {
        // 只分割第一个逗号，因为拼音数组中也包含逗号
        const [word, pinyinStr] = line.split(/,(.+)/)
        // 提取拼音数组字符串中的实际内容
        const cleanPinyinStr = pinyinStr
          .trim()                        // 移除前后空格
          .replace(/^\["|\"]$/g, '')     // 移除开头的 [" 和结尾的 "]
          .replace(/'/g, '\\"')             // 移除所有单引号

        const parseStr = JSON.parse(JSON.parse(cleanPinyinStr))
        return {
          word,
          pinyin: parseStr
        }
      })

      console.log(`已加载 ${this.idiomList.length} 个成语`)
    } catch (error) {
      console.error('解析成语文件时出错:', error)
      throw error
    }
  }

  /**
   * 检查拼音是否匹配
   */
  private pinyinMatches(input: string, target: string): boolean {
    // 如果输入为空，视为通配符
    if (!input) return true

    // 移除所有空格并转换为小写
    input = input.trim().toLowerCase()
    target = target.trim().toLowerCase()

    // 如果输入只是数字（音调），只比较声调
    if (/^\d+$/.test(input)) {
      return target.endsWith(input)
    }

    // 完全匹配的情况
    if (input === target) return true

    // 如果输入不包含声调数字，只比较拼音部分
    if (!/\d/.test(input)) {
      // 移除目标中的声调数字再比较
      const targetWithoutTone = target.replace(/\d/g, '')
      return input === targetWithoutTone
    }

    return false
  }

  /**
   * 分离拼音和声调
   */
  private splitPinyinAndTone(pinyin: string): { base: string; tone: string | null } {
    const match = pinyin.match(/^([a-z]+)(\d)?$/i)
    if (!match) return { base: pinyin, tone: null }
    return { base: match[1], tone: match[2] || null }
  }

  /**
   * 根据拼音查找成语
   */
  findByGameRules(pinyinInputs: (PinyinInput | null)[]): string[] {
    return this.idiomList.filter(idiom => {
      return pinyinInputs.every((input, index) => {
        if (!input || !input.value) return true

        const target = idiom.pinyin[index]
        const inputParts = this.splitPinyinAndTone(input.value)
        const targetParts = this.splitPinyinAndTone(target)

        // 处理拼音部分
        if (input.pinyinState === 'correct') {
          if (inputParts.base !== targetParts.base) return false
        } else if (input.pinyinState === 'partial') {
          if (!targetParts.base.startsWith(inputParts.base)) return false
        } else if (input.pinyinState === 'absent') {
          if (idiom.pinyin.some(p => {
            const parts = this.splitPinyinAndTone(p)
            return parts.base === inputParts.base
          })) return false
        }

        // 处理声调部分
        if (inputParts.tone) {
          if (input.toneState === 'correct') {
            if (inputParts.tone !== targetParts.tone) return false
          } else if (input.toneState === 'partial') {
            if (inputParts.tone !== targetParts.tone) return false
          } else if (input.toneState === 'absent') {
            if (idiom.pinyin.some(p => {
              const parts = this.splitPinyinAndTone(p)
              return parts.tone === inputParts.tone
            })) return false
          }
        }

        return true
      })
    }).map(idiom => idiom.word)
  }
} 