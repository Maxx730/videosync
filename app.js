const port = 4000;
const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const io = require("socket.io")(server, {
  transports: ['websocket']
});
const AUTOSTART_TIME = 1000;
const util = require('./util.js');

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

io.on('connection', (socket) => {
    console.log('--- Connection Established ----');
    socket.on('disconnect', () => {
      users.forEach(user => {
        if (user.nickname === socket.data.nickname) {
          const index = users.indexOf(user);
          const name = users[index].nickname;
          users.splice(index, 1);
          console.log(`--- ${name} Disconnected ---`);
          updateState(io, socket, 'disconnect');
        } 
      });
      io.remove
    });

    socket.on('user_joined', async nickname => {
      await joinRoom(nickname, users).then(user => {
        console.log(`--- ${user} Connected ---`);
        socket.data = {nickname: nickname}
        updateState(io, socket, 'joined');
      }).catch(err => {
          console.log(err);
      });
    });

    socket.on('add_video',async video => {
        await addVideo(video, currentVideo, videos).then(action => {
            updateState(io, socket, action);
        }).catch(err => {
            console.log(err);
        });
    });
    
    socket.on('move_video', payload => {
        const vId = util.findVideo(payload.video, videos);
        if (vId != null) {
            console.log(vId);
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

    socket.on('next_video',async payload => {
        await skipVideo().then(action => {
            updateState(io, socket, action, {user: payload.user});
        }).catch(err => {
            console.log(err);
        });
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
      updateState(io, socket, 'sync');
    });
    
    socket.on('change_player_time', time => {
        currentTime = time;
        updateState(io, socket, 'change_player_time');
    });

    socket.on('move_up', video => {

    });

    socket.on('move_down', video => {

    });
});

//Return a simple message saying the server is up and running
app.get('/', (req, res) => {
    console.log('<<< Serving Status Page >>>')
    res.send('Server Status: Listening');
});

server.listen(port, () => {
  console.log(`Video Sync Core listening on port:` + port);
});

function updateState(io, socket, action, extra) {
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
    currentTime: currentTime,
    extra: extra != null ? extra : {},
    lastUpdate: "Last Sync: " + date.getDate() + "/"
    + (date.getMonth()+1)  + "/" 
    + date.getFullYear() + " @ "  
    + date.getHours() + ":"  
    + date.getMinutes() + ":" 
    + (date.getSeconds() > 9 ? date.getSeconds() : '0' + date.getSeconds())
  });
}

async function joinRoom(nickname, users) {
    return new Promise((resolve, reject) => {
      if (!users.filter(user => user.nickname === nickname).length) {
        users.push({
          nickname: nickname
        });
        resolve(nickname);
      } else {
          reject('Username already exists in room.');
      }
    });
}

async function addVideo(video) {
    return new Promise((resolve, reject) => {
        const exists = util.videoExists(video, videos);
        if (video != null && !exists) {
            if (currentVideo) {
                videos.push(video);
                resolve('add_video');
            } else {
                currentVideo = video;
                resolve('start_video');
            }
        } else {
            if (exists) {
                resolve('video_exists');
            }
        }
    });
}

async function skipVideo() {
    return new Promise((resolve, reject) => {
        if (videos != null) {
            if(videos.length > 0) {
              currentVideo = JSON.parse(JSON.stringify(videos[0]));
              history.push(currentVideo);
              videos.shift();
              io.emit('set_video', currentVideo);
            } else {
              currentVideo = null;
            }
            
            resolve('skip_video');
        } else {
            reject('Video to be skipped is null.');
        }
    });
}

async function moveVideo(video, direction) {
    
}
