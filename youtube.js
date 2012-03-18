var debug = false;

/**
 * Spew mode
 **/
function log(message) {
    if (debug) {
        console.log(message);
    }
}

//Load youtbe API asynchronously.
var tag = document.createElement('script');
tag.src = "http://www.youtube.com/player_api";
var firstScriptTag = document.getElementsByTagName('script')[0];
firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
var youtube;


// Connect to Spotify API.
sp  = getSpotifyApi(1);
var models = sp.require('sp://import/scripts/api/models');
var player = models.player;

// Observe Spotify player change events
player.observe(models.EVENT.CHANGE, function (e) {
    log("Spotify Event");

    // Only update the page if the track changed
    if (e.data.curtrack == true) {
        findVideo();
    }
    
    // Ensure youtube & Spotify play status are the same
    if (player.playing) {
        playVideo();
    } else {
        stopVideo();
    }
});

/**
 * Get current youtube video id from local storage.
 **/
function getYTID() {
    log("Get current video");
    
    return localStorage.getItem("ytid");
}

/**
 * Set current youtube video id in local storage
 **/
function setYTID(ytid) {
    localStorage.setItem("ytid", ytid);
}

function findVideo() {
    log("Searching youtube");

    // This will be null if nothing is playing.
    var playerTrackInfo = player.track;

    if (playerTrackInfo == null) {

    } else {
        var track = playerTrackInfo.data;
        var url = "https://gdata.youtube.com/feeds/api/videos" + 
                "?q=" + encodeURIComponent(track.artists[0].name) + "+" + encodeURIComponent(track.name) + 
                "&orderby=relevance" + 
                "&start-index=1" + 
                "&max-results=1" +
                "&format=5" +
                "&strict=true" + 
                "&v=2";

        $.ajax({
            type: "GET",
            url: url,

            // change dataType to 'text' so that jquery doesn't try to parse xml as parsing fails for some reason
            dataType: "text",
            success: function(xml) {

                var ytid = ($(xml).find('entry').find("yt\\:videoid").text());
                setYTID(ytid);
                
                youtube.loadVideoById(ytid);
                playVideo();
            }
        });
    }
}

/**
 * Create youtube player
 **/
function onYouTubePlayerAPIReady() {
    log("Youtube API ready")
    youtube = new YT.Player('player', {
      height: window.innerHeight - 8,
      width: window.innerWidth - 8,
      videoId: getYTID(),
      playerVars: {
          border: 0,
          autoplay: 0,
          controls: 0
      },
      events: {
        'onReady': onPlayerReady,
        'onStateChange': onPlayerStateChange
      }
    });
}

/**
 * Fires when youtube player has loaded
 */
function onPlayerReady(event) {
    log("Player Ready");
    
    // Spotify does not allow any other audio
    setVideoVolume(0);
    findVideo();
}


/**
 *  What happens when the youtube player fires an event
 */
function onPlayerStateChange(event) {
    
    // If the player is playing
    if (event.data == YT.PlayerState.PLAYING) {
        log("Video playing");
        syncVideo();
    
    // Nothing much to do when it's buffering
    } else if (event.data == YT.PlayerState.BUFFERING) {
        log("Video buffering");
        
    // If the played has finished buffering
    } else if (event.data == YT.PlayerState.CUED) {
        log("Video cued");
    
    // Don't do anything if the video has ended - leave spotify playing
    } else if (event.data == YT.PlayerState.ENDED) {
        log("Video ended");
        
    // Stop spotify if the youtube player was paused
    } else if (event.data == YT.PlayerState.PAUSED) {
        log("Video paused");
        
        // Youtube appears to sometimes fire this event rather 
        // then the ENDED event, so check if we are actually finished
        if (Math.abs(youtube.getDuration() - youtube.getCurrentTime()) > 1 ) {
            stopSpotify();    
        }
             
    // Not started - set highest video quality
    } else if (event.data == -1) {
        log("Video unstarted");
        setHighQuality();

    // Shouldn't happen
    } else {
        log("Unknown Youtube state change")
    }
}

/**
 * Ensure we are using the highest quality video.
 */
function setHighQuality() {
    log("Setting highest video quality");
    // Get available video qualities, highest is first in the array
    var qualities = youtube.getAvailableQualityLevels();
    var top_quality = qualities.shift();
    
    // If not currently use the highest, use it.
    if (youtube.getPlaybackQuality != top_quality) {
        youtube.setPlaybackQuality(top_quality);
    }
}


/**
 *  Spotify doesn't allow external audio to be used in app
 *  This is just for handiness while debugging.
 **/
function setVideoVolume(i) {
    log("Setting video volume to " + i);
    youtube.setVolume(i);
}

/**
 *  Get the spotify play time and set the youtube position to the same
 *  Add a smidgen on top to allow for the process to complete.
 *  Not scientific.
 **/
function syncVideo() {
    log("Check video sync");

    // Only sync if over 2 second out otherwise we'll endlessly sync
    if ( Math.abs((player.position/1000) - youtube.getCurrentTime()) > 2) {
        log("Syncing video");
        youtube.seekTo((player.position/1000) + 3);
    }
}

/**
 *  Play video, but always check that we're in sync and that we should be playing
 **/
function playVideo() {
    log("Play video");

    // Ensure at the same time as spotify
    syncVideo();
    
    // Only allow video to play if spotify is
    // This doesn't stop user clicking on youtube video to re-commence playback
    if(player.playing) {
        youtube.playVideo();
    } else {
        youtube.stopVideo();
    }
}

function playSpotify() {
    log("Play spotify");
    player.playing = true;
}

function stopVideo() {
    log("Stop video");
    youtube.stopVideo();
}

function stopSpotify() {
    log("Stop Spotify");
    player.playing = false;
}
