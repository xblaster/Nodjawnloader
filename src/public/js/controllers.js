'use strict';

window.requestFileSystem = window.requestFileSystem ||  window.webkitRequestFileSystem;
window.BlobBuilder = window.BlobBuilder || window.WebKitBlobBuilder;

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
    console.log(message);

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
		$scope.chunk = 0;

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
		window.webkitStorageInfo.requestQuota(TEMPORARY, 1024*1024*1000, function(grantedBytes) {
			window.requestFileSystem(TEMPORARY, grantedBytes, $scope.onInitFs, $scope.errorHandler);
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

	$scope.constructLoop = function() {
		//console.log("constructLoop");
		//console.log($scope.packets);
		//console.log($scope.fileUploaded);
		while($scope.packets.length>0) {
			console.log("handle packet");
			var obj = $scope.packets[0];
			$scope.packets.splice(0,1);
			var chunk = obj.data;
			//var decoded = window.atob(chunk);
			//var decoded = decode64(chunk);
			//var decoded = JSON.parse(decodeURIComponent(escape(chunk)));
			var decoded = new Uint8Array(chunk);
			$scope.blob.push(decoded);
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

			if ($scope.status === 'downloaded') {
				$scope.file.fileEntry.createWriter(function(fileWriter) {
			//fileWriter.write($scope.blob.getBlob('text/plain'));
				console.log("write eveything");
				console.log($scope.blob);
				fileWriter.write(new Blob($scope.blob,{type: "application/octet-binary"}));
			//fileWriter.write(new Blob([$scope.blob],{type: "text/plain"}));
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
			$scope.chunk = $scope.chunk+1;

		});
	});

	socket.on('end', function(chunk, eventType) {
		$scope.status = 'downloaded'
		


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