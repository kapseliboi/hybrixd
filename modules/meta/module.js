// (C) 2015 Internet of Coins / Metasync / Joachim de Koning
// hybridd module - meta/module.js
// Module for top-level meta operations

// exports
exports.init = init;
exports.tick = tick;
exports.exec = exec;
exports.post = post;
exports.stop = stop;

// init function
function init() {
	var modulename = 'meta';
}

// stop function
function stop() {
}

// scheduled ticker function
function tick(properties) {
}

// standard functions of an asset store results in a process superglobal -> global.hybridd.process[processID]
// child processes are waited on, and the parent process is then updated by the postprocess() function
function exec(properties) {
	// decode our serialized properties
	var processID = properties.processID;
	var sessionID = properties.sessionID;
	var subprocesses = [];
	var command = [];
	// set request to what command we are performing
	global.hybridd.proc[processID].request = properties.command;
	// this is our link
	var link = 'modules.module.meta.main.link';
	// handle standard cases here, and construct the sequential process list
	switch(properties.command[0]) {
		 case 'status':
		 break;		 
		 case 'address':
		 break;
		 case 'balance':
		 break;
		 case 'transfer':
		 break;
		 case 'confirm':
			confirms = 10;
		 	subprocesses.push('prog(0,'+confirms+')');
		 	subprocesses.push('poke("i",0)');
		 	subprocesses.push('prog(peek("i"),'+confirms+')');
		 	subprocesses.push('wait(2000)');
		 	subprocesses.push('push({count:peek("i"),total:'+confirms+'})');
		 	subprocesses.push('poke("i",peek("i")+1)');
		 	subprocesses.push('test(peek("i")<'+confirms+',-4)');
		 	subprocesses.push('stop(0,{count:peek("i"),total:'+confirms+'})');
		 	postprocessing = false;
		 break;
		 case 'transferlist':
			var cnt = 0;
			var parallelIDs = [];
			var command = ['transferlist',(typeof properties.command[1]!='undefined'?properties.command[1]:'20'),(typeof properties.command[1]!='undefined'?properties.command[1]:'0')];
			// go through all assets, and queue them up to perform a parallel commands on all of them
			for (var asset in global.hybridd.asset) {
				target = global.hybridd.asset[asset];
				target.name = asset;
				if(target.name!='*' && typeof target.module != 'undefined') {
					// create a new process layer with parallel processIDs called altprocesses
					processID = scheduler.init(0,{sessionID:sessionID});
					parallelIDs[cnt] = processID;
					var properties = {
							processID:processID,
              sessionID:sessionID,
							source:target.source,
							target:target,
							type:target.type,
							factor:target.factor,
							command:command
						};
					var altprocesses=[];
					altprocesses = modules.module[target.module].main.exec(properties);
					altprocesses.push('modules.module.'+global.hybridd.asset[target.name].module+'.main.post('+JSON.stringify({processID,target,command})+');');
					scheduler.subqueue(processID,altprocesses);
					cnt++;
				}
			}
		 	subprocesses.push('prog(0,'+parallelIDs.length+')');
			for (i=0;i<parallelIDs.length;i++) {
				subprocesses.push('prwt('+parallelIDs[i]+')');
				subprocesses.push('prog('+(cnt/parallelIDs.length)+','+parallelIDs.length+')');
				cnt++;
			}
		 	subprocesses.push('prog(-1)');
		 	subprocesses.push('push('+JSON.stringify(parallelIDs)+')');
		 break;
		 default:
		 	subprocesses.push('stop(1,"Asset function not supported!")');
	}
	return subprocesses;
}

// standard function for postprocessing the data of a sequential set of instructions
function post(properties) {
	// decode our serialized properties
	var processID = properties.processID;
  var sessionID = properties.sessionID;
	var procinfo = scheduler.procpart(properties.processID);
	var parentID = procinfo[0];
	var prevproc = procinfo[2];
	var target = properties.target;
	var factor = (typeof properties.factor != 'undefined'?properties.factor:12);
	var type  = (typeof properties.type != 'undefined'?properties.type:'deterministic');	
	var posttemp = global.hybridd.proc[parentID].temp;
	var postdata = global.hybridd.proc[prevproc].data;
	// set data to what command we are performing
	global.hybridd.proc[processID].data = properties.command;
	// handle the command
	if (postdata == null) {
		var success = false;
	} else {
		var success = true;
		switch(properties.command[0]) {
			case 'status':
			break;		
			case 'address':
			break;
			case 'balance':
			break;
			case 'transfer':
			break;
			case 'listtransactions':
				global.hybridd.proc[prevproc].err = 0;
				var output = [];
				for(var i=0; i<postdata.length; i++) {
					var parallelID = postdata[i];
					if(typeof global.hybridd.proc[parallelID].data != 'undefined') {
						var procdata = global.hybridd.proc[parallelID].data;
						if(typeof procdata == 'object') {
							output = output.concat(procdata);
						}
					}
				}
				postdata = output;
			break;
			default:
				success = false;		
		}
	}
	// default is to transfer the datafield of the last subprocess to the main process
	if (success && !global.hybridd.proc[prevproc].err && typeof postdata != 'undefined') {
		// TODO: here we only get the balance from the 1st visible address!
		global.hybridd.proc[parentID].data = postdata;
		if(DEBUG) { console.log(' [D] sending postprocessing data to parent '+parentID); }
	} else {
		if(DEBUG) { console.log(' [D] error in '+prevproc+' during postprocessing for '+parentID); }
		global.hybridd.proc[parentID].data = null;
		global.hybridd.proc[parentID].err = 1;
	}
	global.hybridd.proc[processID].stopped=Date.now();
	global.hybridd.proc[processID].progress=1;
}
