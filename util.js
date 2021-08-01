module.exports = {
   findVideo(video, videos) {
        if (video != null && videos.length > 0) {
            for (let i = 0;i < videos.length;i++) {
                if (video.id == videos[i].id) {
                    return i;
                }
            }
        }
        return null;
   },
   videoExists(video, videos) {
       if (video != null && videos.length > 0) {
           return (videos.filter(vid => vid.id == video.id).length);
       }
       return false;
   }
}
