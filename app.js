const port = process.env.PORT || 4000;
const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const io = require("socket.io")(server, {
  cors: {
    origin: process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : 'https://videosync-client.herokuapp.com/',
    methods: ["GET", "POST"]
  }
});

const users = new Array();
const videos = new Array();

io.on('connection', (socket) => {
    if (!users.filter(user => user.id === socket.id).length) {
      users.push({
        id: socket.id,
        nickname: 'Client-' + socket.id
      });
    }  

    socket.on('disconnect', socket => {
      users.forEach(user => {
        if (user.id === socket.id) {
          console.log('removing disconnected player');
        } 
      });
    });
});

server.listen(port, () => {
  console.log(`Video Sync Core listening on port:` + port);
});