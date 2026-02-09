<script setup lang="ts">
import { ref } from 'vue'
import AppSidebar from '@/components/AppSidebar.vue'
import AppHeader from '@/components/AppHeader.vue'

const sidebarOpen = ref(false)
</script>

<template>
  <div class="flex h-screen overflow-hidden">
    <!-- Overlay mobile -->
    <Transition
      enter-active-class="transition-opacity duration-300 ease-linear"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition-opacity duration-300 ease-linear"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="sidebarOpen"
        class="fixed inset-0 z-40 bg-gray-900/80 md:hidden"
        @click="sidebarOpen = false"
      />
    </Transition>

    <!-- Sidebar mobile (drawer) -->
    <Transition
      enter-active-class="transition-transform duration-300 ease-in-out"
      enter-from-class="-translate-x-full"
      enter-to-class="translate-x-0"
      leave-active-class="transition-transform duration-300 ease-in-out"
      leave-from-class="translate-x-0"
      leave-to-class="-translate-x-full"
    >
      <div
        v-if="sidebarOpen"
        class="fixed inset-y-0 left-0 z-50 md:hidden"
      >
        <AppSidebar :on-navigate="() => (sidebarOpen = false)" />
      </div>
    </Transition>

    <!-- Sidebar desktop -->
    <div class="hidden md:flex">
      <AppSidebar />
    </div>

    <!-- Contenu principal -->
    <div class="flex flex-1 flex-col overflow-hidden">
      <AppHeader :on-menu-toggle="() => (sidebarOpen = true)" />
      <main class="flex-1 overflow-y-auto bg-gray-50 p-4 sm:p-6">
        <router-view />
      </main>
    </div>
  </div>
</template>
