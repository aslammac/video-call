const { Server } = require('socket.io');
const express = require('express');
const cors = require('cors');
const http = require('http');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: true
});

app.use(cors());

const emailToSocket = new Map();
const socketToEmail = new Map();

io.on('connection', (socket) => {
  console.log(`Socket ${socket.id} connected`);

  socket.on('room:join', data => {
    const { email, room } = data;
    emailToSocket.set(email, socket.id);
    socketToEmail.set(socket.id, email);
    socket.join(room);
    io.to(room).emit('room:joined', { email, id: socket.id });
    const users = io.sockets.adapter.rooms.get(room);
    const userData = users ? Array.from(users).map(id => ({ email: socketToEmail.get(id), id })) : [];
    io.to(room).emit('room:users', userData);
  })

  socket.on('room:chat', data => {
    const { room, message } = data;
    io.to(room).emit('room:chat', {
      email: socketToEmail.get(socket.id),
      message,
      from: socket.id
    });
  });

  socket.on('room:leave', ({
    room, email
  }) => {
    socket.leave(room);
    emailToSocket.delete(email);
    socketToEmail.delete(socket.id);
    io.to(room).emit('room:leave', { email, id: socket.id });
  }
  );

  socket.on('request-user-list', (room) => {
    const users = io.sockets.adapter.rooms.get(room);
    const userData = users ? Array.from(users).map(id => ({ email: socketToEmail.get(id), id })) : [];
    io.to(room).emit('room:users', userData);
  });

  socket.on('video-offer', ({
    offer,
    to
  }) => {
    io.to(to).emit('video-offer', {
      offer,
      from: socket.id
    });
  });

  socket.on('video-answer', ({
    answer,
    to
  }) => {
    io.to(to).emit('video-answer', {
      answer,
      to: to
    });
  });

  socket.on('new-ice-candidate', ({
    candidate,
    to
  }) => {
    io.to(to).emit('new-ice-candidate', {
      candidate,
      from: socket.id
    });
  }
  );

  socket.on('disconnect', () => {
    console.log(`Socket ${socket.id} disconnected`);
    const email = socketToEmail.get(socket.id);
    emailToSocket.delete(email);
    socketToEmail.delete(socket.id);
  }
  );

  socket.on('call-ended', (data) => {
    io.to(data.room).emit('call-ended', data);
  });

});

server.listen(process.env.PORT || 3001, () => {
  console.log(`Server running on port ${process.env.PORT}`);
}
);

