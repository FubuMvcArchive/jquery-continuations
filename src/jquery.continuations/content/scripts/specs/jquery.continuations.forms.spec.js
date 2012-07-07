describe('Integrated correlatedSubmit tests', function () {
	var server;
    beforeEach(function () {
        server = sinon.fakeServer.create();
    });
    afterEach(function () {
        server.restore();
        $.continuations.reset();
    });
	
	it('should set form on the continuation', function() {
		var form = $('<form id="mainForm" action="/correlate" method="post"></form>');
        var id = '';
		
		$.continuations.bind('AjaxStarted', function(request) {
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
		$.continuations.bind('AjaxStarted', function(request) {
			server.respondWith([200,
				{ 'Content-Type': 'application/json', 'X-Correlation-Id': request.correlationId}, '{"success":"true"}'
			]);
		});
        $.continuations.bind('AjaxCompleted', function (response) {
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
		$.continuations.bind('AjaxStarted', function(request) {
			server.respondWith([200,
				{ 'Content-Type': 'application/json', 'X-Correlation-Id': request.correlationId}, '{"success":"true"}'
			]);
		});
        $.continuations.bind('AjaxCompleted', function (response) {
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
	
	it('should persist options passed to correlatedSubmit', function() {
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
		$.continuations.bind('AjaxStarted', function(request) {
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

describe('integrated error callback tests', function() {
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
	
	it('should invoke error callback from correlatedSubmit', function() {
		$.continuations.bind('AjaxStarted', function(request) {
			server.respondWith([500, { 
					'Content-Type': 'application/json', 
					'X-Correlation-Id': request.correlationId
				}, continuationBuilder()
			]);
		});
		var invoked = false;
		runs(function() {
			var form = $('<form id="mainForm" action="/correlate" method="post"></form>');
			form.correlatedSubmit({
				continuationError: function(continuation) {
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