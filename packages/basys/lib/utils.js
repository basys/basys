const chalk = require('chalk');
const net = require('net');

// Calls `onChange(connected)` callback when connection is established or closed.
// If `once` is true then monitoring is stopped after the first connection.
function monitorServerStatus(host, port, once, onChange) {
  const socket = net.connect({host, port});
  let connected = true;
  let reconnect = true;
  socket.on('connect', () => {
    connected = true;
    onChange(true);
    if (once) {
      reconnect = false;
      socket.destroy();
    }
  });
  socket.on('error', () => {});
  socket.on('close', err => {
    if (reconnect) {
      if (connected) {
        connected = false;
        onChange(false);
      }
      setTimeout(() => socket.connect({host, port}), 500);
    }
  });
  return socket;
}

function exit(error) {
  console.log(chalk.bold.red(error));
  process.exit(1);
}

module.exports = {exit, monitorServerStatus};
