
/**
 * Module dependencies.
 */

var btoa = require('btoa');


function base64encode(u8) {
  return btoa(String.fromCharCode.apply(null, u8));
}

function base64decode(b64encoded) {
  var u8_2 = new Uint8Array(atob(b64encoded).split("").map(function(c) {
    return c.charCodeAt(0); }));
  return u8_2;
}


// LZW-compress a string
function lzw_encode(s) {
    var dict = {};
    var data = (s + "").split("");
    var out = [];
    var currChar;
    var phrase = data[0];
    var code = 256;
    for (var i=1; i<data.length; i++) {
        currChar=data[i];
        if (dict[phrase + currChar] != null) {
            phrase += currChar;
        }
        else {
            out.push(phrase.length > 1 ? dict[phrase] : phrase.charCodeAt(0));
            dict[phrase + currChar] = code;
            code++;
            phrase=currChar;
        }
    }
    out.push(phrase.length > 1 ? dict[phrase] : phrase.charCodeAt(0));
    for (var i=0; i<out.length; i++) {
        out[i] = String.fromCharCode(out[i]);
    }
    return out.join("");
}
 
// Decompress an LZW-encoded string
function lzw_decode(s) {
    var dict = {};
    var data = (s + "").split("");
    var currChar = data[0];
    var oldPhrase = currChar;
    var out = [currChar];
    var code = 256;
    var phrase;
    for (var i=1; i<data.length; i++) {
        var currCode = data[i].charCodeAt(0);
        if (currCode < 256) {
            phrase = data[i];
        }
        else {
           phrase = dict[currCode] ? dict[currCode] : (oldPhrase + currChar);
        }
        out.push(phrase);
        currChar = phrase.charAt(0);
        dict[code] = oldPhrase + currChar;
        code++;
        oldPhrase = phrase;
    }
    return out.join("");
}


var express = require('express')
  , routes = require('./routes')
  //, user = require('./routes/user')
  //, testCtrl = require('./routes/test')
  , http = require('http')
  , https = require('https')

  , path = require('path');

var app = express();
var url = require('url');
var _ = require('lodash');

var BISON = require('./public/js/lib/bison');


app.configure(function(){
  app.set('port', process.env.PORT || 3001);
  app.set('views', __dirname + '/views');
  app.set('view engine', 'ejs');
  app.use(express.favicon());
  app.use(express.compress());
  app.use(express.logger('dev'));
  //app.use(express.static(__dirname+"/public", {maxAge: 60*60*24}));
  //app.use(express.bodyParser());
  //app.use(express.methodOverride());
  app.use(express.cookieParser('your secret here'));
  app.use(express.session());
  app.use(app.router);
  app.use(require('less-middleware')({ src: __dirname + '/public' }));

  /*app.use(expressUglify.middleware({ 
    src: __dirname + '/public',
    logLevel: 'info'
    //logger: new (winston.Logger)() // Specify your own winston logger or category
  }));*/

  app.use(express.static(path.join(__dirname, 'public')));

  

});

var server = http.createServer(app);
var io = require('socket.io').listen(server);

//configure for production
io.enable('browser client minification');
io.enable('browser client etag');
io.enable('browser client gzip');
io.set('log level',1);
io.set('flash policy port',-1);


app.configure('development', function(){
  app.use(express.errorHandler());
});

app.get('/', routes.index);
//app.get('/users', user.list);
//app.get('/test', testCtrl.show);

server.listen(app.get('port'), function(){
  console.log("Express server listening on port " + app.get('port'));
});


function getUintFromBuffer(buffer) {
  //console.log(buffer);
  var uint8Packet = new Uint8Array(buffer.length);

  for(var i = 0, len = buffer.length; i < len; i++) {
    uint8Packet[i] = buffer.readInt8(i);
  }

  return uint8Packet;
}

//download part
io.of('/download')
  .on('connection', function(socket) {

      socket.emit('connected');

      socket.on('join', function(param) {

      });

      socket.on('say', function(message) {
        //io.of('/chat').in(roomN).emit('say', {author: nickname, text: message, at: new Date().getTime()});
      });

      socket.on('download', function(link) {
        //launch request to download

        socket.emit('downloading', link);

        var offset = 0;

        var parsedUrl = url.parse(link);

        if (link.indexOf("https")>-1) {
          //socket.emit('error', "https not supported");
          //return;
          var dlder = https;
        } else {
          var dlder = http;
        }



        var req = dlder.request(parsedUrl, function(res) {
          //res.setEncoding('ascii');
          //res.setEncoding('binary');
          //res.setEncoding('UTF-8');

          console.log(res.headers);

          socket.emit('size', res.headers['content-length']);

          res.on('data', function(chunk) {
            //console.log(chunk);

            socket.emit('data', {
              'offset': offset, 
              //'data': chunk.toString('base64')
              'data': BISON.encode(base64encode(getUintFromBuffer(chunk)))
              //'data': unescape(encodeURIComponent(JSON.stringify(chunk.toString())))
            });
            offset+= chunk.length;
          });

          res.on('end', function() {
            socket.emit('end',{'name': parsedUrl.pathname});
          });
        });

        req.on('error', function(e) {
          socket.emit('error', e);
          console.log(e);
        })

        req.end();
      });

  });

