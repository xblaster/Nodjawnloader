
/**
 * Module dependencies.
 */

var express = require('express')
  , routes = require('./routes')
  //, user = require('./routes/user')
  //, testCtrl = require('./routes/test')
  , http = require('http')

  , path = require('path');

var app = express();
var _ = require('lodash');

require('./public/js/lib/bison')


app.configure(function(){
  app.set('port', process.env.PORT || 3000);
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
  // Encode packet with BiSON to safe up to 50% against JSON.stringify
  var bisonPacket = BISON.encode(buffer.toString("binary"));

  // A tricky part is that you will get nothing sending data as-is.
  // Our bison string is build of chars with indexes from 0 to 255.
  // utf-8 uses extra byte to encode char beyond index 127 so u will end up
  // sending value which can be represented by one byte in two bytes.
  // To take advantage of binary transport we will have to convert our data
  // to javascript typed array. Unsigned Int 8 will do best.

  var uint8Packet = new Uint8Array(packet.length);

  for(var i = 0, len = bisonPacket.length; i < len; i++) {
    uint8Packet[i] = packet.charCodeAt(i);
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

      socket.on('download', function(url) {
        //launch request to download

        socket.emit('downloading', url);

        var offset = 0;

        var req = http.request(url, function(res) {
          //res.setEncoding('ascii');
          res.setEncoding('binary');
          res.on('data', function(chunk) {
            //console.log(chunk);

            socket.emit('data', {
              'offset': offset, 
              //'data': chunk.toString('base64')
              'data': getUintFromBuffer(chunk);
            });
            offset+= chunk.length;
          });

          res.on('end', function() {
            socket.emit('end');
          });
        });

        req.on('error', function(e) {
          socket.emit('error', e);
          console.log(e);
        })

        req.end();
      });

  });

