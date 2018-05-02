## 0.4.0 (2 May 2018)

* Upgrade to webpack 4, babel 7 and vue-loader 15
* Changed the default value of `browsers` config option
* Merged `cssSourceMap` and `jsSourceMap` options into `sourceMap`
* Activate debug mode on end-to-end tests failure
* `basys init` now streams the output of `npm install` into the terminal
* Set up Travis CI and AppVeyor for automatic package testing

## 0.3.5 (8 April 2018)

* Dev server integration with external tools

## 0.3.4 (2 April 2018)

* Overriding JS modules to reduce front-end code bundle size. Allows to exclude node.js-specific code from npm packages.
* Re-activate app builder

## 0.3.3 (6 March 2018)

* Recommend vscode-jest extension for new projects created with CLI

## 0.3.2 (6 March 2018)

* Unit testing with Jest

## 0.3.1 (1 March 2018)

* Replace cssnano with csso
* Make .eslintrc optional
* Code linting improvements

## 0.3.0 (26 February 2018)

* [Visual Studio Code extension](https://marketplace.visualstudio.com/items?itemName=basys.vscode-basys) for improved developer experience
* Style linting using styleling and Prettier
* Add ~ and @ aliases for `src/` and `assets/` directories
* Made index.html template optional
* Bundle size report is generated along with the production build
* CLI performance improvements

## 0.2.0 (3 February 2018)

* Basys CLI for creating new projects and working with existing ones
* Improved error handling during the compilation
* Support for parameters in page paths
* Global `basys` object is accessible in code
* JS linting improvements
* Documentation is available on basys.io

## 0.1.1 (12 January 2018)

* Expose API for working with projects: running dev server, building for production, end-to-end testing
* Bug fixes and polishing of webpack configuration
* index.html template for pages is now included in the project code
* Restructure basys.json configuration file to support multiple apps

## 0.1.0 (3 January 2018)

The initial release that provides:
* Dev server with hot module reload
* Support for web and backend applications
* Automatic code bundling for production
* Code linting configuration
* End-to-end testing configuration
