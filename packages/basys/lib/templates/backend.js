import bodyParser from 'body-parser';
import express from 'express';
import fs from 'fs';
import http from 'http';
import morgan from 'morgan';
import nunjucks from 'nunjucks';
import path from 'path';

let config = {{ conf|dump(2) }};
{% if conf.env !== 'dev' %}
  // To customize deployment configuration put 'config.json' next to the bundled backend.js
  // or set BASYS_CONFIG_PATH environment variable to the path to the config file
  const configPath = process.env.BASYS_CONFIG_PATH || path.join(__dirname, 'config.json');
  if (fs.existsSync(configPath)) {
    // BUG: a hack to prevent a smartass webpack from bundling config.json
    // BUG: parse file as a json, don't use require()?
    Object.assign(config, eval('require')(configPath));
  }
{% endif %}
global.BASYS_CONFIG = config;

const pagePaths = {{ pagePaths }};

const app = express();

// BUG: think about it. should be false when deployed to production (not during `npm run dev/start`). take it as an argument?
const testRun = true;
if (testRun) {
  app.use(morgan('dev'));
} else {
  // BUG: Configure production logging (may need some optional configuration).
  //      Consider using https://github.com/winstonjs/winston .
  //      See http://www.jyotman.xyz/post/logging-in-node.js-done-right .
}

if (testRun) {
  // BUG: don't use express to serve these files in production, in dev mode assets are managed by webpack-dev-server
  app.use('/static', express.static(path.join(__dirname, 'static')), (req, res) => {
    res.status(404).end();
  });
}

// BUG: only include this code if pagePaths.length>0
let pageHandler = (render, req, res) => render({});

global.setPageHandler = func => {
  pageHandler = func;
};

const nunjucksEnv = new nunjucks.Environment(new nunjucks.FileSystemLoader(), {autoescape: false});
nunjucksEnv.addFilter('escapeJS', js => {
  // See https://stackoverflow.com/a/8749240
  return js.replace(/</g, '\\u003c').replace(/>/g, '\\u003e');
});

const pageTemplate = nunjucks.compile(
  fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8'),
  nunjucksEnv,
  path.join(__dirname, 'index.html')
);

const pageRoute = (req, res) => {
  pageHandler(ctx => res.send(pageTemplate.render(ctx)), req, res);
};
for (const pagePath of pagePaths) {
  app.get(pagePath, pageRoute);
}

// BUG: use helmet
// BUG: validate the host on requests for security reasons (like in django)

const port = {% if conf.env === 'dev' %}config.backendPort{% else %}config.port{% endif %};

// BUG: somehow express ignores this setting. allow to customize it?
// app.set('views', [path.join(config._projectDir, 'views')]);
app.set('view engine', 'pug'); // BUG: think about it
app.set('port', port);

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true})); // BUG: configure it, see https://github.com/expressjs/body-parser

// BUG: temporary hack, make `app` and `server` available only in the backend entry module
global.app = app;
global.server = http.createServer(app);

{% if entry %}
  require('{{ entry }}');
{% endif %}

{% if conf.env !== 'dev' %}
  app.use((err, req, res, next) => {
    console.error(err.stack);
    // BUG: show custom 500 page (optional). allow to customize. only add if not added inside the app?
    res.sendStatus(err.status || 500);
  });
{% endif %}

// BUG: show custom 404 page
app.use((req, res) => {
  res.status(404).end();
});

server.listen({host: config.host, port}, err => {
  if (err) {
    // BUG: print the error and exit the process?
    console.log(err);
  } else {
    // BUG: gets inside webpack temporary console messages
    // console.log(`Server listening on ${config.host}:${port}`);
  }
});

// BUG: do it for other codes as well?
process.on('SIGINT', () => server.close());
