<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { ArrowRightOnRectangleIcon } from '@heroicons/vue/24/outline'

const router = useRouter()
const auth = useAuthStore()

async function handleLogout() {
  await auth.logout()
  router.push({ name: 'login' })
}
</script>

<template>
  <header class="flex h-16 items-center justify-between border-b border-gray-200 bg-white px-6">
    <div />

    <div class="flex items-center gap-4">
      <span class="text-sm text-gray-500">{{ auth.user?.email }}</span>
      <button
        type="button"
        class="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
        @click="handleLogout"
      >
        <ArrowRightOnRectangleIcon class="h-4 w-4" />
        Se déconnecter
      </button>
    </div>
  </header>
</template>
