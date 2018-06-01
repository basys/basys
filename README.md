<!--- This file should be edited in the repository root directory, maintain a copy of it in packages/basys/README.md  -->

<p align="center"><a href="https://basys.io"><img width="100" src="https://avatars1.githubusercontent.com/u/10965504" alt="Basys logo"></a></p>

<p align="center">
    <a href="https://www.npmjs.com/package/basys"><img src="https://img.shields.io/npm/v/basys.svg" alt="Version"></a>
    <a href="https://travis-ci.org/basys/basys"><img src="https://travis-ci.org/basys/basys.svg?branch=master" alt="Build status"></a>
    <a href="https://ci.appveyor.com/project/sergkop/basys/branch/master"><img src="https://ci.appveyor.com/api/projects/status/6chns73bnq1hgq3v/branch/master?svg=true" alt="Windows build status"></a>
    <a href="https://gitter.im/basys/basys"><img src="https://badges.gitter.im/basys/basys.svg"></a>
</div>

<h1 align="center">Basys</h1>

[Basys](https://basys.io) is a toolbox for building Vue.js full-stack apps with a focus on great developer experience.

* An easy way to create full-stack [Express](https://expressjs.com)-based backend and [Vue](https://vuejs.org) single-page applications
* A simple configuration via [JSON5](https://json5.org) with intuitive options
* Code can be written using modern JavaScript and CSS pre-processing and compiled for required browsers
thanks to [Babel](https://babeljs.io), [PostCSS](http://postcss.org) and [Browserlist](https://github.com/ai/browserslist)
* Dev server with hot module reload and automatic restart with [nodemon](https://nodemon.io)
* [Webpack 4](https://webpack.js.org)-based bundler for optimized production builds
* Code and style linting with [ESLint](https://eslint.org), [stylelint](https://stylelint.io) and [Prettier](https://prettier.io)
* An easy way to create new pages - .vue files with custom 'info' option are automatically registered
* Unit testing with [Jest](https://facebook.github.io/jest/)
* End-to-end testing with [TestCafe](https://devexpress.github.io/testcafe)
* [Basys IDE](https://marketplace.visualstudio.com/items?itemName=basys.vscode-basys) implemented as a Visual Studio Code extension
* Visual app builder that allows non-technical team members to participate in app development

## Getting started

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

## Documentation

You can find a detailed [documentation](https://basys.io/docs/getting-started) on the website.

## License

[MIT](https://github.com/basys/basys/blob/master/LICENSE)
