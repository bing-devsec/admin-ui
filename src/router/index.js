import { createRouter, createWebHistory } from 'vue-router'

import writeDocument from '@/views/writeDocument.vue'
import manageDocument from '@/views/manageDocument.vue'
import pubTime from '@/components/pubTime.vue'
import pubViews from '@/components/pubViews.vue'
import manageLabel from '@/views/manageLabel.vue'
import toolsConfig from '@/views/toolsConfig.vue'
import aboutMe from '@/views/aboutMe.vue'
import Home from '../components/Home.vue'
import Login from '@/views/Login.vue'
import shortMsgLogin from '@/views/shortMsgLogin.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/home',
      component: Home,
      children:[
        {
          path: '',
          component: manageDocument
        },
        {
          path: 'manageDocument',
          component: manageDocument,
          children:[
            {
              path:'pubTime',
              component:pubTime
            },
            {
              path: 'pubViews',
              component:pubViews
            }
          ]
        },
        {
          path: 'writeDocument',
          component: writeDocument
        },
        {
          path: 'manageLabel',
          component: manageLabel
        },
        {
          path: 'toolsConfig',
          component: toolsConfig
        },
        {
          path: 'aboutMe',
          component: aboutMe
        },
      ]
    },
    {
      path: '/',
      component: Login
    },
    {
      path: '/short-message-login',
      component: shortMsgLogin
    },
  ]
}
)

export default router
