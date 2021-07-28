const port = 4000;
const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const io = require("socket.io")(server, {
  transports: ['websocket']
});
const AUTOSTART_TIME = 1000;

let users = new Array();
let videos = new Array();
let history = new Array();

let playing = false;
let currentTime = 0;
let currentVideo =  null;
let lastVideoChange = new Date();
let banner = 'Now With Chiken';
let status = 'idle';
let syncInterval = null;

const NEXT_THRESHOLD = process.env.NEXT_THRESHOLD || 1;

io.once('connection', (socket) => {
    console.log('--- Connection Established ----');
    socket.on('disconnect', () => {
      console.log('--- Socket Disconnection ---');
      users.forEach(user => {
        if (user.nickname === socket.data.nickname) {
          const index = users.indexOf(user);
          users.splice(index, 1);
          updateState(io, socket, 'disconnect');
        } 
      });
      socket.removeAllListeners();
    });

    socket.on('user_joined', nickname => {
      if (!users.filter(user => user.nickname === nickname).length) {
        console.log(nickname + ' Connected!');
        users.push({
          nickname: nickname
        });
        socket.data = {nickname: nickname};
        updateState(io, socket, 'joined');
      }  
    });

    socket.on('add_video', video => {
      if (currentVideo) {
        videos.push(video);
        updateState(io, socket, 'add_video');
      } else {
        currentVideo = video;
        updateState(io, socket, 'start_video');
      }
    });

    socket.on('remove_video', removed => {
      videos = videos.filter(video => video.id !== removed.id)
      //Remove the video from the playlist and then update state
    });

    socket.on('play_pause', payload => {
      playing = payload.playing;
      status = payload.playing ? 'Playing' : 'Paused';
      updateState(io, socket, 'play_pause');
    });

    socket.on('next_video', payload => {
      const curDate = new Date();

      if (Math.abs((lastVideoChange.getTime() - curDate.getTime()) / 1000) > NEXT_THRESHOLD * users.length) 
      { 
        if(videos.length > 0) {
          currentVideo = JSON.parse(JSON.stringify(videos[0]));
          history.push(currentVideo);
          videos.shift();
          io.emit('set_video', currentVideo);
        } else {
          currentVideo = null;
        }

        updateState(io, socket, 'skip');
      }
      
      lastVideoChange = new Date();
    });

    socket.on('update_nickname', payload => {
      for (let i = 0;i < users.length;i++) {
        if (users[i].nickname === payload.old) {
          users[i].nickname = payload.new;
          socket.data.nickname = payload.new
          updateState(io, socket, 'name_update');
        } 
      }
    });

    socket.on('sync', user => {
      console.log('--- App Syncing ---');
      updateState(io, socket, 'sync')
    });

    socket.on('move_up', video => {

    });

    socket.on('move_down', video => {

    });
});

server.listen(port, () => {
  console.log(`Video Sync Core listening on port:` + port);
});

function updateState(io, socket, action) {
  const date = new Date();
  io.emit('state_updated', {
    playing: playing,
    users: users,
    user: socket.data ? socket.data.nickname : '',
    videos: videos,
    video: currentVideo,
    history: history,
    action: action,
    banner: banner,
    status: status,
    lastUpdate: "Last Sync: " + date.getDate() + "/"
    + (date.getMonth()+1)  + "/" 
    + date.getFullYear() + " @ "  
    + date.getHours() + ":"  
    + date.getMinutes() + ":" 
    + (date.getSeconds() > 9 ? date.getSeconds() : '0' + date.getSeconds())
  });
}