// jquery.continuations.amplify v0.1.1
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

    var topics = ['AjaxStarted', 'AjaxCompleted', 'ContinuationError'];
    for(var i = 0; i < topics.length; i++) {
        var topic = topics[i];
        continuations.bind(topic, function(payload) {
            amplify.publish(topic, payload);
        });
    }
}(jQuery.continuations));