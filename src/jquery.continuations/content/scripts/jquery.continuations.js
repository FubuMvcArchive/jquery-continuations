// jquery.continuations v1.1.0.18
//
// Copyright (C)2011-2013 Joshua Arnold, Jeremy Miller
// Distributed Under Apache License, Version 2.0
//
// https://github.com/DarthFubuMVC/jquery-continuations

(function ($) {

    var CORRELATION_ID = 'X-Correlation-Id';
    var policies = [];
	
	function theContinuation() {
        this.errors = [];
        this.success = false;
        this.refresh = false;
		this.contentType = 'application/json';
        this.correlationId = null;
        this.options = { };
    }
    theContinuation.prototype = {
		isAjax: function() {
			return this.contentType.indexOf('json') != -1;
		},
		isHtml: function() {
			return this.contentType.indexOf('html') != -1;
		},
		matchOnProperty: function(prop, predicate) {
			return typeof(this[prop]) !== 'undefined' && predicate(this[prop]);
		},
        isCorrelated: function () {
			return this.matchOnProperty('correlationId', function(id) {
				return id != null;
			});
        },
		eachError: function(action) {
			if(!this.errors) return;
			
			for(var i = 0; i < this.errors.length; i++) {
				action(this.errors[i]);
			}
		}
    };

    var refreshPolicy = function () {
        this.matches = function (continuation) {
            return continuation.refresh && continuation.refresh.toString() === 'true';
        };
        this.execute = function (continuation) {
            $.continuations.windowService.refresh();
        };
    };

    var navigatePolicy = function () {
        this.matches = function (continuation) {
            return continuation.navigatePage != undefined && continuation.navigatePage != '';
        };
        this.execute = function (continuation) {
            $.continuations.windowService.navigateTo(continuation.navigatePage);
        };
    };
    
    var redirectPolicy = function () {
        this.matches = function (continuation) {
            // TODO -- Harden this against the proper statuses
            return continuation.matchOnProperty('statusCode', function(c) { return c != 200; })
                && continuation.matchOnProperty('response', function(r) { return r.getResponseHeader('Location'); });
        };
        this.execute = function (continuation) {
            var url = continuation.response.getResponseHeader('Location');
            $.continuations.windowService.navigateTo(url);
        };
    };

    var errorPolicy = function () {
        this.matches = function (continuation) {
            return continuation.errors && continuation.errors.length != 0;
        };
        this.execute = function (continuation) {
            $.continuations.trigger('ContinuationError', continuation);
        };
    };
    
    var httpErrorPolicy = function () {
        this.matches = function (continuation) {
            return continuation.matchOnProperty('statusCode', function(code) { return code != 200; });
        };
        this.execute = function (continuation) {
            $.continuations.trigger('HttpError', continuation);
        };
    };

    function continuations() { 
        this.callbacks = {};
        this.setupDefaults();
    };
    continuations.prototype = {
        bind: function(topic, callback) {
            if( !this.callbacks[topic] ) {
                this.callbacks[topic] = [];
            }
            
            this.callbacks[topic].push(callback);
        },
        // Mostly public for testing
        trigger: function(topic, payload, context) {
			if(!payload) {
				payload = {};
			}
			
			if( !this.callbacks[topic] ) {
                this.callbacks[topic] = [];
            }
			
			if(!context) {
				context = {
					topic: topic
				};
			}

            var actions = this.callbacks[topic];
            for(var i = 0; i < actions.length; i++) {
				actions[i].call(context, payload);
            }
			
			if(topic != '*') {
				this.trigger('*', payload, {topic: topic});
			}
        },
        onSuccess: function(event, response, settings) {
            var continuation = this.parseContinuation(response);

            var options = settings.options;
            if(typeof(options) === 'undefined') {
                options = {};
            }

            continuation.options = options;

            if($.isFunction(settings.continuationSuccess)) {
                settings.continuationSuccess(continuation);
            }

            this.process(continuation);
        },
        setupDefaults: function () {
            this.applyPolicy(new refreshPolicy());
            this.applyPolicy(new navigatePolicy());
            this.applyPolicy(new redirectPolicy());
            this.applyPolicy(new errorPolicy());
            this.applyPolicy(new httpErrorPolicy());
        },
        onError: function(response, settings) {
            var continuation = this.parseContinuation(response);
			var process = true;
			if($.isFunction(settings.continuationError)) {
				process = !(settings.continuationError(continuation) === false);
			}
			
			if(process) {
				this.process(continuation);
			}
        },
        parseContinuation: function(response) {
            var continuation = new $.continuations.continuation();
            continuation.success = false;
            
			var header = response.getResponseHeader('Content-Type');
            if (header && header.indexOf('json') != -1) {
                continuation = JSON.parse(response.responseText);
            }
            
            continuation.contentType = header;
            continuation.response = response;
            continuation.statusCode = response.status;
            continuation.correlationId = response.getResponseHeader('X-Correlation-Id');
            
            return continuation;
        },
        // Keep this public for form correlation
        setupRequest: function (xhr, settings) {
            // this could come from the ajax options
            var id = settings.correlationId;
            if (typeof(id) === 'undefined') {
                id = new Date().getTime().toString();
            }
            xhr.setRequestHeader(CORRELATION_ID, id);
            $.continuations.trigger('AjaxStarted', {
                correlationId: id
            });
        },
        applyPolicy: function (policy) {
            policies.push(policy);
            return this;
        },
		// Mostly for testing
		reset: function() {
			policies.length = 0;
			this.setupDefaults();
            this.callbacks = {};
		},
        process: function (continuation) {
			continuation= $.continuations.create(continuation);

            var matchingPolicies = [];
            for (var i = 0; i < policies.length; ++i) {
                var p = policies[i];
                if (p.matches(continuation)) {
                    matchingPolicies.push(p);
                }
            }

            for (var i = 0; i < matchingPolicies.length; ++i) {
                matchingPolicies[i].execute(continuation);
            }
        }
    };

    continuations.prototype.windowService = {
        refresh: function () {
            window.location.reload();
        },
        navigateTo: function (url) {
            window.location = url;
        }
    };
    
    var module = new continuations();
    
    $(document).ajaxSend(function(e, jqxhr, settings) {
        module.setupRequest(jqxhr, settings);
    });
    
    $(document).ajaxComplete(function(e, jqxhr) {
        module.trigger('AjaxCompleted', {
            correlationId: jqxhr.getResponseHeader(CORRELATION_ID)
        });
    });
    
    $(document).ajaxError(function(e, jqxhr, settings) {
        module.onError(jqxhr, settings);
    });
    
    $(document).ajaxSuccess(function(e, response, settings) {
        module.onSuccess(e, response, settings);
    });


    // Exports
    $.continuations = module;
    $.continuations.fn = continuations.prototype;
	$.continuations.continuation = theContinuation;
	$.continuations.create = function(values) {
		var continuation = new theContinuation();
		return $.extend(true, continuation, values);
	};

} (jQuery));