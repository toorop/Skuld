<script setup lang="ts">
import AppToast from '@/components/AppToast.vue'
import AppLoading from '@/components/AppLoading.vue'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
</script>

<template>
  <AppLoading v-if="auth.loading" />
  <router-view v-else />
  <AppToast />
</template>
