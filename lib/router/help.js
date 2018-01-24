// proc.js -> handle proc calls
//
// (c)2016 metasync r&d / internet of coins project - Amadeus de Koning / Joachim de Koning
//

// export every function
exports.valid = valid;
exports.help = help;


//TODO store validRoutes in a file (and make a reload function for it

function levenshteinDistance (a, b){
  if(a.length == 0) return b.length;
  if(b.length == 0) return a.length;
  
  var matrix = [];
  
  // increment along the first column of each row
  var i;
  for(i = 0; i <= b.length; i++){
    matrix[i] = [i];
  }
  
  // increment each column in the first row
  var j;
  for(j = 0; j <= a.length; j++){
    matrix[0][j] = j;
  }
  
  // Fill in the rest of the matrix
  for(i = 1; i <= b.length; i++){
    for(j = 1; j <= a.length; j++){
      if(b.charAt(i-1) == a.charAt(j-1)){
        matrix[i][j] = matrix[i-1][j-1];
      } else {
        matrix[i][j] = Math.min(matrix[i-1][j-1] + 1, // substitution
                                Math.min(matrix[i][j-1] + 1, // insertion
                                         matrix[i-1][j] + 1)); // deletion
      }
    }
  }
  
  return matrix[b.length][a.length];
};

function getHelpMessage(n){
  if(typeof n === 'string'){return n;}
  else if(typeof n === 'object'){
    if(n.hasOwnProperty("_this")){
      return n["_this"];
    }else if(n.hasOwnProperty("_help")){
      return n["_help"];
    }
  }
  return " No help available.";
}

// Returns help information and suggestions for a given command
//validity is the return of valid call  {valid:true|false,ypath:[...],status:200|403|404|500}
function help(xpath,validity){
  var message="";
  switch(validity.status){
    case 200:
      //TODO show help for this command
      break;
    case 403:
      // TODO use of this command is restricted
      // show help for last command
      
      
    case 404:
      var xpath_last = xpath[validity.ypath.length-1];
      var ypath_last = validity.ypath[validity.ypath.length-1];
      if(ypath_last && ypath_last.hasOwnProperty(xpath_last)){
        var url = xpath.join("/");
        //Found but does not have _this, so can't be used as standalone command
        message+="'"+url+"' cannot be used as stand alone command. \n Please try one of the following:\n";
        for(var sibling in ypath_last[xpath_last]){
          if(sibling.substr(0,1)!="_"){
            message+=" - '"+url+"/"+sibling+"' : "+getHelpMessage(ypath_last[xpath_last][sibling])+"\n";
          }
        }                
      }else{
        var url=xpath.splice(0,validity.ypath.length-1).join("/");
        message+="'"+url+"/"+xpath_last+"' is unknown.";
        var bestLevenshteinDistance = 3 + xpath_last.length * 0.1;
        var bestMatchingSibling = "";
        for(var sibling in ypath_last){
          var tryLevenshteinDistance = levenshteinDistance(sibling,xpath_last);
          if(tryLevenshteinDistance<bestLevenshteinDistance){
            bestLevenshteinDistance=tryLevenshteinDistance;
            bestMatchingSibling=sibling;
          }
        }
        if(bestMatchingSibling){ // Fuzzy matched suggestion
          message+=" Did you mean '"+url+"/"+bestMatchingSibling+"'? "+getHelpMessage(ypath_last[bestMatchingSibling])+"";
        }else{
          message+=" Available options are:\n";
          for(var sibling in ypath_last){
            if(sibling.substr(0,1)!="_"){
              message+=" - '"+url+"/"+sibling+"' : "+getHelpMessage(ypath_last[sibling])+"\n";
            }
          }
        }
      }
    case 500:
      //TODO internal error routetree.json is invalid
    default:
      
  }
  return message;
}


// Check whether a route is valid according to router/routes.json
function valid(xpath,sessionID){
  
  var it = JSON.parse(fs.readFileSync("./router/routetree.json", "utf8")); // iterate through routes.json
  
  if(xpath[0]==="help"){return {valid:true,ypath:[it],status:200}};
  
  var ypath=[];
  for(var i=0, len = xpath.length;i<len;++i){
    ypath.push(it);

    if(it !== null && typeof it === 'object'){
      if(it.hasOwnProperty("_access")){
        if(it["_access"]=="root"){
          if(sessionID!==1){return {valid:false,ypath:ypath,status:403};}
        }else if(it["_access"]=="owner"){
          //TODO check owner access
        }else{
          return {valid:false,ypath:ypath,status:403};
        }
      }
      if(it.hasOwnProperty("_ref")){ // Next xpath node is part of a dynamic list
        //TODO check if item is in list
        return {valid:true,ypath:ypath,msg:"references TODO"};//deze return moet natuurlijk weg :)
      }else if(it.hasOwnProperty(xpath[i])){
        if(it[xpath[i]] !== null && typeof it[xpath[i]] === 'object' && it[xpath[i]].hasOwnProperty("_alias")){ // use alias instead
          if(it.hasOwnProperty(it[xpath[i]]["_alias"])){
            it = it[xpath[i]]["_alias"];
          }else{
            return {valid:false,ypath:ypath,status:500,msg:"Alias '"+xpath[i]+"' => '"+it[xpath[i]]["_alias"]+"'not found"}; // Alias not found
          }
        }else{
          it=it[xpath[i]]; // Found next xpath node, moving to it
        }
      }else{
        return {valid:false,ypath:ypath,status:404}; // Can't find next xpath node
      }
    }else if(i<len-1){
      return {valid:false,ypath:ypath,status:404}; // Not an object so can't find a next xpath node
    }
  }
  
  if(typeof it === "string"){
    return {valid:true,message:it};
  }else if(it !== null && typeof it === 'object'){
    if(it.hasOwnProperty("_this")){
      return {valid:true,ypath:ypath,status:200};
    }else{
      return {valid:false,ypath:ypath,status:404};
    }
  }else{
    return {valid:false,ypath:ypath,status:500}; // the routes.json itself is invalid
  }
}


