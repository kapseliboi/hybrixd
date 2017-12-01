//
// hybridd - apiqueue.js
// API/Transaction queue processor
//

exports.initialize = initialize;
exports.add = insert;

function initialize () {

    var timer = 500;
    setInterval( function() {

        var timenow = Date.now();
        for (var qid in global.hybridd.APIqueue) {

            var target = global.hybridd.APIqueue[qid].target;
            var base = target.split(".")[0];
            var timestamp = global.hybridd.APIqueue[qid].time;
            var processID = global.hybridd.APIqueue[qid].pid;
            var timeout = timestamp + global.hybridd.APIqueue[qid].timeout;
            if (timeout > timenow && global.hybridd.APIqueue[qid].retries < global.hybridd.APIqueue[qid].retry) {

                if (typeof global.hybridd.APIthrottle[base] === "undefined") {

                    global.hybridd.APIthrottle[base] = 0;

                }
                if (global.hybridd.APIqueue[qid].next < timenow && global.hybridd.APIthrottle[base] < timenow) {

                    try {

                        // reduce the amount of retries & throttle the maximum amount of requests per second
                        global.hybridd.APIqueue[qid].retries++;
                        global.hybridd.APIqueue[qid].next = timenow + Number(global.hybridd.APIqueue[qid].interval * (global.hybridd.APIqueue[qid].retries + 1));
                        if (global.hybridd.APIthrottle[base] < timenow + timer / 1000 * global.hybridd.APIqueue[qid].throttle) {

                            global.hybridd.APIthrottle[base] = timenow + timer / 1000 * global.hybridd.APIqueue[qid].throttle;

                        }
                        // loadbalance the URL element
                        if (typeof global.hybridd.APIqueue[qid].host === "string") {

                            var host = global.hybridd.APIqueue[qid].host;

                        } else {

                            var host = global.hybridd.APIqueue[qid].host[global.hybridd.APIqueue[qid].reqcnt];

                            if (global.hybridd.APIqueue[qid].reqcnt < global.hybridd.APIqueue[qid].host.length - 1) {

                                global.hybridd.APIqueue[qid].reqcnt+=1;

                            } else {

                                global.hybridd.APIqueue[qid].reqcnt = 0;

                            }

                        }
                        // get the initialized link
                        var args   = global.hybridd.APIqueue[qid].args;
                        var method = global.hybridd.APIqueue[qid].method;
                        var qpath  = (typeof args.path==='undefined'?'':args.path);
                        // DEBUG: console.log(' ## TARGET: '+target+' HOST: '+host+'  QID: '+qid);
                        // DEBUG: console.log(' ### METHOD: '+method+' ARGS: '+JSON.stringify(args));
                        var restAPI = (new Function(`return global.hybridd.${global.hybridd.APIqueue[qid].link}.link;`))();
                        // DEPRECATED: var restAPI = eval(`global.hybridd.${global.hybridd.APIqueue[qid].link}.link`);
                        var postresult;
                        switch (method) {
                          case 'POST':
                            postresult = restAPI.post(host+qpath, args, function (data, response) {

                                restaction({
                                    "processID": this.processID,
                                    "qid": this.qid,
                                    "data" : data
                                });

                            }.bind({
                                qid,
                                processID
                            }));
                            break;
                          case 'PUT':
                            postresult = restAPI.put(host+qpath, args, function (data, response) {

                                restaction({
                                    "processID": this.processID,
                                    "qid": this.qid,
                                    "data" : data
                                });

                            }.bind({
                                qid,
                                processID
                            }));
                            break;
                          case 'GET':
                            postresult = restAPI.get(host+qpath, {}, function (data, response) {

                                restaction({
                                    "processID": this.processID,
                                    "qid": this.qid,
                                    "data" : data
                                });

                            }.bind({
                                qid,
                                processID
                            }));
                            break;                           
                        }
                        postresult.on("error", (result) => {

                            console.log(` [!] API queue -> ${result}`);

                        });
                    } catch (result) { console.log(` [!] API queue -> ${result}`); }

                } // DEBUG: else { console.log(' WAITING... '); }

            } else if (global.hybridd.APIqueue[qid].retries >= global.hybridd.APIqueue[qid].retry) {

                // timeout: if no more retries delete the queue object
                scheduler.stop(processID, {"err": 1});
                delete global.hybridd.APIqueue[qid];

            }

        }

    }, timer); // every 1000 milliseconds push transactions from the queue...

    return 1;
}

function restaction (properties) {

    var err = 0;
    try {
      properties.data = JSON.parse(properties.data);
    } catch(result) {
      if(typeof properties.data !== 'object') {
        err = 1;
      }
    }

    if(err === 0) {
      
      delete global.hybridd.APIqueue[properties.qid];

      scheduler.stop(properties.processID, {
          "err": 0,
          "data": properties.data
      });

    } else {

      global.hybridd.proc[properties.processID].data = properties.data;

    }

    return err;
}

function insert (queueobject) {

    // sane defaults
    var suffix = `0000${Math.random() * 9999}`.slice(-4);
    var qid = Date.now() + suffix.toString();
    global.hybridd.APIqueue[qid] = {
        "method": "POST",
        "retry": 3,
        "retries": 0,
        "throttle": 5,
        "timeout": 15000,
        "time": Date.now(),
        "next": Date.now(),
        "interval": 2000,
        "host": null,
        "reqcnt": 0,
        "pid": null,
        "args": null,
        "target": null
    };
    // merge objects
    Object.assign(global.hybridd.APIqueue[qid], queueobject);
    // if multiple hosts: randomize the first request count
    if(typeof global.hybridd.APIqueue[qid].host === "object" && global.hybridd.APIqueue[qid].host.length) {
      global.hybridd.APIqueue[qid].reqcnt = Math.floor(Math.random() * (global.hybridd.APIqueue[qid].host.length));
    }
    
    return 1;
}

