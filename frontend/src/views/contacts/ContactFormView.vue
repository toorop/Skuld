<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useContactsStore } from '@/stores/contacts'
import { useToast } from '@/composables/useToast'
import { ApiError } from '@/lib/api'
import ContactForm from '@/components/ContactForm.vue'

const router = useRouter()
const store = useContactsStore()
const toast = useToast()

const loading = ref(false)

async function handleSubmit(data: Record<string, unknown>) {
  loading.value = true
  try {
    const contact = await store.createContact(data)
    toast.success('Contact enregistre.')
    router.push({ name: 'contact-detail', params: { id: contact.id } })
  } catch (err) {
    if (err instanceof ApiError) {
      toast.error(err.message)
    } else {
      toast.error('Une erreur est survenue.')
    }
  } finally {
    loading.value = false
  }
}

function handleCancel() {
  router.push({ name: 'contacts' })
}
</script>

<template>
  <div>
    <div class="mb-6">
      <button
        class="text-sm text-gray-500 hover:text-gray-700"
        @click="handleCancel"
      >
        &larr; Retour
      </button>
      <h1 class="mt-2 text-2xl font-bold text-gray-900">Nouveau contact</h1>
    </div>

    <div class="rounded-xl bg-white p-6 shadow-sm">
      <ContactForm :loading="loading" @submit="handleSubmit" @cancel="handleCancel" />
    </div>
  </div>
</template>
