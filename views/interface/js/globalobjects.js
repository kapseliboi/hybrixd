Decimal.set({ precision: 64 }); // make sure Decimal precision is set to 64!

Zcache = {};                    // browser cache objects in which all must be compressed!

intervals = {};   // stores timing intervals

assets = {
  count : 0,       // amount of assets
  init  : [],      // initialization status
  mode  : {},      // mode of assets
  modehashes : {}, // mode hashes
  seed  : {},      // cryptoseeds of assets
  keys  : {},      // keys of assets
  addr  : {},      // public addresses of assets
  cntr  : {},      // stored contract pointer, location or address
  fact  : {},      // factor of assets
  fees  : {}       // fees of assets
};

//
// global functions
//

logger = function(text) {
  console.log(text);
}

// Jquery extension to animate/pulsate an element
$.fn.pulse = function(options) {

    var options = $.extend({
        times: 3,
        duration: 1000
    }, options);

    var period = function(callback) {
        $(this).animate({opacity: 0}, options.duration, function() {
            $(this).animate({opacity: 1}, options.duration, callback);
        });
    };
    return this.each(function() {
        var i = +options.times, self = this,
        repeat = function() { --i && period.call(self, repeat) };
        period.call(this, repeat);
    });
};
