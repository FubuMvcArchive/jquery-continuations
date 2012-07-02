# jQuery.continutions

## Overview

jQuery.continuations provides a standarized way of processing Ajax responses via [the Continuation object](https://github.com/DarthFubuMVC/jquery-continuations/wiki/Continuation-object). The idea is that for most cases,
your server side code will be generated responses that are similar in structure and you want to build a conventional approach to processing those requests.

## How it works

jQuery.continuations hooks into jQuery via the $.ajaxSetup method and provides a global success callback. The callback that is registered kicks off the
$.continuations.process pipeline.

## Processing pipeline

The processing pipeline is orchestrated through [continuation policies](https://github.com/DarthFubuMVC/jquery-continuations/wiki/Continuation-policy). jQuery.continuations comes with several policies that are registered by default:

**errorPolicy**

(_Matches when the error collection is not empty_)

Publishes 'ContinuationError' topic through amplifyjs

**refreshPolicy**

(_Matches when the refresh property is true_)

Simply refreshes the page

**navigatePolicy**

(_Matches when the url property is not empty_)

Navigates the window to the specified url

**payloadPolicy**

(_Matches when the following properties exist: payload, topic_)

Publishes the specified topic and payload through amplifyjs

## Request Correlation

Before each request is initiated, a custom header is appended (X-Correlation-Id). This value originates from one of two sources: 1) randomly assigned for a request 2) the id of the form responsible for the request.

> Note: It's up to your web framework to handle setting the header into its response.

Assuming that you are sending the header back down through your response, jquery.continuations handles it from there by doing two things:

**The AjaxCompleted topic**

This topic is published through the jquery.continuations event aggregator facade (we use amplify). The message that is published contains a correlationId property with the appropriate value.

**The continuation processing pipeline**

Before the continuation is processed, the correlationId property is set.

> jQuery.continuations also integrates with jquery.form by providing a correlatedSubmit method to any form ($('#myForm').correlatedSubmit())

## Custom Policies

An example of how to register a custom policy:

> $.continuations.applyPolicy({ custom policy... })