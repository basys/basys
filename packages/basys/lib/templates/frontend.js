import 'babel-polyfill';
import Meta from 'vue-meta';
import Router from 'vue-router';

const routes = [];
let options;
let comp;

Vue.use(Meta, {keyName: 'head'});
Vue.use(Router);

{% if entry %}
  require('{{ entry }}');
{% endif %}

{% for vuePath, info in vueComponents %}
  options = require({{ vuePath|dump }}).default;
  comp = Vue.component(options.name, options);

  {% if info.path %}
    {# BUG: pass other route info #}
    routes.push({
      path: {{ info.path|dump }},
      name: options.name,
      component: comp,
    });
  {% endif %}
{% endfor %}

{# BUG: allow to customize `scrollBehaviour` #}
const router = new Router({
  mode: 'history',
  caseSensitive: {{ caseSensitive }},
  fallback: false,
  routes,
});

{# BUG: add Vuex #}

Vue.config.productionTip = false;

{# BUG: do not expose it to `window`, but make accessible in the code #}
const useDefaultTemplate = document.getElementById('app').children.length === 0;
window.app = new Vue({
  el: '#app',
  router,
  {# BUG: this is a default layout component. allow to override it on per-page basis. #}
  render: useDefaultTemplate ? (h => h('router-view')) : null,
});
