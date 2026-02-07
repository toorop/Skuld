<script setup lang="ts">
import AppSidebar from '@/components/AppSidebar.vue'
import AppHeader from '@/components/AppHeader.vue'
</script>

<template>
  <div class="flex h-screen overflow-hidden">
    <!-- Sidebar -->
    <AppSidebar />

    <!-- Contenu principal -->
    <div class="flex flex-1 flex-col overflow-hidden">
      <AppHeader />
      <main class="flex-1 overflow-y-auto bg-gray-50 p-6">
        <router-view />
      </main>
    </div>
  </div>
</template>
