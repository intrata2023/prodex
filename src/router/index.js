import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    name: 'login',
    component: () => import('../views/LoginView.vue'),
    meta: { guest: true },
  },
  {
    path: '/dashboard',
    name: 'dashboard',
    component: () => import('../views/DashboardView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/mis-predicciones',
    name: 'mis-predicciones',
    component: () => import('../views/MisPrediccionesView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/rivales',
    name: 'rivales',
    component: () => import('../views/RivalesView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/grupos',
    name: 'grupos',
    component: () => import('../views/GruposView.vue'),
    meta: { requiresAuth: true, etapa: 'grupos' },
  },
  {
    path: '/eliminatorias',
    name: 'eliminatorias',
    component: () => import('../views/EliminatoriasView.vue'),
    meta: { requiresAuth: true, etapa: 'eliminatorias' },
  },
  {
    path: '/ranking',
    name: 'ranking',
    component: () => import('../views/RankingView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/admin',
    name: 'admin',
    component: () => import('../views/AdminView.vue'),
    meta: { requiresAdmin: true },
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach(async (to) => {
  let session = null
  try {
    session = JSON.parse(localStorage.getItem('prode_session') || 'null')
  } catch {
    session = null
  }

  if (to.meta.requiresAdmin && !session?.es_admin) {
    return { name: 'login' }
  }

  if (to.meta.requiresAuth && !session?.participante_id && !session?.es_admin) {
    return { name: 'login' }
  }

  if (to.meta.guest && (session?.participante_id || session?.es_admin)) {
    if (session.es_admin) return { name: 'admin' }
    return { name: 'dashboard' }
  }

  return true
})

export default router
