# Basys

A JavaScript framework for building cross-plaform applications with a focus on developer experience.

* An easy way to create [Express](https://expressjs.com)-based backend and [Vue](https://vuejs.org) single-page applications
* A simple configuration via [JSON5](http://json5.org) with intuitive options
* Code can be written using modern JavaScript and CSS pre-processing and compiled for required browsers
thanks to [Babel](http://babeljs.io), [PostCSS](http://postcss.org) and [Browserlist](https://github.com/ai/browserslist)
* Dev server with hot module reload and automatic restart with [nodemon](https://nodemon.io)
* [Webpack](https://webpack.js.org)-based bundler for production builds with automatic minification
* Code linting using [Prettier](https://prettier.io)
* An easy way to create new pages - .vue files with custom <info> block are automatically registered
* End-to-end testing with [TestCafe](https://devexpress.github.io/testcafe) is built-in

## Getting started
```sh
npm i -g basys-cli && basys init
basys dev
```

## Inspiration
Basys was created with the goal of making app development accessible to a wider audience by automating the boring parts of technology stack, building tools for visual editing and focusing on a great developer experience. It was heavily inspired and shaped by the following projects:
* [Create React App](https://github.com/facebookincubator/create-react-app)
* [vue-cli-template-webpack](https://github.com/vuejs-templates/webpack)
* [Nuxt](https://nuxtjs.org)
