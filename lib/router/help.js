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
    const defaultData = {data: '../docs/introduction.html', error: 0, id: null};
    return Object.assign(defaultData, getFileTypeData(request, xpath.concat(['introduction'])));
  } else if (xpath[1] === 'api') {
    return html(xpath.slice(1), request.sessionID);
  }
}

function getFileTypeData (request, xpath) {
  if (xpath[1] === 'api') {
    return html(['help'], request.sessionID);
  } else if (xpath[1].includes('.woff')) {
    return {mime: 'file:application/x-font-woff'};
  } else if (xpath[1].includes('.ttf')) {
    return {mime: 'file:application/x-font-ttf'};
  } else if (xpath[1].includes('.eot')) {
    return {mime: 'file:application/vnd.ms-fontobject'};
  } else if (xpath[1].includes('.png')) {
    return {mime: 'file:image/png'};
  } else if (xpath[1].includes('.svg')) {
    return {mime: 'file:image/svg+xml'};
  } else if (xpath[1] === 'hybrix-lib.web.js') {
    return {mime: '../interface/hybrix-lib.web.js', mime: 'file:application/javascript'};
  } else if (xpath[1] === 'docs.js') {
    return {mime: '../docs/' + xpath[1], mime: 'file:application/javascript'};
  } else if (xpath[1] === 'codemirror.js' || xpath[1] === 'javascript.js') {
    return {mime: '../docs/' + xpath[1], mime: 'file:application/javascript'};
  } else if (xpath[1].includes('.css')) {
    return {mime: 'file:text/css'};
  } else if (fs.existsSync('../docs/' + xpath[1] + '.html')) {
    return {data: '../docs/' + xpath[1] + '.html', mime: 'file:text/html'};
  } else {
    return {data: '../docs/404.html', mime: 'file:text/html'};
  }
}

function getHelpMessage (n, parentNode) {
  if (typeof n === 'string') {
    return n;
  } else if (typeof n === 'object' && n !== null) {
    if (n.hasOwnProperty('_alias') && parentNode) {
      if (n['_alias'] === '/') {
        n = global.hybrixd.routetree;
      } else {
        n = parentNode[n['_alias']];
      }
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
    data += '/<input placeholder="$' + name + '" id="' + id + '" value="' + sample + '"/>';
  }

  return data;
}

let globalPostFixIdCounter = 0;

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
      const name = command[i].substr(1);
      const sample = typeof tree === 'object' && tree.hasOwnProperty('_sample') ? tree['_sample'] : '';
      ++globalPostFixIdCounter;
      const id = command.join('_').replace('$', '_') + '_' + j + '_' + globalPostFixIdCounter;
      const refList = router.refList(name.toLowerCase());

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
  ++globalPostFixIdCounter;
  const elipsisID = xpath.replace('/', '_').replace('$', '_') + '_' + commandDataHtmlStr.j + '_' + globalPostFixIdCounter;
  const dataElipsisHtmlStr = elipsis ? '<input placeholder="/.../$PATH" id="' + elipsisID + '" />' : '';
  const varDataElipsisHtmlStr = elipsis ? '/\' + document.getElementById(\'' + elipsisID + '\').value' : '';
  const varDataHtmlStr = `${varData}${varDataElipsisHtmlStr}`;

  const rootAccessHtmlStr = !requiresRootAccess || sessionID === 1
    ? '<input type="submit" value="Try it" onclick="rout( \'\' ' + varDataHtmlStr + ');">'
    : '<input disabled type="submit" value="Try it" onclick="rout( \'\' ' + varDataHtmlStr + ');"><span class="root-only">(Root only)&nbsp;</span>';
  const dataHtmlStr = `<code>
                         ${data}
                         ${dataElipsisHtmlStr}
                       </code>
                       <div class="example-buttons">
                       ${rootAccessHtmlStr}
                       <input type="submit" value="Copy" onclick="copyToClipboard(window.location.protocol + '//' + window.location.hostname + ':' + window.location.port ${varDataHtmlStr});">
                       </div>`;

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
    ? '<div class="command-header" onclick="toggleCommand(\'' + aliasOrDefaultXpath + '\')"><b>' + (aliasOrDefaultXpath || '/') + '</b><span class="quickDescription">' + quickDescription + '</span><span class="toggleIcon"><svg width="18px" height="18px" viewBox="0 0 18 18" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"> <g stroke="none" stroke-width="1" fill="none" fill-rule="evenodd"> <path d="M9,0 C11.4848182,0 13.7356364,1.00881818 15.3638182,2.63618182 C16.992,4.26354545 18,6.51518182 18,9 C18,11.4848182 16.9911818,13.7356364 15.3638182,15.3638182 C13.7364545,16.992 11.4848182,18 9,18 C6.51518182,18 4.26436364,16.9911818 2.63618182,15.3638182 C1.008,13.7364545 0,11.4848182 0,9 C0,6.51518182 1.00881818,4.26436364 2.63618182,2.63618182 C4.26354545,1.008 6.51518182,0 9,0 Z M9,4.90909091 C8.54836364,4.90909091 8.18181818,5.27563636 8.18181818,5.72727273 L8.18181818,8.18181818 L5.72727273,8.18181818 C5.27563636,8.18181818 4.90909091,8.54836364 4.90909091,9 C4.90909091,9.45163636 5.27563636,9.81818182 5.72727273,9.81818182 L8.18181818,9.81818182 L8.18181818,12.2727273 C8.18181818,12.7243636 8.54836364,13.0909091 9,13.0909091 C9.45163636,13.0909091 9.81818182,12.7243636 9.81818182,12.2727273 L9.81818182,9.81818182 L12.2727273,9.81818182 C12.7243636,9.81818182 13.0909091,9.45163636 13.0909091,9 C13.0909091,8.54836364 12.7243636,8.18181818 12.2727273,8.18181818 L9.81818182,8.18181818 L9.81818182,5.72727273 C9.81818182,5.27563636 9.45163636,4.90909091 9,4.90909091 Z" fill="#5DBDC9" fill-rule="nonzero"></path> </g> </svg></span></div><div id="' + aliasOrDefaultXpath + '" ' + (expanded ? 'style="display:block"' : 'style="display:none"') + '  class="command-body">'
    : '<div>';
  const initialHtmlStr_ = aliasOrDefaultDataHtmlStr + frameOrDefaultHtmlStr;
  const dataHtmlStr = maybeAddParentNodeDataToHtmlStr(initialHtmlStr_, aliasOrDefaultXpath, parentNode);

  return typeof aliasOrDefaultNode === 'string'
    ? dataHtmlStr + '<div class="paragraph">' + apiEdit(sessionID, aliasOrDefaultXpath, requiresRootAccess, false, rootTree) + '<span class="_this">' + parseMarkUp(aliasOrDefaultNode) + '</span></div></div>'
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
    ? parseMarkUp(node['_help'])
    : '';

  data += node.hasOwnProperty('_this')
    ? '<div class="paragraph">' + apiEdit(sessionID, xpath, requiresRootAccess, node['_ellipsis'], rootTree) + '<span class="_this">' + parseMarkUp(node['_this']) + '</span></div>'
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

  for (let i = 1; i < rootPath.length; ++i) {
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
  data += '<div class="breadcrumbs"><script> setTimeout(initAPIConsole, 100);</script>';

  for (let i = 0; i < rootPath.length; ++i) {
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
        return {mime: 'text/html', data: data, error: 0, id: null};
      }
    }
  }

  data += describeNode(sessionID, '', tree, xpath, parentNode, true, true, requiresRootAccess, rootTree);
  data += fs.readFileSync('../docs/source/footer.html').toString();

  return {mime: 'text/html', data: data, error: 0, id: null};
}

// Returns help information and suggestions for a given command
// validity is the return of valid call  {valid:true|false,ypath:[...],status:200|403|404|500}

function renderUrl (url, pretty, error) {
  const styleStr = error ? ' style="color:red;"' : '';
  if (typeof url === 'string' && !url.startsWith('/')) { url = '/' + url; }
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
