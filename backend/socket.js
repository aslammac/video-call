let io;
let clients = {};

module.exports = {
  init: (httpServer) => {
    io = require("socket.io")(httpServer);
    return io;
  },
  getIO: () => {
    if (!io) {
      throw new Error("Socket.io not initialized");
    }
    return io;
  },
  setClient: (clientId, socket) => {
    clients[clientId] = socket;
  },
  getClient: (clientId) => {
    if (!clients[clientId]) {
      throw new Error("Socket.io client not registered");
    }
    return clients[clientId];
  },
};
