import '@babel/polyfill';
import Meta from 'vue-meta';
import Router from 'vue-router';

const routes = [];
let options;
let comp;

Vue.use(Meta, {keyName: 'head'});
Vue.use(Router);

{% if entry %}
  const entry = require({{ entry|dump }});
  const conf = (entry && entry.default) || {};
{% else %}
  const conf = {};
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

const router = new Router({
  mode: 'history',
  caseSensitive: {{ caseSensitive }},
  fallback: false,
  routes,
  {# BUG: allow to customize `scrollBehavior` #}
  scrollBehavior: () => ({x: 0, y: 0}),
});

{# BUG: add Vuex #}

Vue.config.productionTip = false;

{# BUG: do not expose it to `window`, but make accessible in the code (via `basys`?) #}
window.app = new Vue({
  el: '#app',
  router,
  {# BUG: allow to override other attributes of this object via `conf` (like `data`) #}
  {# BUG: this is a default layout component. allow to override it on per-page basis. #}
  render: conf.render || (h => h('router-view')),
});
