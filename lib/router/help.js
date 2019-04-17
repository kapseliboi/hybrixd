// help.js -> handle proc calls
//
// (c)2016 metasync r&d / internet of coins project - Amadeus de Koning / Joachim de Koning / Rouke Pouw
//

const fs = require('fs');
const router = require('../router/router');

function serve (request, xpath) {
  if (xpath.length === 2) {
    const defaultData = {data: '../docs/' + xpath[1], error: 0, id: null};
    return Object.assign(defaultData, getFileTypeData(request, xpath));
  } else if (xpath.length === 1) { // help
    return html(xpath, request.sessionID);
  } else if (xpath[1] === 'api') {
    return html(xpath.slice(1), request.sessionID);
  }
}

function getFileTypeData (request, xpath) {
  if (xpath[1] === 'api') {
    return html(['help'], request.sessionID);
  } else if (xpath[1].includes('.png')) {
    return {type: 'file:image/png'}; // TODO add request path and command
  } else if (xpath[1].includes('.svg')) {
    return {type: 'file:image/svg+xml'}; // TODO add request path and command
  } else if (xpath[1] === 'hybrix-lib.web.js') {
    return {data: '../interface/hybrix-lib.web.js', type: 'file:application/javascript'}; // TODO add request path and command
  } else if (xpath[1] === 'docs.js') {
    return {data: '../docs/' + xpath[1], type: 'file:application/javascript'}; // TODO add request path and command
  } else if (xpath[1] === 'codemirror.js' || xpath[1] === 'javascript.js') {
    return {data: '../docs/' + xpath[1], type: 'file:application/javascript'}; // TODO add request path and command
  } else if (xpath[1].includes('.css')) {
    return {type: 'file:text/css'}; // TODO add request path and command
  } else {
    return {data: '../docs/' + xpath[1] + '.html', type: 'file:text/html'}; // TODO add request path and command
  }
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

function addSelectionDataHtml (data, refList, name, sample, id) {
  if (refList) {
    data += '/<select id="' + id + '">';
    for (let j = 0; j < refList.length; ++j) {
      data += refList[j] === sample
        ? '<option SELECTED>' + refList[j] + '</option>'
        : '<option>' + refList[j] + '</option>';
    }
    data += '</select>';
  } else {
    data += '/<input vis="true" placeholder="$' + name + '" id="' + id + '" value="' + sample + '"/>';
  }

  return data;
}

function mkCommandDataHtmlStr (data, varData, command, tr, xpath) {
  let j = 0;
  let tree = tr;

  for (let i = 0; i < command.length; ++i) {
    // Iterate through tree
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
      let name = command[i].substr(1);
      let sample = typeof tree === 'object' && tree.hasOwnProperty('_sample') ? tree['_sample'] : '';
      let id = command.slice(0, i).join('/').replace('/', '_').replace('$', '_') + '_' + j;
      let refList = router.refList(name.toLowerCase());

      j = typeof refList !== 'undefined' ? refList.length : 0;

      data = addSelectionDataHtml(data, refList, name, sample, id);
      varData += ' + \'/\' + document.getElementById(\'' + id + '\').value';
    } else if (command[i] !== '') {
      data += '/' + command[i];
      varData += ' + \'/' + command[i] + '\'';
    }
  }

  return {
    data,
    varData,
    j
  };
}

function apiEdit (sessionID, xpath, requiresRootAccess, elipsis, rootTree) {
  const command = xpath.split('/');
  const commandDataHtmlStr = mkCommandDataHtmlStr('', '', command, rootTree, xpath);
  const data = commandDataHtmlStr.data;
  const varData = commandDataHtmlStr.varData;
  const elipsisID = xpath.replace('/', '_').replace('$', '_') + '_' + commandDataHtmlStr.j;
  const dataElipsisHtmlStr = elipsis ? '<input placeholder="/.../$PATH" id="' + elipsisID + '" />' : '';
  const varDataElipsisHtmlStr = elipsis ? '/\' + document.getElementById(\'' + elipsisID + '\').value' : '';
  const varDataHtmlStr = `${varData}${varDataElipsisHtmlStr}`;

  const rootAccessHtmlStr = !requiresRootAccess || sessionID === 1
    ? '<input type="submit" value="Try it" onclick="rout( \'\' ' + varDataHtmlStr + ');">'
    : '<input disabled type="submit" value="Try it" onclick="rout( \'\' ' + varDataHtmlStr + ');"> <span class="root-only">(Root only)</span>';
  const dataHtmlStr = `<code>
                         ${data}
                         ${dataElipsisHtmlStr}
                       </code>
                       ${rootAccessHtmlStr}
                       <input type="submit" value="Copy" onclick="copyToClipboard( \'\' + window.location.protocol + \'//\' + window.location.hostname + \':\' + window.location.port+\'/api\'${varDataHtmlStr});">`;

  return dataHtmlStr;
}

function getDescriptionAndSubNodeCount (node) {
  let subNodeCount = 0;
  let quickDescription = '';

  if (typeof node === 'string') {
    quickDescription = node;
  } else {
    // if there's only one child, don't bother with showing a new frame
    for (let key in node) {
      if (!key.startsWith('_') || key === '_ref') { ++subNodeCount; }
    }
    if (node.hasOwnProperty('_help')) {
      quickDescription += node['_help'].replace(/<\/?[^>]+(>|$)/g, '');
    }

    if (node.hasOwnProperty('_this')) {
      quickDescription += ' ' + node['_this'];
    }
  }

  return {
    quickDescription,
    subNodeCount
  };
}

function maybeAddParentNodeDataToHtmlStr (data, xpath, parentNode) {
  if (parentNode) {
    for (let aliasNode in parentNode) {
      if (parentNode[aliasNode].hasOwnProperty('_alias') && parentNode[aliasNode]['_alias'] === xpath.substr(1)) {
        data += "<p class='_alias'>Alias: <code>/" + aliasNode + '</code></p>';
      }
    }
  }
  return data;
}

function mkHtmlStr (sessionID, id, node, xpath, parentNode, expanded, noFrame, requiresRootAccess, rootTree) {
  const hasAlias = typeof node === 'object' && node.hasOwnProperty('_alias') && parentNode; // Resolve alias
  const descriptionSubNodeCount = getDescriptionAndSubNodeCount(node);
  const quickDescription = descriptionSubNodeCount.quickDescription;
  const subNodeCount = descriptionSubNodeCount.subNodeCount;
  const aliasOrDefaultDataHtmlStr = hasAlias ? '(Redirected from <code>' + xpath + '</code> )' : '';
  const aliasOrDefaultXpath = hasAlias ? xpath.substr(0, xpath.length - id.length - 1) + id + node['_alias'] : xpath;
  const aliasOrDefaultID = hasAlias ? node['_alias'] : id;
  const aliasOrDefaultNode = hasAlias ? parentNode[aliasOrDefaultID] : node;
  const frameOrDefaultHtmlStr = !noFrame
    ? '<div class="command-header" onclick="toggleCommand(\'' + aliasOrDefaultXpath + '\')"><b>' + (aliasOrDefaultXpath || '/') + '</b><span class="quickDescription">' + quickDescription + '</span></div><div id="' + aliasOrDefaultXpath + '" ' + (expanded ? 'style="display:block"' : 'style="display:none"') + '  class="command-body">'
    : '<div>';
  const initialHtmlStr_ = aliasOrDefaultDataHtmlStr + frameOrDefaultHtmlStr;
  const dataHtmlStr = maybeAddParentNodeDataToHtmlStr(initialHtmlStr_, aliasOrDefaultXpath, parentNode);

  return typeof aliasOrDefaultNode === 'string'
    ? dataHtmlStr + '<p>' + apiEdit(sessionID, aliasOrDefaultXpath, requiresRootAccess, false, rootTree) + '&nbsp;<span class="_this">' + parseMarkUp(aliasOrDefaultNode) + '</span></p></div>'
    : setData_(dataHtmlStr, sessionID, aliasOrDefaultXpath, requiresRootAccess, rootTree, aliasOrDefaultNode, subNodeCount);
}

function describeNode (sessionID, id, node, xpath, parentNode, expanded, noFrame, requiresRootAccess, rootTree) {
  const requiresRootAccess_ = requiresRootAccess || node['_access'] === 'root';

  return typeof node === 'object' && node['_hidden']
    ? ''
    : mkHtmlStr(sessionID, id, node, xpath, parentNode, expanded, noFrame, requiresRootAccess_, rootTree);
}

function setData_ (data, sessionID, xpath, requiresRootAccess, rootTree, node, subNodeCount) {
  data += node.hasOwnProperty('_access')
    ? "<p class='_access'>Root only.</p>"
    : '';

  data += node.hasOwnProperty('_help')
    ? "<p class='_help'>" + parseMarkUp(node['_help']) + '</p>'
    : '';

  data += node.hasOwnProperty('_this')
    ? '<p>' + apiEdit(sessionID, xpath, requiresRootAccess, node['_ellipsis'], rootTree) + '&nbsp;<span class="_this">' + parseMarkUp(node['_this']) + '</span></p>'
    : '';

  data = describeNode_(data, sessionID, xpath, requiresRootAccess, rootTree, node, subNodeCount);
  data = describeSubNodes(data, sessionID, xpath, requiresRootAccess, rootTree, node, subNodeCount);

  // if (!noFrame) {
  data += '</div>';
  // }
  return data;
}

function describeNode_ (data, sessionID, xpath, requiresRootAccess, rootTree, node, subNodeCount) {
  if (node.hasOwnProperty('_ref') && node['_ref'].hasOwnProperty('_list')) {
    let list = '$' + node['_ref']['_list'].toUpperCase();
    data += describeNode(sessionID, list, node['_ref'], xpath + '/' + list, node, false, subNodeCount <= 1, requiresRootAccess, rootTree);
  }
  return data;
}

function describeSubNodes (data, sessionID, xpath, requiresRootAccess, rootTree, node, subNodeCount) {
  for (let subNode in node) {
    if (!node[subNode].hasOwnProperty('_alias') && subNode.substr(0, 1) !== '_') {
      data += describeNode(sessionID, subNode, node[subNode], xpath + '/' + subNode, node, false, subNodeCount <= 1, requiresRootAccess, rootTree);
    }
  }
  return data;
}

function html (rootPath, sessionID) {
  let data = fs.readFileSync('../docs/source/header.html').toString();
  let parentNode = null;
  let tree = global.hybrixd.routetree;

  tree['_help'] = fs.readFileSync('../docs/source/api.html').toString();

  let rootTree = tree;
  let nodes = [];
  let valid = true;

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
  let xpath = '';
  data += '<div class="breadcrumbs">';

  for (var i = 0; i < rootPath.length; ++i) {
    const node = rootPath[i];
    const listOrNode = node === '_ref' ? '$' + nodes[i]['_list'].toUpperCase() : node;
    xpath += i > 0 ? '/' + listOrNode : '';
    data += ' / ';
    data += '<a href="/api/' + rootPath.slice(0, i + 1).join('/') + '" ' + (valid ? '' : 'style="color:red;"') + '>' + listOrNode + '</a>';
  }
  data += ' / ';
  data += '</div>';

  let requiresRootAccess = false;
  if (rootPath.length > 1) {
    let v = router.isValidPath(rootPath.slice(1), sessionID);

    if (!v.valid) {
      let h = help(rootPath.slice(1), v, true);
      requiresRootAccess = v.status === 403;
      if (h.indexOf('stand alone') === -1 && v.status !== 403) {
        data += '<br/><br/>' + h;
        return {type: 'text/html', data: data, error: 0, id: null};
      }
    }
  }

  data += describeNode(sessionID, '', tree, xpath, parentNode, true, true, requiresRootAccess, rootTree);
  data += fs.readFileSync('../docs/source/footer.html').toString();

  return {type: 'text/html', data: data, error: 0, id: null}; // TODO add request path and command
}

// Returns help information and suggestions for a given command
// validity is the return of valid call  {valid:true|false,ypath:[...],status:200|403|404|500}

function renderUrl (url, pretty, error) {
  const styleStr = error ? ' style="color:red;"' : '';

  return pretty
    ? `<a href="/api/help${url}"${styleStr}>${url}</a>`
    : '`' + url + '`';
}

function help (xpath, validity, pretty) {
  let message = '';
  switch (validity.status) {
    case 200:
    // TODO show help for this command
      break;
    case 403:
    // TODO use of this command is restricted
    // show help for last command
      break;
    case 404:
      message = mk404message(xpath, validity, pretty);
      break;
    case 500:
    // TODO internal error routetree.json is invalid
      break;
    default:
  }
  return message;
}

function mk404message (xpath, validity, pretty) {
  let message = '';
  const xpathLast = xpath[validity.ypath.length - 1];
  const ypathLast = validity.ypath[validity.ypath.length - 1];
  const dynamicItem = ypathLast &&
                        ypathLast.hasOwnProperty('_ref') &&
                        ypathLast['_ref'].hasOwnProperty('_list')
    ? router.isValidRef(ypathLast['_ref']['_list'], xpathLast)
    : false;

  if (dynamicItem) {
    message = dynamicMessage(xpath, xpathLast, ypathLast, pretty);
  } else if (ypathLast && ypathLast.hasOwnProperty(xpathLast)) { // Found but does not have _this, so can't be used as standalone command
    message = messageCannotBeUsedAsStandAlone(xpath, xpathLast, ypathLast, pretty);
  } else {
    message = messageIsUnknown(xpath, validity, xpathLast, ypathLast, pretty);
  }
  return message;
}

function dynamicMessage (xpath, xpathLast, ypathLast, pretty) {
  let message = '';
  try {
    let url = xpath.join('/');
    message += renderUrl(url, pretty, true) + ' cannot be used as stand alone command.<br/><br/>';

    let options = '';
    if (ypathLast['_ref'] && ypathLast['_ref'].hasOwnProperty('_ref') && ypathLast['_ref']['_ref'].hasOwnProperty('_list')) { // Dynamic list
      options += ' - Specify a value for : ' + '/' + renderUrl(url + '/$' + ypathLast[xpathLast]['_ref']['_ref']['_list'].toUpperCase(), pretty) + '<br/>';
    }
    for (let sibling in ypathLast['_ref']) {
      if (sibling.substr(0, 1) !== '_') {
        options += ' - ' + renderUrl('/' + url + '/' + sibling, pretty) + ' : ' + getHelpMessage(ypathLast['_ref'][sibling], ypathLast['_ref']) + '<br/>';
      }
    }
    if (options !== '') {
      message += 'Available options are:<br/>' + options;
    }
    return message;
  } catch (e) {
    console.log(' [!] routing error: ' + e);
  }
}

function messageCannotBeUsedAsStandAlone (xpath, xpathLast, ypathLast, pretty) {
  const url = xpath.join('/');
  const options = makeStandAloneOptionsHtmlStr(url, xpathLast, ypathLast, pretty);
  const notStandAloneHtmlStr = renderUrl('/' + url, pretty, true) + ' cannot be used as stand alone command.<br/><br/>';
  const optionsHtmlStr = options !== '' ? 'Available options are:<br/>' + options : '';

  return `${notStandAloneHtmlStr}${optionsHtmlStr}`;
}

function makeStandAloneOptionsHtmlStr (url, xpathLast, ypathLast, pretty) {
  let options = '';

  if (ypathLast[xpathLast] && ypathLast[xpathLast].hasOwnProperty('_ref') && ypathLast[xpathLast]['_ref'].hasOwnProperty('_list')) { // Dynamic list
    options += ' - Specify a value for : ' + renderUrl('/' + url + '/$' + ypathLast[xpathLast]['_ref']['_list'].toUpperCase(), pretty) + '<br/>';
  }
  for (let sibling in ypathLast[xpathLast]) {
    if (sibling.substr(0, 1) !== '_') {
      options += ' - ' + renderUrl('/' + url + '/' + sibling, pretty) + ' : ' + getHelpMessage(ypathLast[xpathLast][sibling], ypathLast[xpathLast]) + '<br/>';
    }
  }
  return options;
}

function messageIsUnknown (xpath, validity, xpathLast, ypathLast, pretty) {
  const url = xpath.slice(0, validity.ypath.length - 1).join('/');
  const options = mkOptions(url, ypathLast, pretty);
  const bestMatchingSibling = getBestMatchingSibling(xpathLast, ypathLast);
  const unknownUrlMessageHtmlStr = renderUrl(url + '/' + xpathLast, pretty, true) + ' is unknown.';
  const bestMatchingSiblingHtmlStr = bestMatchingSibling
    ? ' Did you mean ' + renderUrl(url + '/' + bestMatchingSibling, pretty) + '? ' + getHelpMessage(ypathLast[bestMatchingSibling], ypathLast) + '<br/>'
    : '';
  const optionsHtmlStr = options !== ''
    ? '<br/>Available options are:<br/>' + options
    : '';

  return `${unknownUrlMessageHtmlStr} ${bestMatchingSiblingHtmlStr}${optionsHtmlStr}`;
}

function mkOptions (url, ypathLast, pretty) {
  let options = '';
  for (let sibling in ypathLast) {
    if (sibling.substr(0, 1) !== '_') {
      options += ' - ' + renderUrl('' + url + '/' + sibling, pretty) + ' : ' + getHelpMessage(ypathLast[sibling], ypathLast) + '<br/>';
    }
  }
  return options;
}

function getBestMatchingSibling (xpathLast, ypathLast) {
  let bestLevenshteinDistance = 3 + xpathLast.length * 0.1;
  let bestMatchingSibling = '';
  for (let sibling in ypathLast) {
    if (!sibling.startsWith('_')) {
      let tryLevenshteinDistance = levenshteinDistance(sibling, xpathLast);
      if (tryLevenshteinDistance < bestLevenshteinDistance) {
        bestLevenshteinDistance = tryLevenshteinDistance;
        bestMatchingSibling = sibling;
      }
    }
  }
  return bestMatchingSibling;
}

function levenshteinDistance (a, b) {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  let matrix = [];

  // increment along the first column of each row
  let i;
  for (i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  // increment each column in the first row
  let j;
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

exports.help = help;
exports.serve = serve;
