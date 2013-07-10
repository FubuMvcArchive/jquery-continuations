describe('Global jQuery conventions', function () {
  afterEach(function () {
    $fubu.continuations.reset();
  });

  // these should prove to be beneficial for showing loading animations
  it('triggers the AjaxStarted event when a request starts', function () {
    var invoked = false;
    runs(function () {
      $fubu.continuations.bind('AjaxStarted', function () {
        invoked = true;
      });

      $.ajax({
        url: '',
        type: 'get'
      });
    });

    waits(1000);

    runs(function () {
      expect(invoked).toEqual(true);
    });
  });

  it('should publish the AjaxCompleted topic when a request completes', function () {
    var invoked = false;
    runs(function () {
      $fubu.continuations.bind('AjaxCompleted', function () {
        invoked = true;
      });

      $.ajax({
        url: '',
        type: 'get'
      });
    });

    waits(1000);

    runs(function () {
      expect(invoked).toEqual(true);
    });
  });
});

describe('Request correlation', function () {
  var server;
  beforeEach(function () {
    server = sinon.fakeServer.create();
  });
  afterEach(function () {
    server.restore();
    $fubu.continuations.reset();
  });

  it('should match request/response headers to track each request', function () {
    var startingId = '';
    var completedId = '';

    runs(function () {
      $fubu.continuations.bind('AjaxStarted', function (request) {
        startingId = request.correlationId;
        // if it hangs, we never got the topic
        server.respondWith([200,
            { 'Content-Type': 'application/json', 'X-Correlation-Id': startingId }, '{"success":"true"}'
        ]);
      });

      $fubu.continuations.bind('AjaxCompleted', function (response) {
        completedId = response.correlationId;
      });

      $.ajax({
        url: '/testing',
        dataType: 'json',
        type: 'get'
      });

      server.respond();
    });

    waits(500);

    runs(function () {
      expect(completedId == '').toEqual(false);
      expect(completedId).toEqual(startingId);
    });
  });
});

describe('integrated success callback', function () {
  var theServer;
  var theContinuation;

  beforeEach(function () {
    theServerContinuation = new $fubu.continuations.continuation();
    var builder = function () { return JSON.stringify(theServerContinuation) };

    theServer = sinon.fakeServer.create();
    theServer.respondWith([200, { 'Content-Type': 'application/json', 'X-Correlation-Id': '1234' }, builder()]);

    sinon.stub($fubu.continuations, 'process');

    $.ajax();
    theServer.respond();
    theContinuation = $fubu.continuations.process.getCall(0).args[0];
  });
  afterEach(function () {
    theServer.restore();
    $fubu.continuations.process.restore();
    $fubu.continuations.reset();
  });

  it('sets the response', function () {
    expect(theContinuation.response).toBeDefined();
  });

  it('sets the status code', function () {
    expect(theContinuation.statusCode).toEqual(200);
  });
});

describe('Overriding continuation calls', function () {
  var theServer;
  var theContinuation;

  beforeEach(function () {
    theServerContinuation = new $fubu.continuations.continuation();
    var builder = function () { return JSON.stringify(theServerContinuation) };

    theServer = sinon.fakeServer.create();
    theServer.respondWith([200, { 'Content-Type': 'application/json', 'X-Correlation-Id': '1234' }, builder()]);

    sinon.stub($fubu.continuations, 'process');

    $.ajax({
      global: false
    });
    theServer.respond();
  });
  afterEach(function () {
    theServer.restore();
    $fubu.continuations.process.restore();
    $fubu.continuations.reset();
  });

  it('does not invoke the pipeline', function () {
    expect($fubu.continuations.process.called).toEqual(false);
  });
});



describe('Integrated refresh policy tests', function () {
  var server;
  var refresh;
  beforeEach(function () {
    server = sinon.fakeServer.create();
    refresh = $fubu.continuations.windowService.refresh;
  });
  afterEach(function () {
    server.restore();
    $fubu.continuations.windowService.refresh = refresh;
    $fubu.continuations.reset();
  });

  it('should refresh the page when refresh is true', function () {
    $fubu.continuations.windowService.refresh = jasmine.createSpy('windowService.refresh');

    server.respondWith([200,
        { 'Content-Type': 'application/json' }, '{"refresh":"true"}'
    ]);

    runs(function () {
      $.ajax({
        url: '/refresh',
        dataType: 'json',
        type: 'get'
      });
      server.respond();
    });

    waits(500);

    runs(function () {
      expect($fubu.continuations.windowService.refresh).toHaveBeenCalled();
    });
  });

  it('should not refresh the page when refresh is false', function () {
    $fubu.continuations.windowService.refresh = jasmine.createSpy('windowService.refresh');

    server.respondWith([200,
        { 'Content-Type': 'application/json' }, '{"refresh":"false"}'
    ]);

    runs(function () {
      $.ajax({
        url: '/refresh',
        dataType: 'json',
        type: 'get'
      });
      server.respond();
    });

    waits(500);

    runs(function () {
      expect($fubu.continuations.windowService.refresh).not.toHaveBeenCalled();
    });
  });
});

describe('Integrated navigate policy tests', function () {
  var server;
  var navigate;
  beforeEach(function () {
    server = sinon.fakeServer.create();
    navigate = $fubu.continuations.windowService.navigateTo;
  });
  afterEach(function () {
    server.restore();
    $fubu.continuations.windowService.navigateTo = navigate;
    $fubu.continuations.reset();
  });

  it('should navigate to url', function () {
    var url = 'http://www.google.com';
    $fubu.continuations.windowService.navigateTo = sinon.stub();

    server.respondWith([200,
        { 'Content-Type': 'application/json' }, '{"navigatePage":"' + url + '"}'
    ]);

    runs(function () {
      $.ajax({
        url: '/navigate',
        dataType: 'json',
        type: 'get'
      });
      server.respond();
    });

    waits(500);

    runs(function () {
      expect($fubu.continuations.windowService.navigateTo.called).toEqual(true);
      expect($fubu.continuations.windowService.navigateTo.getCall(0).args[0]).toEqual(url);
    });
  });

  it('should not navigate to url when not specified', function () {
    var url = 'http://www.google.com';
    $fubu.continuations.windowService.navigateTo = jasmine.createSpy('windowService.navigateTo');

    server.respondWith([200,
        { 'Content-Type': 'application/json' }, '{"success": "true"}'
    ]);

    runs(function () {
      $.ajax({
        url: '/navigate',
        dataType: 'json',
        type: 'get'
      });
      server.respond();
    });

    waits(500);

    runs(function () {
      expect($fubu.continuations.windowService.navigateTo).not.toHaveBeenCalled();
    });
  });
});

describe('Integrated error policy tests', function () {
  var server;
  beforeEach(function () {
    server = sinon.fakeServer.create();
  });
  afterEach(function () {
    server.restore();
    $fubu.continuations.reset();
  });

  it('should publish the ContinuationError topic when the continuation has errors', function () {
    server.respondWith([200,
        { 'Content-Type': 'application/json' }, '{"errors": [{"message": "Test"}]}'
    ]);

    var invoked = false;
    $fubu.continuations.bind('ContinuationError', function (continuation) {
      invoked = continuation.errors.length == 1;
    });

    runs(function () {
      $.ajax({
        url: '/errors',
        dataType: 'json',
        type: 'get'
      });
      server.respond();
    });

    waits(500);

    runs(function () {
      expect(invoked).toEqual(true);
    });
  });

  it('should publish the ContinuationError topic when the continuation does not have errors', function () {
    server.respondWith([200,
        { 'Content-Type': 'application/json' }, '{"errors": []}'
    ]);

    var invoked = false;
    $fubu.continuations.bind('ContinuationError', function (continuation) {
      invoked = true;
    });

    runs(function () {
      $.ajax({
        url: '/errors',
        dataType: 'json',
        type: 'get'
      });
      server.respond();
    });

    waits(500);

    runs(function () {
      expect(invoked).toEqual(false);
    });
  });
});

describe('Integrated http error policy tests', function () {
  var theServer;
  beforeEach(function () {
    theServer = sinon.fakeServer.create();
  });
  afterEach(function () {
    theServer.restore();
    $fubu.continuations.reset();
  });

  it('publishes the HttpError topic when an http error occurs', function () {
    theServer.respondWith([500, { 'Content-Type': 'text/html', 'X-Correlation-Id': '1234' }, '<html></html>']);

    var invoked = false;
    $fubu.continuations.bind('HttpError', function (continuation) {
      invoked = true;
    });

    runs(function () {
      $.ajax({
        url: '/errors',
        dataType: 'json',
        type: 'get'
      });
      theServer.respond();
    });

    waits(500);

    runs(function () {
      expect(invoked).toEqual(true);
    });
  });

  it('does not publish the HttpError topic when no http errors occur', function () {
    theServer.respondWith([200, { 'Content-Type': 'text/html', 'X-Correlation-Id': '1234' }, '<html></html>']);

    var invoked = false;
    $fubu.continuations.bind('HttpError', function (continuation) {
      invoked = true;
    });

    runs(function () {
      $.ajax({
        url: '/errors',
        dataType: 'json',
        type: 'get'
      });
      theServer.respond();
    });

    waits(500);

    runs(function () {
      expect(invoked).toEqual(false);
    });
  });
});

describe('Integrated redirect policy tests', function () {
  var server;
  var navigate;
  beforeEach(function () {
    server = sinon.fakeServer.create();
    navigate = $fubu.continuations.windowService.navigateTo;

    $fubu.continuations.applyPolicy(new $fubu.continuations.jQuery.redirectPolicy());
  });
  afterEach(function () {
    server.restore();
    $fubu.continuations.windowService.navigateTo = navigate;
    $fubu.continuations.reset();
  });

  it('should navigate to url', function () {
    var url = 'http://www.google.com';
    $fubu.continuations.windowService.navigateTo = sinon.stub();

    server.respondWith([301, { 'Content-Type': 'text/html', 'Location': url }, '']);

    runs(function () {
      $.ajax({
        url: '/navigate',
        dataType: 'json',
        type: 'get'
      });
      server.respond();
    });

    waits(500);

    runs(function () {
      expect($fubu.continuations.windowService.navigateTo.called).toEqual(true);
      expect($fubu.continuations.windowService.navigateTo.getCall(0).args[0]).toEqual(url);
    });
  });

  it('should not navigate to url when not specified', function () {
    var url = 'http://www.google.com';
    $fubu.continuations.windowService.navigateTo = jasmine.createSpy('windowService.navigateTo');

    server.respondWith([200, { 'Content-Type': 'application/json' }, '{"success": "true"}']);

    runs(function () {
      $.ajax({
        url: '/navigate',
        dataType: 'json',
        type: 'get'
      });
      server.respond();
    });

    waits(500);

    runs(function () {
      expect($fubu.continuations.windowService.navigateTo).not.toHaveBeenCalled();
    });
  });
});

describe('when handling a successful response', function () {
  var theResponse = null;
  var theSettings = null;
  var theContinuation = null;
  var theCallback = null;
  var theContinuationToProcess = null;
  var _process = null;

  beforeEach(function () {
    theContinuation = new $fubu.continuations.continuation();
    theCallback = sinon.stub();
    theResponse = {
      getResponseHeader: function (key) {
        if (key == 'Content-Type') return 'text/json';
        if (key == 'X-Correlation-Id') return '1234';
      },
      status: 200,
      responseText: JSON.stringify(theContinuation)
    };
    theSettings = {
      continuationSuccess: theCallback
    };

    _process = $fubu.continuations.process;
    $fubu.continuations.process = sinon.stub();
    $fubu.continuations.jQuery.onSuccess({}, theResponse, theSettings);

    theContinuationToProcess = $fubu.continuations.process.getCall(0).args[0];
  });

  afterEach(function () {
    $fubu.continuations.process = _process;
    $fubu.continuations.reset();
  });

  it('invokes the callback', function () {
    expect(theCallback.called).toEqual(true);
    expect(theCallback.getCall(0).args[0]).toBeDefined();
  });

  it('processes the continuation', function () {
    expect($fubu.continuations.process.called).toEqual(true);
    expect(theContinuationToProcess).toBeDefined();
  });

  it('sets the status code', function () {
    expect(theContinuationToProcess.statusCode).toEqual(200);
  });

  it('sets the response', function () {
    expect(theContinuationToProcess.response).toEqual(theResponse);
  });

  it('sets the correlation id', function () {
    expect(theContinuationToProcess.correlationId).toEqual('1234');
  });
});

describe('when handling an erroneous response', function () {
  var theSettings = null;
  var theResponse = null;
  var theContinuation = null;
  var theCallback = null;
  var theContinuationToProcess = null;
  var _process = null;
  var _parse = null;

  beforeEach(function () {
    theContinuation = new $fubu.continuations.continuation();
    theCallback = sinon.stub();
    theResponse = {
    };
    theSettings = {
      continuationError: theCallback
    };

    _parse = $fubu.continuations.parseContinuation;
    _process = $fubu.continuations.process;

    $fubu.continuations.process = sinon.stub();
    $fubu.continuations.parseContinuation = function () { return theContinuation; };

    $fubu.continuations.jQuery.onError(theResponse, theSettings);

    theContinuationToProcess = $fubu.continuations.process.getCall(0).args[0];
  });

  afterEach(function () {
    $fubu.continuations.process = _process;
    $fubu.continuations.parseContinuation = _parse;
    $fubu.continuations.reset();
  });

  it('invokes the callback', function () {
    expect(theCallback.called).toEqual(true);
    expect(theCallback.getCall(0).args[0]).toEqual(theContinuation);
  });

  it('processes the continuation', function () {
    expect($fubu.continuations.process.called).toEqual(true);
    expect(theContinuationToProcess).toEqual(theContinuation);
  });
});

describe('when handling an erroneous response that stops the processing', function () {
  var theSettings = null;
  var theResponse = null;
  var theContinuation = null;
  var theCallback = null;
  var _process = null;
  var _parse = null;

  beforeEach(function () {
    theContinuation = new $fubu.continuations.continuation();
    theCallback = sinon.stub().returns(false);
    theResponse = {
    };
    theSettings = {
      continuationError: theCallback
    };

    _parse = $fubu.continuations.parseContinuation;
    _process = $fubu.continuations.process;

    $fubu.continuations.process = sinon.stub();
    $fubu.continuations.parseContinuation = function () { return theContinuation; };

    $fubu.continuations.jQuery.onError(theResponse, theSettings);
  });

  afterEach(function () {
    $fubu.continuations.process = _process;
    $fubu.continuations.parseContinuation = _parse;
    $fubu.continuations.reset();
  });

  it('does not process the continuation', function () {
    expect($fubu.continuations.process.called).toEqual(false);
  });
});

describe('Integrated correlatedAjax tests', function () {
  var server;
  beforeEach(function () {
    server = sinon.fakeServer.create();
  });
  afterEach(function () {
    server.restore();
    $fubu.continuations.reset();
  });

  it('should correlate the request via the specified correlation id', function () {
    var id = '';
    $fubu.continuations.bind('AjaxStarted', function (request) {
      server.respondWith([200,
				{ 'Content-Type': 'application/json', 'X-Correlation-Id': request.correlationId }, '{"success":"true"}'
      ]);
    });
    $fubu.continuations.bind('AjaxCompleted', function (response) {
      id = response.correlationId;
    });

    runs(function () {
      $.ajax({
        url: '/test',
        correlationId: '123'
      });
      server.respond();
    });

    waits(500);

    runs(function () {
      expect(id).toEqual('123');
    });
  });
});

describe('End to end custom continuation tests', function () {
  var theContinuation;
  var server;
  beforeEach(function () {
    theContinuation = {
      customProperty: 'Test'
    };
    server = sinon.fakeServer.create();
  });
  afterEach(function () {
    server.restore();
    $fubu.continuations.reset();
  });

  it('should invoke custom policy for custom property', function () {
    var builder = function () { return JSON.stringify(theContinuation) };
    $fubu.continuations.bind('AjaxStarted', function (request) {
      server.respondWith([200,
				{ 'Content-Type': 'application/json', 'X-Correlation-Id': request.correlationId }, builder()
      ]);
    });
    var invoked = false;
    runs(function () {
      $fubu.continuations.applyPolicy({
        matches: function (continuation) { return continuation.customProperty == 'Test'; },
        execute: function () { invoked = true; }
      });
      $.ajax({ url: '/customprop' });
      server.respond();
    });

    waits(500);

    runs(function () {
      expect(invoked).toEqual(true);
    });
  });
});

describe('Custom options tester', function () {
  var server;
  var continuationBuilder;
  beforeEach(function () {
    server = sinon.fakeServer.create();
    continuationBuilder = function () { return JSON.stringify({}) };
  });
  afterEach(function () {
    server.restore();
    $fubu.continuations.reset();
  });

  it('should persist options passed to ajax', function () {
    $fubu.continuations.bind('AjaxStarted', function (request) {
      server.respondWith([200, {
        'Content-Type': 'application/json',
        'X-Correlation-Id': request.correlationId
      }, continuationBuilder()
      ]);
    });
    var invoked = false;
    runs(function () {
      $fubu.continuations.applyPolicy({
        matches: function (continuation) { return continuation.options.customProperty == 'some random value'; },
        execute: function () { invoked = true; }
      });
      $.ajax({
        url: '/custom-options',
        options: {
          customProperty: 'some random value'
        }
      });
      server.respond();
    });

    waits(500);

    runs(function () {
      expect(invoked).toEqual(true);
    });
  });
});

// And now for the error handling
describe('Global error handling', function () {
  var theServer;
  var theStatusCode;
  var theContinuation;
  var theResponse;
  var theOriginal;
  beforeEach(function () {
    theStatusCode = 500;
    theServer = sinon.fakeServer.create();
    theServer.respondWith([theStatusCode, { 'Content-Type': 'text/html', 'X-Correlation-Id': '1234' }, '']);

    theContinuation = new $fubu.continuations.continuation();
    theContinuation.statusCode = theStatusCode;

    theOriginal = $fubu.continuations.parseContinuation;
    $fubu.continuations.parseContinuation = sinon.spy(function (response) {
      theResponse = response;
      return theContinuation;
    });

    sinon.stub($fubu.continuations, 'process');

    runs(function () {
      $.ajax();
      theServer.respond();
    });

    waits(500);
  });
  afterEach(function () {
    theServer.restore();
    $fubu.continuations.parseContinuation = theOriginal;
    $fubu.continuations.process.restore();
    $fubu.continuations.reset();
  });

  it('builds the error continuation', function () {
    expect($fubu.continuations.parseContinuation.called).toEqual(true);
    expect(theResponse.status()).toEqual(theStatusCode);
  });

  it('processes the errors', function () {
    expect($fubu.continuations.process.called).toEqual(true);
    var response = $fubu.continuations.process.getCall(0).args[0];
    expect(response.statusCode).toEqual(theStatusCode);
  });
});

describe('when building an error continuation for a response that is not json', function () {
  var theServer;
  var theStatusCode;
  var theContinuation;

  beforeEach(function () {
    theStatusCode = 501;
    theServer = sinon.fakeServer.create();
    theServer.respondWith([theStatusCode, { 'Content-Type': 'text/html', 'X-Correlation-Id': '1234' }, '<html></html>']);

    sinon.stub($fubu.continuations, 'process');

    $.ajax();
    theServer.respond();
    theContinuation = $fubu.continuations.process.getCall(0).args[0];
  });
  afterEach(function () {
    theServer.restore();
    $fubu.continuations.process.restore();
    $fubu.continuations.reset();
  });

  it('sets the status code', function () {
    expect(theContinuation.statusCode).toEqual(theStatusCode);
  });

  it('sets the success flag', function () {
    expect(theContinuation.success).toEqual(false);
  });

  it('sets the response', function () {
    expect(theContinuation.response.getResponseHeader('Content-Type')).toEqual('text/html');
  });
});

describe('when building an error continuation for a response that is json', function () {
  var theServer;
  var theStatusCode;
  var theServerContinuation;
  var theContinuation;

  beforeEach(function () {
    theStatusCode = 501;

    theServerContinuation = new $fubu.continuations.continuation();
    theServerContinuation.customProperty = 'Hello';
    var builder = function () { return JSON.stringify(theServerContinuation) };

    theServer = sinon.fakeServer.create();
    theServer.respondWith([theStatusCode, { 'Content-Type': 'application/json', 'X-Correlation-Id': '1234' }, builder()]);

    sinon.stub($fubu.continuations, 'process');

    $.ajax({
    });

    theServer.respond();
    theContinuation = $fubu.continuations.process.getCall(0).args[0];
  });
  afterEach(function () {
    theServer.restore();
    $fubu.continuations.process.restore();
    $fubu.continuations.reset();
  });

  it('uses the continuation from the response', function () {
    expect(theContinuation.customProperty).toEqual(theServerContinuation.customProperty);
  });

  it('sets the response', function () {
    expect(theContinuation.response.getResponseHeader('Content-Type')).toEqual('application/json');
  });
});


describe('conventional processing of non-json requests', function () {
  var theServer;

  beforeEach(function () {
    theServer = sinon.fakeServer.create();
  });

  afterEach(function () {
    theServer.restore();
    $fubu.continuations.reset();
  });

  it('should persist options passed to ajax', function () {
    var theExpectedHtml = '<h1>Hello, World</h1>';
    $fubu.continuations.bind('AjaxStarted', function (request) {
      theServer.respondWith([200, {
        'Content-Type': 'text/html',
        'X-Correlation-Id': request.correlationId
      }, theExpectedHtml]);
    });

    var theActualHtml;
    runs(function () {
      $fubu.continuations.applyPolicy({
        matches: function (continuation) { return continuation.isHtml(); },
        execute: function (continuation) {
          theActualHtml = continuation.response.responseText;
        }
      });
      $.ajax({
        url: '/html-template'
      });
      theServer.respond();
    });

    waits(500);

    runs(function () {
      expect(theActualHtml).toEqual(theExpectedHtml);
    });
  });
});