// hybrid_connect.js - connects to closest hybrid daemon
//
// (c)2016-2017 metasync r&d / internet of coins project
//
$(document).ready(function() {
  init = {};
  cached = {};
  fetchview_path = null;
  fetchview_time = 0;
  path = 'api/';
  console.log('Starting hybridd-connect...');
  // fetch the login view
  fetchview('login', {});
});

function fetchview(viewpath,args) {
  // avoid hitting the server with requests if fetchview is called too often
  if(fetchview_path!=viewpath) {
    // we populate startinit to contain the viewpath as subfunction(s)
    // call init.id_object(json) via startinit to reach sub frame
    // initialize an object by using a string reference as subobject target
    // run the safely initialized object through its sub-object id
    // subelement abstractor calls init.viewname
    if(typeof args == 'undefined') { args = false; }
    initialize = function (data, accessor) {
      var keys = accessor.split('.');
      var result = data;
      while (keys.length > 0) {
        var key = keys.shift();
        if (typeof result[key] !== 'undefined') {
          result = result[key];
        }
      }
      console.log('result', result);
      return result;
    }
    // check if view available in cache
    var cacheIdx = 'view:'+viewpath;
    var data = cacheGet(cacheIdx,600000);
    if(!data) {
      // fetch
      $.ajax({
        url: path+'v/'+viewpath,
        dataType: 'json'
      })
        .done(function(data) {
          cacheAdd(cacheIdx,data);
          activateview(viewpath,args,data);
          fetchview_path=viewpath;
        });
    } else {
      if(fetchview_time<Date.now()-2000) {
        fetchview_time=Date.now();
        activateview(viewpath,args,data);
        fetchview_path=viewpath;
      }
    }
  }
}

function activateview(viewpath,args,data) {
  // DEBUG console.log(data);
  console.log('Activating view: '+viewpath);
  // verify the signature
  // decompress pack into hy_view
  var hy_target = data['target'];
  var hy_view = LZString.decompressFromEncodedURIComponent(data['pack']);
  // DEBUG console.log(hy_view);
  // put hy_view into hy_frame
  $(hy_target).html(hy_view);
  // run init.subframe if it exists, and contains a non-empty function
  if(typeof initialize !== 'undefined' && JSON.stringify(initialize) !== '{}') {
    var initialized = initialize(init, viewpath);
    if (typeof initialized !== 'object') {
      initialized(args);
    }
  }
}

cacheAdd = function(index,data) {
  // DEBUG: console.log(' [D] cache added for index: '+index);
  cached[index] = [Date.now(),data];
}

cacheGet = function(index,millisecs) {
  if(millisecs<100) { millisecs=100; }
  if(typeof cached[index]!='undefined' && typeof cached[index][0]!='undefined') {
    if(cached[index][0]>Date.now()-millisecs) {
      // DEBUG: console.log(' [D] cache hit for index: '+index);
      return cached[index][1];
    } else {
      delete cached[index];
      return null;
    }
  } else {
    return null;
  }
}
