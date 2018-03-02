
  // fill local usercrypto object with keys and nonce later on
  GL = {
    usercrypto:{ user_keys: args.user_keys, nonce: args.nonce },
    powqueue:[]
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

  // once every two minutes, loop through proof-of-work queue
  setInterval(function() {
    var req = GL.powqueue.shift();
    if(typeof req !== 'undefined') {
      // attempt to send proof-of-work to node
      proofOfWork.solve(req.split('/')[1],
        function(proof){ 
          // DEBUG: 
          logger('submitting storage proof: '+req.split('/')[0]+'/'+proof);
          hybriddcall({r:'s/storage/pow/'+req.split('/')[0]+'/'+proof,z:0},0, function(object) {});
        },
        function(){ 
          // DEBUG: 
          logger('failed storage proof: '+req.split('/')[0]);
        }
      );
    }
  },120000);
