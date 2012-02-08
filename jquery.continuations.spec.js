describe('Global jQuery conventions', function () {
    // these should prove to be beneficial for showing loading animations
    it('should publish the AjaxStarted topic when a request starts', function () {
        var invoked = false;
        runs(function () {
            amplify.subscribe('AjaxStarted', function () {
                invoked = true;
            });

            $.ajax({
                url: '', // should request the current page
                type: 'get'
            });
        });

        waits(1000);

        runs(function () {
            expect(invoked).toEqual(true);
        });
    });

    it('should published the AjaxCompleted topic when a request completes', function () {
        var invoked = false;
        runs(function () {
            amplify.subscribe('AjaxCompleted', function () {
                invoked = true;
            });

            $.ajax({
                url: '', // should request the current page
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
    });

    it('should match request/response headers to track each request', function () {
        var startingId = '';
        var completedId = '';

        amplify.subscribe('AjaxStarted', function (request) {
            startingId = request.correlationId;
            // if it hangs, we never got the topic
            server.respondWith([200,
                { 'Content-Type': 'application/json', 'X-Correlation-Id': startingId }, '{success: true}'
            ]);
        });

        amplify.subscribe('AjaxCompleted', function (response) {
            completedId = response.correlationId;
        });

        runs(function () {
            $.ajax({
                url: '/testing'
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
        amplify.subscribe('ContinuationError', function (continuation) {
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
        amplify.subscribe('ContinuationError', function (continuation) {
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

describe('Integrated payload policy tests', function () {
    var server;
    beforeEach(function () {
        server = sinon.fakeServer.create();
    });
    afterEach(function () {
        server.restore();
    });

    it('should publish the topic/payload when the continuation has a topic and payload', function () {
        server.respondWith([200,
            { 'Content-Type': 'application/json' }, '{"topic": "something", "payload": "else"}'
        ]);

        var invoked = false;
        amplify.subscribe('something', function (value) {
            invoked = value == "else";
        });

        runs(function () {
            $.ajax({
                url: '/payload',
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

    it('should not publish the topic/payload when the continuation does not have a topic and payload', function () {
        server.respondWith([200,
            { 'Content-Type': 'application/json' }, '{"success": "true"}'
        ]);

        var invoked = false;
        amplify.subscribe('something', function (value) {
            invoked = true;
        });

        runs(function () {
            $.ajax({
                url: '/payload',
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

describe('Integrated correlatedSubmit tests', function () {
	var server;
    beforeEach(function () {
        server = sinon.fakeServer.create();
    });
    afterEach(function () {
        server.restore();
    });
	
	it('should set form on the continuation', function() {
		var form = $('<form id="mainForm" action="/correlate" method="post"></form>');
        var id = '';
		
		amplify.subscribe('AjaxStarted', function(request) {
			server.respondWith([200,
				{ 'Content-Type': 'application/json', 'X-Correlation-Id': request.correlationId}, '{"success":"true"}'
			]);
		});
		
		$.continuations.applyPolicy({
			matches: function(continuation) {
				return continuation.matchOnProperty('form', function(form) {
					return form.size() != 0;
				});
			},
			execute: function(continuation) {
				id = continuation.form.attr('id');
			}
		});

        runs(function () {
            form.correlatedSubmit();
			server.respond();
        });

        waits(500);

        runs(function () {
            expect(id).toEqual('mainForm');
        });
	});
	
	it('should correlate the request via the id of the form', function() {
		var form = $('<form id="mainForm" action="/correlate" method="post"></form>');
        var id = '';
		amplify.subscribe('AjaxStarted', function(request) {
			server.respondWith([200,
				{ 'Content-Type': 'application/json', 'X-Correlation-Id': request.correlationId}, '{"success":"true"}'
			]);
		});
        amplify.subscribe('AjaxCompleted', function (response) {
            id = response.correlationId;
        });

        runs(function () {
            form.correlatedSubmit();
			server.respond();
        });

        waits(500);

        runs(function () {
            expect(id).toEqual('mainForm');
        });
	});
	
	it('should correlate the request via the specified correlation id', function() {
		var form = $('<form id="mainForm" action="/correlate" method="post"></form>');
		var id = '';
		amplify.subscribe('AjaxStarted', function(request) {
			server.respondWith([200,
				{ 'Content-Type': 'application/json', 'X-Correlation-Id': request.correlationId}, '{"success":"true"}'
			]);
		});
        amplify.subscribe('AjaxCompleted', function (response) {
            id = response.correlationId;
        });

        runs(function () {
            form.correlatedSubmit({
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

describe('Integrated correlatedAjax tests', function () {
	var server;
    beforeEach(function () {
        server = sinon.fakeServer.create();
    });
    afterEach(function () {
        server.restore();
    });
	
	it('should correlate the request via the specified correlation id', function() {
		var id = '';
		amplify.subscribe('AjaxStarted', function(request) {
			server.respondWith([200,
				{ 'Content-Type': 'application/json', 'X-Correlation-Id': request.correlationId}, '{"success":"true"}'
			]);
		});
        amplify.subscribe('AjaxCompleted', function (response) {
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
		amplify.subscribe('AjaxStarted', function(request) {
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
		amplify.subscribe('AjaxStarted', function(request) {
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
	
	it('should persist options passed to correlatedSubmit', function() {
		amplify.subscribe('AjaxStarted', function(request) {
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
			
			var form = $('<form id="mainForm" action="/correlate" method="post"></form>');
			form.correlatedSubmit({
				customProperty: 'some random value'
			});
			server.respond();
		});
		
		waits(500);
		
		runs(function() {
			expect(invoked).toEqual(true);
		});
	});
});

describe('integrated success callback tests', function() {
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
	
	it('should invoke success callback from correlatedSubmit', function() {
		amplify.subscribe('AjaxStarted', function(request) {
			server.respondWith([200, { 
					'Content-Type': 'application/json', 
					'X-Correlation-Id': request.correlationId
				}, continuationBuilder()
			]);
		});
		var invoked = false;
		runs(function() {
			var form = $('<form id="mainForm" action="/correlate" method="post"></form>');
			form.correlatedSubmit({
				continuationSuccess: function(continuation) {
					invoked = true;
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