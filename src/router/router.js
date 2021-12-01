import Vue from 'vue';
import VueRouter from 'vue-router';
import homePage from '../pages/homePage.vue';
import digiApp from '../pages/digiApp.vue';
import boardDetails from '../pages/boardDetails.vue';
import taskDetails from '../pages/taskDetails.vue';
import loginSignup from '../pages/loginSignup.vue';

Vue.use(VueRouter);

const routes = [
  {
    path: '/',
    name: 'home',
    component: homePage,
  },
  {
    path: '/workspace',
    name: 'digiApp',
    component: digiApp,
  },
  {
    path: '/b/:board._id',
    name: 'boardDetails',
    component: boardDetails,
    children: [
      {
        path: ':taskId?',
        name: 'taskDetails',
        component: taskDetails,
      },
    ],
  },
  {
    path: '/signup',
    name: 'loginSignup',
    component: loginSignup,
  },
];

const router = new VueRouter({
  routes,
});

export default router;
