// fubucontinuations.jquery.js v2.0.0
//
// Copyright (C)2011-2013 Joshua Arnold, Jeremy Miller
// Distributed Under Apache License, Version 2.0
//
// https://github.com/DarthFubuMVC/jquery-continuations

(function ($, continuations) {

  function redirectPolicy() {
    this.matches = function (continuation) {
      // TODO -- Harden this against the proper statuses
      return continuation.matchOnProperty('statusCode', function (c) { return c != 200; })
          && continuation.matchOnProperty('response', function (r) { return r.getResponseHeader('Location'); });
    };
    this.execute = function (continuation) {
      var url = continuation.response.getResponseHeader('Location');
      continuations.windowService.navigateTo(url);
    };
  }

  function jQueryResponse(response) {
    this.response = response;
  }

  jQueryResponse.prototype = {
    header: function (key) {
      return this.response.getResponseHeader(key);
    },
    text: function () {
      return this.response.responseText;
    },
    status: function () {
      return this.response.status;
    }
  };

  function jQueryController() {
  }

  jQueryController.prototype = {
    setupRequest: function (jqxhr, settings) {
      var id = settings.correlationId;
      if (typeof (id) === 'undefined') {
        id = new Date().getTime().toString();
      }

      jqxhr.setRequestHeader(continuations.CORRELATION_ID, id);

      continuations.trigger('AjaxStarted', {
        correlationId: id
      });
    },
    onSuccess: function (e, jqxhr, settings) {
      var response = new jQueryResponse(jqxhr);
      var continuation = continuations.parseContinuation(response);
      continuation.response = jqxhr;

      var options = settings.options;
      if (typeof (options) === 'undefined') {
        options = {};
      }

      continuation.options = options;

      if ($.isFunction(settings.continuationSuccess)) {
        settings.continuationSuccess(continuation);
      }

      continuations.process(continuation);
    },
    onError: function (jqxhr, settings) {
      var process = true;
      var response = new jQueryResponse(jqxhr);
      var continuation = continuations.parseContinuation(response);
      continuation.response = jqxhr;

      if ($.isFunction(settings.continuationError)) {
        process = !(settings.continuationError(continuation) === false);
      }

      if (process) {
        continuations.process(continuation);
      }
    }
  };

  var jQueryContinuations = new jQueryController();

  $(document).ajaxSend(function (e, jqxhr, settings) {
    jQueryContinuations.setupRequest(jqxhr, settings);
  });

  $(document).ajaxComplete(function (e, jqxhr) {
    continuations.trigger('AjaxCompleted', {
      correlationId: jqxhr.getResponseHeader($fubu.continuations.CORRELATION_ID)
    });
  });

  $(document).ajaxError(function (e, jqxhr, settings) {
    jQueryContinuations.onError(jqxhr, settings);
  });

  $(document).ajaxSuccess(function (e, response, settings) {
    jQueryContinuations.onSuccess(e, response, settings);
  });

  continuations.applyPolicy(new redirectPolicy());
  continuations.jQuery = jQueryContinuations;
  continuations.jQuery.redirectPolicy = redirectPolicy;

}(jQuery, $fubu.continuations));