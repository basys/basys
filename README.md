<!--- This file should be editing in the repository root directory, maintain a copy of it in packages/basys/README.md  -->

<p align="center"><a href="https://basys.io"><img width="100" src="https://avatars1.githubusercontent.com/u/10965504" alt="Basys logo"></a></p>

<p align="center">
    <a href="https://www.npmjs.com/package/basys"><img src="https://img.shields.io/npm/v/basys.svg" alt="Version"></a>
    <a href="https://travis-ci.org/basys/basys"><img src="https://travis-ci.org/basys/basys.svg?branch=master" alt="Build status"></a>
    <a href="https://ci.appveyor.com/project/sergkop/basys/branch/master"><img src="https://ci.appveyor.com/api/projects/status/6chns73bnq1hgq3v/branch/master?svg=true" alt="Windows build status"></a>
    <a href="https://gitter.im/basys/basys"><img src="https://badges.gitter.im/basys/basys.svg"></a>
</div>

<h1 align="center">Basys</h1>

A JavaScript framework for building cross-plaform applications with a focus on developer experience.

* An easy way to create full-stack [Express](https://expressjs.com)-based backend and [Vue](https://vuejs.org) single-page applications
* A simple configuration via [JSON5](https://json5.org) with intuitive options
* Code can be written using modern JavaScript and CSS pre-processing and compiled for required browsers
thanks to [Babel](https://babeljs.io), [PostCSS](http://postcss.org) and [Browserlist](https://github.com/ai/browserslist)
* Dev server with hot module reload and automatic restart with [nodemon](https://nodemon.io)
* [Webpack](https://webpack.js.org)-based bundler for optimized production builds
* Code and style linting with [ESLint](https://eslint.org), [stylelint](https://stylelint.io) and [Prettier](https://prettier.io)
* An easy way to create new pages - .vue files with custom 'info' option are automatically registered
* Unit testing with [Jest](https://facebook.github.io/jest/)
* End-to-end testing with [TestCafe](https://devexpress.github.io/testcafe)
* [Basys IDE](https://marketplace.visualstudio.com/items?itemName=basys.vscode-basys) implemented as a Visual Studio Code extension

<h2 align="center">Getting started</h2>

If you prefer to use Basys IDE install [Basys extension for VSCode](https://marketplace.visualstudio.com/items?itemName=basys.vscode-basys), open the Command Palette (`Ctrl+Shift+P` on Windows/Linux or `⇧⌘P` on MacOS) and run `Basys: Create project` command.

Or just use Basys CLI to start a new project:

```bash
npm install -g basys-cli
# or
yarn global add basys-cli

basys init # Scaffold a new project from a starter template
cd <project-dir>

basys dev # Launch the development server
```

<h2 align="center">Inspiration</h2>

Basys was created with the goal of making app development accessible to a wider audience by automating the boring parts of the technology stack, building tools for visual editing and focusing on a great developer experience. It was heavily inspired and shaped by the following projects:
* [Create React App](https://github.com/facebookincubator/create-react-app)
* [vue-cli-template-webpack](https://github.com/vuejs-templates/webpack)
* [Nuxt](https://nuxtjs.org)

<h2 align="center">License</h2>

[MIT](https://github.com/basys/basys/blob/master/LICENSE)
