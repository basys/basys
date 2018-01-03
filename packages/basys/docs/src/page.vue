<template>
<section class="todoapp">
  <header class="header">
    <h1>todos</h1>
    <input class="new-todo" autofocus autocomplete="off" placeholder="What needs to be done?" v-model="newTodo" @keyup.enter="addTodo">
  </header>
  <section class="main" v-show="todos.length">
    <ul class="todo-list">
      <li class="todo" v-for="todo in todos" :key="todo.id" :class="{completed: todo.completed}">
        <div class="view">
          <input class="toggle" type="checkbox" v-model="todo.completed">
          <label>{{ todo.title }}</label>
          <button class="destroy" @click="removeTodo(todo)"></button>
        </div>
      </li>
    </ul>
  </section>
</section>
</template>

<script>
export default {
  name: 'todos',
  // Specify the tags in the <head> of the page.
  // See https://github.com/declandewet/vue-meta#step-3-start-defining-metainfo .
  metaInfo: {
    title: 'Todos',
    meta: [
      {charset: 'utf-8'},
    ],
  },
  data() {
    return {
      todos: [],
      newTodo: '',
    };
  },
  methods: {
    addTodo() {
      const value = this.newTodo && this.newTodo.trim();
      if (!value) return;
      this.todos.push({id: this.todos.length + 1, title: value, completed: false});
      this.newTodo = '';
    },
    removeTodo(todo) {
      const index = this.todos.indexOf(todo);
      this.todos.splice(index, 1);
    },
  },
};
</script>

<!-- If this section is present the Vue component is treated as a page -->
<route>
{
  path: '/',
}
</route>