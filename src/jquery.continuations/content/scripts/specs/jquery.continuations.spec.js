describe('Global jQuery conventions', function () {
    afterEach(function () {
		$.continuations.reset();
    });
    
    // these should prove to be beneficial for showing loading animations
    it('triggers the AjaxStarted event when a request starts', function () {
        var invoked = false;
        runs(function () {
            $.continuations.bind('AjaxStarted', function() {
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
            $.continuations.bind('AjaxCompleted', function () {
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

describe('simple event aggregation', function () {
	afterEach(function() {
		$.continuations.reset();
	});
	
	it('* listens to all topics', function() {
		var thePayloads = [];
		var theCallback = function(payload) {
			thePayloads.push(payload);
		};
		
		$.continuations.bind('*', theCallback);
		$.continuations.trigger('AjaxStarted', 'p1');
		$.continuations.trigger('AjaxCompleted', 'p2');
		$.continuations.trigger('HttpError', 'p3');
		
		expect(thePayloads).toEqual(['p1', 'p2', 'p3']);
	});
	
	it('triggers all of the subscriptions', function() {
		var c1 = sinon.stub(), c2 = sinon.stub(), c3 = sinon.stub();
		
		$.continuations.bind('AjaxStarted', c1);
		$.continuations.bind('AjaxStarted', c2);
		$.continuations.bind('AjaxStarted', c3);
		
		$.continuations.trigger('AjaxStarted', {});
		
		expect(c1.called).toEqual(true);
		expect(c2.called).toEqual(true);
		expect(c3.called).toEqual(true);
	});
});

describe('Request correlation', function () {
    var server;
    beforeEach(function () {
        server = sinon.fakeServer.create();
    });
    afterEach(function () {
        server.restore();
        $.continuations.reset();
    });

    it('should match request/response headers to track each request', function () {
        var startingId = '';
        var completedId = '';

        runs(function () {
            $.continuations.bind('AjaxStarted', function (request) {
                startingId = request.correlationId;
                // if it hangs, we never got the topic
                server.respondWith([200,
                    { 'Content-Type': 'application/json', 'X-Correlation-Id': startingId }, '{"success":"true"}'
                ]);
            });

            $.continuations.bind('AjaxCompleted', function (response) {
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

describe('integrated success callback', function() {
    var theServer;
    var theContinuation;
    
	beforeEach(function() {
        theServerContinuation = new $.continuations.continuation();
        var builder = function() { return JSON.stringify(theServerContinuation) };
        
        theServer = sinon.fakeServer.create();
        theServer.respondWith([200, { 'Content-Type': 'application/json', 'X-Correlation-Id': '1234'}, builder() ]);

        sinon.stub($.continuations, 'process');
        
        $.ajax();
        theServer.respond();
        theContinuation = $.continuations.process.getCall(0).args[0];
	});
	afterEach(function () {
        theServer.restore();
        $.continuations.process.restore();
		$.continuations.reset();
    });
    
    it('sets the response', function() {
        expect(theContinuation.response).toBeDefined();
    });
    
    it('sets the status code', function() {
        expect(theContinuation.statusCode).toEqual(200);
    });
});


describe('Integrated refresh policy tests', function () {
    var server;
    var refresh;
    beforeEach(function () {
        server = sinon.fakeServer.create();
        refresh = $.continuations.windowService.refresh;
    });
    afterEach(function () {
        server.restore();
        $.continuations.windowService.refresh = refresh;
    });

    it('should refresh the page when refresh is true', function () {
        $.continuations.windowService.refresh = jasmine.createSpy('windowService.refresh');

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
            expect($.continuations.windowService.refresh).toHaveBeenCalled();
        });
    });

    it('should not refresh the page when refresh is false', function () {
        $.continuations.windowService.refresh = jasmine.createSpy('windowService.refresh');

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
            expect($.continuations.windowService.refresh).not.toHaveBeenCalled();
        });
    });
});

describe('Integrated navigate policy tests', function() {
    var server;
    var navigate;
    beforeEach(function() {
        server = sinon.fakeServer.create();
        navigate = $.continuations.windowService.navigateTo;
    });
    afterEach(function() {
        server.restore();
        $.continuations.windowService.navigateTo = navigate;
    });

    it('should navigate to url', function () {
        var url = 'http://www.google.com';
        $.continuations.windowService.navigateTo = jasmine.createSpy('windowService.navigateTo');

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
            expect($.continuations.windowService.navigateTo).toHaveBeenCalledWith(url);
        });
    });

    it('should not navigate to url when not specified', function () {
        var url = 'http://www.google.com';
        $.continuations.windowService.navigateTo = jasmine.createSpy('windowService.navigateTo');

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
            expect($.continuations.windowService.navigateTo).not.toHaveBeenCalled();
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
    });

    it('should publish the ContinuationError topic when the continuation has errors', function () {
        server.respondWith([200,
            { 'Content-Type': 'application/json' }, '{"errors": [{"message": "Test"}]}'
        ]);

        var invoked = false;
        $.continuations.bind('ContinuationError', function (continuation) {
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
        $.continuations.bind('ContinuationError', function (continuation) {
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
    });

    it('publishes the HttpError topic when an http error occurs', function () {
        theServer.respondWith([500, { 'Content-Type': 'text/html', 'X-Correlation-Id': '1234' }, '<html></html>' ]);

        var invoked = false;
        $.continuations.bind('HttpError', function (continuation) {
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
        theServer.respondWith([200, { 'Content-Type': 'text/html', 'X-Correlation-Id': '1234' }, '<html></html>' ]);

        var invoked = false;
        $.continuations.bind('HttpError', function (continuation) {
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

describe('Integrated redirect policy tests', function() {
    var server;
    var navigate;
    beforeEach(function() {
        server = sinon.fakeServer.create();
        navigate = $.continuations.windowService.navigateTo;
    });
    afterEach(function() {
        server.restore();
        $.continuations.windowService.navigateTo = navigate;
    });

    it('should navigate to url', function () {
        var url = 'http://www.google.com';
        $.continuations.windowService.navigateTo = jasmine.createSpy('windowService.navigateTo');

        server.respondWith([301, { 'Content-Type': 'text/html', 'Location': url}, '' ]);

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
            expect($.continuations.windowService.navigateTo).toHaveBeenCalledWith(url);
        });
    });

    it('should not navigate to url when not specified', function () {
        var url = 'http://www.google.com';
        $.continuations.windowService.navigateTo = jasmine.createSpy('windowService.navigateTo');

        server.respondWith([200, { 'Content-Type': 'application/json' }, '{"success": "true"}' ]);

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
            expect($.continuations.windowService.navigateTo).not.toHaveBeenCalled();
        });
    });
});

describe('when handling a successful response', function() {
	var theMessage = null;
	var theContinuation = null;
	var theCallback = null;
	var theContinuationToProcess = null;
	var _process = null;
	
	beforeEach(function() {
		theContinuation = new $.continuations.continuation();
		theCallback = sinon.stub();
		theMessage = {
			response: {
				getResponseHeader: function(key) { 
					if(key == 'Content-Type') return 'text/json';
					if(key == 'X-Correlation-Id') return '1234';
				},
				status: 200
			},
			continuation: theContinuation,
			callback: theCallback
		};

		_process = $.continuations.process;
		$.continuations.process = sinon.stub();
		$.continuations.onSuccess(theMessage);
		
		theContinuationToProcess = $.continuations.process.getCall(0).args[0];
	});

	afterEach(function() {
		$.continuations.process = _process;
	});
	
	it('invokes the callback', function() {
		expect(theCallback.called).toEqual(true);
		expect(theCallback.getCall(0).args[0]).toEqual(theContinuation);
	});
	
	it('processes the continuation', function() {
		expect($.continuations.process.called).toEqual(true);
		expect(theContinuationToProcess).toEqual(theContinuation);
	});
	
	it('sets the status code', function() {
		expect(theContinuationToProcess.statusCode).toEqual(200);
	});
	
	it('sets the response', function() {
		expect(theContinuationToProcess.response).toEqual(theMessage.response);
	});
	
	it('sets the correlation id', function() {
		expect(theContinuationToProcess.correlationId).toEqual('1234');
	});
});

describe('when handling an erroneous response', function() {
	var theOptions = null;
	var theContinuation = null;
	var theCallback = null;
	var theContinuationToProcess = null;
	var _process = null;
	var _buildError = null;
	
	beforeEach(function() {
		theContinuation = new $.continuations.continuation();
		theCallback = sinon.stub();
		theOptions = {
			response: { id: '21341235' },
			text: 'Hello',
			error: 'Uh huh',
			callback: theCallback
		};

		_process = $.continuations.process;
		_buildError = $.continuations.buildError;
		
		$.continuations.process = sinon.stub();
		$.continuations.buildError = function() { return theContinuation; };
		
		$.continuations.onError(theOptions);
		
		theContinuationToProcess = $.continuations.process.getCall(0).args[0];
	});

	afterEach(function() {
		$.continuations.process = _process;
		$.continuations.buildError = _buildError;
	});
	
	it('invokes the callback', function() {
		expect(theCallback.called).toEqual(true);
		expect(theCallback.getCall(0).args[0]).toEqual(theContinuation);
	});
	
	it('processes the continuation', function() {
		expect($.continuations.process.called).toEqual(true);
		expect(theContinuationToProcess).toEqual(theContinuation);
	});
});

describe('when handling an erroneous response that stops the processing', function() {
	var theOptions = null;
	var theContinuation = null;
	var theCallback = null;
	var _process = null;
	var _buildError = null;
	
	beforeEach(function() {
		theContinuation = new $.continuations.continuation();
		theCallback = sinon.stub().returns(false);
		theOptions = {
			response: { id: '21341235' },
			text: 'Hello',
			error: 'Uh huh',
			callback: theCallback
		};

		_process = $.continuations.process;
		_buildError = $.continuations.buildError;
		
		$.continuations.process = sinon.stub();
		$.continuations.buildError = function() { return theContinuation; };
		
		$.continuations.onError(theOptions);
	});

	afterEach(function() {
		$.continuations.process = _process;
		$.continuations.buildError = _buildError;
	});
	
	it('does not process the continuation', function() {
		expect($.continuations.process.called).toEqual(false);
	});
});

describe('Integrated correlatedAjax tests', function () {
	var server;
    beforeEach(function () {
        server = sinon.fakeServer.create();
    });
    afterEach(function () {
        server.restore();
        $.continuations.reset();
    });
	
	it('should correlate the request via the specified correlation id', function() {
		var id = '';
		$.continuations.bind('AjaxStarted', function(request) {
			server.respondWith([200,
				{ 'Content-Type': 'application/json', 'X-Correlation-Id': request.correlationId}, '{"success":"true"}'
			]);
		});
        $.continuations.bind('AjaxCompleted', function (response) {
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

describe('Custom policy tests', function () {
	it('should call custom policy', function() {
		var invoked = false;
		var customPolicy = {
			matches: function(continuation) { return true; },
			execute: function(continuation) { invoked = true; }
		};
		
		$.continuations.applyPolicy(customPolicy);
		$.continuations.process({ success: true });
		
		expect(invoked).toEqual(true);
	});
});

describe('End to end custom continuation tests', function() {
	var theContinuation;
	var server;
	beforeEach(function() {
		theContinuation = {
			customProperty: 'Test'
		};
		server = sinon.fakeServer.create();
	});
	afterEach(function () {
        server.restore();
		$.continuations.reset();
    });
	
	it('should invoke custom policy for custom property', function() {
		var builder = function() { return JSON.stringify(theContinuation) };
		$.continuations.bind('AjaxStarted', function(request) {
			server.respondWith([200,
				{ 'Content-Type': 'application/json', 'X-Correlation-Id': request.correlationId}, builder()
			]);
		});
		var invoked = false;
		runs(function() {
			$.continuations.applyPolicy({
				matches: function(continuation) { return continuation.customProperty == 'Test'; },
				execute: function() { invoked = true; }
			});
			$.ajax({ url: '/customprop' });
			server.respond();
		});
		
		waits(500);
		
		runs(function() {
			expect(invoked).toEqual(true);
		});
	});
});

describe('Custom options tester', function() {
	var server;
	var continuationBuilder;
	beforeEach(function() {
		server = sinon.fakeServer.create();
		continuationBuilder = function() { return JSON.stringify({}) };
	});
	afterEach(function () {
        server.restore();
		$.continuations.reset();
    });
	
	it('should persist options passed to ajax', function() {
		$.continuations.bind('AjaxStarted', function(request) {
			server.respondWith([200, { 
					'Content-Type': 'application/json', 
					'X-Correlation-Id': request.correlationId
				}, continuationBuilder()
			]);
		});
		var invoked = false;
		runs(function() {
			$.continuations.applyPolicy({
				matches: function(continuation) { return continuation.options.customProperty == 'some random value'; },
				execute: function() { invoked = true; }
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
		
		runs(function() {
			expect(invoked).toEqual(true);
		});
	});
});

describe('continuation tester', function() {
	var theContinuation;
	beforeEach(function() {
		theContinuation = new $.continuations.continuation();
	});
	
	it('should not be correlated if the correlation id is not set', function() {
		expect(theContinuation.isCorrelated()).toEqual(false);
	});
	
	it('should be correlated if the correlation id is set', function() {
		theContinuation.correlationId = '123';
		expect(theContinuation.isCorrelated()).toEqual(true);
	});
});

// And now for the error handling
describe('Global error handling', function() {
    var theServer;
    var theStatusCode;
    var theContinuation;
    var theResponse;
    var theOriginal;
	beforeEach(function() {
		theStatusCode = 500;
        theServer = sinon.fakeServer.create();
		theServer.respondWith([theStatusCode, { 'Content-Type': 'text/html', 'X-Correlation-Id': '1234' }, '' ]);
        
        theContinuation = new $.continuations.continuation();
        theContinuation.statusCode = theStatusCode;
        
        theOriginal = $.continuations.buildError;
        $.continuations.buildError = sinon.spy(function(response) {
            theResponse = response;
            return theContinuation;
        });
        
        sinon.stub($.continuations, 'process');
        
        runs(function() {
            $.ajax();
            theServer.respond();
        });
        
        waits(500);
	});
	afterEach(function () {
        theServer.restore();
        $.continuations.buildError = theOriginal;
        $.continuations.process.restore();
		$.continuations.reset();
    });
    
    it('builds the error continuation', function() {
        expect($.continuations.buildError.called).toEqual(true);
        expect(theResponse.status).toEqual(theStatusCode);
    });
    
    it('processes the errors', function() {
        expect($.continuations.process.called).toEqual(true);
        var response = $.continuations.process.getCall(0).args[0];
        expect(response.statusCode).toEqual(theStatusCode);
    });
});

describe('when building an error continuation for a response that is not json', function() {
    var theServer;
    var theStatusCode;
    var theContinuation;
    
	beforeEach(function() {
		theStatusCode = 501;
        theServer = sinon.fakeServer.create();
		theServer.respondWith([theStatusCode, { 'Content-Type': 'text/html', 'X-Correlation-Id': '1234' }, '<html></html>' ]);
        
        sinon.stub($.continuations, 'process');
        
        $.ajax();
        theServer.respond();
        theContinuation = $.continuations.process.getCall(0).args[0];
	});
	afterEach(function () {
        theServer.restore();
        $.continuations.process.restore();
		$.continuations.reset();
    });
    
    it('sets the status code', function() {
        expect(theContinuation.statusCode).toEqual(theStatusCode);
    });
    
    it('sets the success flag', function() {
        expect(theContinuation.success).toEqual(false);
    });
    
    it('sets the response', function() {
        expect(theContinuation.response.getResponseHeader('Content-Type')).toEqual('text/html');
    });
});

describe('when building an error continuation for a response that is json', function() {
    var theServer;
    var theStatusCode;
    var theServerContinuation;
    var theContinuation;
    
	beforeEach(function() {
		theStatusCode = 501;
        
        theServerContinuation = new $.continuations.continuation();
        theServerContinuation.customProperty = 'Hello';
        var builder = function() { return JSON.stringify(theServerContinuation) };
        
        theServer = sinon.fakeServer.create();
        theServer.respondWith([theStatusCode, { 'Content-Type': 'application/json', 'X-Correlation-Id': '1234'}, builder() ]);

        sinon.stub($.continuations, 'process');
        
        $.ajax();
        theServer.respond();
        theContinuation = $.continuations.process.getCall(0).args[0];
	});
	afterEach(function () {
        theServer.restore();
        $.continuations.process.restore();
		$.continuations.reset();
    });
    
    it('uses the continuation from the response', function() {
        expect(theContinuation.customProperty).toEqual(theServerContinuation.customProperty);
    });

    it('sets the response', function() {
        expect(theContinuation.response.getResponseHeader('Content-Type')).toEqual('application/json');
    });
});

describe('Continuation builder tests', function() {
	var theValues = null;
	var theContinuation = null;
	
	beforeEach(function() {
		theValues = {};
		// hello
		theContinuation = $.continuations.create(theValues);
	});
	
	it('creates the canonical continuation type', function() {
		expect(theContinuation.errors).toEqual([]);
	});
});

describe('continuation tests', function() {
	var theContinuation = null;
	
	beforeEach(function() {
		theContinuation = new $.continuations.continuation();
		theContinuation.errors = [ {id: '1'}, {id: '2'}, {id: '3'}];
	});
	
	it('iterates each error', function() {
		var theErrors = [];
		theContinuation.eachError(function(error) {
			theErrors.push(error);
		});
		
		expect(theErrors).toEqual(theContinuation.errors);
	});
});