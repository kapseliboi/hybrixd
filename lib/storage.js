// storage.js :: higher level storage functions
// depends on localforage.nopromises.min.js

var storage = (function() {
  
  var storepath = require('path').normalize(process.cwd()+'/../storage/');
  
  function makeDir(dirname) {
    if (fs.existsSync(dirname)) {
      return true;
    }
    fs.mkdirSync(dirname);
  }

	var storage = {	  

    Set : function(storekey, storevalue, meta) {
      try {
        var fold = storekey.substr(0,2)+'/';
        makeDir(storepath+fold);
        fs.writeFileSync(storepath+fold+storekey, storevalue);
        if(typeof meta==='undefined') {
          meta = {time:Date.now(),hash:DJB2.hash(storevalue),pow:0,res:0};
        }
        fs.writeFileSync(storepath+fold+storekey+'.meta', JSON.stringify(meta));
        return true;
      } catch(e) {
        return false;
      }
    },

    Get : function(storekey, postfunction) {
      if(typeof storekey=='string') {
        var fold = storekey.substr(0,2)+'/';
        if(fs.existsSync(storepath+fold+storekey)) {
          try {
            if(typeof postfunction == 'function') {
                postfunction( String(fs.readFileSync(storepath+fold+storekey)) );
                if(fs.existsSync(storepath+fold+storekey+'.meta')) {
                  var meta = JSON.parse(String(fs.readFileSync(storepath+fold+storekey+'.meta')));
                  meta.read = Date.now();
                  fs.writeFileSync(storepath+fold+storekey+'.meta', JSON.stringify(meta));
                }
            }
          } catch(e) {
            if(typeof postfunction == 'function') {
              postfunction(null);
            }
          }
        } else { if(typeof postfunction == 'function') { postfunction(null); } }
      } else { if(typeof postfunction == 'function') { postfunction(null); } }
    },

    Del : function(storekey) {
      try {
        var fold = storekey.substr(0,2)+'/';
        fs.unlinkSync(storepath+fold+storekey);
        fs.unlinkSync(storepath+fold+storekey+'.meta');
        return true;
      } catch(e) {
        return false;
      }
    },
    
    GetMeta : function(storekey, postfunction) {
      if(typeof storekey=='string') {
        var fold = storekey.substr(0,2)+'/';
        if(fs.existsSync(storepath+fold+storekey+'.meta')) {
          try {
            if(typeof postfunction === 'function') {
              var meta = JSON.parse(String(fs.readFileSync(storepath+fold+storekey+'.meta')));
              postfunction( meta );
            }
          } catch(e) {
            if(typeof postfunction === 'function') {
              postfunction(null);
            }
          }
        } else { if(typeof postfunction === 'function') { postfunction(null); } }
      } else { if(typeof postfunction === 'function') { postfunction(null); } }
    },

    SetMeta : function(storekey, meta) {
      try {
        var fold = storekey.substr(0,2)+'/';
        makeDir(storepath+fold);
        if(typeof meta==='undefined') {
          meta = {time:Date.now(),hash:DJB2.hash(storevalue),pow:0,res:0};
        }
        fs.writeFileSync(storepath+fold+storekey+'.meta', JSON.stringify(meta));
        return true;
      } catch(e) {
        return false;
      }
    },    

  }

  return storage;

})();

if (typeof define === 'function' && define.amd) {
  define(function () { return storage; });
} else if( typeof module !== 'undefined' && module != null ) {
  module.exports = storage;
} else if( typeof angular !== 'undefined' && angular != null ) {
  angular.module('storage', [])
  .factory('storage', function () {
    return storage;
  });
}
