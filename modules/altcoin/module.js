// (C) 2015 Internet of Coins / Metasync / Joachim de Koning
// hybridd module - altcoin/module.js
// Module to connect to Bitcoin daemon or any of its derivatives

// required libraries in this context
var altcoin = require('./altcoin')();


// exports
exports.init = init;
exports.tick = tick;
exports.exec = exec;
exports.stop = stop;
exports.link = link;
exports.post = post;
exports.rpcsetup = rpcsetup;
exports.rpcfire = rpcfire;

// initialization function
function init() {
	modules.initexec('altcoin',["init"]);
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
	var target = properties.target;
	var type  = properties.type;
	var factor = (typeof properties.factor != 'undefined'?properties.factor:12);
	var subprocesses = [];	
	var command = [];
	var postprocessing = true;
	// set request to what command we are performing
	global.hybridd.proc[processID].request = properties.command;
	// handle standard cases here, and construct the sequential process list
	switch(properties.command[0]) {
		case 'init':
			subprocesses.push('func("altcoin","link",{target:'+jstr(target)+',command:["getinfo"]})'); // set up init probe command to check if Altcoin RPC is responding and connected
      subprocesses.push('pass( ((data != null && typeof data.errors!="undefined" && data.errors=="") ? 1 : 0) )');      
      subprocesses.push('logs(1,"module altcoin: "+(data?"connected":"failed connection")+" to ['+target.name+'] host '+target.host+':'+target.port+'")');      
		break;
		case 'status':
			// set up init probe command to check if Altcoin RPC is responding and connected
			command = ['getinfo'];	// get sync status
			subprocesses.push('func("altcoin","link",'+JSON.stringify({processID,target,command})+')');
			//subprocesses.push('stop(err,data)');
		break;
		case 'factor':
      // directly return factor, post-processing not required!
      subprocesses.push('stop(0,"'+factor+'")');
		break;
		case 'fee':
      // directly return fee, post-processing not required!
      subprocesses.push('stop(0,"'+padFloat(fee,factor)+'")');
		break;
		case 'balance':
      if(properties.command[1]) {
        subprocesses.push('stop(0,"0.0000")')
        //subprocesses.push('func("altcoin","link",{target:'+jstr(target)+',command:["getaddressbalance",["'+sourceaddr+'"]]})'); // send balance query
        //subprocesses.push('stop(1,data)');
      } else {
        subprocesses.push('stop(1,"Error: missing address!")');
      }
		break;
		case 'push':
      var deterministic_script = (typeof properties.command[1] != 'undefined'?properties.command[1]:false);
      if(deterministic_script) {
        subprocesses.push('func("altcoin","link",{target:'+jstr(target)+',command:["broadcast",["'+deterministic_script+'"]]})');
        // example: {"jsonrpc":"2.0","result":[true,"b4a8d3939e9ee75221e5453d52b27763f3de51b0ffa7670e68b7f8d420f88e49"],"id":0}
        subprocesses.push('stop((typeof data.result[0]!="undefined" && data.result[0]===true && data.result[1]!="undefined"?0:1),(typeof data.result[1]!="undefined"?data.result[1]:null))');
      } else {
        subprocesses.push('stop(1,"Missing or badly formed deterministic transaction!")');
      }
    break;
		case 'unspent':
      if(sourceaddr) {
        subprocesses.push('func("blockexplorer","exec",{target:'+jstr( modules.getsource(mode) )+',command:["unspent","'+sourceaddr+'"'+(properties.command[2]?',"'+properties.command[2]+'"':'')+']})');
      } else {
        subprocesses.push('stop(1,"Error: missing address!")');
      }
    break;
		default:
		 	subprocesses.push('stop(1,"Asset function not supported!")');
	}
   // fire the Qrtz sequence into the subprocess queue
  if(subprocesses) {
    scheduler.fire(processID,subprocesses);  
  }
}

function execOLD(properties) {
	// decode our serialized properties
	var processID = properties.processID;
	var source = properties.source;
	var target = properties.target;
	var type  = properties.type;
	var factor = (typeof properties.factor != 'undefined'?properties.factor:8);
	var subprocesses = [];	
	var command = [];
	// set request to what command we are performing
	global.hybridd.proc[processID].request = properties.command;
	// this is our link
	var link = 'modules.module.altcoin.main.link';
	// handle the command
	var success = true;
	switch(properties.command[0]) {
		 case 'address':
			subprocesses.push('stop(0,"Not yet supported!")');
		 break;
		 case 'balance':
			// TODO: first try to get balance directly from wallet, if not succesful, go query blockexplorer API
			// delegate getting the balance to module blockexplorerapi
			//subprocesses.push('modules.module.blockexplorerapi.main.exec('+JSON.stringify({processID,target,source,command})+');');
			subprocesses.push('stop(1,"N/A")');
		 break;
		 default:
			subprocesses.push('stop(1,"Asset function not supported!")');
	}
	return subprocesses;	
}

// standard function for postprocessing the data of a sequential set of instructions
function post(properties) {
	// decode our serialized properties
	var processID = properties.processID
	var target = properties.target
	var postdata = properties.data;
	// DEPRECATED? - var factor = (typeof properties.factor != 'undefined'?properties.factor:12);
	// set data to what command we are performing
	global.hybridd.proc[processID].data = properties.command;
	// handle the command
	if (postdata == null) {
		var success = false;
	} else {
		var success = true;
		switch(properties.command[0]) {
			default:
				success = false;		
		}
	}
  // stop and send data to parent
  scheduler.stop(processID,{err:(success?0:1),data:postdata});
}

// data returned by this link is stored in a process superglobal -> global.hybridd.process[processID]
function link(properties) {
	// decode our serialized properties
	var processID = properties.processID;
	var target = properties.target;
	var command = properties.command;

	console.log(' [.] module altcoin: sending RPC call to ['+target.name+'] -> '+command.join(' '));

	// create eval-safe flexible object string
	var flexinput = '';
	command.forEach(function(element, index, array) {
		// flexinput = flexinput+"'"+element+"',"; !!! AVOID THIS UNSAFE AND EXPLOITABLE METHOD !!!
		flexinput = flexinput+command[index]+',';
	});
	flexinput = flexinput.rTrim(',');
	// launch the asynchronous altcoin functions and store result in global.hybridd.proc[processID]
  var subprocesses = [];
  subprocesses.push('func("altcoin","rpcsetup",{target:'+jstr(target)+'});');
  subprocesses.push('func("altcoin","rpcfire",{flexinput:'+jstr(flexinput)+'});');
  scheduler.fire(processID,subprocesses); // fire the Qrtz sequence into the subprocess queue
}

function rpcsetup(properties) {
	var processID = properties.processID;
	var target = properties.target;
  try {
    altcoin
    .set('host', target.host)
    .set('port', target.port)
    .auth(target.user,target.pass);
    var err=0;
    var data='Authentication ok.';
  } catch (e) {
    var err=1;
    var data='Authentication error: '+e;
  }
  scheduler.stop(processID,{err:err,data:data});
}

function rpcfire(properties) {
  var processID=properties.processID;
  var flexinput=properties.flexinput;
  altcoin
  .exec( flexinput ,function(err,result) {
    if(err == null || err == {}) { err = 0; } else {
      err = err['code'];
    }
    if(typeof result == 'undefined') {
      result = 'Error on RPC command: '+flexinput+' => '+err;
      err = 1;
    }
    if(result == null) { err = 1; }
    scheduler.stop(processID,{err:err,data:result});
  });
  setTimeout( function() {
    if(global.hybridd.proc[processID].progress<1) {
      scheduler.stop(processID,{err:1,data:'Timeout waiting for response to RPC command!'});
    }
  },8000);
}
