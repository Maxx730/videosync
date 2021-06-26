const port = process.env.PORT || 4000;
const { debug } = require('console');
const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const io = require("socket.io")(server, {
  cors: {
    origin: '*',
    methods: ["GET", "POST"]
  }
});

let users = new Array();
let videos = new Array();

io.on('connection', (socket) => {
    socket.on('disconnect', () => {
      users.forEach(user => {
        if (user.nickname === socket.data.nickname) {
          const index = users.indexOf(user);
          users.splice(index, 1);
          io.emit('users_updated', users);
        } 
      });
    });

    socket.on('user_login', nickname => {
      if (!users.filter(user => user.nickname === nickname).length) {
        console.log(nickname + ' Connected!');
        users.push({
          nickname: nickname
        });
        socket.data = {nickname: nickname};
        io.emit('users_updated', {users:users, videos:videos});
      }  
    })

    socket.on('add_video', video => {
      videos.push(video);
      io.emit('videos_updated', videos);
    });

    socket.on('remove_video', removed => {
      videos = videos.filter(video => video.id !== removed.id)
      io.emit('videos_updated', videos);
    });
});

server.listen(port, () => {
  console.log(`Video Sync Core listening on port:` + port);
});