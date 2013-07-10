// SAMPLE: prototypeExample
$fubucontinuations.fn.myPropertyExists = function () {
  return typeof(this['someProperty']) != 'undefined';
};
// ENDSAMPLE

// SAMPLE: continuationSuccessExample
$.ajax({
  url: '/continuations/123' ,
  type: 'get',
  dataType: 'json',
  continuationSuccess: function(continuation) {
    console.log(continuation);
  }
});
// ENDSAMPLE

// SAMPLE: continuationErrorExample
$.ajax({
  url: '/continuation-errors/123' ,
  type: 'get',
  dataType: 'json',
  continuationError: function(continuation) {
    console.log(continuation);
  }
});
// ENDSAMPLE

// SAMPLE: matchesExample
matches: function(continuation) { 
    return continuation.statusCode == 200; 
}
// ENDSAMPLE

// SAMPLE: executeExample
execute: function(continuation) { 
    console.log(continuation.errors);
}
// ENDSAMPLE

// SAMPLE: registrationExample
$fubucontinuations.applyPolicy(myPolicy);
// ENDSAMPLE

// SAMPLE: bindExample
$fubucontinuations.bind('ContinuationError', function(continuation) {
    myErrorModule.render(continuation.errors);
});
// ENDSAMPLE

// SAMPLE: propertiesExample
$.ajax({
    url: 'test/something',
    type: 'get',
    options: {
        el: $('#my-element')
    },
    continuationSuccess: function(continuation) {
        continuation.options.el.html('Hello, World');
    }
});
// ENDSAMPLE

// SAMPLE: matchOnOption
var customPropertyPolicy = {
    matches: function(continuation) {
        return continuation.matchOnOption('el', function(el) {
            return el.size() != 0;
        });
    },
    execute: function(continuation) {
        continuation.el.html('Hello, World');
    }
};

$fubucontinuations.applyPolicy(customPropertyPolicy);
// ENDSAMPLE

// SAMPLE: correlatedSubmitWithProperties
$('#theForm').correlatedSubmit({
    myCustomProperty: '1234'
});
// ENDSAMPLE

// SAMPLE: correlatedSubmit
$('#theForm').correlatedSubmit({
    continuationSuccess: function(continuation) {
        continuation.form.attr('id') == 'theForm'; // true
    }
});
// ENDSAMPLE