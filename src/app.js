
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
var url = require('url');
var _ = require('lodash');

var BISON = require('./public/js/lib/bison');


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
          socket.emit('error', "https not supported");
          return;
        }

        var req = http.request(parsedUrl, function(res) {
          //res.setEncoding('ascii');
          //res.setEncoding('binary');
          //res.setEncoding('UTF-8');
          res.on('data', function(chunk) {
            //console.log(chunk);

            socket.emit('data', {
              'offset': offset, 
              //'data': chunk.toString('base64')
              'data': BISON.encode(getUintFromBuffer(chunk))
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

