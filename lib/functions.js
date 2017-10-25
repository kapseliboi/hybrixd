// (C) 2015 Internet of Coins / Metasync / Joachim de Koning
// hybridd - functions.js
// Collection of process and other ubiquitous functions.

// handy functions that can be imported into modules
exports.timestamp = timestamp;
exports.JSONvalid = JSONvalid;
exports.isset = isset;
exports.implode = implode;
exports.cloneobj = cloneobj;
exports.clean = clean;
exports.confdefaults = confdefaults;
exports.randomstring = randomstring;
exports.activate = activate;
exports.sortArrayByObjKey = sortArrayByObjKey;
exports.sortObjectByKey = sortObjectByKey;

// cleans a string
function clean(dirty) {
	var clean_str = dirty.toString().replace(/[^A-Za-z0-9\.\*]/g,"");
	return clean_str;
}

// produces a complete timestamp in the format: Y-m-d H:i:s.m
function timestamp(currentdate) {
	var datetime = currentdate.getFullYear() + "-" +
					(currentdate.getMonth()+1).toString().lZero(2) + "-" + 
					currentdate.getDate().toString().
lZero(2) + " " +  
					currentdate.getHours().toString().
lZero(2) + ":" +  
					currentdate.getMinutes().toString().
lZero(2) + ":" + 
					currentdate.getSeconds().toString().
lZero(2) + "." +
					currentdate.getMilliseconds().toString().
lZero(3);
	return datetime;
}

// clones one object into another without tied referencing
function cloneobj(array) {
	var output = [];
	for(key in array) {
		output[key] = array[key];
	}
	return output;
}

// set sane configuration defaults for modules
function confdefaults(object) {
	for (var key in object) {
		if(typeof (object[key].port) == "undefined") {
			if (typeof object[key].host != "undefined" && object[key].host.substring(0, 5) === "https") {
				object[key].port = 443;
			} else {
				object[key].port = 80;
			}
		}
		if(typeof (object[key].path) == "undefined") {
			object[key].path = "/q";
		}
	}
	return object;
}

// quick and dirty duplication of isset() found in PHP
function isset(strVariableName) {
	try {
		eval( strVariableName );
	} catch( err ) {
		if ( err instanceof ReferenceError ) { return false; }
	}
	return true;
}

// implode like in PHP
function implode(glue, pieces) {
  //  discuss at: http://phpjs.org/functions/implode/
  // original by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
  // improved by: Waldo Malqui Silva
  // improved by: Itsacon (http://www.itsacon.net/)
  // bugfixed by: Brett Zamir (http://brett-zamir.me)
  //   example 1: implode(' ', ['Kevin', 'van', 'Zonneveld']);
  //   returns 1: 'Kevin van Zonneveld'
  //   example 2: implode(' ', {first:'Kevin', last: 'van Zonneveld'});
  //   returns 2: 'Kevin van Zonneveld'
  var i = "",
    retVal = "",
    tGlue = "";
  if (arguments.length === 1) {
    pieces = glue;
    glue = "";
  }
  if (typeof pieces === "object") {
    if (Object.prototype.toString.call(pieces) === "[object Array]") {
      return pieces.join(glue);
    }
    for (i in pieces) {
      retVal += tGlue + pieces[i];
      tGlue = glue;
    }
    return retVal;
  }
  return pieces;
}

// validates JSON, else returns false 
function JSONvalid(stringinput) {
	var output = {};
	if (typeof stringinput == "string" && stringinput) {
		output = !(/[^,:{}\[\]0-9.\-+Eaeflnr-u \n\r\t]/.test(stringinput.replace(/"(\\.|[^"\\])*"/g, ""))) && JSON.parse(stringinput);
	}
	return output;
}

// DO NOT USE THIS FOR CRYPTOGRAPHIC PURPOSES!!!
function randomstring(len, charSet) {
    charSet = charSet || "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    var randomString = "";
    for (var i = 0; i < len; i++) {
    	var randomPoz = Math.floor(Math.random() * charSet.length);
    	randomString += charSet.substring(randomPoz,randomPoz+1);
    }
    return randomString;
}

  // activate (deterministic) code from a string
function activate(code) {
  if(typeof code == "string") {
    // interpret deterministic library in a virtual DOM environment
    const {JSDOM} = jsdom;
    var dom = (new JSDOM("", {runScripts: "outside-only"})).window;
    dom.window.nacl = nacl; // inject NACL into virtual DOM
    dom.window.crypto = crypto; // inject nodeJS crypto to supersede crypto-browserify
    dom.window.logger = logger; // inject the logger function into virtual DOM
    dom.eval("var deterministic = (function(){})(); "+code+";"); // init deterministic code
    return dom.window.deterministic;
  } 
    console.log(" [!] Error: cannot activate deterministic code!");
    return function() {};
  
}

// sort an array by Object Key
function sortArrayByObjKey(arr,key,desc) {
    // make key value index for unspents
    order = (typeof order!="undefined"?desc:false);
    var unordered = {};
    for (var i in arr) {
      unordered[arr[i][key]] = i;
    }
    // sort unspent list
    var ordered = [];
    var cnt = 0;
    Object.keys(unordered).sort().
forEach((key) => {
      ordered[cnt] = arr[unordered[key]];
      cnt++;
    });
    if(desc) { ordered = ordered.reverse(); }
    return ordered;
}

// sort an object by key
function sortObjectByKey(obj) {
  return Object.keys(obj).
    sort().
reduce((a, v) => {
    a[v] = obj[v];
    return a; 
}, {});
}
