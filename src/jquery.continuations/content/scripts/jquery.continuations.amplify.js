// jquery.continuations.amplify v0.2.3
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

	continuations.resetAmplify = function() {
		continuations.applyPolicy(new payloadPolicy());
		continuations.bind('*', function(payload) {
			amplify.publish(this.topic, payload);
		});
	};
	
	continuations.resetAmplify();
	
}(jQuery.continuations));