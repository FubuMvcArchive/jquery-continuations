// fubucontinuations.angular.js v2.0.0
//
// Copyright (C)2013 Joshua Arnold, Jeremy Miller
// Distributed Under Apache License, Version 2.0
//
// https://github.com/DarthFubuMVC/jquery-continuations

(function (continuations, angular) {

  function angularResponseAdapter(config) {
    this.config = config;
  }

  angularResponseAdapter.prototype = {
    header: function (key) {
      if (angular.isFunction(this.config.headers)) {
        return this.config.headers(key);
      }
      
      return this.config.headers[key];
    },
    text: function() {
      return this.data;
    },
    status: function() {
      return this.status;
    }
  };

  var module = angular.module('$fubucontinuations', []);

  module.factory('angularContinuationAdapter', function($q) {
    return {
      request: function(config) {
        var id = config.correlationId;
        if (typeof(id) === 'undefined') {
          id = new Date().getTime().toString();
        }

        config.headers[continuations.CORRELATION_ID] = id;

        continuations.trigger('AjaxStarted', {
          correlationId: id
        });

        return config || $q.when(config);
      },
      response: function(response) {
        var adapter = new angularResponseAdapter(response);
        var continuation = continuations.parseContinuation(adapter);
        continuation.response = response;

        var config = response.config;
        var options = config.options;
        if (typeof (options) === 'undefined') {
          options = {};
        }

        continuation.options = options;

        if (angular.isFunction(config.continuationSuccess)) {
          config.continuationSuccess(continuation);
        }

        continuations.process(continuation);
        
        continuations.trigger('AjaxCompleted', {
          correlationId: continuation.correlationId
        });

        return config || $q.when(config);
      }
    };
  });

}($fubu.continuations, angular));