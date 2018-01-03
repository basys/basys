import Meta from 'vue-meta';
import Router from 'vue-router';


const routes = [];
let options;
let comp;


Vue.use(Meta);
Vue.use(Router);


{% for vuePath in vuePaths %}
  {# BUG: if !options.name just skip the component? #}
  options = require('{{ vuePath }}').default;
  comp = Vue.component(options.name, options);

  {% if routes[vuePath] %}
    {# BUG: pass other route info #}
    routes.push({
      {# BUG: better use JSON.stringify(routes[vuePath].path) #}
      path: `{{ routes[vuePath].path }}`,
      name: options.name,
      component: comp,
    });
  {% endif %}
{% endfor %}

{# BUG: allow to customize `scrollBehaviour` #}
const router = new Router({
  mode: 'history',
  caseSensitive: true,
  fallback: false,
  routes,
});


{# BUG: add Vuex #}

Vue.config.productionTip = false;

{% if entry %}
  require('{{ entry }}');
{% endif %}

/* eslint-disable no-new */
new Vue({
  el: '#app',
  router,
  render: h => h('router-view'), {# BUG: this is a default layout component. allow to override it on per-page basis. #}
});
