// help.js -> handle proc calls
//
// (c)2016 metasync r&d / internet of coins project - Amadeus de Koning / Joachim de Koning / Rouke Pouw
//

// export every function
var fs = require('fs');
var router = require('../router');

exports.help = help;
exports.serve = serve;

function serve (request, xpath) {
  if (xpath.length === 2) {
    if (xpath[1] === 'hybrix.png') {
      return {data: '../docs/' + xpath[1], type: 'file:image/png', error: 0, id: null}; // TODO add request path and command
    } else if (xpath[1] === 'download.svg') {
      return {data: '../docs/' + xpath[1], type: 'file:image/svg+xml', error: 0, id: null}; // TODO add request path and command
    } else {
      return {data: '../docs/' + xpath[1] + '.html', type: 'file:text/html', error: 0, id: null}; // TODO add request path and command
    }
  } else {
    return html(xpath, request.sessionID);
  }
}

global.viewList = ['login', 'interface', 'interface.dashboard', 'interface.assets'];

function levenshteinDistance (a, b) {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  var matrix = [];

  // increment along the first column of each row
  var i;
  for (i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  // increment each column in the first row
  var j;
  for (j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  // Fill in the rest of the matrix
  for (i = 1; i <= b.length; i++) {
    for (j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1, // substitution
          Math.min(matrix[i][j - 1] + 1, // insertion
            matrix[i - 1][j] + 1)); // deletion
      }
    }
  }

  return matrix[b.length][a.length];
}

function getHelpMessage (n, parentNode) {
  if (typeof n === 'string') { return n; } else if (typeof n === 'object') {
    if (n.hasOwnProperty('_alias') && parentNode) {
      n = parentNode[n['_alias']];
    }

    if (n.hasOwnProperty('_this')) {
      return n['_this'];
    } else if (n.hasOwnProperty('_help')) {
      return n['_help'];
    } else if (n.hasOwnProperty('_list')) {
      return n['_list'];
    }
  }
  return ' No help available.';
}

function parseMarkUp (str) {
  return str.replace(/ `/g, ' <code>').replace(/` /g, '</code> ');
}

function apiEdit (sessionID, xpath, requiresRootAccess, elipsis, rootTree) {
  var command = xpath.split('/');
  var data = '';
  var varData = '';
  var j = 0;
  data += '<code>';
  var tree = rootTree;
  for (var i = 0; i < command.length; ++i) {
    if (typeof tree === 'object') {
      if (tree.hasOwnProperty(command[i])) {
        tree = tree[command[i]];
      } else if (tree.hasOwnProperty('_ref')) {
        tree = tree['_ref'];
      } else {
        // TODO error
      }
    }

    if (command[i].startsWith('$')) {
      var name = command[i].substr(1);
      var sample = '';
      if (typeof tree === 'object' && tree.hasOwnProperty('_sample')) {
        sample = tree['_sample'];
      }
      var id = xpath.replace('/', '_').replace('$', '_') + '_' + j;
      ++j;
      var refList = router.refList(name.toLowerCase());
      if (refList) {
        data += '/<select id="' + id + '">';
        for (var j = 0; j < refList.length; ++j) {
          if (refList[j] === sample) {
            data += '<option SELECTED>' + refList[j] + '</option>';
          } else {
            data += '<option>' + refList[j] + '</option>';
          }
        }
        data += '</select>';
      } else {
        data += '/<input placeholder="$' + name + '" id="' + id + '" value="' + sample + '"/>';
      }
      varData += ' + \'/\' + document.getElementById(\'' + id + '\').value';
    } else if (command[i] !== '') {
      data += '/' + command[i];
      varData += ' + \'/' + command[i] + '\'';
    }
  }
  if (elipsis) {
    var id = xpath.replace('/', '_').replace('$', '_') + '_' + j;
    data += '<input placeholder="/.../$PATH" id="' + id + '" />';
    varData += ' + \'/\' + document.getElementById(\'' + id + '\').value';
  }
  data += '</code>';

  if (!requiresRootAccess || sessionID === 1) {
    data += '<input type="submit" value="execute" onclick="rout( \'\' ' + varData + ');">';
  } else {
    data += '<input disabled type="submit" value="execute" onclick="rout( \'\' ' + varData + ');"> <i>(Root only)</i>';
  }
  data += '<input type="submit" value="copy" onclick="copyToClipboard( \'\' + window.location.protocol + \'//\' + window.location.hostname + \':\' + window.location.port+\'/api\'' + varData + ');">';
  return data;
}

function describeNode (sessionID, id, node, xpath, parentNode, expanded, noFrame, requiresRootAccess, rootTree) {
  var data = '';

  // update root access requirements
  if (typeof node === 'object') {
    if (node['_hidden']) { return ''; }
    var thisRequiresRootAccess = node['_access'] === 'root';
    requiresRootAccess = requiresRootAccess || thisRequiresRootAccess;
  }

  // Resolve alias
  if (typeof node === 'object' && node.hasOwnProperty('_alias') && parentNode) {
    data += '(Redirected from <code>' + xpath + '</code> )';

    xpath = xpath.substr(0, xpath.length - id.length - 1) + id + node['_alias'];
    id = node['_alias'];

    node = parentNode[id];
  }

  var subNodeCount = 0;
  var quickDescription = '';
  if (typeof node === 'string') {
    quickDescription = node;
  } else {
    // if there's only one child, don't bother with showing a new frame
    for (var key in node) {
      if (!key.startsWith('_') || key === '_ref') { ++subNodeCount; }
    }
    if (node.hasOwnProperty('_help')) {
      quickDescription += node['_help'].replace(/<\/?[^>]+(>|$)/g, '');
    }

    if (node.hasOwnProperty('_this')) {
      quickDescription += ' ' + node['_this'];
    }
  }

  if (!noFrame) {
    data += '<div class="command-header" onclick="toggleCommand(\'' + xpath + '\')"><b>' + (xpath || '/') + '</b><span class="quickDescription">' + quickDescription + '</span></div><div id="' + xpath + '" ' + (expanded ? 'style="display:block"' : 'style="display:none"') + '  class="command-body">';
  } else {
    data += '<div>';
  }
  if (typeof node === 'string') {
    return data + '<p>' + parseMarkUp(node) + '</p><p>' + apiEdit(sessionID, xpath, requiresRootAccess, false, rootTree) + '</p></div>';
  }

  if (node.hasOwnProperty('_access')) {
    data += "<p class='access'><i>Root only.</i></p>";
  }

  if (node.hasOwnProperty('_help')) {
    data += "<p class='help'>" + parseMarkUp(node['_help']) + '</p>';
  }

  if (node.hasOwnProperty('_this')) {
    data += '<p>' + parseMarkUp(node['_this']) + '</p>';
  }

  if (parentNode) {
    for (var aliasNode in parentNode) {
      if (parentNode[aliasNode].hasOwnProperty('_alias') && parentNode[aliasNode]['_alias'] === xpath.substr(1)) {
        data += "<p class='alias'>Alias: <code>/" + aliasNode + '</code></p>';
      }
    }
  }

  if (node.hasOwnProperty('_this')) {
    data += '<p>' + apiEdit(sessionID, xpath, requiresRootAccess, node['_ellipsis'], rootTree) + '</p>';

    if (node.hasOwnProperty('_response')) {
      if (typeof node['_response'] === 'string') {
        data += "<p class='exampleResponse'>Example response: <code>" + node['_response'] + '</code></p>';
      } else if (typeof node['_response'] === 'object') {
        if (node['_response'].constructor === Array) {
          for (var i = 0, len = node['_response'].length; i < len; ++i) {
            if (typeof node['_response'][i] === 'string') {
              data += "<p class='exampleResponse'>Example response: <code>" + node['_response'][i] + '</code></p>';
            } else {
              data += "<p class='exampleResponse'>Example response: <code>" + JSON.stringify(node['_response'][i]) + '</code></p>';
            }
          }
        } else {
          data += "<p class='exampleResponse'>Example response: <code>" + JSON.stringify(node['_response']) + '</code></p>';
        }
      }
    }
  }

  if (node.hasOwnProperty('_ref') && node['_ref'].hasOwnProperty('_list')) {
    var list = '$' + node['_ref']['_list'].toUpperCase();
    data += describeNode(sessionID, list, node['_ref'], xpath + '/' + list, node, false, subNodeCount <= 1, requiresRootAccess, rootTree);
  }
  for (var subNode in node) {
    if (!node[subNode].hasOwnProperty('_alias') && subNode.substr(0, 1) !== '_') {
      data += describeNode(sessionID, subNode, node[subNode], xpath + '/' + subNode, node, false, subNodeCount <= 1, requiresRootAccess, rootTree);
    }
  }
  // if (!noFrame) {
  data += '</div>';
  // }
  return data;
}

function html (rootPath, sessionID) {
  var data = `<!DOCTYPE html><html lang="en"><head><title>hybrixd : Help</title><meta name="viewport" content="width=device-width, initial-scale=1, minimum-scale=0.5, maximum-scale=2.0"><meta http-equiv="Content-Type" content="text/html;charset=UTF-8"><link href="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAAAXNSR0IArs4c6QAABS1JREFUWAntVn2IVFUUP+feNx+7M7trqa3Grru6O2pBVmCZICImYUFkCEGJfwRmf2iazu64psnTBdfdHT/CUgJLqahQMYKKQDLCJCEpiaLacdfVLTet1dz52Jn3cU/nzvimkV1RkOifPX/Mve/cc8/5nd8757wBGJVRBkYZ+J8ZwNuJb5pkZDKJiCoXA3Gz8dLNfBERslCp3W0BeDnWtUUoWgGCfiGUy6E62DM9VOP094Nrmqi8QKvXdU9C116GKGVVyGg1zclZ7+ymADhLfyp00RdvnpD2Luk1FvuzwoErH5JSTxT0eBoR/uD8XAWU5UyHQGAaCHJKwQMIaq62E8Joirc37PCYEIXLI/82m2cnXE117XMuXf0ouqF7TqlVR8f4JID6HgFTgHBKSrWJpHwJDGOzEvIdlOIrcKGPAZFgFEUhVVvc8+aGDHDmgoMfAKCl+gIbfuuT8nnOIemWUdZvGXLIyn3KWX4QlOVvt7XVDGg700xUptOi2ueTqa1b6/u1LhrtqVPCOYBEDwrwzY3Hp/yg9VqKAEzz7JiCqn4wlTpXpyD7HCAuIoL7GYRPgPgGBHzNWVdwZn4+m8pUzxGIRwnhMoIYIOVqEDMAxTwi1W9gcElnZ/132m/+ldHAYUB5bEdHpL0Q6xqAaCyxRBEtY6WDQL0E6jEB8jj4jQ2YU7NBuONAyYPxeOMlzUwKuse5KToiUGU4+JdM8xSucE3tdCa7rugcxd7KUGSlV5DRdYlN5KoFPmk82d7ecFXbGdENPXVk2a1ANFkrCHBQoIhWhMLvm+bdGQ7Y5zngvZFMdzVx0Me54GaTpBekG/hMoX0fX31K+0ABFilmSPsiZevVEyH8Xzgq+4pSzgzWHdd6ISzXYNRjPSNu0/MC/J/o4FrnBdf7wfSZF7mmWknRXM5YoAvLXLKOMXuHmcy7yDBWC4UrucI/Rom7q8Ly1dL7ZDtlzNaQC7hm/frEeO1ThEKhfq7kI+yAceRVv0opcoX99b8K3UauCcPTMlv3chGdwqCYV1+LS3dua/w8HJ76Fk0sf7aybOpa04wMerbNzd0Rhc6bnMAYZubpnOMe0gUrdKaVofAKCbCYQezhw8W2k9vX1NQ7eU3LmYVr1nVrevMipTzBZVuklRGfdUWgbfuWxtOrVkXyoHlmlPkvWpxdb/jgQWK3BXHIeohZm+I98zpTd0uxC/SB7oRk0tqvkBZxoAwXRDnT+RdPuc1V5Q172EQk04kWDjwLSP1OSI/rOuYO2B0wyvcD5MZajrOXAzVwe/ax/jUDxVFb0UKeT8u5KObrOAURCQyIR68DoA9isd9qHEqdYKonXbPkGOK8NOAZ2zX+FkK5fqJAfh4gNbqu+zo7vofb8iS/RIspzk88fZedpxTgT7w+zA8/st0p3s/nL8IVYYgd29si7xbfpxfM9qVJWDjEjjwVl7Oa5Npwkgtct4llE2YJVY73TDsVfBA9UnIjf5efwzxqZ3LQ93zSvykYrL8waHdXl5HheENqGACffeegA5d/Zg/TPATsoIv7JQkKqjjgeAZXVYrPs7vB2orVVfFt/35L+krt2PdwiW3smebkrDc4SC0HPgMB3Oi3/b2uqwJSQpB8qkJlnVqFWOMqmsjTsJq9jOMpOav01fGsuKAwuGBXR71OaEQZEYC21C2SyUClPSE4sHNt7dCIt0uUekImhxJzlEMmSpjGw6iXC3BXZ2fkUInZsO0NAQyzvEVFS8u5OxxjaAx/FdO38iflFt2Omo0yMMrAf8fAP8fXR9N4is8VAAAAAElFTkSuQmCC" rel="icon" type="image/x-icon" /><link href="https://fonts.googleapis.com/css?family=Open+Sans:400italic,600italic,700italic,400,600,700" rel="stylesheet" type="text/css"><style>` + fs.readFileSync(__dirname + '/../../docs/docs.css').toString() + `</style><script>` + fs.readFileSync(__dirname + '/../../docs/docs.js').toString() + `</script></head><body>`;

  data += '<div id="console-wrapper"><div id="console-header"  onclick="toggleConsole();">REST API Console  <span id="console-close" class="close">Show</span></div><div id="console-results"><div class="result">[?] Try our REST API. For example: /asset/btc/balance/$YOUR_ADDRESS.</div></div><div class="prompt"> >> <input class="text" type="text" onkeyup="if(event.keyCode===13){rout(event.target.value);event.target.value=\'\';}else if(event.keyCode===38 && commandIndex>0){ commandIndex--; event.target.value=commands[commandIndex];}else if(event.keyCode===40 && commandIndex<commands.length-1){ commandIndex++; event.target.value=commands[commandIndex];}"/></div></div>';

  data += '<div id="navigation"><script>initNavigation("REST API")</script>';

  var parentNode = null;
  var tree = global.hybrixd.routetree;

  tree['_help'] = `<h3>Welcome to the hybrixd REST API.</h3>

This Application Programming Interface can be used to retrieve information from hybrixd. The requests are formated as / separated commands.
(Similar to a website url or file path.)

<p><a onclick="document.getElementById('more').style.display='block'; event.target.style.display='none';">Read more...</a></p>
<div id="more" style="display:none;">

<h3>Examples</h3>
<ul>
<li><code><span style="color:blue">/asset</span></code> returns the assets supported by the hybrixd node.</li>
<li><code><span style="color:blue">/asset/btc/balance/32FCGFdRGeho2HBeWQPaAYawJfPqHHvsCJ</span></code> returns the balance of the Bitcoin address 32FCGFdRGeho2HBeWQPaAYawJfPqHHvsCJ.</li>
<li><code>/command/reload</code> reload hybrixd and reinitialize modules and recipes.</li>
<li><code><span style="color:green">/proc</span></code> returns the list of processes running on the hybrixd node.</li>
<li><code><span style="color:green">/proc/1543921378626236</span></code> returns the progress and result of process 1543921378626236.</li>
</ul>

<p>The response will be in JSON format. For the balance request <code>/asset/btc/balance/32FCGFdRGeho2HBeWQPaAYawJfPqHHvsCJ</code> this will be of the form:</p>

<p><code>{"error":0,"info":"Process data.","id":"1543921378626236","progress":1,"started":1543923093402,"stopped":1543923093695,"data":"<span style="color:orange;">0.00000000</span>","request":"<span style="color:blue">/asset/btc/balance/32FCGFdRGeho2HBeWQPaAYawJfPqHHvsCJ</span>"}</code></p>

<p>From which we see that the balance on this address is <span style="color:orange;">0.00000000</p>

<h3>Two Stage Requests</h3>
<p>For some requests the response will consist of a process reference. This means that the response to your request is not yet finished but you can follow up on it using the given process id.</p>


<p><code><span style="color:blue">/asset/btc/balance/32FCGFdRGeho2HBeWQPaAYawJfPqHHvsCJ</span></code></p>

<p>then returns</p>

<p><code>{"error":0,"info":"Command process ID.","id":"id","request":"<span style="color:blue">/asset/btc/balance/32FCGFdRGeho2HBeWQPaAYawJfPqHHvsCJ</span>","data":"<span style="color:green;">1543921378626236</span>"}</code></p>

<p>and the request <code><span style="color:green">/proc/1543921378626236</span></code> then returns</p>

<p><code>{"error":0,"info":"Process data.","id":"<span style="color:green;">1543921378626236</span>","progress":1,"started":1543923093402,"stopped":1543923093695,"data":"<span style="color:orange;">0.00000000</span>","request":"<span style="color:blue">/asset/btc/balance/32FCGFdRGeho2HBeWQPaAYawJfPqHHvsCJ</span>"}</code></p>

<h3>hybrixd-lib.js : a Javascript Library</h3>

To facilitate integration of the API into you Javascript projects we have created a library. This library will handle two stage request and all client side steps for the encyrption and signing of transactions.

<p><a href="/api/help/hybrix-lib.js">Learn more...</a></p>


</div>
`;

  var rootTree = tree;

  var nodes = [];

  var valid = true;

  for (var i = 1; i < rootPath.length; ++i) {
    parentNode = tree;
    if (tree.hasOwnProperty(rootPath[i])) {
      tree = tree[rootPath[i]];
      nodes[i] = tree;
    } else if (tree.hasOwnProperty('_ref')) {
      tree = tree['_ref'];
      nodes[i] = tree;
    } else {
      valid = false;
      // TODO error
    }
  }

  // Breadcrumbs
  var xpath = '';
  data += '<div class="breadcrumbs">';

  for (var i = 0; i < rootPath.length; ++i) {
    var node = rootPath[i];
    data += ' / ';
    if (node === '_ref') {
      var list = '$' + nodes[i]['_list'].toUpperCase();
      if (i > 0) {
        xpath += '/' + list;
      }
      data += '<a href="/api/' + rootPath.slice(0, i + 1).join('/') + '" ' + (valid ? '' : 'style="color:red;"') + '>' + list + '</a>';
    } else {
      if (i > 0) {
        xpath += '/' + node;
      }
      data += '<a href="/api/' + rootPath.slice(0, i + 1).join('/') + '" ' + (valid ? '' : 'style="color:red;"') + '>' + node + '</a>';
    }
  }
  data += ' / ';
  data += '</div>';
  data += '</div>';

  var requiresRootAccess = false;
  if (rootPath.length > 1) {
    var v = router.isValidPath(rootPath.slice(1), sessionID);

    if (!v.valid) {
      var h = help(rootPath.slice(1), v, true);
      requiresRootAccess = v.status === 403;
      if (h.indexOf('stand alone') === -1 && v.status !== 403) {
        data += '<br/><br/>' + h;
        return {type: 'text/html', data: data, error: 0, id: null};
      }
    }
  }
  // (sessionID, id, node, xpath, parentNode, expanded, noFrame, requiresRootAccess, rootTree) {
  if (xpath === '') {
    data += describeNode(sessionID, '', tree, xpath, parentNode, true, true, requiresRootAccess, rootTree);
  } else {
    data += describeNode(sessionID, '', tree, xpath, parentNode, true, true, requiresRootAccess, rootTree);
  }
  data += '</body>';
  data += '</html>';

  return {type: 'text/html', data: data, error: 0, id: null}; // TODO add request path and command
}

// Returns help information and suggestions for a given command
// validity is the return of valid call  {valid:true|false,ypath:[...],status:200|403|404|500}

function renderUrl (url, pretty, error) {
  if (pretty) {
    if (error) {
      return '<a href="/api/help' + url + '" style="color:red;">' + url + '</a>';
    } else {
      return '<a href="/api/help' + url + '">' + url + '</a>';
    }
  } else {
    return '`' + url + '`';
  }
}

function help (xpath, validity, pretty) {
  var message = '';
  switch (validity.status) {
    case 200:
    // TODO show help for this command
      break;
    case 403:
    // TODO use of this command is restricted
    // show help for last command
      break;
    case 404:
      var xpath_last = xpath[validity.ypath.length - 1];
      var ypath_last = validity.ypath[validity.ypath.length - 1];

      var dynamic_item = false;
      if (ypath_last && ypath_last.hasOwnProperty('_ref')) {
        if (ypath_last['_ref'].hasOwnProperty('_list')) {
          var list = ypath_last['_ref']['_list'];
          dynamic_item = router.isValidRef(list, xpath_last);
        }
      }

      if (dynamic_item) {
        try {
          var url = xpath.join('/');
          message += renderUrl(url, pretty, true) + ' cannot be used as stand alone command.<br/><br/>';

          var options = '';
          if (ypath_last['_ref'] && ypath_last['_ref'].hasOwnProperty('_ref') && ypath_last['_ref']['_ref'].hasOwnProperty('_list')) { // Dynamic list
            options += ' - Specify a value for : ' + '/' + renderUrl(url + '/$' + ypath_last[xpath_last]['_ref']['_ref']['_list'].toUpperCase(), pretty) + '<br/>';
          }
          for (var sibling in ypath_last['_ref']) {
            if (sibling.substr(0, 1) !== '_') {
              options += ' - ' + renderUrl('/' + url + '/' + sibling, pretty) + ' : ' + getHelpMessage(ypath_last['_ref'][sibling], ypath_last['_ref']) + '<br/>';
            }
          }
          if (options !== '') {
            message += 'Available options are:<br/>' + options;
          }
        } catch (e) {
          console.log(' [!] routing error: ' + e);
        }
      } else if (ypath_last && ypath_last.hasOwnProperty(xpath_last)) { // Found but does not have _this, so can't be used as standalone command
        var url = xpath.join('/');
        message += renderUrl('/' + url, pretty, true) + ' cannot be used as stand alone command.<br/><br/>';
        var options = '';
        if (ypath_last[xpath_last] && ypath_last[xpath_last].hasOwnProperty('_ref') && ypath_last[xpath_last]['_ref'].hasOwnProperty('_list')) { // Dynamic list
          options += ' - Specify a value for : ' + renderUrl('/' + url + '/$' + ypath_last[xpath_last]['_ref']['_list'].toUpperCase(), pretty) + '<br/>';
        }
        for (var sibling in ypath_last[xpath_last]) {
          if (sibling.substr(0, 1) !== '_') {
            options += ' - ' + renderUrl('/' + url + '/' + sibling, pretty) + ' : ' + getHelpMessage(ypath_last[xpath_last][sibling], ypath_last[xpath_last]) + '<br/>';
          }
        }
        if (options !== '') {
          message += 'Available options are:<br/>' + options;
        }
      } else {
        var url = xpath.slice(0, validity.ypath.length - 1).join('/');
        message += renderUrl(url + '/' + xpath_last, pretty, true) + ' is unknown.';
        var bestLevenshteinDistance = 3 + xpath_last.length * 0.1;
        var bestMatchingSibling = '';
        for (var sibling in ypath_last) {
          if (!sibling.startsWith('_')) {
            var tryLevenshteinDistance = levenshteinDistance(sibling, xpath_last);
            if (tryLevenshteinDistance < bestLevenshteinDistance) {
              bestLevenshteinDistance = tryLevenshteinDistance;
              bestMatchingSibling = sibling;
            }
          }
        }
        if (bestMatchingSibling) { // Fuzzy matched suggestion
          message += ' Did you mean ' + renderUrl(url + '/' + bestMatchingSibling, pretty) + '? ' + getHelpMessage(ypath_last[bestMatchingSibling], ypath_last) + '<br/>';
        }
        var options = '';
        for (var sibling in ypath_last) {
          if (sibling.substr(0, 1) !== '_') {
            options += ' - ' + renderUrl('' + url + '/' + sibling, pretty) + ' : ' + getHelpMessage(ypath_last[sibling], ypath_last) + '<br/>';
          }
        }
        if (options !== '') {
          message += '<br/>Available options are:<br/>' + options;
        }
      }
    case 500:
    // TODO internal error routetree.json is invalid
      break;
    default:
  }
  return message;
}
