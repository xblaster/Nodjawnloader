'use strict';


//fix ie console
if (typeof console==="undefined"|| typeof console.log === "undefined") {
	console = {}
	console.log = function(){};
}

angular.module('jsDownload', ['ng','ngCookies']).config(['$routeProvider',
function($routeProvider) {

	$routeProvider.when('/', {templateUrl: 'partials/index.html', controller : IndexCtrl})
	//.when('/avoir/:id', {templateUrl : 'partials/detailAvoir.html', controller: AvoirDetailCtrl})
	.otherwise({
		redirectTo : '/'
	});
}]);