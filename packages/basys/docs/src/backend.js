// Available global variables:
// `app` - Express app instance
// `BASYS_CONFIG` - Basys project configuration object (evaluated using basys.json)

// Inject a global `config` variable with the value returned by the function into each page
setPageGlobalVar('config', req => {
  return {
    value: 'from backend',
  };
});

app.get('/api', (req, res) => {
  res.json({value: 'api'});
});
