// jquery.continuations.amplify v0.1.2
//
// Copyright (C)2011 Joshua Arnold, Jeremy Miller
// Distributed Under Apache License, Version 2.0
//
// https://github.com/DarthFubuMVC/jquery-continuations

(function (continuations) {

    var payloadPolicy = function () {
        this.matches = function (continuation) {
            return continuation.topic != null && continuation.payload != null;
        };
        this.execute = function (continuation) {
            amplify.publish(continuation.topic, continuation.payload);
        };
    };
    
    continuations.applyPolicy(new payloadPolicy());

	// TODO -- This is stupid. Need to just support wildcards
    var topics = ['AjaxStarted', 'AjaxCompleted', 'ContinuationError', 'HttpError'];
    for(var i = 0; i < topics.length; i++) {
        var topic = topics[i];
        continuations.bind(topic, (function (topicScoped) {
            return function(payload) {
                amplify.publish(topicScoped, payload);
            };
        })(topic));
    }
}(jQuery.continuations));