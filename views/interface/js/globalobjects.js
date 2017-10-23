Decimal.set({ precision: 64 }); // make sure Decimal precision is set to 64!

Zcache = {};                    // browser cache objects in which all must be compressed!

intervals = {};   // stores timing intervals

assets = {};      // list of assets
assets.count = 0; // amount of assets
assets.init = [];
assets.mode = {}; // mode of assets
assets.modehashes = {}; // mode hashes
assets.seed = {}; // cryptoseeds of assets
assets.keys = {}; // keys of assets
assets.addr = {}; // public addresses of assets
assets.fact = {}; // factor of assets
assets.fees = {}; // fees of assets

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