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

                            if (global.hybridd.APIqueue[qid].reqcnt < global.hybridd.APIqueue[qid].host.length - 1) {

                                global.hybridd.APIqueue[qid].reqcnt++;

                            } else {

                                global.hybridd.APIqueue[qid].reqcnt = 0;

                            }
                            var host = global.hybridd.APIqueue[qid].host[global.hybridd.APIqueue[qid].reqcnt];

                        }
                        // get the initialized link
                        // DEBUG: console.log(' ## TARGET: '+global.hybridd.APIqueue[qid].target);
                        var args = global.hybridd.APIqueue[qid].args;
                        // DEBUG: console.log(' ### ARGS: '+JSON.stringify(args));
                        var restAPI = eval(`global.hybridd.${global.hybridd.APIqueue[qid].link}.link`);
                        var postresult = restAPI.post(host, args, function (data, response) {

                            restaction({
                                "processID": this.processID,
                                data
                            });
                            delete global.hybridd.APIqueue[this.qid];

                        }.bind({
                            qid,
                            processID
                        }));
                        postresult.on("error", (err) => {

                            console.log(` [!] API request [${target}] - ${err}`);

                        });

                    } catch (e) { /* API's are timing out */ }

                } // DEBUG: else { console.log(' WAITING... '); }
                // if timeout of queue object

            } else if (global.hybridd.APIqueue[qid].retries >= global.hybridd.APIqueue[qid].retry) {

                // timeout: if no more retries delete the queue object
                scheduler.stop(processID, {"err": 1});
                delete global.hybridd.APIqueue[qid];

            }

        }

    }, timer); // every 1000 milliseconds push transactions from the queue...

}

function restaction (properties) {

    if (properties.data.code < 0) {

        var err = 1;

    } else {

        var err = properties.data.code;

    }
    try {

        properties.data = JSON.parse(properties.data);

    } catch (e) {}
    // DEBUG: console.log(' ### DATA: '+JSON.stringify( hex2dec.toDec(properties.data.result) ));
    scheduler.stop(properties.processID, {
        err,
        "data": properties.data
    });

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

}

