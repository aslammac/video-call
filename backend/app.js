const { Server } = require('socket.io');
const express = require('express');
const cors = require('cors');
const http = require('http');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: true,
    maxHttpBufferSize: 1e8
});

app.use(cors());
 
app.get("/", (req, res) => {
    res.send("Hello World");
});

const emailToSocket = new Map();
const socketToEmail = new Map();

io.on("connection", (socket) => {
    console.log(`Socket Connected: ${socket.id}`);

    socket.on("room:join", data => {
        const { email, room } = data;
        emailToSocket.set(email, socket.id);
        socketToEmail.set(socket.id, email);

        socket.join(room);
        io.to(room).emit("user:joined", { email, id: socket.id });
        const users = io.sockets.adapter.rooms.get(room);
        const userData = users ? Array.from(users).map(id => ({ id, email: socketToEmail.get(id) })) : [];
        io.to(room).emit('user-list', userData);
        // emits a 'room:joined' event back to the client 
        // that just joined the room.
        // io.to(socket.id).emit("room:join", data);
    });
    socket.on('room:chat', (data) => {
        const { room, message } = data;
        console.log(data);
        io.to(room).emit('room:chat', { message, from: socket.id , email: socketToEmail.get(socket.id)});
    });

    // Listen for image messages from the client
  socket.on('room:chat-image', ({
    room,
    email,
    image
  }) => {
    // console.log('Received image data: ', image);
    
    // // Optionally, process the image data (save, resize, etc.)
    // // For example, save it as a file or broadcast it to other clients
    // // You could use fs to save it, for example:
    // const fs = require('fs');
    // const imageBuffer = Buffer.from(image.split(',')[1], 'base64');
    
    // fs.writeFile('received_image.png', imageBuffer, (err) => {
    //   if (err) {
    //     console.log('Error saving image:', err);
    //   } else {
    //     console.log('Image saved successfully');
    //   }
    // });

    // Broadcast the image to all other connected clients (optional)
    // socket.broadcast.emit('receive-image', imageData);
    io.to(room).emit('room:chat-image', { image, email: socketToEmail.get(socket.id) });
  });

  socket.on("typing", ({ room, isTyping,email }) => {
    socket.to(room).emit("typing", { email, isTyping });
  });

    socket.on('room:leave', ({
        room,
        email
    }) => {
        socket.leave(room);
        io.to(room).emit('user:leave', {email:email, id: socket.id });
        emailToSocket.delete(socketToEmail.get(socket.id));
        socketToEmail.delete(socket.id);
    }
    );

    socket.on('request-user-list', (room) => {
        const users = io.sockets.adapter.rooms.get(room);
        const data = users ? Array.from(users).map(id => ({ id, email: socketToEmail.get(id) })) : [];
        io.to(room).emit('user-list', data);
    }
    );


     // Listen for a video offer (for initiating a call)
     socket.on('video-offer', ({offer, to}) => {
        console.log('video-offer', to);
        io.to(to).emit('video-offer', {
            offer,
            to: socket.id
        });
    });

    // Listen for an answer to a video offer
    socket.on('video-answer', ({answer, to}) => {
        console.log('video-answer', to);
        console.log(answer);
        io.to(to).emit('video-answer', {
            answer,
            to: to
        });
    });

    // Handle ICE candidates
    socket.on('new-ice-candidate', ({candidate, to}) => {
        console.log('new-ice-candidate', to);
        console.log(candidate);
        io.to(to).emit('new-ice-candidate', candidate);
    });

    // Handle disconnection
    socket.on('disconnect', () => {
        console.log('A user disconnected');
    });
    socket.on('call-ended', ({ room, email }) => {
        console.log(`${email} ended the call in room ${room}`);

        // Broadcast to other users in the room that the call has ended
        socket.to(room).emit('call-ended', { email });

      
    });
})

server.listen(process.env.PORT || 3001, () => console.log(`Server has started.`));