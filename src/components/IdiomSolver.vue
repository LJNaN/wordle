<template>
  <div class="p-4">
    <h2 class="text-xl font-bold mb-4">成语 Wordle 助手</h2>

    <div class="mb-4 flex gap-4">
      <div v-for="(_, index) in 4" :key="index" class="relative">
        <input 
          v-model="pinyinInputs[index]" 
          class="border p-2 w-24 text-center" 
          :placeholder="'拼音'"
          :class="{
            'border-green-500': pinyinStates[index] === 'correct',
            'border-yellow-500': pinyinStates[index] === 'partial',
            'border-gray-300': pinyinStates[index] === 'absent'
          }"
        >
        <input 
          v-model="toneInputs[index]" 
          class="absolute top-0 right-0 w-6 h-6 border text-center text-sm"
          :placeholder="'声'"
          maxlength="1"
          :class="{
            'border-green-500': toneStates[index] === 'correct',
            'border-yellow-500': toneStates[index] === 'partial',
            'border-gray-300': toneStates[index] === 'absent'
          }"
        >
        <div class="flex gap-1 mt-1">
          <button 
            v-for="state in states" 
            :key="state"
            @click="setPinyinState(index, state)"
            class="flex-1 text-xs p-1 border rounded"
            :class="{
              'bg-green-500 text-white': state === 'correct' && pinyinStates[index] === 'correct',
              'bg-gray-300': state === 'absent' && pinyinStates[index] === 'absent',
              'bg-blue-500 text-white': state === 'partial' && pinyinStates[index] === 'partial'
            }"
          >
            {{ stateLabels[state] }}
          </button>
        </div>
        <div class="flex gap-1 mt-1">
          <button 
            v-for="state in states" 
            :key="state"
            @click="setToneState(index, state)"
            class="flex-1 text-xs p-1 border rounded"
            :class="{
              'bg-green-500 text-white': state === 'correct' && toneStates[index] === 'correct',
              'bg-gray-300': state === 'absent' && toneStates[index] === 'absent',
              'bg-blue-500 text-white': state === 'partial' && toneStates[index] === 'partial'
            }"
          >
            {{ stateLabels[state] }}声
          </button>
        </div>
      </div>
    </div>

    <button @click="findMatches" class="bg-blue-500 text-white px-4 py-2 rounded">
      查找匹配成语
    </button>

    <div class="mt-4">
      <h3 class="font-bold mb-2">可能的成语：</h3>
      <div class="grid grid-cols-8">
        <div v-for="word in matches" :key="word" class="mb-1">
          {{ word }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { IdiomFinder } from '@/utils/idiomFinder'

type State = 'correct' | 'absent' | 'partial' | null

const idiomFinder = new IdiomFinder()
const pinyinInputs = ref(['', '', '', ''])
const toneInputs = ref(['', '', '', ''])
const pinyinStates = ref<State[]>([null, null, null, null])
const toneStates = ref<State[]>([null, null, null, null])
const matches = ref<string[]>([])

const states = ['correct', 'partial', 'absent']
const stateLabels = {
  correct: '对',
  absent: '无',
  partial: '部分'
}

function setPinyinState(index: number, state: State) {
  pinyinStates.value[index] = state
}

function setToneState(index: number, state: State) {
  toneStates.value[index] = state
}

const correctPinyin = computed(() => {
  return pinyinInputs.value.map((pinyin, index) => {
    const tone = toneInputs.value[index]
    const pinyinState = pinyinStates.value[index]
    const toneState = toneStates.value[index]

    // 构建带状态的拼音对象
    const result = {
      value: '',
      pinyinState,
      toneState
    }

    if (pinyin) {
      result.value = pinyin + (tone || '')
    } else if (tone) {
      result.value = tone
    }

    return result.value ? result : null
  })
})

function findMatches() {
  matches.value = idiomFinder.findByGameRules(correctPinyin.value)
}
</script>

<style scoped>
input::-webkit-outer-spin-button,
input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}
</style>