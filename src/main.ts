import './assets/index.css'

import { createApp } from 'vue'
import App from './App.vue'
import { createMemoryHistory, createRouter } from 'vue-router'

import HomeView from './pages/HomeView.vue'

const router = createRouter({
  history: createMemoryHistory(),
  routes: [
    {
      path: '/',
      component: HomeView,
    },
  ],
})

createApp(App).use(router).mount('#app')
