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
        if(fs.existsSync(storepath+fold+storekey+'.meta')) {
          var oldmeta = JSON.parse(String(fs.readFileSync(storepath+fold+storekey+'.meta')));
          if(typeof oldmeta.n!=='undefined') { meta.n = oldmeta.n; }
        }
        fs.writeFileSync(storepath+fold+storekey+'.meta', JSON.stringify(meta));
        return true;
      } catch(e) {
        return false;
      }
    },

    Get : function(storekey, postfunction) {
      if(typeof storekey === 'string') {
        var fold = storekey.substr(0,2)+'/';
        if(fs.existsSync(storepath+fold+storekey)) {
          try {
            if(typeof postfunction === 'function') {
                postfunction( String(fs.readFileSync(storepath+fold+storekey)) );
                if(fs.existsSync(storepath+fold+storekey+'.meta')) {
                  var meta = JSON.parse(String(fs.readFileSync(storepath+fold+storekey+'.meta')));
                  meta.read = Date.now();
                  fs.writeFileSync(storepath+fold+storekey+'.meta', JSON.stringify(meta));
                }
            }
          } catch(e) {
            if(typeof postfunction === 'function') {
              postfunction(null);
            }
          }
        } else { if(typeof postfunction === 'function') { postfunction(null); } }
      } else { if(typeof postfunction === 'function') { postfunction(null); } }
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
      if(typeof storekey === 'string') {
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
          meta = {time:Date.now(),hash:DJB2.hash(storevalue),pow:0,res:0,n:0};
        }
        fs.writeFileSync(storepath+fold+storekey+'.meta', JSON.stringify(meta));
        return true;
      } catch(e) {
        return false;
      }
    },

    AutoClean : function() {
      console.log(" [.] module storage: storage auto-clean scan");
      if( !fs.statSync( storepath ).isDirectory() ) {
        fs.mkdirSync(storepath);
      }
      fs.readdir(storepath, function(err, directories){
        // scan storage directories
        directories.sort().forEach(function(fold, dirindex, dirarray) {
          if( fs.statSync( storepath+fold).isDirectory() ) {
            // DEBUG: console.log(" [i] module storage: found directory " + storepath + fold);
            fs.readdir(storepath+fold, function(err, files){
              files.sort().forEach(function(storekey, fileindex, filearray) {
                if( storekey.substr(-5)==='.meta' ) {
                  var fileelement = storepath+fold+'/'+storekey;
                  // DEBUG: console.log(" [i] module storage: test on storage " + fileelement);
                  if(fs.existsSync(fileelement)) {
                    var meta = JSON.parse(String(fs.readFileSync(fileelement)));
                    var mindeadline = Date.now()-(global.hybridd.maxstoragetime*86400)-global.hybridd.maxstoragetime*(864*meta.n);
                    var maxdeadline = Date.now()-((typeof global.hybridd.maxstoragetime!==undefined && global.hybridd.maxstoragetime>=1?global.hybridd.maxstoragetime:365)*86400);
                    if( meta.read<mindeadline || meta.read<maxdeadline ) {
                      var dataelement = fileelement.substr(0,fileelement.length-5);
                      try {
                        fs.unlinkSync(dataelement);
                        fs.unlinkSync(fileelement);
                        console.log(" [i] module storage: purged stale storage element" + dataelement);
                      } catch(e) {
                        console.log(" [!] module storage: failed to purge stale storage " + dataelement);
                      }

                    }
                  }
                }
              });
            });
          }
        });
      });
      return 1;
    }

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
