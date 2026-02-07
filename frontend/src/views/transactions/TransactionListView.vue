<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
</script>

<template>
  <div>
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-bold text-gray-900">{{ t('transactions.title') }}</h1>
      <router-link
        to="/app/transactions/new"
        class="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary-700"
      >
        {{ t('transactions.new') }}
      </router-link>
    </div>
    <p class="mt-4 text-sm text-gray-500">Module en construction (Phase 2.6)</p>
  </div>
</template>
