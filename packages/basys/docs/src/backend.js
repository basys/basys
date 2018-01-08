// Available global variables:
// `app` - Express app instance
// `BASYS_CONFIG` - Basys project configuration object (evaluated using basys.json)

// Provide a custom function to render index.html and include request-specific data (avoid using request url).
setPageHandler((render, req, res) => {
  render({
    config: {value: 'from backend'},
  });
});

app.get('/api', (req, res) => {
  res.json({value: 'api'});
});
