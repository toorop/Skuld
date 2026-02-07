<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
</script>

<template>
  <div>
    <h1 class="text-2xl font-bold text-gray-900">{{ t('contacts.new') }}</h1>
    <p class="mt-2 text-sm text-gray-500">Formulaire en construction (Phase 2.4)</p>
  </div>
</template>
