'use strict';

window.requestFileSystem = window.requestFileSystem ||  window.webkitRequestFileSystem;
window.BlobBuilder = window.BlobBuilder || window.WebKitBlobBuilder;


 var keyStr = "ABCDEFGHIJKLMNOP" +
               "QRSTUVWXYZabcdef" +
               "ghijklmnopqrstuv" +
               "wxyz0123456789+/" +
               "=";

  function encode64(input) {
     input = escape(input);
     var output = "";
     var chr1, chr2, chr3 = "";
     var enc1, enc2, enc3, enc4 = "";
     var i = 0;

     do {
        chr1 = input.charCodeAt(i++);
        chr2 = input.charCodeAt(i++);
        chr3 = input.charCodeAt(i++);

        enc1 = chr1 >> 2;
        enc2 = ((chr1 & 3) << 4) | (chr2 >> 4);
        enc3 = ((chr2 & 15) << 2) | (chr3 >> 6);
        enc4 = chr3 & 63;

        if (isNaN(chr2)) {
           enc3 = enc4 = 64;
        } else if (isNaN(chr3)) {
           enc4 = 64;
        }

        output = output +
           keyStr.charAt(enc1) +
           keyStr.charAt(enc2) +
           keyStr.charAt(enc3) +
           keyStr.charAt(enc4);
        chr1 = chr2 = chr3 = "";
        enc1 = enc2 = enc3 = enc4 = "";
     } while (i < input.length);

     return output;
  }

  function decode64(input) {
     var output = "";
     var chr1, chr2, chr3 = "";
     var enc1, enc2, enc3, enc4 = "";
     var i = 0;

     // remove all characters that are not A-Z, a-z, 0-9, +, /, or =
     var base64test = /[^A-Za-z0-9\+\/\=]/g;
     if (base64test.exec(input)) {
        alert("There were invalid base64 characters in the input text.\n" +
              "Valid base64 characters are A-Z, a-z, 0-9, '+', '/',and '='\n" +
              "Expect errors in decoding.");
     }
     input = input.replace(/[^A-Za-z0-9\+\/\=]/g, "");

     do {
        enc1 = keyStr.indexOf(input.charAt(i++));
        enc2 = keyStr.indexOf(input.charAt(i++));
        enc3 = keyStr.indexOf(input.charAt(i++));
        enc4 = keyStr.indexOf(input.charAt(i++));

        chr1 = (enc1 << 2) | (enc2 >> 4);
        chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
        chr3 = ((enc3 & 3) << 6) | enc4;

        output = output + String.fromCharCode(chr1);

        if (enc3 != 64) {
           output = output + String.fromCharCode(chr2);
        }
        if (enc4 != 64) {
           output = output + String.fromCharCode(chr3);
        }

        chr1 = chr2 = chr3 = "";
        enc1 = enc2 = enc3 = enc4 = "";

     } while (i < input.length);

     return unescape(output);
  }

var IndexCtrl = function($scope, $location, $rootScope, $cookies, $timeout) {

	$scope.mode = 'read';
	$scope.connected = false;

	$scope.file = {};
	$scope.errors = [];

	var fs = null;

	$scope.onInitFs = function(fsRef) {
		fs = fsRef;
		$scope.removeFile("toto");
	};

	$scope.removeFile = function(name) {
		console.log(fs);

		//remove it if exist
		fs.root.getFile(name, {create: false}, function (fileEntry) {
			fileEntry.remove(function() { //remove it first

				console.log("removed");

			}, $scope.errorHandler)
		});

	}

	$scope.errorHandler = function(e) {
		console.log(e);
		$scope.errors.push(e);
		$scope.$apply();
	};

	$scope.askDownload = function(url) {

		fs.root.getFile("toto", {create: true}, function (fileEntry) {
			console.log("create file !");
			$scope.file.fileEntry = fileEntry;
			fileEntry.createWriter(function(fileWriter) {

				$scope.file.fileWriter = fileWriter;
				console.log("create filewriter");
					//console.log($scope.file);
					
					socket.emit("download", url);
					$scope.dlInProgress = true;
					$scope.$apply();
					//launch loop for file construction;
					$scope.constructLoop();
				}, $scope.errorHandler);
		}, $scope.errorHandler);

		
	}

	$scope.init = function() {
		window.webkitStorageInfo.requestQuota(PERSISTENT, 1024*1024*1000, function(grantedBytes) {
			window.requestFileSystem(PERSISTENT, grantedBytes, $scope.onInitFs, $scope.errorHandler);
		}, function(e) {
			$scope.$apply(function() {
				$scope.error = e;
			});
		});
	}

	$scope.packets = [];
	$scope.blob = "";

	$scope.fileUploaded = false;

	$scope.constructLoop = function() {
		console.log("constructLoop");
		console.log($scope.packets);
		console.log($scope.fileUploaded);
		while($scope.packets.length>0) {
			console.log("handle packet");
			var obj = $scope.packets[0];
			$scope.packets.splice(0,1);
			var chunk = obj.data;
			//var decoded = window.atob(chunk);
			var decoded = decode64(chunk);
			$scope.blob = $scope.blob+decoded;
				/*
				

				console.log($scope.packets);

				
				var offset = obj.offset;
				//console.log(window.atob(chunk));
				

					
				console.log("warning: "+fileWriter.length+" / "+offset);
				console.log(decoded.length);
				fileWriter.seek(offset);

				fileWriter.write(new Blob([decoded]));
				*/
				
			}

			if ($scope.dlInProgress === false) {
				$scope.file.fileEntry.createWriter(function(fileWriter) {
			//fileWriter.write($scope.blob.getBlob('text/plain'));
			console.log("write eveything");
			console.log($scope.blob);
			fileWriter.write(new Blob([$scope.blob],{type: "application/octet-binary"}));
		});	

				return;
			}

			$timeout($scope.constructLoop, 100);

		//$timeout.flush();
		
	};


	var socket = io.connect( "http://"+window.location.host+'/download');
	socket.on('connected', function(event, eventType) {
		$scope.$apply(function() {

			$scope.connected = true;

		});
	});

	socket.on('end', function(chunk, eventType) {
		$scope.dlInProgress = false;
		
		$scope.$apply();
	});

	socket.on('data', function(obj, eventType) {
		$scope.packets.push(obj);
	});

	socket.on('error', function(err, eventType) {
		$scope.errorHandler(err);
	});


	$scope.init();
}


IndexCtrl.$inject = ['$scope', '$location','$rootScope','$cookies','$timeout'];