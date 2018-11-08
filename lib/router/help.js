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
    return {data: '../docs/' + xpath[1] + '.html', type: 'file:text/html', error: 0, id: null}; // TODO add request path and command
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
      quickDescription += node['_help'];
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
    data += "<p class='help'><i>" + parseMarkUp(node['_help']) + '</i></p>';
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
  var data = `<html><header><title>hybridd : REST API Help</title></header><body><style>` + fs.readFileSync(__dirname + '/../../docs/docs.css').toString() + `</style><script>` + fs.readFileSync(__dirname + '/../../docs/docs.js').toString() + `</script>
`;

  data += '<div id="console-wrapper"><div id="console-header"  onclick="toggleConsole();">REST API Console  <span id="console-close" class="close">Show</span></div><div id="console-results"><div class="result">[?] Try our REST API. For example: /asset/btc/balance/$YOUR_ADDRESS.</div></div><div class="prompt"> >> <input class="text" type="text" onkeyup="if(event.keyCode===13){rout(event.target.value);event.target.value=\'\';}else if(event.keyCode===38 && commandIndex>0){ commandIndex--; event.target.value=commands[commandIndex];}else if(event.keyCode===40 && commandIndex<commands.length-1){ commandIndex++; event.target.value=commands[commandIndex];}"/></div></div>';

  data += '<div id="navigation"></div><script>initNavigation("REST API")</script>';

  var parentNode = null;
  var tree = global.hybridd.routetree;
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

  if (xpath === '') {
    data += describeNode(sessionID, '', tree, xpath, parentNode, true, false, requiresRootAccess, rootTree);
  } else {
    data += describeNode(sessionID, '', tree, xpath, parentNode, true, false, requiresRootAccess, rootTree);
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
