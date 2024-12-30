<template>
  <div class="p-4">
    <h2 class="text-xl font-bold mb-4">成语 Wordle 助手</h2>

    <!-- 成语输入 -->
    <div class="mb-4">
      <div class="flex items-center gap-2">
        <input 
          v-model="currentGuess" 
          class="border p-2 w-full max-w-xs text-center border-gray-300"
          placeholder="输入你猜的成语" 
          maxlength="4"
        >
        <button 
          class="ml-2 bg-green-500 text-white px-4 py-2 rounded disabled:bg-gray-400" 
          @click="submitGuess"
          :disabled="!isValidInput"
        >
          添加猜测
        </button>
      </div>
    </div>

    <!-- 历史猜测记录 -->
    <div class="mb-4">
      <h3 class="font-bold mb-2">历史猜测：</h3>
      <div v-for="(history, historyIndex) in guessHistory" :key="historyIndex" class="mb-4">
        <!-- 拼音信息行 -->
        <div class="flex gap-2 mb-1">
          <div v-for="(info, charIndex) in history.pinyinInfo" :key="charIndex" 
            class="w-28 h-12 flex items-center justify-center text-sm border rounded">
            <div class="flex items-center gap-2">
              <!-- 声母 -->
              <div 
                class="cursor-pointer px-1 rounded"
                :class="{
                  'text-green-600 bg-green-100': info.initialStatus === 'exact',
                  'text-yellow-600 bg-yellow-100': info.initialStatus === 'partial',
                  'text-gray-400': info.initialStatus === 'none'
                }"
                @click="toggleStatus(historyIndex, charIndex, 'initial')"
              >
                {{ info.initial || '-' }}
              </div>
              <!-- 韵母 -->
              <div 
                class="cursor-pointer px-1 rounded"
                :class="{
                  'text-green-600 bg-green-100': info.finalStatus === 'exact',
                  'text-yellow-600 bg-yellow-100': info.finalStatus === 'partial',
                  'text-gray-400': info.finalStatus === 'none'
                }"
                @click="toggleStatus(historyIndex, charIndex, 'final')"
              >
                {{ info.final }}
              </div>
              <!-- 声调 -->
              <div 
                class="cursor-pointer px-1 rounded"
                :class="{
                  'text-green-600 bg-green-100': info.toneStatus === 'exact',
                  'text-yellow-600 bg-yellow-100': info.toneStatus === 'partial',
                  'text-gray-400': info.toneStatus === 'none'
                }"
                @click="toggleStatus(historyIndex, charIndex, 'tone')"
              >
                {{ info.tone }}
              </div>
            </div>
          </div>
        </div>
        <!-- 汉字显示行 -->
        <div class="flex gap-2">
          <div v-for="(result, charIndex) in history.result" :key="charIndex"
            class="w-28 h-12 flex items-center justify-center text-white text-xl font-bold rounded cursor-pointer"
            :class="{
              'bg-green-500': result.status === 'exact',
              'bg-yellow-500': result.status === 'partial',
              'bg-gray-400': result.status === 'none'
            }"
            @click="toggleStatus(historyIndex, charIndex, 'character')"
          >
            {{ result.character }}
          </div>
        </div>
      </div>
    </div>

    <button class="bg-blue-500 text-white px-4 py-2 rounded disabled:bg-gray-400" @click="searchIdioms"
      :disabled="isSearching">
      {{ isSearching ? '搜索中...' : '查找匹配成语' }}
    </button>

    <div class="mt-4">
      <h3 class="font-bold mb-2 flex items-center gap-2">
        可能的成语：
        <span class="text-sm font-normal text-gray-600">
          (共 {{ matchingIdioms.length }} 个)
        </span>
        <span v-if="showCopyTip" class="text-sm text-green-600 transition-opacity">
          已复制到剪贴板
        </span>
      </h3>
      <div v-if="matchingIdioms.length" class="grid grid-cols-4 gap-2">
        <div v-for="idiom in matchingIdioms" :key="idiom.word"
          class="p-2 border rounded hover:bg-gray-50 cursor-pointer" @click="selectIdiom(idiom.word)">
          <div class="text-lg">{{ idiom.word }}</div>
          <div class="text-sm text-gray-600">
            {{ idiom.pinyinInfo.map(p => p.pinyin).join(' ') }}
          </div>
        </div>
      </div>
      <div v-else-if="!isSearching" class="text-gray-500">
        没有找到匹配的成语
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import {
  findMatchingIdioms,
  type IdiomInfo,
  type GuessResult,
  MatchStatus,
  type PinyinMatchInfo
} from '../utils/pinyinUtils'
import { pinyin } from 'pinyin-pro'
console.log('pinyin: ', pinyin);

const matchingIdioms = ref<IdiomInfo[]>([])
const isSearching = ref(false)
const currentGuess = ref('')
const guessHistory = ref<Array<{
  guess: string;
  result: GuessResult[];
  pinyinInfo: PinyinMatchInfo[];
}>>([])

const isValidInput = computed(() => currentGuess.value.length === 4)

// 在 setup 中添加提示状态
const showCopyTip = ref(false)

// 切换状态的函数
function toggleStatus(historyIndex: number, charIndex: number, type: 'initial' | 'final' | 'tone' | 'character') {
  const history = guessHistory.value[historyIndex]
  
  if (type === 'character') {
    const currentStatus = history.result[charIndex].status
    history.result[charIndex].status = getNextStatus(currentStatus)
  } else {
    switch (type) {
      case 'initial':
        history.pinyinInfo[charIndex].initialStatus = getNextStatus(history.pinyinInfo[charIndex].initialStatus)
        break
      case 'final':
        history.pinyinInfo[charIndex].finalStatus = getNextStatus(history.pinyinInfo[charIndex].finalStatus)
        break
      case 'tone':
        history.pinyinInfo[charIndex].toneStatus = getNextStatus(history.pinyinInfo[charIndex].toneStatus)
        break
    }
  }
}

// 获取下一个状态
function getNextStatus(current: MatchStatus): MatchStatus {
  switch (current) {
    case MatchStatus.NONE:
      return MatchStatus.EXACT
    case MatchStatus.EXACT:
      return MatchStatus.PARTIAL
    case MatchStatus.PARTIAL:
      return MatchStatus.NONE
    default:
      return MatchStatus.NONE
  }
}

function submitGuess() {
  if (!isValidInput.value) return

  // 获取拼音信息
  const pinyinInfo = pinyin(currentGuess.value, { type: 'all' }).map(info => ({
    initial: info.initial,
    final: info.final.normalize('NFD').replace(/[\u0300-\u036f]/g, ""),
    tone: info.num,
    initialStatus: MatchStatus.NONE,
    finalStatus: MatchStatus.NONE,
    toneStatus: MatchStatus.NONE
  }))

  // 添加新的猜测记录
  guessHistory.value.push({
    guess: currentGuess.value,
    result: currentGuess.value.split('').map(char => ({
      character: char,
      status: MatchStatus.NONE
    })),
    pinyinInfo
  })

  // 清空输入
  currentGuess.value = ''
}

async function searchIdioms() {
  isSearching.value = true
  try {
    matchingIdioms.value = findMatchingIdioms([], guessHistory.value)
  } catch (error) {
    console.error('搜索出错：', error)
  } finally {
    isSearching.value = false
  }
}

function selectIdiom(word: string) {
  currentGuess.value = word
  navigator.clipboard.writeText(word)
    .then(() => {
      showCopyTip.value = true
      setTimeout(() => {
        showCopyTip.value = false
      }, 2000)
    })
    .catch(err => {
      console.error('复制失败：', err)
    })
}
</script>

<style scoped>
.cursor-pointer {
  transition: all 0.2s;
}
.cursor-pointer:hover {
  opacity: 0.8;
}
</style>