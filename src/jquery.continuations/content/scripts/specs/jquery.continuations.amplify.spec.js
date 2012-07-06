afterEach(function() {
    $.continuations.callbacks = {};
});

describe('amplify publishing', function() {
    it('publishes each topic through amplify', function() {
        var topics = ['AjaxStarted', 'AjaxCompleted', 'ContinuationError', 'HttpError'];
        var msgs = {};
        
        var forEachTopic = function(action) {
            for(var i = 0; i < topics.length; i++) {
                action(topics[i]);
            }
        };
        
        for(var i = 0; i < topics.length; i++) {
            var topic = topics[i];
            amplify.subscribe(topic, function(payload) {
                msgs[topic] = true;
                return true;
            });
        }
        
        for(var i = 0; i < topics.length; i++) {
            var topic = topics[i];
            $.continuations.trigger(topic, {});
        }
        
        for(var i = 0; i < topics.length; i++) {
            var topic = topics[i];
            expect(msgs[topic]).toEqual(true);
        }
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