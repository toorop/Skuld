<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import {
  ChartBarIcon,
  UserGroupIcon,
  DocumentTextIcon,
  BanknotesIcon,
  Cog6ToothIcon,
} from '@heroicons/vue/24/outline'

const { t } = useI18n()
const route = useRoute()

const navigation = [
  { name: 'nav.dashboard', to: '/app/dashboard', icon: ChartBarIcon },
  { name: 'nav.contacts', to: '/app/contacts', icon: UserGroupIcon },
  { name: 'nav.documents', to: '/app/documents', icon: DocumentTextIcon },
  { name: 'nav.transactions', to: '/app/transactions', icon: BanknotesIcon },
  { name: 'nav.settings', to: '/app/settings', icon: Cog6ToothIcon },
]

function isActive(path: string): boolean {
  return route.path.startsWith(path)
}
</script>

<template>
  <aside class="flex w-64 flex-col border-r border-gray-200 bg-white">
    <!-- Logo -->
    <div class="flex h-16 items-center gap-2 border-b border-gray-200 px-6">
      <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-600 text-sm font-bold text-white">
        S
      </div>
      <span class="text-lg font-semibold text-gray-900">{{ t('app.name') }}</span>
    </div>

    <!-- Navigation -->
    <nav class="flex-1 space-y-1 px-3 py-4">
      <router-link
        v-for="item in navigation"
        :key="item.to"
        :to="item.to"
        :class="[
          isActive(item.to)
            ? 'bg-primary-50 text-primary-700'
            : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900',
          'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
        ]"
      >
        <component
          :is="item.icon"
          :class="[
            isActive(item.to) ? 'text-primary-600' : 'text-gray-400 group-hover:text-gray-500',
            'h-5 w-5 shrink-0',
          ]"
        />
        {{ t(item.name) }}
      </router-link>
    </nav>
  </aside>
</template>
