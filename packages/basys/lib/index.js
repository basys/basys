const fs = require('fs-extra');
const glob = require('glob');
const opn = require('opn');
const path = require('path');
const portfinder = require('portfinder');
const {codeConfig, getConfig} = require('./config');
const {exit, monitorServerStatus} = require('./utils');
const {build} = require('./webpack/build');

async function dev(projectDir, appName, appBuilder = true) {
  const {startDevServer} = require('./webpack/dev');
  let config = getConfig(projectDir, appName, 'dev');
  const host = config.host;
  const firstRun = !fs.pathExistsSync(path.join(config.tempDir, 'index.html'));

  config.port = await portfinder.getPortPromise({host, port: config.port});
  if (config.type === 'web') {
    config.backendPort = await portfinder.getPortPromise({host, port: config.backendPort});
  }

  let server = await startDevServer(config);

  // On basys.json changes restart the webpack dev server
  require('chokidar')
    .watch(path.join(projectDir, 'basys.json'), {ignoreInitial: true})
    .on('change', () => {
      // BUG: not all changes in basys.json require to restart the dev server and recompile the project
      // BUG: if host or app name changes dev server should be stopped
      server.close(async () => {
        const {backendPort, port} = config;
        config = getConfig(projectDir, config.appName, 'dev');
        config.port = port;
        config.backendPort = backendPort;
        server = await startDevServer(config);
      });

      // BUG: nodemon may need to be stopped or started (if config.type === 'web')
    });

  if (config.type === 'web') {
    const backendEntryPath = path.join(config.tempDir, 'backend.js');
    const watchPaths = [backendEntryPath];
    // BUG: only if there are pages
    watchPaths.push(path.join(config.tempDir, 'index.html'));
    // BUG: watch other files (like basys.json)?

    const nodemon = require('nodemon');
    nodemon({
      script: backendEntryPath,
      watch: watchPaths,
    });

    await new Promise((resolve, reject) => {
      nodemon
        .on('start', resolve)
        .on('crash', reject) // BUG: test it
        .on('restart', () => console.log('Express app restarted'));
    });

    const appUrl = `http://${host}:${config.port}`;
    console.log(`Your application is available at ${appUrl}`);

    // Open web app when running dev server for the first time
    if (firstRun) {
      // BUG: exclude page paths with parameters from the search
      const pagePaths = Object.values(config.vueComponents).map(info => info.path);
      const pagePath = pagePaths.includes('/') ? '/' : pagePaths[0];
      if (pagePath) opn(appUrl + pagePath);
    }
  }

  if (appBuilder) {
    const appBuilderPort = await portfinder.getPortPromise({host, port: 8090});
    const configPath = path.join(config.tempDir, 'app-builder.json');
    await fs.writeFile(
      configPath,
      JSON.stringify({
        host,
        port: appBuilderPort,
        backendPort: appBuilderPort,
        appPort: config.port,
        targetProjectDir: projectDir,
      }),
    );
    process.env.BASYS_CONFIG_PATH = configPath;
    require('basys-app-builder/backend.js');

    // Open app builder when running dev server for the first time
    await new Promise(resolve => {
      monitorServerStatus(host, appBuilderPort, true, connected => {
        if (connected) {
          const appBuilderUrl = `http://${host}:${appBuilderPort}`;
          console.log(`App builder is available at ${appBuilderUrl}`);
          if (firstRun) opn(appBuilderUrl);
          resolve();
        }
      });
    });
  }

  // BUG: expose API for stopping the dev server?
  return config;
}

async function start(projectDir, appName, env = 'prod') {
  const config = getConfig(projectDir, appName, env);
  if (config.type === 'web') {
    const backendPath = path.join(config.distDir, 'backend.js');
    if (!fs.pathExistsSync(backendPath)) {
      exit(`Please run \`basys build${appName ? ` ${appName}` : ''}\` command first`);
    }

    const port = await portfinder.getPortPromise({host: config.host, port: config.port});
    config.port = port;
    config.backendPort = port;
    await fs.ensureDir(config.distDir);
    await fs.writeFile(path.join(config.distDir, 'config.json'), JSON.stringify({port}));

    require(backendPath);

    console.log(`Your application is available at http://${config.host}:${port}`);
  }
  return config;
}

async function lint(projectDir, fix) {
  const stats = {
    js: {formatting: 0, linting: 0},
    style: {formatting: 0, linting: 0},
  };

  // Style linting
  const ignorer = require('ignore')();
  try {
    ignorer.add(await fs.readFile(path.join(projectDir, '.stylelintignore'), 'utf8'));
  } catch (e) {}

  const stylePaths = glob
    .sync(path.join(projectDir, 'assets', '**/*.@(css|less|scss)'))
    .filter(stylePath => !ignorer.ignores(path.relative(projectDir, stylePath)));

  if (fix) {
    const prettier = require('prettier');
    await Promise.all(
      stylePaths.map(async filePath => {
        const css = await fs.readFile(filePath, 'utf8');
        let prettyCss;
        try {
          prettyCss = prettier.format(css, {
            printWidth: 100,
            tabWidth: 2,
            filepath: filePath,
          });
        } catch (e) {
          // Syntax errors are reported by stylelint
        }

        if (typeof prettyCss === 'string' && css !== prettyCss) {
          await fs.writeFile(filePath, prettyCss);
        }
      }),
    );
  }

  const stylelintrcPath = path.join(projectDir, '.stylelintrc');
  const useStylelintrc = await fs.pathExists(stylelintrcPath);
  const stylelint = require('stylelint');
  const res = await stylelint.lint({
    config: useStylelintrc ? undefined : {extends: 'stylelint-config-basys'},
    configBasedir: projectDir,
    configFile: useStylelintrc ? stylelintrcPath : null,
    files: stylePaths,
    // cache: true, // BUG: temporary deactivated - syntax errors get ignored because of it
    cacheLocation: path.join(projectDir, '.basys', '.stylelintcache'),
    reportNeedlessDisables: true,
    fix,
  });

  // Don't show style formatting rule warnings, only their statistics. All these rules must be autofixable.
  const stylelintFormattingRules = [
    'at-rule-name-case',
    'at-rule-name-space-after',
    'at-rule-semicolon-space-before',
    'declaration-bang-space-after',
    'declaration-bang-space-before',
    'media-feature-colon-space-after',
    'media-feature-colon-space-before',
    'media-feature-parentheses-space-inside',
    'media-query-list-comma-space-after',
    'media-query-list-comma-space-before',
    'selector-attribute-brackets-space-inside',
    'selector-attribute-quotes',
    'selector-combinator-space-after',
    'selector-combinator-space-before',
    'selector-descendant-combinator-no-non-space',
    'selector-pseudo-class-parentheses-space-inside',
  ];
  for (const result of res.results) {
    const numWarnings = result.warnings.length;
    result.warnings = result.warnings.filter(
      warning => !stylelintFormattingRules.includes(warning.rule),
    );
    stats.style.formatting += numWarnings - result.warnings.length;
    stats.style.linting += result.warnings.length;
  }

  const stylelintOutput = require('stylelint/lib/formatters/stringFormatter')(res.results);
  console.log(stylelintOutput.substr(0, stylelintOutput.length - 1));

  // Javascript linting
  const CLIEngine = require('eslint/lib/cli-engine');
  const engine = new CLIEngine({
    cwd: projectDir,
    baseConfig: {extends: 'basys'},
    extensions: ['.js', '.vue'],
    cache: true,
    cacheLocation: path.join(projectDir, '.basys', '.eslintcache'),
    reportUnusedDisableDirectives: true,
    fix,
  });
  const report = engine.executeOnFiles(['src', 'tests']);
  if (fix) CLIEngine.outputFixes(report);

  // Exclude fixable errors from the printed output
  for (const result of report.results) {
    const numMessages = result.messages.length;
    result.messages = result.messages.filter(message => !message.fix);
    stats.js.formatting += numMessages - result.messages.length;
    stats.js.linting += result.messages.length;
  }
  const output = engine.getFormatter()(report.results);
  if (output) {
    // Strip error statistics added by the ESLint formatter
    console.log(output.substr(0, output.indexOf('\u2716') - 11));
  }

  const chalk = require('chalk');
  console.log(
    chalk.red.bold(`\n${stats.js.linting} code and ${stats.style.linting} style linting errors.`),
  );
  if (stats.js.formatting + stats.style.formatting > 0) {
    console.log(
      chalk.yellow.bold(
        `Also detected ${stats.js.formatting} code and ${stats.style.formatting} style ` +
          `formatting errors, that can be fixed with \`basys lint:fix\`.`,
      ),
    );
  }
}

function unitTest(projectDir) {
  const configPath = path.join(projectDir, 'jest.config.js');
  const jestConfig = fs.pathExistsSync(configPath)
    ? require(configPath)
    : require('./webpack/jest-config');
  const argv = {config: JSON.stringify(jestConfig)};
  require('jest').runCLI(argv, [projectDir]); // BUG: should be tests/unit?
}

async function e2eTest(projectDir, appName) {
  // BUG: get fixture file detection in line with testcafe (see https://github.com/DevExpress/testcafe/issues/2074)
  const testPaths = glob.sync(path.join(projectDir, 'tests', 'e2e', '**', '*.js'));
  if (testPaths.length === 0) exit(`No tests found in ${path.join(projectDir, 'tests', 'e2e')}`);

  const env = 'test';
  await build(projectDir, appName, env);
  const config = await start(projectDir, appName, env);

  if (config.testBrowsers.length === 0) {
    exit('Please provide "testBrowsers" option in basys.json to run end-to-end tests');
  }

  // Set the global variable accessible in test files
  global.basys = {
    env,
    appName,
    config: codeConfig(config),
  };

  // BUG: look at https://github.com/DevExpress/testcafe/blob/master/src/cli/index.js
  // BUG: support remote browsers
  // BUG: look at https://devexpress.github.io/testcafe/documentation/using-testcafe/programming-interface/runner.html#screenshots
  const testcafe = await require('testcafe')(config.host);
  const runner = testcafe.createRunner();
  await runner.src(testPaths).browsers(config.testBrowsers);

  try {
    await runner.run(); // BUG: look at options https://devexpress.github.io/testcafe/documentation/using-testcafe/programming-interface/runner.html#run
  } finally {
    await testcafe.close();
  }

  return config;
}

module.exports = {build, dev, e2eTest, lint, start, unitTest};
