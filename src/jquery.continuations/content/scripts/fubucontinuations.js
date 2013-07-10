// fubucontinuations v2.0.0
//
// Copyright (C)2011-2013 Joshua Arnold, Jeremy Miller
// Distributed Under Apache License, Version 2.0
//
// https://github.com/DarthFubuMVC/jquery-continuations

(function () {

  var exports = {};
  if (typeof (window['$fubu']) == 'undefined') {
    window['$fubu'] = exports;
  }

  var define = function (key, value) {
    exports[key] = value;
  };

  var CORRELATION_ID = 'X-Correlation-Id';

  function Continuation() {
    // SAMPLE: defaultProperties
    this.errors = [];
    this.success = false;
    this.refresh = false;
    this.contentType = 'application/json';
    this.correlationId = null;
    this.options = {};
    // ENDSAMPLE
  }

  Continuation.prototype = {
    isAjax: function () {
      return this.contentType.indexOf('json') != -1;
    },
    isHtml: function () {
      return this.contentType.indexOf('html') != -1;
    },
    matchOnProperty: function (prop, predicate) {
      return typeof (this[prop]) !== 'undefined' && predicate(this[prop]);
    },
    matchOnOption: function (prop, predicate) {
      if (typeof (predicate) != 'function') {
        predicate = function () { return true; };
      }

      return typeof (this.options[prop]) !== 'undefined' && predicate(this.options[prop]);
    },
    isCorrelated: function () {
      return this.matchOnProperty('correlationId', function (id) {
        return id != null;
      });
    },
    eachError: function (action) {
      if (!this.errors) return;

      for (var i = 0; i < this.errors.length; i++) {
        action(this.errors[i]);
      }
    }
  };

  var refreshPolicy = function () {
    this.matches = function (continuation) {
      return continuation.refresh && continuation.refresh.toString() === 'true';
    };
    this.execute = function (continuation) {
      $fubu.continuations.windowService.refresh();
    };
  };

  var navigatePolicy = function () {
    this.matches = function (continuation) {
      return continuation.navigatePage != undefined && continuation.navigatePage != '';
    };
    this.execute = function (continuation) {
      $fubu.continuations.windowService.navigateTo(continuation.navigatePage);
    };
  };

  var errorPolicy = function () {
    this.matches = function (continuation) {
      return continuation.errors && continuation.errors.length != 0;
    };
    this.execute = function (continuation) {
      $fubu.continuations.trigger('ContinuationError', continuation);
    };
  };

  var httpErrorPolicy = function () {
    this.matches = function (continuation) {
      return continuation.matchOnProperty('statusCode', function (code) { return code != 200; });
    };
    this.execute = function (continuation) {
      $fubu.continuations.trigger('HttpError', continuation);
    };
  };

  function ContinuationController() {
    this.policies = [];
    this.reset();
  }

  ContinuationController.prototype = {
    bind: function (topic, callback) {
      if (!this.callbacks[topic]) {
        this.callbacks[topic] = [];
      }

      this.callbacks[topic].push(callback);
    },
    // Mostly public for testing
    trigger: function (topic, payload, context) {
      if (!payload) {
        payload = {};
      }

      if (!this.callbacks[topic]) {
        this.callbacks[topic] = [];
      }

      if (!context) {
        context = {
          topic: topic
        };
      }

      var actions = this.callbacks[topic];
      for (var i = 0; i < actions.length; i++) {
        actions[i].call(context, payload);
      }

      if (topic != '*') {
        this.trigger('*', payload, { topic: topic });
      }
    },
    parseContinuation: function (response) {
      var continuation = new Continuation();
      continuation.success = false;

      var header = response.header('Content-Type');
      if (header && header.indexOf('json') != -1) {
        continuation = JSON.parse(response.text());
      }

      // SAMPLE: additionalProperties
      continuation.contentType = header; // Content-Type HTTP header
      continuation.statusCode = response.status();
      continuation.correlationId = response.header(CORRELATION_ID);
      // ENDSAMPLE
      
      return continuation;
    },
    applyPolicy: function (policy) {
      this.policies.push(policy);
      return this;
    },
    // Mostly for testing
    reset: function () {
      this.policies.length = 0;
      this.applyPolicy(new refreshPolicy());
      this.applyPolicy(new navigatePolicy());
      this.applyPolicy(new errorPolicy());
      this.applyPolicy(new httpErrorPolicy());
      this.callbacks = {};
    },
    create: function (source) {
      var continuation = new Continuation();
      if (source) {
        for (var prop in source) {
          continuation[prop] = source[prop];
        }
      }
      return continuation;
    },
    process: function (continuation) {
      continuation = this.create(continuation);

      var matchingPolicies = [];
      for (var i = 0; i < this.policies.length; ++i) {
        var p = this.policies[i];
        if (p.matches(continuation)) {
          matchingPolicies.push(p);
        }
      }

      for (var i = 0; i < matchingPolicies.length; ++i) {
        matchingPolicies[i].execute(continuation);
      }
    },
    windowService: {
      refresh: function () {
        window.location.reload();
      },
      navigateTo: function (url) {
        window.location = url;
      }
    }
  };

  var module = new ContinuationController();
  module.continuation = Continuation;
  module.CORRELATION_ID = CORRELATION_ID;
  module.fn = ContinuationController.prototype;

  define('continuations', module);
}());