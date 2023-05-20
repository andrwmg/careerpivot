const socketIO = require('socket.io');

let io;

function initialize(server) {
  io = socketIO(server, {
      cors: {
          origin: 'http://localhost:7071'
      }
  });

  // Socket.IO configuration and event handling

  return io;
}

function getIO() {
  if (!io) {
    throw new Error('Socket.IO has not been initialized');
  }
  return io;
}

module.exports = { initialize, getIO };