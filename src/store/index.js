import Vue from 'vue'
import Vuex from 'vuex'

Vue.use(Vuex)

export default new Vuex.Store({
  state: {
    BACKEND: 'https://chinatours.traveldays.com/api',
    COMPANION: 'https://companion.traveldays.com',
    CDN: 'https://cdn.traveldays.com'
  },
  mutations: {},
  actions: {},
  modules: {}
})
