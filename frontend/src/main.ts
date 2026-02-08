import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'

import { useAuthStore } from './stores/auth'

import './assets/main.css'

const app = createApp(App)

app.use(createPinia())

// Initialiser l'auth avant de monter le router
const auth = useAuthStore()
auth.init().then(() => {
  app.use(router)
  app.mount('#app')
})
