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
let history = new Array();

let playing = false;
let currentTime = 0;
let currentVideo =  null;
let lastVideoChange = new Date();

const NEXT_THRESHOLD = process.env.NEXT_THRESHOLD || 1;

io.on('connection', (socket) => {
    socket.on('disconnect', () => {
      users.forEach(user => {
        if (user.nickname === socket.data.nickname) {
          const index = users.indexOf(user);
          users.splice(index, 1);
          io.emit('users_updated', {users: users, videos: videos, video: currentVideo});
        } 
      });
    });

    socket.on('notify', payload => {
      io.emit('notify', payload);
    });

    socket.on('add_reaction', reaction => {
      io.emit('show_reaction', reaction);
    });

    socket.on('user_login', nickname => {
      if (!users.filter(user => user.nickname === nickname).length) {
        console.log(nickname + ' Connected!');
        users.push({
          nickname: nickname
        });
        socket.data = {nickname: nickname};
        updateState(io, 'joined');
      }  
    })

    socket.on('add_video', video => {
      if (currentVideo) {
        videos.push(video);
        io.emit('videos_updated', videos);
      } else {
        io.emit('set_video', video);

        setTimeout(() => {
          io.emit('start_player', true);
        },1000);

        currentVideo = video;
      }

      updateState(io, 'add');
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

    socket.on('next_video', () => {
      const curDate = new Date();

      if (Math.abs((lastVideoChange.getTime() - curDate.getTime()) / 1000) > NEXT_THRESHOLD) 
      { 
        if(videos.length > 0) {
          currentVideo = JSON.parse(JSON.stringify(videos[0]));
          history.push(currentVideo);
          videos.shift();
          io.emit('set_video', currentVideo);
        } else {
          io.emit('set_video', null);
        }

        io.emit('videos_updated', videos);
        io.emit('history_updated', history);
      }

      
      lastVideoChange = new Date();
    });

    socket.on('update_nickname', payload => {
      for (let i = 0;i < users.length;i++) {
        if (users[i].nickname === payload.old) {
          users[i].nickname = payload.new;
          socket.data.nickname = payload.new
          io.emit('users_updated', {users:users, videos: videos});
        } 
      }
    });

    socket.on('change_player_time', value => {
      io.emit('changing_player_time', value);
    });
});

server.listen(port, () => {
  console.log(`Video Sync Core listening on port:` + port);
});

function updateState(io, action) {
  io.emit('state_updated', {
    users: users,
    videos: videos,
    video: currentVideo,
    history: history,
    action: action
  });
}