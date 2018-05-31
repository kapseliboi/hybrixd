// help.js -> handle proc calls
//
// (c)2016 metasync r&d / internet of coins project - Amadeus de Koning / Joachim de Koning / Rouke Pouw
//

// export every function
var router = require("../router");

exports.help = help;
exports.serve = serve;

function serve(request,xpath){
  return html();
}

global.viewList = ["login","interface","interface.dashboard","interface.assets"];

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

function parseMarkUp(str){
  return str.replace(/ `/g,' <code>').replace(/` /g,'</code> ');
}

function htmlNode(node,xpath, parentNode){
  if(typeof node === "string"){
    return "<code>"+xpath+"</code> " + parseMarkUp(node);
  }else{


    var data='';

    for(var aliasNode in parentNode){
      if(parentNode[aliasNode].hasOwnProperty("_alias") && parentNode[aliasNode]["_alias"]===xpath.substr(1)){
        data+="<p>Alias: <code>/"+aliasNode+"</code></p>";
      }
    }

    if(node.hasOwnProperty("_access")){
      data+="<p><i>Root only.</i></p>";
    }

    if(node.hasOwnProperty("_help")){
      data+="<p><i>"+parseMarkUp(node["_help"])+"</i></p>";
    }

    data+="<dl>";

    if(node.hasOwnProperty("_this")){
      data+="<dt><code>"+xpath+"</code></dt><dd>"+parseMarkUp(node["_this"])
      if(node.hasOwnProperty("_response")){
        if(typeof node["_response"] === "string"){
          data+="<p>Example response: <code>"+node["_response"]+"</code></p>";
        }else if(typeof  node["_response"] === 'object'){
          if( node["_response"].constructor === Array){
            for(var i=0, len=node["_response"].length; i<len;++i){
              if(typeof node["_response"][i] === "string"){
                data+="<p>Example response: <code>"+node["_response"][i]+"</code></p>";
              }else{
                data+="<p>Example response: <code>"+JSON.stringify(node["_response"][i])+"</code></p>";
              }
            }
          }else{
            data+="<p>Example response: <code>"+JSON.stringify(node["_response"])+"</code></p>";
          }
        }
      }
      data+="</dd>";
    }


    if(node.hasOwnProperty("_ref") && node["_ref"].hasOwnProperty("_list") ){
      var list = '$'+node["_ref"]["_list"].toUpperCase();
      data+="<dt><a name='API"+encodeURIComponent(xpath+"/"+list)+"'> For each "+node["_ref"]["_list"]+" (<code>"+list+"</code>)</a></dt><dd>" + htmlNode(node["_ref"],xpath+"/"+list)+"</dd>";
    }

    for(var subNode in node){
      if(subNode.substr(0,1)!=='_'){
        data+="<dt><a name='API"+encodeURIComponent(xpath)+"'>"+ subNode + "</a></dt><dd>" + htmlNode(node[subNode],xpath+'/'+subNode,node)+"</dd>";
      }
    }
    data+="</dl>";
  }
  return data;
}


function html(){
  //TODO intro
  var data='<style>code {background-color: #EEEEEE;}</style>';
  var tree = global.hybridd.routetree;
  data+="<h1>Overview</h1>";
  data+="<ul>";
  for(var node in tree){
    if(!tree[node].hasOwnProperty("_alias")){
      data+="<li><a href='#"+encodeURIComponent("API/"+node)+"'>"+node+"</a></li>";
    }
  }
  data+="</ul>";

  for(var node in tree){
    if(!tree[node].hasOwnProperty("_alias")){
      data+="<h1><a name='"+encodeURIComponent("API/"+node)+"'>/"+node+"</a></h1>";
      data+= htmlNode(tree[node],"/"+node,tree);
    }
  }
  return {content:'html',data:data,error:0,id:null};
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

    var dynamic_item=false;
    if (ypath_last && ypath_last.hasOwnProperty("_ref") ){
      if(ypath_last["_ref"].hasOwnProperty("_list")){

        var list = ypath_last["_ref"]["_list"];
        dynamic_item = router.isValidRef(list,xpath_last);
      }
    }

    if(dynamic_item){
      var url = xpath.join("/");
      message+="'"+url+"' cannot be used as stand alone command.<br/>";

      message+="Please try one of the following:<br/>";
      for(var sibling in ypath_last["_ref"]){
        if(sibling.substr(0,1)!="_"){
          message+=" - '"+url+"/"+sibling+"' : "+getHelpMessage(ypath_last["_ref"][sibling])+"<br/>";
        }
      }
    }else if(ypath_last && ypath_last.hasOwnProperty(xpath_last)){ //Found but does not have _this, so can't be used as standalone command

      var url = xpath.join("/");
      message+="'"+url+"' cannot be used as stand alone command.<br/>";

      if(ypath_last[xpath_last] && ypath_last[xpath_last].hasOwnProperty("_ref") && ypath_last[xpath_last]["_ref"].hasOwnProperty("_list")){ // Dynamic list
        message+="TODO choose from a list:<br/>"; // todo provide query to retrieve list for assets/sources
      }

      message+="Please try one of the following:<br/>";
      for(var sibling in ypath_last[xpath_last]){
        if(sibling.substr(0,1)!="_"){
          message+=" - '"+url+"/"+sibling+"' : "+getHelpMessage(ypath_last[xpath_last][sibling])+"<br/>";
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
        message+=" Did you mean '"+url+"/"+bestMatchingSibling+"'? "+getHelpMessage(ypath_last[bestMatchingSibling])+"<br/>";
      }
      var options = "";
      for(var sibling in ypath_last){
        if(sibling.substr(0,1)!="_"){
          options+=" - '"+url+"/"+sibling+"' : "+getHelpMessage(ypath_last[sibling])+"<br/>";
        }
      }
      if(options!==""){
              message+="<br/>Available options are:<br/>"+options;
      }
    }
  case 500:
    //TODO internal error routetree.json is invalid
  default:

  }
  return message;
}
