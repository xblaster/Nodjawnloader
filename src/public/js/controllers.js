'use strict';

window.requestFileSystem = window.requestFileSystem ||  window.webkitRequestFileSystem;
window.BlobBuilder = window.BlobBuilder || window.WebKitBlobBuilder;

function rename(cwd, src, newName) {
  cwd.getFile(src, {}, function(fileEntry) {
    fileEntry.moveTo(cwd, newName);
  }, function() {});
}

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

function decodeUint8(data) {
var reader = new FileReader();

  // There is also readAsBinaryString method if you are not using typed arrays
  reader.readAsArrayBuffer(data);

  // As the stream finish to load we can use the results
  reader.onloadend = function() {

    // Another tricky part. Before you can read the results you have to create
    // a view for our typed array
    var view = new Uint8Array(this.result);

    // Now let's decode array containing char indexes to normal ol' utf8 string
    var str = "";
    for(var i = 0; i < view.length; i++) {
      str += String.fromCharCode(view[i]);
    }

    // Our string is still BISON encoded, so last conversion needs to be done.
    var message = BISON.decode(str);                   

    // Voilà, here comes object that we sent
    //console.log(message);

    return message;
  };
}

var IndexCtrl = function($scope, $location, $rootScope, $cookies, $timeout) {

	$scope.mode = 'read';
	$scope.connected = false;

	$scope.file = {};
	$scope.errors = [];

	var fs = null;
	$scope.chunk = 0;
	$scope.status = false;

	$scope.receivedBytes = 0;
	$scope.totalBytes = 100000000;
	$scope.writtenBytes = 0;

	$scope.onInitFs = function(fsRef) {
		fs = fsRef;
		//$scope.removeFile("tmpFile");

		var dirReader = fs.root.createReader();
		dirReader.readEntries(function(entries) {
			for (var i = 0, entry;  entry = entries[i]; i++) {
				entry.remove(function() {},$scope.errorHandler);
			}
		});


	};

	$scope.removeFile = function(name) {
		//console.log(fs);

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
		$scope.chunk = 0;
		
		//init tmpfile
		fs.root.getFile("tmpFile", {create: true}, function (fileEntry) {
		});
		
		fs.root.getFile("tmpFile", {create: true}, function (fileEntry) {
			console.log("create file !");
			$scope.file.fileEntry = fileEntry;
			fileEntry.createWriter(function(fileWriter) {

				$scope.file.fileWriter = fileWriter;
				console.log("create filewriter");
					//console.log($scope.file);
					
					socket.emit("download", url);
					//$scope.dlInProgress = true;
					$scope.status = 'downloading'
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
	$scope.blob = [];

	$scope.getATag = function() {
		if ($scope.file.fileEntry) {
			return '<a href="'+$scope.file.fileEntry.toURL()+'">'+$scope.file.fileEntry.toURL()+'</a>';
		}
		return "";
	}

	
	$scope.writeBlob = function (blob) {
		$scope.file.fileEntry.createWriter(function(fileWriter) {
				console.log("writeFile "+fileWriter.length);
				fileWriter.seek(fileWriter.length);
				fileWriter.write(new Blob(blob,{type: "application/octet-binary"}));
		});
	}
	
	$scope.constructLoop = function() {
		//console.log("constructLoop");
		//console.log($scope.packets);
		//console.log($scope.fileUploaded);
		while($scope.packets.length>0) {
			//console.log("handle packet");
			var obj = $scope.packets[0];
			$scope.packets.splice(0,1);
			var chunk = obj.data;
			var decoded = new Uint8Array(base64decode(BISON.decode(chunk)));
			$scope.blob.push(decoded);

			$scope.receivedBytes = $scope.receivedBytes+decoded.length;
			
			
		}

		var tmpBlock = $scope.blob;
		$scope.blob = []; //reinit for next loop
	
		if (tmpBlock.lengh > 0) {
			$scope.writeBlob(tmpBlock);
		}
	

		if ($scope.receivedBytes == $scope.totalBytes) {
		
		
				$scope.file.fileEntry.createWriter(function(fileWriter) {
				

				console.log('end');
				$scope.status = 'downloaded';
			
				//rename file
				var splited = $scope.finalName.split("/");
				var fileName = splited[splited.length-1];

				var fileExtension = fileName.split(".")[1];
				if (fileExtension== "exe") {
					fileName = fileName+".forJsSecurity"
				}

				rename(fs.root, 'tmpFile', fileName);

				//change file link
				fs.root.getFile(fileName, {create: true}, function (fileEntry) {
					console.log("change to filename "+fileName);
					$scope.file.fileEntry = fileEntry;
					$scope.$apply();
				});

			//fileWriter.write(new Blob([$scope.blob],{type: "text/plain"}));
		});	

				return;
			}

			$timeout($scope.constructLoop, 100);

		//$timeout.flush();
		
	};


	var socket = io.connect( "http://"+window.location.host+'/download'
			,  {'resource': '/dl/socket.io'});
	socket.on('connected', function(event, eventType) {
		$scope.$apply(function() {

			$scope.connected = true;

		});
	});

	socket.on('size', function(obj, eventType) {
		$scope.totalBytes = obj;
	});

	socket.on('name', function(obj, eventType) {
		$scope.finalName = obj;
	});


	socket.on('data', function(obj, eventType) {
		$scope.packets.push(obj);
		$scope.chunk = $scope.chunk+1;
	});

	socket.on('error', function(err, eventType) {
		$scope.errorHandler(err);
	});


	$scope.init();
}


IndexCtrl.$inject = ['$scope', '$location','$rootScope','$cookies','$timeout'];
