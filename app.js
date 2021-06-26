const port = process.env.PORT || 4000;
const { debug } = require('console');
const express = require('express');
const app = express();
const http = require('http');
const { emit } = require('process');
const server = http.createServer(app);
const io = require("socket.io")(server, {
  cors: {
    origin: '*',
    methods: ["GET", "POST"]
  }
});

let users = new Array();
let videos = new Array();

let playing = false;
let currentTime = 0;

io.on('connection', (socket) => {
    socket.on('disconnect', () => {
      users.forEach(user => {
        if (user.nickname === socket.data.nickname) {
          const index = users.indexOf(user);
          users.splice(index, 1);
          io.emit('users_updated', {users: users, videos: videos});
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

    socket.on('playing', status => {
      playing = status.playing;
      currentTime = status.current;
      io.emit('start_player', playing);
      io.emit('set_player_time', currentTime);
    });
});

server.listen(port, () => {
  console.log(`Video Sync Core listening on port:` + port);
});