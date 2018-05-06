<!--- This file should be editing in the repository root directory, maintain a copy of it in packages/basys/README.md  -->
# Basys

[![Build status](https://travis-ci.org/basys/basys.svg?branch=master)](https://travis-ci.org/basys/basys)
[![Windows build status](https://ci.appveyor.com/api/projects/status/6chns73bnq1hgq3v/branch/master?svg=true)](https://ci.appveyor.com/project/sergkop/basys/branch/master)

A JavaScript framework for building cross-plaform applications with a focus on developer experience.

* An easy way to create full-stack [Express](https://expressjs.com)-based backend and [Vue](https://vuejs.org) single-page applications
* A simple configuration via [JSON5](http://json5.org) with intuitive options
* Code can be written using modern JavaScript and CSS pre-processing and compiled for required browsers
thanks to [Babel](http://babeljs.io), [PostCSS](http://postcss.org) and [Browserlist](https://github.com/ai/browserslist)
* Dev server with hot module reload and automatic restart with [nodemon](https://nodemon.io)
* [Webpack](https://webpack.js.org)-based bundler for optimized production builds
* Code linting using [Prettier](https://prettier.io)
* An easy way to create new pages - .vue files with custom 'info' option are automatically registered
* Unit testing with [Jest](https://facebook.github.io/jest/)
* End-to-end testing with [TestCafe](https://devexpress.github.io/testcafe)
* [Basys IDE](https://marketplace.visualstudio.com/items?itemName=basys.vscode-basys) implemented as a Visual Studio Code extension

## Getting started
```sh
npm i -g basys-cli && basys init
basys dev
```

## Inspiration
Basys was created with the goal of making app development accessible to a wider audience by automating the boring parts of the technology stack, building tools for visual editing and focusing on a great developer experience. It was heavily inspired and shaped by the following projects:
* [Create React App](https://github.com/facebookincubator/create-react-app)
* [vue-cli-template-webpack](https://github.com/vuejs-templates/webpack)
* [Nuxt](https://nuxtjs.org)

## License

[MIT](https://github.com/basys/basys/blob/master/LICENSE)
