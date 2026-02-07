import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    // --- Routes publiques ---
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/LoginView.vue'),
      meta: { requiresAuth: false },
    },

    // --- Setup (auth requise, pas de settings) ---
    {
      path: '/setup',
      name: 'setup',
      component: () => import('@/views/SetupView.vue'),
      meta: { requiresAuth: true, requiresSetup: false },
    },

    // --- Routes authentifiées ---
    {
      path: '/app',
      component: () => import('@/layouts/AuthLayout.vue'),
      meta: { requiresAuth: true, requiresSetup: true },
      children: [
        {
          path: '',
          redirect: '/app/dashboard',
        },
        {
          path: 'dashboard',
          name: 'dashboard',
          component: () => import('@/views/DashboardView.vue'),
        },
        {
          path: 'contacts',
          name: 'contacts',
          component: () => import('@/views/contacts/ContactListView.vue'),
        },
        {
          path: 'contacts/new',
          name: 'contact-new',
          component: () => import('@/views/contacts/ContactFormView.vue'),
        },
        {
          path: 'contacts/:id',
          name: 'contact-detail',
          component: () => import('@/views/contacts/ContactDetailView.vue'),
        },
        {
          path: 'documents',
          name: 'documents',
          component: () => import('@/views/documents/DocumentListView.vue'),
        },
        {
          path: 'documents/new',
          name: 'document-new',
          component: () => import('@/views/documents/DocumentFormView.vue'),
        },
        {
          path: 'documents/:id',
          name: 'document-detail',
          component: () => import('@/views/documents/DocumentDetailView.vue'),
        },
        {
          path: 'transactions',
          name: 'transactions',
          component: () => import('@/views/transactions/TransactionListView.vue'),
        },
        {
          path: 'transactions/new',
          name: 'transaction-new',
          component: () => import('@/views/transactions/TransactionFormView.vue'),
        },
        {
          path: 'transactions/:id',
          name: 'transaction-detail',
          component: () => import('@/views/transactions/TransactionDetailView.vue'),
        },
        {
          path: 'settings',
          name: 'settings',
          component: () => import('@/views/SettingsView.vue'),
        },
      ],
    },

    // --- Redirect racine ---
    {
      path: '/',
      redirect: '/app/dashboard',
    },

    // --- 404 ---
    {
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      component: () => import('@/views/NotFoundView.vue'),
    },
  ],
})

// --- Guards de navigation ---
router.beforeEach(async (to) => {
  const auth = useAuthStore()

  // Attendre l'initialisation si en cours
  if (auth.loading) {
    await new Promise<void>((resolve) => {
      const unwatch = auth.$subscribe(() => {
        if (!auth.loading) {
          unwatch()
          resolve()
        }
      })
      // Au cas où loading est déjà false
      if (!auth.loading) {
        unwatch()
        resolve()
      }
    })
  }

  const requiresAuth = to.meta.requiresAuth !== false
  const requiresSetup = to.meta.requiresSetup === true

  // Non authentifié → login
  if (requiresAuth && !auth.isAuthenticated) {
    return { name: 'login' }
  }

  // Authentifié mais sur /login → redirection
  if (to.name === 'login' && auth.isAuthenticated) {
    return auth.setupComplete ? { name: 'dashboard' } : { name: 'setup' }
  }

  // Setup requis mais pas terminé → setup
  if (requiresSetup && auth.setupComplete === false) {
    return { name: 'setup' }
  }

  // Sur /setup mais déjà configuré → dashboard
  if (to.name === 'setup' && auth.setupComplete === true) {
    return { name: 'dashboard' }
  }
})

export default router
