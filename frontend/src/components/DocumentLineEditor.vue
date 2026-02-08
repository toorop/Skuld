<script setup lang="ts">
import { computed } from 'vue'
import { TrashIcon, PlusIcon } from '@heroicons/vue/24/outline'

/** Entrée d'une ligne de document (sans id ni total calculé) */
export interface LineInput {
  description: string
  quantity: number
  unit: string
  unitPrice: number
  fiscalCategory: string
}

const props = defineProps<{
  modelValue: LineInput[]
  disabled?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [lines: LineInput[]]
}>()

function updateLine(index: number, field: keyof LineInput, value: unknown) {
  const updated = props.modelValue.map((l) => ({ ...l }))
  ;(updated[index] as Record<string, unknown>)[field] = value
  emit('update:modelValue', updated)
}

function addLine() {
  emit('update:modelValue', [
    ...props.modelValue,
    { description: '', quantity: 1, unit: '', unitPrice: 0, fiscalCategory: 'BIC_VENTE' },
  ])
}

function removeLine(index: number) {
  const updated = props.modelValue.filter((_, i) => i !== index)
  emit('update:modelValue', updated)
}

/** Total d'une ligne */
function lineTotal(line: LineInput): number {
  return line.quantity * line.unitPrice
}

/** Sous-totaux par catégorie fiscale */
const subtotals = computed(() => {
  const bicVente = props.modelValue
    .filter((l) => l.fiscalCategory === 'BIC_VENTE')
    .reduce((s, l) => s + lineTotal(l), 0)
  const bicPresta = props.modelValue
    .filter((l) => l.fiscalCategory === 'BIC_PRESTA')
    .reduce((s, l) => s + lineTotal(l), 0)
  const bnc = props.modelValue
    .filter((l) => l.fiscalCategory === 'BNC')
    .reduce((s, l) => s + lineTotal(l), 0)
  return { bicVente, bicPresta, bnc, total: bicVente + bicPresta + bnc }
})

/** Catégories fiscales avec label */
const categories = [
  { value: 'BIC_VENTE', label: 'BIC Vente' },
  { value: 'BIC_PRESTA', label: 'BIC Presta' },
  { value: 'BNC', label: 'BNC' },
]

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount)
}
</script>

<template>
  <div>
    <label class="block text-sm font-medium text-gray-700 mb-2">
      Lignes
    </label>

    <!-- Tableau des lignes -->
    <div class="overflow-x-auto rounded-lg border border-gray-200">
      <table class="min-w-full divide-y divide-gray-200">
        <thead class="bg-gray-50">
          <tr>
            <th class="px-3 py-2 text-left text-xs font-medium uppercase text-gray-500">
              Description
            </th>
            <th class="px-3 py-2 text-right text-xs font-medium uppercase text-gray-500 w-20">
              Quantité
            </th>
            <th class="px-3 py-2 text-left text-xs font-medium uppercase text-gray-500 w-20">
              Unité
            </th>
            <th class="px-3 py-2 text-right text-xs font-medium uppercase text-gray-500 w-28">
              Prix unitaire
            </th>
            <th class="px-3 py-2 text-left text-xs font-medium uppercase text-gray-500 w-32">
              Catégorie fiscale
            </th>
            <th class="px-3 py-2 text-right text-xs font-medium uppercase text-gray-500 w-24">
              Total
            </th>
            <th class="px-3 py-2 w-10"></th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-200 bg-white">
          <tr v-for="(line, index) in modelValue" :key="index">
            <!-- Description -->
            <td class="px-2 py-2">
              <input
                :value="line.description"
                type="text"
                required
                :disabled="disabled"
                class="block w-full rounded border-gray-300 text-sm focus:border-primary-500 focus:ring-primary-500 disabled:bg-gray-50"
                @input="updateLine(index, 'description', ($event.target as HTMLInputElement).value)"
              />
            </td>
            <!-- Quantité -->
            <td class="px-2 py-2">
              <input
                :value="line.quantity"
                type="number"
                step="0.01"
                min="0.01"
                required
                :disabled="disabled"
                class="block w-full rounded border-gray-300 text-right text-sm focus:border-primary-500 focus:ring-primary-500 disabled:bg-gray-50"
                @input="updateLine(index, 'quantity', Number(($event.target as HTMLInputElement).value))"
              />
            </td>
            <!-- Unité -->
            <td class="px-2 py-2">
              <input
                :value="line.unit"
                type="text"
                :disabled="disabled"
                placeholder="h, j, u..."
                class="block w-full rounded border-gray-300 text-sm focus:border-primary-500 focus:ring-primary-500 disabled:bg-gray-50"
                @input="updateLine(index, 'unit', ($event.target as HTMLInputElement).value)"
              />
            </td>
            <!-- Prix unitaire -->
            <td class="px-2 py-2">
              <input
                :value="line.unitPrice"
                type="number"
                step="0.01"
                min="0"
                required
                :disabled="disabled"
                class="block w-full rounded border-gray-300 text-right text-sm focus:border-primary-500 focus:ring-primary-500 disabled:bg-gray-50"
                @input="updateLine(index, 'unitPrice', Number(($event.target as HTMLInputElement).value))"
              />
            </td>
            <!-- Catégorie fiscale -->
            <td class="px-2 py-2">
              <select
                :value="line.fiscalCategory"
                :disabled="disabled"
                class="block w-full rounded border-gray-300 text-sm focus:border-primary-500 focus:ring-primary-500 disabled:bg-gray-50"
                @change="updateLine(index, 'fiscalCategory', ($event.target as HTMLSelectElement).value)"
              >
                <option v-for="cat in categories" :key="cat.value" :value="cat.value">
                  {{ cat.label }}
                </option>
              </select>
            </td>
            <!-- Total -->
            <td class="px-3 py-2 text-right text-sm font-medium text-gray-900 whitespace-nowrap">
              {{ formatCurrency(lineTotal(line)) }}
            </td>
            <!-- Supprimer -->
            <td class="px-2 py-2 text-center">
              <button
                v-if="modelValue.length > 1 && !disabled"
                type="button"
                class="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600"
                @click="removeLine(index)"
              >
                <TrashIcon class="h-4 w-4" />
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Bouton ajouter -->
    <button
      v-if="!disabled"
      type="button"
      class="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-dashed border-gray-300 px-3 py-1.5 text-sm text-gray-600 hover:border-primary-400 hover:text-primary-600"
      @click="addLine"
    >
      <PlusIcon class="h-4 w-4" />
      Ajouter une ligne
    </button>

    <!-- Sous-totaux -->
    <div class="mt-4 flex justify-end">
      <dl class="w-64 space-y-1 text-sm">
        <div
          v-if="subtotals.bicVente > 0"
          class="flex justify-between text-gray-600"
        >
          <dt>BIC Vente</dt>
          <dd>{{ formatCurrency(subtotals.bicVente) }}</dd>
        </div>
        <div
          v-if="subtotals.bicPresta > 0"
          class="flex justify-between text-gray-600"
        >
          <dt>BIC Presta</dt>
          <dd>{{ formatCurrency(subtotals.bicPresta) }}</dd>
        </div>
        <div v-if="subtotals.bnc > 0" class="flex justify-between text-gray-600">
          <dt>BNC</dt>
          <dd>{{ formatCurrency(subtotals.bnc) }}</dd>
        </div>
        <div
          class="flex justify-between border-t border-gray-200 pt-1 font-semibold text-gray-900"
        >
          <dt>Total HT</dt>
          <dd>{{ formatCurrency(subtotals.total) }}</dd>
        </div>
      </dl>
    </div>
  </div>
</template>
