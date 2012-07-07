# jquery.continuations

## First things first
The first thing you need to know is what an Ajax Continuation actually is. [You can read about them here](https://github.com/DarthFubuMVC/jquery-continuations/wiki/Continuation-object).

## Now, let's talk about the pipeline
The continuation objects are processed by what we call our "pipeline" of policies. It tends to make more sense if you read about the pipeline before the policies themselves. [You can read all about that here](https://github.com/DarthFubuMVC/jquery-continuations/wiki/The-Continuation-Pipeline).

## Cool, now what's a policy?
Their structure is simple but they're extremely powerful. [Go here to find out why](https://github.com/DarthFubuMVC/jquery-continuations/wiki/Continuation-policy).

## How do I make my own?
See [Creating a custom policy](https://github.com/DarthFubuMVC/jquery-continuations/wiki/Creating-a-custom-policy)

## USEFUL (more advanced) topics
A few other things that you should know about jquery.continuations:
* [correlatedSubmit does a lot of work for you](https://github.com/DarthFubuMVC/jquery-continuations/wiki/correlatedSubmit)
* [You can specify custom properties](https://github.com/DarthFubuMVC/jquery-continuations/wiki/Using-custom-properties)

### Additional Reading

Some links for more information on jquery.continuations:

* http://lostechies.com/josharnold/2012/01/06/our-ajax-conventions-the-ajaxcontinuation/
* http://lostechies.com/josharnold/2012/01/06/our-ajax-conventionsclientside-continuations/
* http://lostechies.com/josharnold/2012/01/07/our-ajax-conventionsrequest-correlation/
* http://lostechies.com/josharnold/2012/01/08/our-ajax-conventionsvalidation/

### Dependencies

* jquery.continuations.js a dependency on jQuery (>= 1.6.2).
* jQuery.continuations.forms.js has a dependency on jquery.continuation.js and jQuery.form (>= 2.94)
* jQuery.continuations.amplify.js has a dependency on jquery.continuations.js and amplify.core.js (>=  1.1.0)