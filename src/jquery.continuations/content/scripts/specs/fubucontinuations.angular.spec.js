function TestController($scope, $http) {
  $scope.execute = function() {
    $http({
      method: 'GET',
      url: '/test',
      continuationSuccess: function(continuation) {
        $scope.correlationId = continuation.correlationId;
      }
    });
  };
}

var TestModule = angular.module('TestModule', ['$fubucontinuations']);
TestModule.config(function($httpProvider) {
  $httpProvider.interceptors.push('angularContinuationAdapter');
});

describe('Global Angular conventions', function () {

  beforeEach(module('TestModule'));
  beforeEach(module('ngMock'));

  var $httpBackend = null;
  var $rootScope = null;
  var createController = null;

  beforeEach(inject(function($injector) {
    $httpBackend = $injector.get('$httpBackend');
    $httpBackend.when('GET', '/test').respond({ success: true }, {'X-Correlation-Id': '123'});
    
    $rootScope = $injector.get('$rootScope');
    var $controller = $injector.get('$controller');

    createController = function () {
      return $controller('TestController', { '$scope': $rootScope });
    };
  }));
  
  afterEach(function () {
    $fubu.continuations.reset();
  });

  it('triggers the AjaxStarted event when a request starts', function () {
    var invoked = false;
    $fubu.continuations.bind('AjaxStarted', function () {
      invoked = true;
    });

    var controller = createController();
    $rootScope.execute();

    $httpBackend.flush();

    expect(invoked).toEqual(true);
  });

  it('should publish the AjaxCompleted topic when a request completes', function () {
    var invoked = false;
    $fubu.continuations.bind('AjaxCompleted', function () {
      invoked = true;
    });

    var controller = createController();
    $rootScope.execute();

    $httpBackend.flush();

    expect(invoked).toEqual(true);
  });
});

describe('Request correlation', function () {

  beforeEach(module('TestModule'));
  beforeEach(module('ngMock'));

  var $httpBackend = null;
  var $rootScope = null;
  var createController = null;

  beforeEach(inject(function ($injector) {
    $httpBackend = $injector.get('$httpBackend');
    $httpBackend.expectGET('/test').respond(function(method, url, data, headers) {
      return [
        200,
        JSON.stringify({ success: true }),
        { 'X-Correlation-Id': headers['X-Correlation-Id'] }
      ];
    });

    $rootScope = $injector.get('$rootScope');
    var $controller = $injector.get('$controller');

    createController = function () {
      return $controller('TestController', { '$scope': $rootScope });
    };
  }));

  afterEach(function () {
    $fubu.continuations.reset();
  });
  

  it('should match request/response headers to track each request', function () {
    var startingId = '';
    var completedId = '';

    $fubu.continuations.bind('AjaxStarted', function (request) {
      startingId = request.correlationId;
    });

    $fubu.continuations.bind('AjaxCompleted', function (response) {
      completedId = response.correlationId;
    });

    var controller = createController();
    $rootScope.execute();

    $httpBackend.flush();

    expect(completedId == '').toEqual(false);
    expect(completedId).toEqual(startingId);
  });
});