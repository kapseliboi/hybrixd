
  // fill local usercrypto object with keys and nonce later on
  GL = {
    usercrypto:{ user_keys: args.user_keys, nonce: args.nonce }
  }

  // retrieve modes supported by node
  GL.cur_step = next_step();
  $.ajax({ url: path+zchan(GL.usercrypto,GL.cur_step,'l/asset/modes'),
    success: function(object){
      object = zchan_obj(GL.usercrypto,GL.cur_step,object);
      GL.assetmodes=object.data;
      // retrieve names supported by node
      GL.cur_step = next_step();
      $.ajax({ url: path+zchan(GL.usercrypto,GL.cur_step,'l/asset/names'),
        success: function(object){
          object = zchan_obj(GL.usercrypto,GL.cur_step,object);
          GL.assetnames=object.data;

          // Switch to dashboard view
          fetchview('interface.dashboard',args);

        }
      });
    }
  });

  // once every minute, loop through proof-of-work queue
  setInterval(function() {
    var payload = powqueue.shift();
    if(typeof payload!=='undefined') {
      // attempt to send proof-of-work to node
      hybriddcall({r:'s/storage/pow/'+payload,z:0},0, function(object) {});
    }
  },60000);
