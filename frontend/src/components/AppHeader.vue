<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { ArrowRightOnRectangleIcon, Bars3Icon } from '@heroicons/vue/24/outline'

defineProps<{
  onMenuToggle?: () => void
}>()

const router = useRouter()
const auth = useAuthStore()

async function handleLogout() {
  await auth.logout()
  router.push({ name: 'login' })
}
</script>

<template>
  <header class="flex h-16 items-center justify-between border-b border-gray-200 bg-white px-4 sm:px-6">
    <!-- Bouton hamburger (mobile) -->
    <button
      type="button"
      class="rounded-md p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700 md:hidden"
      @click="onMenuToggle?.()"
    >
      <Bars3Icon class="h-6 w-6" />
    </button>

    <!-- Spacer desktop -->
    <div class="hidden md:block" />

    <div class="flex items-center gap-4">
      <span class="hidden text-sm text-gray-500 sm:inline">{{ auth.user?.email }}</span>
      <button
        type="button"
        class="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
        @click="handleLogout"
      >
        <ArrowRightOnRectangleIcon class="h-4 w-4" />
        <span class="hidden sm:inline">Se déconnecter</span>
      </button>
    </div>
  </header>
</template>
