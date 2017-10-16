//
// hybridd - apiqueue.js
// API/Transaction queue processor

// required libraries in this context
//functions = require('./functions');

exports.initialize = initialize;
exports.add = insert;

function initialize() {
  var timer = 500;
	setInterval(function() {
		for(timestamp in global.hybridd.APIqueue) {
      var processID = global.hybridd.APIqueue[timestamp].pid;
      var target = global.hybridd.APIqueue[timestamp].target;
      var timeout = timestamp+(8000*global.hybridd.APIqueue[timestamp].retry);
      if(timeout>Date.now() && global.hybridd.APIqueue[timestamp].retries<global.hybridd.APIqueue[timestamp].retry) {
        var throttle = (typeof global.hybridd.APIqueue.throttle[ target ]!='undefined'?global.hybridd.APIqueue.throttle[ target ]:0);
        if(throttle<Date.now() && global.hybridd.APIqueue[timestamp].nexttry<Date.now()) {
          // reduce the amount of retries & throttle the maximum amount of requests per second
          global.hybridd.APIqueue[timestamp].retries++;
          global.hybridd.APIqueue[timestamp].nexttry = global.hybridd.APIqueue[timestamp].nexttry+Number(global.hybridd.APIqueue[timestamp].interval*(global.hybridd.APIqueue[timestamp].retries+1));
          // loadbalance the URL element
          if(typeof global.hybridd.APIqueue[timestamp].url=='string') {
            var url=global.hybridd.APIqueue[timestamp].url;
          } else {
            if(global.hybridd.APIqueue[timestamp].urlcnt<(global.hybridd.APIqueue[timestamp].url.length-1)) {
              global.hybridd.APIqueue[timestamp].urlcnt++;
            } else { global.hybridd.APIqueue[timestamp].urlcnt=0; }
            var url=global.hybridd.APIqueue[timestamp].url[ global.hybridd.APIqueue[timestamp].urlcnt ];
          }
          // get the initialized link
          // DEBUG: console.log(' ## TARGET: '+global.hybridd.APIqueue[timestamp].target);
          var restAPI = eval('global.hybridd.'+global.hybridd.APIqueue[timestamp].link+'.link');
          var args = global.hybridd.APIqueue[timestamp].args;
          // DEBUG: console.log(' ### ARGS: '+JSON.stringify(args));
          var postresult = restAPI.post(url,args, function(data,response) {
            restaction({processID:processID,data:data});
            delete global.hybridd.APIqueue[timestamp];
          });
          postresult.on('error', function(err){
            console.log(' [!] API request ['+target+'] - '+err);
          });
        }
      // if timeout of queue object
      } else {
        if(global.hybridd.APIqueue[timestamp].retries>=global.hybridd.APIqueue[timestamp].retry) {
          // timeout: if no more retries delete the queue object
          scheduler.stop(processID,{err:1});
          delete global.hybridd.APIqueue[timestamp];
        }
      }
		}
	}, timer); // every 1000 milliseconds push transactions from the queue...
  
}

function restaction(properties) {
  var data = properties.data;
  if(data.code<0) { var err=1; } else { var err=data['code']; }
  try { data = JSON.parse(data); } catch(e) {}
  // DEBUG: console.log(' ### DATA: '+JSON.stringify(data));
  scheduler.stop(properties.processID,{err:err,data:data});
}

function insert(queueobject) {
  // sane defaults
  global.hybridd.APIqueue[Date.now()] = { 'method':'POST',
                                          'retry':3,
                                          'retries':0,
                                          'throttle':5,
                                          'nexttry':Date.now(),
                                          'interval':2000,
                                          'url':null,
                                          'urlcnt':0,
                                          'pid':null,
                                          'args':null,
                                          'target':null }
  // merge objects
  Object.assign(global.hybridd.APIqueue[Date.now()],queueobject);
}

