<script setup lang="ts">
import {
  Dialog,
  DialogPanel,
  DialogTitle,
  TransitionRoot,
  TransitionChild,
} from '@headlessui/vue'
import { ExclamationTriangleIcon } from '@heroicons/vue/24/outline'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

defineProps<{
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  destructive?: boolean
}>()

const emit = defineEmits<{
  confirm: []
  cancel: []
}>()
</script>

<template>
  <TransitionRoot :show="open" as="template">
    <Dialog @close="emit('cancel')" class="relative z-50">
      <TransitionChild
        as="template"
        enter="ease-out duration-200"
        enter-from="opacity-0"
        enter-to="opacity-100"
        leave="ease-in duration-150"
        leave-from="opacity-100"
        leave-to="opacity-0"
      >
        <div class="fixed inset-0 bg-black/30" />
      </TransitionChild>

      <div class="fixed inset-0 flex items-center justify-center p-4">
        <TransitionChild
          as="template"
          enter="ease-out duration-200"
          enter-from="opacity-0 scale-95"
          enter-to="opacity-100 scale-100"
          leave="ease-in duration-150"
          leave-from="opacity-100 scale-100"
          leave-to="opacity-0 scale-95"
        >
          <DialogPanel class="mx-auto max-w-sm rounded-xl bg-white p-6 shadow-xl">
            <div class="flex items-start gap-4">
              <div
                class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
                :class="destructive ? 'bg-red-100' : 'bg-primary-100'"
              >
                <ExclamationTriangleIcon
                  class="h-5 w-5"
                  :class="destructive ? 'text-red-600' : 'text-primary-600'"
                />
              </div>
              <div>
                <DialogTitle class="text-base font-semibold text-gray-900">
                  {{ title }}
                </DialogTitle>
                <p class="mt-2 text-sm text-gray-500">{{ message }}</p>
              </div>
            </div>
            <div class="mt-6 flex justify-end gap-3">
              <button
                type="button"
                class="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                @click="emit('cancel')"
              >
                {{ t('common.cancel') }}
              </button>
              <button
                type="button"
                class="rounded-lg px-4 py-2 text-sm font-medium text-white"
                :class="
                  destructive
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-primary-600 hover:bg-primary-700'
                "
                @click="emit('confirm')"
              >
                {{ confirmLabel || t('common.confirm') }}
              </button>
            </div>
          </DialogPanel>
        </TransitionChild>
      </div>
    </Dialog>
  </TransitionRoot>
</template>
