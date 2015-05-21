jQuery.ajaxSettings.traditional = true;
var config = getConfig();
function fetchArtistPlaylist(artist,  wandering, variety) {
    var url = config.echoNestHost + 'api/v4/playlist/static';
    $("#all_results").empty();
    info("Creating the playlist ...");
    $.getJSON(url, { 'artist': artist,
            'api_key': config.apiKey,
                    'bucket': [ 'id:' + config.spotifySpace, 'tracks'], 'limit' : true, 'results': 50, 'variety' : 1, 'type':'artist-radio',  })
        .done(function(data) {
            info("");
            if (! ('songs' in data.response)) {
                info("Can't find that artist");
            } else {
                console.log(data.response.songs);
                var title = "Artist radio for " + artist;
                getSpotifyPlayer(data.response.songs, function(player) {
                    console.log('got the player');
                    $("#all_results").append(player);
                });
            }
        })
        .error( function() {
            info("Whoops, had some trouble getting that playlist");
        }) ;
}
function newArtist() {
    var artist = $("#artist").val();
    fetchArtistPlaylist(artist, false, .2);
}
function info(txt) {
    $("#info").text(txt);
}
function initUI() {
    $("#artist").on('keydown', function(evt) {
        if (evt.keyCode == 13) {
            newArtist();
        }
    });
    $("#go").on("click", function() {
        newArtist();
    });
}
$(document).ready(function() {
    initUI();
    newArtist();
});
function getConfig() {
    return {
        apiKey: "ECLJI0GPBJVEXSZDT",
        spotifySpace: "spotify",
        echoNestHost: "http://developer.echonest.com/"
    };
}

/* Tools for making working with the Spotify and Echo Nest APIs easier */
function getSpotifyPlayButtonForPlaylist(title, playlist) {
    var embed = '<iframe src="https://embed.spotify.com/?uri=spotify:trackset:PREFEREDTITLE:TRACKS" style="width:640px; height:520px;" frameborder="0" allowtransparency="true"></iframe>';
    var tids = [];
    playlist.forEach(function(song) {
        var tid = fidToSpid(song.tracks[0].foreign_id);
        tids.push(tid);
    });
    var tracks = tids.join(',');
    var tembed = embed.replace('TRACKS', tracks);
    tembed = tembed.replace('PREFEREDTITLE', title);
    var li = $("<span>").html(tembed);
    return $("<span>").html(tembed);
}

/* converts full URI to just the simple spotify id */

function fidToSpid(fid) {
    var fields = fid.split(':');
    return fields[fields.length - 1];
}

function getSpotifyPlayer(inPlaylist, callback) {
    var curSong = 0;
    var audio = null;
    var player = createPlayer();
    var playlist = null;
    var enriched = [];
    var deprived = [];
    var finalPlayList = [];
    function addSpotifyInfoToPlaylist() {
        var tids = [];
        inPlaylist.forEach(function(song) {
            var tid = fidToSpid(song.tracks[0].foreign_id);
            tids.push(tid);
        });

        $.getJSON("https://api.spotify.com/v1/tracks/", { 'ids': tids.join(',')})
            .done(function(data) {
                console.log('sptracks', tids, data);
                var bandName = inPlaylist[0].artist_name;
                data.tracks.forEach(function(track,i) {
                    if (inPlaylist[i].artist_name == bandName) {
                        enriched.push(inPlaylist[i]);
                    } else { deprived.push(inPlaylist[i]);}

                });
                data.tracks.forEach(function(track, i) {
                    inPlaylist[i].spotifyTrackInfo = track;
                });


                for (i=0;i<enriched.length;i++){
                    finalPlayList.push(enriched[i]);
                    for (j=0; j<3; j++){
                        finalPlayList.push(deprived[i*3+j]);
                    }
                }
                console.log('Final Playlist', finalPlayList);
                playlist = filterSongs(finalPlayList);//inPlaylist);
                showCurSong(false);
                callback(player);
            })
            .error( function() {
                info("Whoops, had some trouble getting that playlist");
            }) ;
    }

    function filterSongs(songs) {
        var out = [];

        function isGoodSong(song) {
            return song.spotifyTrackInfo.preview_url != null;
        }

        songs.forEach(function(song) {
            if (isGoodSong(song)) {
                out.push(song);
            }
        });

        return out;
    }

    function showSong(song, autoplay) {
        var yt_url = 'https://www.googleapis.com/youtube/v3/search?part=id&q=' + song.artist_name + ' ' + song.title + ' official music video&key=AIzaSyDYhXuJLy-9JbQrnGL3Wm8IeqB7_2a3rUM&alt=json';
        //$(player).find(".sp-album-art").attr('src', getBestImage(song.spotifyTrackInfo.album.images, 300).url);
        $(player).find(".sp-title").text(song.title);
        $(player).find(".sp-artist").text(song.artist_name);
        audio.attr('src', song.spotifyTrackInfo.preview_url);
         $.ajax({
                type: "GET",
                url: yt_url,
                dataType: "json",
                success: function(response) {
                    //alert("Success! " + response.items[2].id.videoId);
                    if (response.items) {
                        var counter = 0;
                        $.each(response.items, function(i, data) {
                            if (data.id.kind=="youtube#video"){
                                var video_id = data.id.videoId;
                                //alert(video_id);
                                var video_frame = "<iframe width='640' height='480' src='http://www.youtube.com/embed/" + video_id + "?autoplay=1' frameborder='0' allowfullscreen></iframe>";
                                var final = "<div id='result'><div>" + video_frame;
                                if(counter==0 && document.getElementById("result") != null){
                                    document.getElementById("result").remove();
                                }
                                if (counter == 0) {
                                    $(".sp-artist").append(final);
                                    counter = counter + 1;
                                }
                                return;
                            };

                        });
                    }
                    else {
                        $("#video").html("<div id='no'>No Video</div>");
                    }
                }
            });

        //$(".sp-album-art").append(final);
        if (autoplay) {
            //audio.get(0).play();
        }
    }


    function getBestImage(images, maxWidth) {
        var best = images[0];
        images.reverse().forEach(
            function(image) {
                if (image.width <= maxWidth) {
                    best = image;
                }
            }
        );
        return best;
    }

    function showCurSong(autoplay) {
        showSong(playlist[curSong], autoplay);
    }

    function nextSong() {
        if (curSong < playlist.length - 1) {
            curSong++;
            showCurSong(true);
        } else {
        }
    }

    function prevSong() {
        if (curSong > 0) {
            curSong--;
            showCurSong(true);
        }
    }

    function togglePausePlay() {
        console.log('tpp', audio.get(0).paused);
        if (audio.get(0).paused) {
            audio.get(0).play();
        } else {
            audio.get(0).pause();
        }
    }

    function createPlayer() {
        var main = $("<div class='sp-player'>");
        var img = $("<img class='sp-album-art'>");
        var info  = $("<div class='sp-info'>");
        var title = $("<div class='sp-title'>");
        var artist = $("<div class='sp-artist'>");
        var controls = $("<div class='btn-group sp-controls row'>");

        var next = $('<button class="btn sm ghost" type="button">Next<span class="forward"></span></button>');
        var prev = $('<button class="btn sm ghost" type="button">Prev<span class="backward"></span></button>');
        var pausePlay = $('<button class="btn sm ghost" type="button"><span class="play"></span></button>');


        audio = $("<audio>");
        audio.on('pause', function() {
            var pp = pausePlay.find("span");
            pp.removeClass('glyphicon-pause');
            pp.addClass('glyphicon-play');
        });

        audio.on('play', function() {
            var pp = pausePlay.find("span");
            pp.addClass('glyphicon-pause');
            pp.removeClass('glyphicon-play');
        });

        audio.on('ended', function() {
            console.log('ended');
            nextSong();
        });

        next.on('click', function() {
            nextSong();
        });

        pausePlay.on('click', function() {
            togglePausePlay();
        });

        prev.on('click', function() {
            prevSong();
        });


        info.append(title);
        info.append(artist);

        controls.append(prev);
        //controls.append(pausePlay);
        controls.append(next);

        main.append(img);
        main.append(info);
        main.append(controls);

        main.bind('destroyed', function() {
            console.log('player destroyed');
        });
        return main;
    }

    addSpotifyInfoToPlaylist();
    return player;
}

// set up a handler so if an element is destroyed,
// the 'destroyed' handler is invoked.
// See // http://stackoverflow.com/questions/2200494/jquery-trigger-event-when-an-element-is-removed-from-the-dom

(function($){
  $.event.special.destroyed = {
    remove: function(o) {
      if (o.handler) {
        o.handler()
      }
    }
  }
})(jQuery);
