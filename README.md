JsDownloader
============

A download app using node.js and socket.io and expose file using HTML5 FileAPI 

# Why JsDownloader ? 

Some firewall block zip, war, jar or nearly eveything but GET http requests. JsDownloader server will download 
your request and send file blocks with websocket or long polling using socket.io. 
When all blocks are downloaded by you browser, the file 
is exposed to you using HTML5 File API.

# Requirement

WARNING :  Only tested with Chrome 26

# Launch your own server

Checkout the project and type in a command line
>npm install

>node app.js

# TODO LIST

# License
Copyright (c) 2013 Jérôme WAX
Licensed under the MIT license.
