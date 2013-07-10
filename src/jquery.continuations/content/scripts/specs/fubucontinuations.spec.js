describe('simple event aggregation', function () {
  afterEach(function () {
    $fubu.continuations.reset();
  });

  it('* listens to all topics', function () {
    var thePayloads = [];
    var theCallback = function (payload) {
      thePayloads.push(payload);
    };

    $fubu.continuations.bind('*', theCallback);
    $fubu.continuations.trigger('AjaxStarted', 'p1');
    $fubu.continuations.trigger('AjaxCompleted', 'p2');
    $fubu.continuations.trigger('HttpError', 'p3');

    expect(thePayloads).toEqual(['p1', 'p2', 'p3']);
  });

  it('triggers all of the subscriptions', function () {
    var c1 = sinon.stub(), c2 = sinon.stub(), c3 = sinon.stub();

    $fubu.continuations.bind('AjaxStarted', c1);
    $fubu.continuations.bind('AjaxStarted', c2);
    $fubu.continuations.bind('AjaxStarted', c3);

    $fubu.continuations.trigger('AjaxStarted', {});

    expect(c1.called).toEqual(true);
    expect(c2.called).toEqual(true);
    expect(c3.called).toEqual(true);
  });
});

describe('Custom policy tests', function () {
  afterEach(function() {
    $fubu.continuations.reset();
  });
  
  it('should call custom policy', function () {
    var invoked = false;
    var customPolicy = {
      matches: function (continuation) { return true; },
      execute: function (continuation) { invoked = true; }
    };

    $fubu.continuations.applyPolicy(customPolicy);
    $fubu.continuations.process({ success: true });

    expect(invoked).toEqual(true);
  });
});

describe('Continuation tests', function () {
  var theContinuation;
  beforeEach(function () {
    theContinuation = new $fubu.continuations.continuation();
  });

  it('should not be correlated if the correlation id is not set', function () {
    expect(theContinuation.isCorrelated()).toEqual(false);
  });

  it('should be correlated if the correlation id is set', function () {
    theContinuation.correlationId = '123';
    expect(theContinuation.isCorrelated()).toEqual(true);
  });

  it('matching on options', function () {
    theContinuation.options.myProperty = '123';
    var match = theContinuation.matchOnOption('myProperty', function (x) { return x == '123' });

    expect(match).toEqual(true);
  });

  it('matching on options (negative)', function () {
    theContinuation.options.myProperty = '123';
    var match = theContinuation.matchOnOption('myProperty', function (x) { return x == '345' });

    expect(match).toEqual(false);
  });
});


describe('Continuation builder tests', function () {
  var theValues = null;
  var theContinuation = null;

  beforeEach(function () {
    theValues = {};
    // hello
    theContinuation = $fubu.continuations.create(theValues);
  });

  it('creates the canonical continuation type', function () {
    expect(theContinuation.errors).toEqual([]);
  });
});

describe('More Continuation tests', function () {
  var theContinuation = null;

  beforeEach(function () {
    theContinuation = new $fubu.continuations.continuation();
    theContinuation.errors = [{ id: '1' }, { id: '2' }, { id: '3' }];
  });

  it('iterates each error', function () {
    var theErrors = [];
    theContinuation.eachError(function (error) {
      theErrors.push(error);
    });

    expect(theErrors).toEqual(theContinuation.errors);
  });

  it('contentType defaults to json', function () {
    expect(theContinuation.contentType).toEqual('application/json');
  });

  it('isAjax for application/json', function () {
    theContinuation.contentType = 'application/json';
    expect(theContinuation.isAjax()).toEqual(true);
  });

  it('isAjax for text/json', function () {
    theContinuation.contentType = 'text/json';
    expect(theContinuation.isAjax()).toEqual(true);
  });

  it('isAjax negative', function () {
    theContinuation.contentType = 'text/html';
    expect(theContinuation.isAjax()).toEqual(false);
  });

  it('isHtml for text/html', function () {
    theContinuation.contentType = 'text/html';
    expect(theContinuation.isHtml()).toEqual(true);
  });

  it('isHtml negative', function () {
    theContinuation.contentType = 'text/json';
    expect(theContinuation.isHtml()).toEqual(false);
  });
});

describe('Parsing JSON responses', function() {
  var theController = null;
  var theContinuation = null;
  var theResponse = null;

  beforeEach(function() {
    theController = $fubu.continuations;
    theResponse = {
      header: function (key) {
        if (key == 'Content-Type') {
          return 'application/json';
        }
        if (key == $fubu.continuations.CORRELATION_ID) {
          return '123';
        }

        return undefined;
      },
      status: function () { return '200'; },
      text: function() {
        var obj = { success: false, errors: [{ field: 'Name' }] };
        return JSON.stringify(obj);
      }
    };
    
    theContinuation = theController.parseContinuation(theResponse);
  });

  it('parses the response text', function() {
    expect(theContinuation.success).toEqual(false);
    expect(theContinuation.errors[0].field).toEqual('Name');
  });

  it('sets the contentType', function() {
    expect(theContinuation.contentType).toEqual('application/json');
  });
  
  it('sets the statusCode', function () {
    expect(theContinuation.statusCode).toEqual('200');
  });
  
  it('sets the correlationId', function () {
    expect(theContinuation.correlationId).toEqual('123');
  });

});