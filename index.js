var PlayMusic = require('playmusic');

var https = require('https');
var http = require('http');
var fs = require('fs');
var child_process = require('child_process');
var readline = require('readline');

var tracks = [];
var albums = [];

var pm = new PlayMusic();

var number_tracks;

var rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});


console.info('Sign in Google Accounts:');
rl.question("\033[1;33mLogin: \033[m", function(login) {
    rl.question("\033[1;33mPassword: \033[m", function(password) {
        pm.init({email: login, password: password}, function(err) {
            if(!err){
                getAllTracks();
            }else{
                console.error('\033[1;31mLogin ERROR!\033[m');
            }
        });
        rl.close();
    });
});

var getAllTracks = function(){
    pm.getAllTracks(function(err, library) {
        if(!err){
            tracks = library.data.items;
            number_tracks = tracks.length;
            try {
                fs.mkdirSync('music');
            } catch(e) {}
            loadTrack();
        }else{
            console.error('getAllTracks ERROR!');
        }
    });
};

var loadTrack = function(){
    var track = tracks.shift();
    pm.getStreamUrl(track.id, function(err, streamUrl) {
        if(streamUrl){
            var reg = /([^a-z0-9А-Яа-я' -]+)/gi
            var albumName = (track.albumArtist + ' - ' + track.album).replace(reg, '');
            var fileName = ((track.trackNumber ? ('0'+track.trackNumber).slice(-2) + ' - ' : '') + track.title).replace(reg, '');

            try {
                fs.mkdirSync('music/' + albumName);
            } catch(e) {
                if ( e.code != 'EEXIST' ) throw e;
            }

            if(!~albums.indexOf(albumName)){
                albums.push(albumName);
                if(track.albumArtRef){
                    var cover = fs.createWriteStream('music/' + albumName + '/' + 'cover.jpg');
                    var coverRequest = http.get(track.albumArtRef[0].url, function(res) {
                        res.pipe(cover);
                        res.on('end', function() {

                        });
                    });
                }
            }

            var file = fs.createWriteStream('music/' + albumName + '/' + fileName + '.mp3');
            var fileRequest = https.get(streamUrl, function(res) {
                res.pipe(file);
                res.on('end', function() {
                    var made_tracks = number_tracks-tracks.length;
                    process.stdout.write(made_tracks + '/' + (number_tracks) + ' ' + Math.round(made_tracks/number_tracks*100) + "%\r");
                    if(tracks.length){
                        id3(albumName, fileName, track);
                    }else{
                        console.log('completed');
                    }
                });
            });
        }
    });
};

function id3(albumName, fileName, track){

    var command = 'bin\\metamp3.exe'+
        ' --artist "' + track.artist + '"' +
        ' --album "'  + track.album + '"' +
        ' --track "'  + track.trackNumber + '"' +
        ' --title "'  + track.title + '"' +
        ' --year "'   + track.year + '"' +
        ' --genre "'  + track.genre + '"' +
        ' --genre "'  + track.genre + '"' +
        ' --pict "music\\' + albumName + '\\cover.jpg"' +
        ' "music\\' + albumName + '\\' + fileName + '.mp3"';

    child_process.exec(command, function(err, stdout, stderr) {
        if(tracks.length)loadTrack()
    });
}
