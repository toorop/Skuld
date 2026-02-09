<script setup lang="ts">
import { useToast } from '@/composables/useToast'
import { XMarkIcon, CheckCircleIcon, ExclamationCircleIcon, InformationCircleIcon } from '@heroicons/vue/24/outline'

const { toasts, dismiss } = useToast()

const icons = {
  success: CheckCircleIcon,
  error: ExclamationCircleIcon,
  info: InformationCircleIcon,
}

const colors = {
  success: 'bg-green-50 text-green-800 border-green-200',
  error: 'bg-red-50 text-red-800 border-red-200',
  info: 'bg-blue-50 text-blue-800 border-blue-200',
}
</script>

<template>
  <div class="pointer-events-none fixed inset-x-4 bottom-4 z-50 flex flex-col gap-2 sm:inset-x-auto sm:right-4 sm:left-auto">
    <TransitionGroup
      enter-active-class="transform transition duration-300 ease-out"
      enter-from-class="translate-y-2 opacity-0"
      enter-to-class="translate-y-0 opacity-100"
      leave-active-class="transform transition duration-200 ease-in"
      leave-from-class="translate-y-0 opacity-100"
      leave-to-class="translate-y-2 opacity-0"
    >
      <div
        v-for="toast in toasts"
        :key="toast.id"
        :class="[colors[toast.type], 'pointer-events-auto flex w-full items-center gap-3 rounded-lg border px-4 py-3 shadow-lg sm:w-auto']"
      >
        <component :is="icons[toast.type]" class="h-5 w-5 shrink-0" />
        <span class="text-sm font-medium">{{ toast.message }}</span>
        <button
          type="button"
          class="ml-2 shrink-0 opacity-60 hover:opacity-100"
          @click="dismiss(toast.id)"
        >
          <XMarkIcon class="h-4 w-4" />
        </button>
      </div>
    </TransitionGroup>
  </div>
</template>
