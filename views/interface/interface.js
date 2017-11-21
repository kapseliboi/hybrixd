
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
