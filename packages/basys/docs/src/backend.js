// Provide a custom function to render index.html and include request-specific data (avoid using request url).
basys.setPageHandler((render, req, res) => {
  render({
    config: {value: 'from backend'},
  });
});

basys.app.get('/api', (req, res) => {
  res.json({value: 'api'});
});
