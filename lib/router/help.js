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
  if (xpath.length >= 2) {
    if (xpath[1] === 'hybrix.png') {
      return {data: '../docs/' + xpath[1], type: 'file:image/png', error: 0, id: null}; // TODO add request path and command
    } else if (xpath[1] === 'download.svg') {
      return {data: '../docs/' + xpath[1], type: 'file:image/svg+xml', error: 0, id: null}; // TODO add request path and command
    } else if (xpath[1] === 'search.svg') {
      return {data: '../docs/' + xpath[1], type: 'file:image/svg+xml', error: 0, id: null}; // TODO add request path and command
    } else if (xpath[1] === 'hybrix_overview.png') {
      return {data: '../docs/' + xpath[1], type: 'file:image/png', error: 0, id: null}; // TODO add request path and command
    } else if (xpath[1] === 'docs.js') {
      return {data: '../docs/' + xpath[1], type: 'file:application/javascript', error: 0, id: null}; // TODO add request path and command
    } else if (xpath[1] === 'codemirror.js' || xpath[1] === 'javascript.js') {
      return {data: '../docs/' + xpath[1], type: 'file:application/javascript', error: 0, id: null}; // TODO add request path and command
    } else if (xpath[1] === 'codemirror.css') {
      return {data: '../docs/' + xpath[1], type: 'file:text/css', error: 0, id: null}; // TODO add request path and command
    } else if (xpath[1] === 'hybrix-lib.web.js') {
      return {data: '../interface/hybrix-lib.web.js', type: 'file:application/javascript', error: 0, id: null}; // TODO add request path and command
    } else if (xpath[1] === 'docs.css') {
      return {data: '../docs/' + xpath[1], type: 'file:text/css', error: 0, id: null}; // TODO add request path and command
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
    data += '<input type="submit" value="Try it" onclick="rout( \'\' ' + varData + ');">';
  } else {
    data += '<input disabled type="submit" value="Try it" onclick="rout( \'\' ' + varData + ');"> <span class="root-only">(Root only)</span>';
  }
  data += '<input type="submit" value="Copy" onclick="copyToClipboard( \'\' + window.location.protocol + \'//\' + window.location.hostname + \':\' + window.location.port+\'/api\'' + varData + ');">';
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

  if (parentNode) {
    for (var aliasNode in parentNode) {
      if (parentNode[aliasNode].hasOwnProperty('_alias') && parentNode[aliasNode]['_alias'] === xpath.substr(1)) {
        data += "<p class='_alias'>Alias: <code>/" + aliasNode + '</code></p>';
      }
    }
  }

  if (typeof node === 'string') {
    return data + '<p>' + apiEdit(sessionID, xpath, requiresRootAccess, false, rootTree) + '&nbsp;<span class="_this">' + parseMarkUp(node) + '</span></p></div>';
  }

  if (node.hasOwnProperty('_access')) {
    data += "<p class='_access'>Root only.</p>";
  }

  if (node.hasOwnProperty('_help')) {
    data += "<p class='_help'>" + parseMarkUp(node['_help']) + '</p>';
  }

  if (node.hasOwnProperty('_this')) {
    data += '<p>' + apiEdit(sessionID, xpath, requiresRootAccess, node['_ellipsis'], rootTree) + '&nbsp;<span class="_this">' + parseMarkUp(node['_this']) + '</span></p>';

    if (node.hasOwnProperty('_response')) {
      /*      if (typeof node['_response'] === 'string') {
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
      } */
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
  var data = `<!DOCTYPE html>
<html lang="en">
  <head>
    <title>Help | hybrix - Build flexible blockchain solutions</title>
    <meta name="viewport" content="width=device-width, initial-scale=1, minimum-scale=0.5, maximum-scale=2.0">
    <meta http-equiv="Content-Type" content="text/html;charset=UTF-8">

    <link href="data:image/png;base64,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" rel="icon" type="image/x-icon" />

    <!-- Font -->
    <link href="https://fonts.googleapis.com/css?family=Palanquin:200,300,400,500,600" rel="stylesheet">

    <!-- CSS -->
    <link rel="stylesheet" href="https://unpkg.com/purecss@1.0.0/build/pure-min.css" integrity="sha384-nn4HPE8lTHyVtfCBi5yW9d20FjT8BJwUXyWZT9InLYax14RDjBj46LmSztkmNP9w" crossorigin="anonymous">
    <link rel="stylesheet" href="https://unpkg.com/purecss@1.0.0/build/grids-responsive-min.css">
    <link rel="stylesheet" type="text/css" href="./help/docs.css">
    <link rel=stylesheet href="./help/codemirror.css">
    <link rel="stylesheet" type="text/css" href="./docs.css">
    <link rel=stylesheet href="./codemirror.css">

    <!-- JS -->
    <script src="./help/docs.js"></script>
    <script src="./help/codemirror.js"></script>
    <script src="./help/javascript.js"></script>
    <script src="./docs.js"></script>
    <script src="./codemirror.js"></script>
    <script src="./javascript.js"></script>
  </head>
  <body>`;

  data += `<div class="header">
      <div class="pure-g">
        <div class="pure-u-1 pure-u-lg-1-4">
        <svg class="logo" alt="{{ config.site.title }}" viewBox="0 0 2070 839" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
          <defs>
              <radialGradient cx="74.8280232%" cy="94.3295877%" fx="74.8280232%" fy="94.3295877%" r="55.5402692%" gradientTransform="translate(0.748280,0.943296),scale(0.405168,1.000000),rotate(-103.463924),scale(1.000000,3.068031),translate(-0.748280,-0.943296)" id="radialGradient-A">
                  <stop stop-color="#69E1CD" offset="0%"></stop>
                  <stop stop-color="#69E1CE" stop-opacity="0" offset="100%"></stop>
              </radialGradient>
              <radialGradient cx="2.43573207%" cy="10.0784095%" fx="2.43573207%" fy="10.0784095%" r="177.087164%" gradientTransform="translate(0.024357,0.100784),scale(0.405168,1.000000),rotate(-140.508079),scale(1.000000,1.714322),translate(-0.024357,-0.100784)" id="radialGradient-B">
                  <stop stop-color="#EAA05B" offset="0%"></stop>
                  <stop stop-color="#EAA05B" stop-opacity="0.914968297" offset="6.17548772%"></stop>
                  <stop stop-color="#EAA05B" stop-opacity="0" offset="100%"></stop>
                  <stop stop-color="#EAA05B" stop-opacity="0" offset="100%"></stop>
              </radialGradient>
              <radialGradient cx="93.7433601%" cy="0%" fx="93.7433601%" fy="0%" r="230.126538%" gradientTransform="translate(0.937434,0.000000),scale(0.405168,1.000000),rotate(145.390210),scale(1.000000,1.466156),translate(-0.937434,-0.000000)" id="radialGradient-C">
                  <stop stop-color="#F252BC" offset="0%"></stop>
                  <stop stop-color="#F252BC" stop-opacity="0.891502491" offset="31.6104241%"></stop>
                  <stop stop-color="#F251BD" stop-opacity="0" offset="100%"></stop>
              </radialGradient>
              <radialGradient cx="1.95055786%" cy="17.1506499%" fx="1.95055786%" fy="17.1506499%" r="92.519592%" gradientTransform="translate(0.019506,0.171506),scale(0.405168,1.000000),rotate(-116.284375),scale(1.000000,1.779837),translate(-0.019506,-0.171506)" id="radialGradient-D">
                  <stop stop-color="#EAA05B" offset="0%"></stop>
                  <stop stop-color="#EAA05B" stop-opacity="0.914968297" offset="6.17548772%"></stop>
                  <stop stop-color="#EAA05B" stop-opacity="0" offset="100%"></stop>
                  <stop stop-color="#EAA05B" stop-opacity="0" offset="100%"></stop>
              </radialGradient>
              <radialGradient cx="60.5274555%" cy="111.294064%" fx="60.5274555%" fy="111.294064%" r="69.1214675%" gradientTransform="translate(0.605275,1.112941),scale(0.405168,1.000000),rotate(-96.719363),scale(1.000000,1.766288),translate(-0.605275,-1.112941)" id="radialGradient-E">
                  <stop stop-color="#69E1CD" offset="0%"></stop>
                  <stop stop-color="#69E1CE" stop-opacity="0" offset="100%"></stop>
                  <stop stop-color="#69E1CE" stop-opacity="0" offset="100%"></stop>
              </radialGradient>
              <radialGradient cx="21.7131541%" cy="100%" fx="21.7131541%" fy="100%" r="69.1214675%" gradientTransform="translate(0.217132,1.000000),scale(0.405168,1.000000),rotate(-96.719363),scale(1.000000,1.766288),translate(-0.217132,-1.000000)" id="radialGradient-F">
                  <stop stop-color="#69E1CD" stop-opacity="0.120669158" offset="0%"></stop>
                  <stop stop-color="#69E1CE" stop-opacity="0" offset="100%"></stop>
                  <stop stop-color="#69E1CE" stop-opacity="0" offset="100%"></stop>
              </radialGradient>
              <radialGradient cx="56.5147907%" cy="124.171979%" fx="56.5147907%" fy="124.171979%" r="55.1388182%" gradientTransform="translate(0.565148,1.241720),scale(0.405168,1.000000),rotate(-96.149962),scale(1.000000,3.608864),translate(-0.565148,-1.241720)" id="radialGradient-G">
                  <stop stop-color="#69E1CD" offset="0%"></stop>
                  <stop stop-color="#69E1CE" stop-opacity="0" offset="100%"></stop>
              </radialGradient>
              <radialGradient cx="85.0772955%" cy="73.9650222%" fx="85.0772955%" fy="73.9650222%" r="37.8033745%" gradientTransform="translate(0.850773,0.739650),scale(0.405168,1.000000),rotate(-90.000000),scale(1.000000,2.958850),translate(-0.850773,-0.739650)" id="radialGradient-H">
                  <stop stop-color="#60BDC8" offset="0%"></stop>
                  <stop stop-color="#60BCC8" stop-opacity="0" offset="100%"></stop>
              </radialGradient>
              <radialGradient cx="29.2186775%" cy="111.848772%" fx="29.2186775%" fy="111.848772%" r="42.4086048%" gradientTransform="translate(0.292187,1.118488),scale(0.405168,1.000000),rotate(-90.000000),scale(1.000000,2.958850),translate(-0.292187,-1.118488)" id="radialGradient-I">
                  <stop stop-color="#7BD2B8" offset="0%"></stop>
                  <stop stop-color="#7DD1B6" stop-opacity="0" offset="100%"></stop>
              </radialGradient>
          </defs>
          <g id="Page-1" stroke="none" stroke-width="1" fill="none" fill-rule="evenodd">
            <g id="hybrix-logo-gradient" fill-rule="nonzero">
              <path d="M906.316006,221.38826 C1008.08388,221.38826 1090.8814,308.226676 1090.8814,414.944854 C1090.8814,521.663032 1008.08388,608.486387 906.316006,608.486387 C877.109551,608.487511 848.3595,601.242708 822.644551,587.40179 L822.644551,606.754438 L709.741578,606.754438 L709.741578,0 L822.644551,0 L822.644551,242.472857 C848.3595,228.631939 877.109551,221.387136 906.316006,221.38826 Z M906.316006,490.111439 C945.868963,490.111439 978.023633,456.376085 978.023633,414.914733 C978.023633,373.45338 945.853895,339.718027 906.316006,339.718027 C866.778117,339.718027 834.608379,373.43832 834.608379,414.914733 C834.608379,456.391146 866.778117,490.111439 906.316006,490.111439 Z M1253.1816,218.749423 L1253.1816,239.554449 C1278.87131,226.132511 1307.38779,219.006472 1336.37748,218.764467 L1336.37748,337.502041 C1291.24842,338.419688 1254.68741,377.321927 1253.1816,425.671422 L1253.1816,609.441624 L1139.59852,609.441624 L1139.59852,218.749423 L1253.1816,218.749423 Z M657.631754,217.794186 L657.601641,430.385906 L658.158745,430.385906 C657.993119,432.10157 657.812437,433.817233 657.601641,435.517846 L657.601641,838.698662 L538.516846,838.698662 L538.516846,591.582984 C515.115433,601.220391 490.048139,606.170094 464.738176,606.151071 C363.811968,606.151071 280.622754,528.855935 271.287494,430.385906 L391.531668,430.385906 C399.949933,463.757124 429.892034,487.207115 464.323635,487.394963 C498.755237,487.58281 528.951663,464.460917 537.733888,431.183539 L536.815419,431.183539 L536.649794,430.446105 L538.456618,423.116913 L538.546959,426.367643 L538.546959,217.794186 L657.631754,217.794186 Z M1397.51269,215.88371 L1513.09645,215.88371 L1513.09645,606.575911 L1397.51269,606.575911 L1397.51269,215.88371 Z M193.510957,216.861703 C294.032998,216.861703 377.002855,293.516291 386.871251,391.420314 L266.341225,391.420314 C257.400653,358.536714 227.534009,335.713327 193.443158,335.713327 C159.352308,335.713327 129.485664,358.536714 120.545092,391.420314 L119.309659,396.435241 L119.309659,609.441624 L0.286258811,609.441624 L0.286258811,391.420314 L0,391.420314 C0.0753312662,390.561903 0.195861292,389.718552 0.286258811,388.875201 L0.286258811,0 L119.309659,0 L119.309659,231.575167 C142.833152,221.835561 168.049324,216.835416 193.510957,216.861703 Z M1868.29408,335.632555 L1868.44485,335.632555 C1826.95586,336.21644 1793.62927,369.959814 1793.62927,411.3838 C1793.62927,452.807787 1826.95586,486.55116 1868.44485,487.135045 L1868.44485,605.9136 C1812.3854,605.931452 1759.04692,581.789435 1722.11743,539.683003 C1685.16492,582.184256 1631.55957,606.589105 1575.18689,606.575911 L1575.18689,487.782299 C1617.08881,487.782299 1651.05703,453.870681 1651.05703,412.03858 C1651.05703,370.206479 1617.08881,336.294861 1575.18689,336.294861 L1575.18689,217.501254 C1631.21749,217.516899 1684.51955,241.654872 1721.43894,283.731851 C1758.37419,241.25044 1811.94772,216.847558 1868.29408,216.838948 L1868.29408,335.632555 Z M1994.05861,614.217813 C1952.11733,614.217813 1918.11721,580.217693 1918.11721,538.276419 C1918.11721,496.335145 1952.11733,462.335025 1994.05861,462.335025 C2035.99988,462.335025 2070,496.335145 2070,538.276419 C2070,580.217693 2035.99988,614.217813 1994.05861,614.217813 Z" id="Combined-Shape" fill="#FFFFFF"></path>
              <path d="M906.316006,221.38826 C1008.08388,221.38826 1090.8814,308.226676 1090.8814,414.944854 C1090.8814,521.663032 1008.08388,608.486387 906.316006,608.486387 C877.109551,608.487511 848.3595,601.242708 822.644551,587.40179 L822.644551,606.754438 L709.741578,606.754438 L709.741578,0 L822.644551,0 L822.644551,242.472857 C848.3595,228.631939 877.109551,221.387136 906.316006,221.38826 Z M906.316006,490.111439 C945.868963,490.111439 978.023633,456.376085 978.023633,414.914733 C978.023633,373.45338 945.853895,339.718027 906.316006,339.718027 C866.778117,339.718027 834.608379,373.43832 834.608379,414.914733 C834.608379,456.391146 866.778117,490.111439 906.316006,490.111439 Z M1253.1816,218.749423 L1253.1816,239.554449 C1278.87131,226.132511 1307.38779,219.006472 1336.37748,218.764467 L1336.37748,337.502041 C1291.24842,338.419688 1254.68741,377.321927 1253.1816,425.671422 L1253.1816,609.441624 L1139.59852,609.441624 L1139.59852,218.749423 L1253.1816,218.749423 Z M657.631754,217.794186 L657.601641,430.385906 L658.158745,430.385906 C657.993119,432.10157 657.812437,433.817233 657.601641,435.517846 L657.601641,838.698662 L538.516846,838.698662 L538.516846,591.582984 C515.115433,601.220391 490.048139,606.170094 464.738176,606.151071 C363.811968,606.151071 280.622754,528.855935 271.287494,430.385906 L391.531668,430.385906 C399.949933,463.757124 429.892034,487.207115 464.323635,487.394963 C498.755237,487.58281 528.951663,464.460917 537.733888,431.183539 L536.815419,431.183539 L536.649794,430.446105 L538.456618,423.116913 L538.546959,426.367643 L538.546959,217.794186 L657.631754,217.794186 Z M1397.51269,215.88371 L1513.09645,215.88371 L1513.09645,606.575911 L1397.51269,606.575911 L1397.51269,215.88371 Z M193.510957,216.861703 C294.032998,216.861703 377.002855,293.516291 386.871251,391.420314 L266.341225,391.420314 C257.400653,358.536714 227.534009,335.713327 193.443158,335.713327 C159.352308,335.713327 129.485664,358.536714 120.545092,391.420314 L119.309659,396.435241 L119.309659,609.441624 L0.286258811,609.441624 L0.286258811,391.420314 L0,391.420314 C0.0753312662,390.561903 0.195861292,389.718552 0.286258811,388.875201 L0.286258811,0 L119.309659,0 L119.309659,231.575167 C142.833152,221.835561 168.049324,216.835416 193.510957,216.861703 Z M1868.29408,335.632555 L1868.44485,335.632555 C1826.95586,336.21644 1793.62927,369.959814 1793.62927,411.3838 C1793.62927,452.807787 1826.95586,486.55116 1868.44485,487.135045 L1868.44485,605.9136 C1812.3854,605.931452 1759.04692,581.789435 1722.11743,539.683003 C1685.16492,582.184256 1631.55957,606.589105 1575.18689,606.575911 L1575.18689,487.782299 C1617.08881,487.782299 1651.05703,453.870681 1651.05703,412.03858 C1651.05703,370.206479 1617.08881,336.294861 1575.18689,336.294861 L1575.18689,217.501254 C1631.21749,217.516899 1684.51955,241.654872 1721.43894,283.731851 C1758.37419,241.25044 1811.94772,216.847558 1868.29408,216.838948 L1868.29408,335.632555 Z M1994.05861,614.217813 C1952.11733,614.217813 1918.11721,580.217693 1918.11721,538.276419 C1918.11721,496.335145 1952.11733,462.335025 1994.05861,462.335025 C2035.99988,462.335025 2070,496.335145 2070,538.276419 C2070,580.217693 2035.99988,614.217813 1994.05861,614.217813 Z" id="Combined-Shape" fill-opacity="0.500990716" fill="#8F7BB6"></path>
              <path d="M906.316006,221.38826 C1008.08388,221.38826 1090.8814,308.226676 1090.8814,414.944854 C1090.8814,521.663032 1008.08388,608.486387 906.316006,608.486387 C877.109551,608.487511 848.3595,601.242708 822.644551,587.40179 L822.644551,606.754438 L709.741578,606.754438 L709.741578,0 L822.644551,0 L822.644551,242.472857 C848.3595,228.631939 877.109551,221.387136 906.316006,221.38826 Z M906.316006,490.111439 C945.868963,490.111439 978.023633,456.376085 978.023633,414.914733 C978.023633,373.45338 945.853895,339.718027 906.316006,339.718027 C866.778117,339.718027 834.608379,373.43832 834.608379,414.914733 C834.608379,456.391146 866.778117,490.111439 906.316006,490.111439 Z M1253.1816,218.749423 L1253.1816,239.554449 C1278.87131,226.132511 1307.38779,219.006472 1336.37748,218.764467 L1336.37748,337.502041 C1291.24842,338.419688 1254.68741,377.321927 1253.1816,425.671422 L1253.1816,609.441624 L1139.59852,609.441624 L1139.59852,218.749423 L1253.1816,218.749423 Z M657.631754,217.794186 L657.601641,430.385906 L658.158745,430.385906 C657.993119,432.10157 657.812437,433.817233 657.601641,435.517846 L657.601641,838.698662 L538.516846,838.698662 L538.516846,591.582984 C515.115433,601.220391 490.048139,606.170094 464.738176,606.151071 C363.811968,606.151071 280.622754,528.855935 271.287494,430.385906 L391.531668,430.385906 C399.949933,463.757124 429.892034,487.207115 464.323635,487.394963 C498.755237,487.58281 528.951663,464.460917 537.733888,431.183539 L536.815419,431.183539 L536.649794,430.446105 L538.456618,423.116913 L538.546959,426.367643 L538.546959,217.794186 L657.631754,217.794186 Z M1397.51269,215.88371 L1513.09645,215.88371 L1513.09645,606.575911 L1397.51269,606.575911 L1397.51269,215.88371 Z M193.510957,216.861703 C294.032998,216.861703 377.002855,293.516291 386.871251,391.420314 L266.341225,391.420314 C257.400653,358.536714 227.534009,335.713327 193.443158,335.713327 C159.352308,335.713327 129.485664,358.536714 120.545092,391.420314 L119.309659,396.435241 L119.309659,609.441624 L0.286258811,609.441624 L0.286258811,391.420314 L0,391.420314 C0.0753312662,390.561903 0.195861292,389.718552 0.286258811,388.875201 L0.286258811,0 L119.309659,0 L119.309659,231.575167 C142.833152,221.835561 168.049324,216.835416 193.510957,216.861703 Z M1868.29408,335.632555 L1868.44485,335.632555 C1826.95586,336.21644 1793.62927,369.959814 1793.62927,411.3838 C1793.62927,452.807787 1826.95586,486.55116 1868.44485,487.135045 L1868.44485,605.9136 C1812.3854,605.931452 1759.04692,581.789435 1722.11743,539.683003 C1685.16492,582.184256 1631.55957,606.589105 1575.18689,606.575911 L1575.18689,487.782299 C1617.08881,487.782299 1651.05703,453.870681 1651.05703,412.03858 C1651.05703,370.206479 1617.08881,336.294861 1575.18689,336.294861 L1575.18689,217.501254 C1631.21749,217.516899 1684.51955,241.654872 1721.43894,283.731851 C1758.37419,241.25044 1811.94772,216.847558 1868.29408,216.838948 L1868.29408,335.632555 Z M1994.05861,614.217813 C1952.11733,614.217813 1918.11721,580.217693 1918.11721,538.276419 C1918.11721,496.335145 1952.11733,462.335025 1994.05861,462.335025 C2035.99988,462.335025 2070,496.335145 2070,538.276419 C2070,580.217693 2035.99988,614.217813 1994.05861,614.217813 Z" id="Combined-Shape" fill="url(#radialGradient-A)"></path>
              <path d="M906.316006,221.38826 C1008.08388,221.38826 1090.8814,308.226676 1090.8814,414.944854 C1090.8814,521.663032 1008.08388,608.486387 906.316006,608.486387 C877.109551,608.487511 848.3595,601.242708 822.644551,587.40179 L822.644551,606.754438 L709.741578,606.754438 L709.741578,0 L822.644551,0 L822.644551,242.472857 C848.3595,228.631939 877.109551,221.387136 906.316006,221.38826 Z M906.316006,490.111439 C945.868963,490.111439 978.023633,456.376085 978.023633,414.914733 C978.023633,373.45338 945.853895,339.718027 906.316006,339.718027 C866.778117,339.718027 834.608379,373.43832 834.608379,414.914733 C834.608379,456.391146 866.778117,490.111439 906.316006,490.111439 Z M1253.1816,218.749423 L1253.1816,239.554449 C1278.87131,226.132511 1307.38779,219.006472 1336.37748,218.764467 L1336.37748,337.502041 C1291.24842,338.419688 1254.68741,377.321927 1253.1816,425.671422 L1253.1816,609.441624 L1139.59852,609.441624 L1139.59852,218.749423 L1253.1816,218.749423 Z M657.631754,217.794186 L657.601641,430.385906 L658.158745,430.385906 C657.993119,432.10157 657.812437,433.817233 657.601641,435.517846 L657.601641,838.698662 L538.516846,838.698662 L538.516846,591.582984 C515.115433,601.220391 490.048139,606.170094 464.738176,606.151071 C363.811968,606.151071 280.622754,528.855935 271.287494,430.385906 L391.531668,430.385906 C399.949933,463.757124 429.892034,487.207115 464.323635,487.394963 C498.755237,487.58281 528.951663,464.460917 537.733888,431.183539 L536.815419,431.183539 L536.649794,430.446105 L538.456618,423.116913 L538.546959,426.367643 L538.546959,217.794186 L657.631754,217.794186 Z M1397.51269,215.88371 L1513.09645,215.88371 L1513.09645,606.575911 L1397.51269,606.575911 L1397.51269,215.88371 Z M193.510957,216.861703 C294.032998,216.861703 377.002855,293.516291 386.871251,391.420314 L266.341225,391.420314 C257.400653,358.536714 227.534009,335.713327 193.443158,335.713327 C159.352308,335.713327 129.485664,358.536714 120.545092,391.420314 L119.309659,396.435241 L119.309659,609.441624 L0.286258811,609.441624 L0.286258811,391.420314 L0,391.420314 C0.0753312662,390.561903 0.195861292,389.718552 0.286258811,388.875201 L0.286258811,0 L119.309659,0 L119.309659,231.575167 C142.833152,221.835561 168.049324,216.835416 193.510957,216.861703 Z M1868.29408,335.632555 L1868.44485,335.632555 C1826.95586,336.21644 1793.62927,369.959814 1793.62927,411.3838 C1793.62927,452.807787 1826.95586,486.55116 1868.44485,487.135045 L1868.44485,605.9136 C1812.3854,605.931452 1759.04692,581.789435 1722.11743,539.683003 C1685.16492,582.184256 1631.55957,606.589105 1575.18689,606.575911 L1575.18689,487.782299 C1617.08881,487.782299 1651.05703,453.870681 1651.05703,412.03858 C1651.05703,370.206479 1617.08881,336.294861 1575.18689,336.294861 L1575.18689,217.501254 C1631.21749,217.516899 1684.51955,241.654872 1721.43894,283.731851 C1758.37419,241.25044 1811.94772,216.847558 1868.29408,216.838948 L1868.29408,335.632555 Z M1994.05861,614.217813 C1952.11733,614.217813 1918.11721,580.217693 1918.11721,538.276419 C1918.11721,496.335145 1952.11733,462.335025 1994.05861,462.335025 C2035.99988,462.335025 2070,496.335145 2070,538.276419 C2070,580.217693 2035.99988,614.217813 1994.05861,614.217813 Z" id="Combined-Shape" fill="url(#radialGradient-B)"></path>
              <path d="M906.316006,221.38826 C1008.08388,221.38826 1090.8814,308.226676 1090.8814,414.944854 C1090.8814,521.663032 1008.08388,608.486387 906.316006,608.486387 C877.109551,608.487511 848.3595,601.242708 822.644551,587.40179 L822.644551,606.754438 L709.741578,606.754438 L709.741578,0 L822.644551,0 L822.644551,242.472857 C848.3595,228.631939 877.109551,221.387136 906.316006,221.38826 Z M906.316006,490.111439 C945.868963,490.111439 978.023633,456.376085 978.023633,414.914733 C978.023633,373.45338 945.853895,339.718027 906.316006,339.718027 C866.778117,339.718027 834.608379,373.43832 834.608379,414.914733 C834.608379,456.391146 866.778117,490.111439 906.316006,490.111439 Z M1253.1816,218.749423 L1253.1816,239.554449 C1278.87131,226.132511 1307.38779,219.006472 1336.37748,218.764467 L1336.37748,337.502041 C1291.24842,338.419688 1254.68741,377.321927 1253.1816,425.671422 L1253.1816,609.441624 L1139.59852,609.441624 L1139.59852,218.749423 L1253.1816,218.749423 Z M657.631754,217.794186 L657.601641,430.385906 L658.158745,430.385906 C657.993119,432.10157 657.812437,433.817233 657.601641,435.517846 L657.601641,838.698662 L538.516846,838.698662 L538.516846,591.582984 C515.115433,601.220391 490.048139,606.170094 464.738176,606.151071 C363.811968,606.151071 280.622754,528.855935 271.287494,430.385906 L391.531668,430.385906 C399.949933,463.757124 429.892034,487.207115 464.323635,487.394963 C498.755237,487.58281 528.951663,464.460917 537.733888,431.183539 L536.815419,431.183539 L536.649794,430.446105 L538.456618,423.116913 L538.546959,426.367643 L538.546959,217.794186 L657.631754,217.794186 Z M1397.51269,215.88371 L1513.09645,215.88371 L1513.09645,606.575911 L1397.51269,606.575911 L1397.51269,215.88371 Z M193.510957,216.861703 C294.032998,216.861703 377.002855,293.516291 386.871251,391.420314 L266.341225,391.420314 C257.400653,358.536714 227.534009,335.713327 193.443158,335.713327 C159.352308,335.713327 129.485664,358.536714 120.545092,391.420314 L119.309659,396.435241 L119.309659,609.441624 L0.286258811,609.441624 L0.286258811,391.420314 L0,391.420314 C0.0753312662,390.561903 0.195861292,389.718552 0.286258811,388.875201 L0.286258811,0 L119.309659,0 L119.309659,231.575167 C142.833152,221.835561 168.049324,216.835416 193.510957,216.861703 Z M1868.29408,335.632555 L1868.44485,335.632555 C1826.95586,336.21644 1793.62927,369.959814 1793.62927,411.3838 C1793.62927,452.807787 1826.95586,486.55116 1868.44485,487.135045 L1868.44485,605.9136 C1812.3854,605.931452 1759.04692,581.789435 1722.11743,539.683003 C1685.16492,582.184256 1631.55957,606.589105 1575.18689,606.575911 L1575.18689,487.782299 C1617.08881,487.782299 1651.05703,453.870681 1651.05703,412.03858 C1651.05703,370.206479 1617.08881,336.294861 1575.18689,336.294861 L1575.18689,217.501254 C1631.21749,217.516899 1684.51955,241.654872 1721.43894,283.731851 C1758.37419,241.25044 1811.94772,216.847558 1868.29408,216.838948 L1868.29408,335.632555 Z M1994.05861,614.217813 C1952.11733,614.217813 1918.11721,580.217693 1918.11721,538.276419 C1918.11721,496.335145 1952.11733,462.335025 1994.05861,462.335025 C2035.99988,462.335025 2070,496.335145 2070,538.276419 C2070,580.217693 2035.99988,614.217813 1994.05861,614.217813 Z" id="Combined-Shape" fill="url(#radialGradient-C)"></path>
              <path d="M906.316006,221.38826 C1008.08388,221.38826 1090.8814,308.226676 1090.8814,414.944854 C1090.8814,521.663032 1008.08388,608.486387 906.316006,608.486387 C877.109551,608.487511 848.3595,601.242708 822.644551,587.40179 L822.644551,606.754438 L709.741578,606.754438 L709.741578,0 L822.644551,0 L822.644551,242.472857 C848.3595,228.631939 877.109551,221.387136 906.316006,221.38826 Z M906.316006,490.111439 C945.868963,490.111439 978.023633,456.376085 978.023633,414.914733 C978.023633,373.45338 945.853895,339.718027 906.316006,339.718027 C866.778117,339.718027 834.608379,373.43832 834.608379,414.914733 C834.608379,456.391146 866.778117,490.111439 906.316006,490.111439 Z M1253.1816,218.749423 L1253.1816,239.554449 C1278.87131,226.132511 1307.38779,219.006472 1336.37748,218.764467 L1336.37748,337.502041 C1291.24842,338.419688 1254.68741,377.321927 1253.1816,425.671422 L1253.1816,609.441624 L1139.59852,609.441624 L1139.59852,218.749423 L1253.1816,218.749423 Z M657.631754,217.794186 L657.601641,430.385906 L658.158745,430.385906 C657.993119,432.10157 657.812437,433.817233 657.601641,435.517846 L657.601641,838.698662 L538.516846,838.698662 L538.516846,591.582984 C515.115433,601.220391 490.048139,606.170094 464.738176,606.151071 C363.811968,606.151071 280.622754,528.855935 271.287494,430.385906 L391.531668,430.385906 C399.949933,463.757124 429.892034,487.207115 464.323635,487.394963 C498.755237,487.58281 528.951663,464.460917 537.733888,431.183539 L536.815419,431.183539 L536.649794,430.446105 L538.456618,423.116913 L538.546959,426.367643 L538.546959,217.794186 L657.631754,217.794186 Z M1397.51269,215.88371 L1513.09645,215.88371 L1513.09645,606.575911 L1397.51269,606.575911 L1397.51269,215.88371 Z M193.510957,216.861703 C294.032998,216.861703 377.002855,293.516291 386.871251,391.420314 L266.341225,391.420314 C257.400653,358.536714 227.534009,335.713327 193.443158,335.713327 C159.352308,335.713327 129.485664,358.536714 120.545092,391.420314 L119.309659,396.435241 L119.309659,609.441624 L0.286258811,609.441624 L0.286258811,391.420314 L0,391.420314 C0.0753312662,390.561903 0.195861292,389.718552 0.286258811,388.875201 L0.286258811,0 L119.309659,0 L119.309659,231.575167 C142.833152,221.835561 168.049324,216.835416 193.510957,216.861703 Z M1868.29408,335.632555 L1868.44485,335.632555 C1826.95586,336.21644 1793.62927,369.959814 1793.62927,411.3838 C1793.62927,452.807787 1826.95586,486.55116 1868.44485,487.135045 L1868.44485,605.9136 C1812.3854,605.931452 1759.04692,581.789435 1722.11743,539.683003 C1685.16492,582.184256 1631.55957,606.589105 1575.18689,606.575911 L1575.18689,487.782299 C1617.08881,487.782299 1651.05703,453.870681 1651.05703,412.03858 C1651.05703,370.206479 1617.08881,336.294861 1575.18689,336.294861 L1575.18689,217.501254 C1631.21749,217.516899 1684.51955,241.654872 1721.43894,283.731851 C1758.37419,241.25044 1811.94772,216.847558 1868.29408,216.838948 L1868.29408,335.632555 Z M1994.05861,614.217813 C1952.11733,614.217813 1918.11721,580.217693 1918.11721,538.276419 C1918.11721,496.335145 1952.11733,462.335025 1994.05861,462.335025 C2035.99988,462.335025 2070,496.335145 2070,538.276419 C2070,580.217693 2035.99988,614.217813 1994.05861,614.217813 Z" id="Combined-Shape" fill="url(#radialGradient-D)"></path>
              <path d="M906.316006,221.38826 C1008.08388,221.38826 1090.8814,308.226676 1090.8814,414.944854 C1090.8814,521.663032 1008.08388,608.486387 906.316006,608.486387 C877.109551,608.487511 848.3595,601.242708 822.644551,587.40179 L822.644551,606.754438 L709.741578,606.754438 L709.741578,0 L822.644551,0 L822.644551,242.472857 C848.3595,228.631939 877.109551,221.387136 906.316006,221.38826 Z M906.316006,490.111439 C945.868963,490.111439 978.023633,456.376085 978.023633,414.914733 C978.023633,373.45338 945.853895,339.718027 906.316006,339.718027 C866.778117,339.718027 834.608379,373.43832 834.608379,414.914733 C834.608379,456.391146 866.778117,490.111439 906.316006,490.111439 Z M1253.1816,218.749423 L1253.1816,239.554449 C1278.87131,226.132511 1307.38779,219.006472 1336.37748,218.764467 L1336.37748,337.502041 C1291.24842,338.419688 1254.68741,377.321927 1253.1816,425.671422 L1253.1816,609.441624 L1139.59852,609.441624 L1139.59852,218.749423 L1253.1816,218.749423 Z M657.631754,217.794186 L657.601641,430.385906 L658.158745,430.385906 C657.993119,432.10157 657.812437,433.817233 657.601641,435.517846 L657.601641,838.698662 L538.516846,838.698662 L538.516846,591.582984 C515.115433,601.220391 490.048139,606.170094 464.738176,606.151071 C363.811968,606.151071 280.622754,528.855935 271.287494,430.385906 L391.531668,430.385906 C399.949933,463.757124 429.892034,487.207115 464.323635,487.394963 C498.755237,487.58281 528.951663,464.460917 537.733888,431.183539 L536.815419,431.183539 L536.649794,430.446105 L538.456618,423.116913 L538.546959,426.367643 L538.546959,217.794186 L657.631754,217.794186 Z M1397.51269,215.88371 L1513.09645,215.88371 L1513.09645,606.575911 L1397.51269,606.575911 L1397.51269,215.88371 Z M193.510957,216.861703 C294.032998,216.861703 377.002855,293.516291 386.871251,391.420314 L266.341225,391.420314 C257.400653,358.536714 227.534009,335.713327 193.443158,335.713327 C159.352308,335.713327 129.485664,358.536714 120.545092,391.420314 L119.309659,396.435241 L119.309659,609.441624 L0.286258811,609.441624 L0.286258811,391.420314 L0,391.420314 C0.0753312662,390.561903 0.195861292,389.718552 0.286258811,388.875201 L0.286258811,0 L119.309659,0 L119.309659,231.575167 C142.833152,221.835561 168.049324,216.835416 193.510957,216.861703 Z M1868.29408,335.632555 L1868.44485,335.632555 C1826.95586,336.21644 1793.62927,369.959814 1793.62927,411.3838 C1793.62927,452.807787 1826.95586,486.55116 1868.44485,487.135045 L1868.44485,605.9136 C1812.3854,605.931452 1759.04692,581.789435 1722.11743,539.683003 C1685.16492,582.184256 1631.55957,606.589105 1575.18689,606.575911 L1575.18689,487.782299 C1617.08881,487.782299 1651.05703,453.870681 1651.05703,412.03858 C1651.05703,370.206479 1617.08881,336.294861 1575.18689,336.294861 L1575.18689,217.501254 C1631.21749,217.516899 1684.51955,241.654872 1721.43894,283.731851 C1758.37419,241.25044 1811.94772,216.847558 1868.29408,216.838948 L1868.29408,335.632555 Z M1994.05861,614.217813 C1952.11733,614.217813 1918.11721,580.217693 1918.11721,538.276419 C1918.11721,496.335145 1952.11733,462.335025 1994.05861,462.335025 C2035.99988,462.335025 2070,496.335145 2070,538.276419 C2070,580.217693 2035.99988,614.217813 1994.05861,614.217813 Z" id="Combined-Shape" fill="url(#radialGradient-E)"></path>
              <path d="M906.316006,221.38826 C1008.08388,221.38826 1090.8814,308.226676 1090.8814,414.944854 C1090.8814,521.663032 1008.08388,608.486387 906.316006,608.486387 C877.109551,608.487511 848.3595,601.242708 822.644551,587.40179 L822.644551,606.754438 L709.741578,606.754438 L709.741578,0 L822.644551,0 L822.644551,242.472857 C848.3595,228.631939 877.109551,221.387136 906.316006,221.38826 Z M906.316006,490.111439 C945.868963,490.111439 978.023633,456.376085 978.023633,414.914733 C978.023633,373.45338 945.853895,339.718027 906.316006,339.718027 C866.778117,339.718027 834.608379,373.43832 834.608379,414.914733 C834.608379,456.391146 866.778117,490.111439 906.316006,490.111439 Z M1253.1816,218.749423 L1253.1816,239.554449 C1278.87131,226.132511 1307.38779,219.006472 1336.37748,218.764467 L1336.37748,337.502041 C1291.24842,338.419688 1254.68741,377.321927 1253.1816,425.671422 L1253.1816,609.441624 L1139.59852,609.441624 L1139.59852,218.749423 L1253.1816,218.749423 Z M657.631754,217.794186 L657.601641,430.385906 L658.158745,430.385906 C657.993119,432.10157 657.812437,433.817233 657.601641,435.517846 L657.601641,838.698662 L538.516846,838.698662 L538.516846,591.582984 C515.115433,601.220391 490.048139,606.170094 464.738176,606.151071 C363.811968,606.151071 280.622754,528.855935 271.287494,430.385906 L391.531668,430.385906 C399.949933,463.757124 429.892034,487.207115 464.323635,487.394963 C498.755237,487.58281 528.951663,464.460917 537.733888,431.183539 L536.815419,431.183539 L536.649794,430.446105 L538.456618,423.116913 L538.546959,426.367643 L538.546959,217.794186 L657.631754,217.794186 Z M1397.51269,215.88371 L1513.09645,215.88371 L1513.09645,606.575911 L1397.51269,606.575911 L1397.51269,215.88371 Z M193.510957,216.861703 C294.032998,216.861703 377.002855,293.516291 386.871251,391.420314 L266.341225,391.420314 C257.400653,358.536714 227.534009,335.713327 193.443158,335.713327 C159.352308,335.713327 129.485664,358.536714 120.545092,391.420314 L119.309659,396.435241 L119.309659,609.441624 L0.286258811,609.441624 L0.286258811,391.420314 L0,391.420314 C0.0753312662,390.561903 0.195861292,389.718552 0.286258811,388.875201 L0.286258811,0 L119.309659,0 L119.309659,231.575167 C142.833152,221.835561 168.049324,216.835416 193.510957,216.861703 Z M1868.29408,335.632555 L1868.44485,335.632555 C1826.95586,336.21644 1793.62927,369.959814 1793.62927,411.3838 C1793.62927,452.807787 1826.95586,486.55116 1868.44485,487.135045 L1868.44485,605.9136 C1812.3854,605.931452 1759.04692,581.789435 1722.11743,539.683003 C1685.16492,582.184256 1631.55957,606.589105 1575.18689,606.575911 L1575.18689,487.782299 C1617.08881,487.782299 1651.05703,453.870681 1651.05703,412.03858 C1651.05703,370.206479 1617.08881,336.294861 1575.18689,336.294861 L1575.18689,217.501254 C1631.21749,217.516899 1684.51955,241.654872 1721.43894,283.731851 C1758.37419,241.25044 1811.94772,216.847558 1868.29408,216.838948 L1868.29408,335.632555 Z M1994.05861,614.217813 C1952.11733,614.217813 1918.11721,580.217693 1918.11721,538.276419 C1918.11721,496.335145 1952.11733,462.335025 1994.05861,462.335025 C2035.99988,462.335025 2070,496.335145 2070,538.276419 C2070,580.217693 2035.99988,614.217813 1994.05861,614.217813 Z" id="Combined-Shape" fill="url(#radialGradient-F)"></path>
              <path d="M906.316006,221.38826 C1008.08388,221.38826 1090.8814,308.226676 1090.8814,414.944854 C1090.8814,521.663032 1008.08388,608.486387 906.316006,608.486387 C877.109551,608.487511 848.3595,601.242708 822.644551,587.40179 L822.644551,606.754438 L709.741578,606.754438 L709.741578,0 L822.644551,0 L822.644551,242.472857 C848.3595,228.631939 877.109551,221.387136 906.316006,221.38826 Z M906.316006,490.111439 C945.868963,490.111439 978.023633,456.376085 978.023633,414.914733 C978.023633,373.45338 945.853895,339.718027 906.316006,339.718027 C866.778117,339.718027 834.608379,373.43832 834.608379,414.914733 C834.608379,456.391146 866.778117,490.111439 906.316006,490.111439 Z M1253.1816,218.749423 L1253.1816,239.554449 C1278.87131,226.132511 1307.38779,219.006472 1336.37748,218.764467 L1336.37748,337.502041 C1291.24842,338.419688 1254.68741,377.321927 1253.1816,425.671422 L1253.1816,609.441624 L1139.59852,609.441624 L1139.59852,218.749423 L1253.1816,218.749423 Z M657.631754,217.794186 L657.601641,430.385906 L658.158745,430.385906 C657.993119,432.10157 657.812437,433.817233 657.601641,435.517846 L657.601641,838.698662 L538.516846,838.698662 L538.516846,591.582984 C515.115433,601.220391 490.048139,606.170094 464.738176,606.151071 C363.811968,606.151071 280.622754,528.855935 271.287494,430.385906 L391.531668,430.385906 C399.949933,463.757124 429.892034,487.207115 464.323635,487.394963 C498.755237,487.58281 528.951663,464.460917 537.733888,431.183539 L536.815419,431.183539 L536.649794,430.446105 L538.456618,423.116913 L538.546959,426.367643 L538.546959,217.794186 L657.631754,217.794186 Z M1397.51269,215.88371 L1513.09645,215.88371 L1513.09645,606.575911 L1397.51269,606.575911 L1397.51269,215.88371 Z M193.510957,216.861703 C294.032998,216.861703 377.002855,293.516291 386.871251,391.420314 L266.341225,391.420314 C257.400653,358.536714 227.534009,335.713327 193.443158,335.713327 C159.352308,335.713327 129.485664,358.536714 120.545092,391.420314 L119.309659,396.435241 L119.309659,609.441624 L0.286258811,609.441624 L0.286258811,391.420314 L0,391.420314 C0.0753312662,390.561903 0.195861292,389.718552 0.286258811,388.875201 L0.286258811,0 L119.309659,0 L119.309659,231.575167 C142.833152,221.835561 168.049324,216.835416 193.510957,216.861703 Z M1868.29408,335.632555 L1868.44485,335.632555 C1826.95586,336.21644 1793.62927,369.959814 1793.62927,411.3838 C1793.62927,452.807787 1826.95586,486.55116 1868.44485,487.135045 L1868.44485,605.9136 C1812.3854,605.931452 1759.04692,581.789435 1722.11743,539.683003 C1685.16492,582.184256 1631.55957,606.589105 1575.18689,606.575911 L1575.18689,487.782299 C1617.08881,487.782299 1651.05703,453.870681 1651.05703,412.03858 C1651.05703,370.206479 1617.08881,336.294861 1575.18689,336.294861 L1575.18689,217.501254 C1631.21749,217.516899 1684.51955,241.654872 1721.43894,283.731851 C1758.37419,241.25044 1811.94772,216.847558 1868.29408,216.838948 L1868.29408,335.632555 Z M1994.05861,614.217813 C1952.11733,614.217813 1918.11721,580.217693 1918.11721,538.276419 C1918.11721,496.335145 1952.11733,462.335025 1994.05861,462.335025 C2035.99988,462.335025 2070,496.335145 2070,538.276419 C2070,580.217693 2035.99988,614.217813 1994.05861,614.217813 Z" id="Combined-Shape" fill="url(#radialGradient-G)"></path>
              <path d="M906.316006,221.38826 C1008.08388,221.38826 1090.8814,308.226676 1090.8814,414.944854 C1090.8814,521.663032 1008.08388,608.486387 906.316006,608.486387 C877.109551,608.487511 848.3595,601.242708 822.644551,587.40179 L822.644551,606.754438 L709.741578,606.754438 L709.741578,0 L822.644551,0 L822.644551,242.472857 C848.3595,228.631939 877.109551,221.387136 906.316006,221.38826 Z M906.316006,490.111439 C945.868963,490.111439 978.023633,456.376085 978.023633,414.914733 C978.023633,373.45338 945.853895,339.718027 906.316006,339.718027 C866.778117,339.718027 834.608379,373.43832 834.608379,414.914733 C834.608379,456.391146 866.778117,490.111439 906.316006,490.111439 Z M1253.1816,218.749423 L1253.1816,239.554449 C1278.87131,226.132511 1307.38779,219.006472 1336.37748,218.764467 L1336.37748,337.502041 C1291.24842,338.419688 1254.68741,377.321927 1253.1816,425.671422 L1253.1816,609.441624 L1139.59852,609.441624 L1139.59852,218.749423 L1253.1816,218.749423 Z M657.631754,217.794186 L657.601641,430.385906 L658.158745,430.385906 C657.993119,432.10157 657.812437,433.817233 657.601641,435.517846 L657.601641,838.698662 L538.516846,838.698662 L538.516846,591.582984 C515.115433,601.220391 490.048139,606.170094 464.738176,606.151071 C363.811968,606.151071 280.622754,528.855935 271.287494,430.385906 L391.531668,430.385906 C399.949933,463.757124 429.892034,487.207115 464.323635,487.394963 C498.755237,487.58281 528.951663,464.460917 537.733888,431.183539 L536.815419,431.183539 L536.649794,430.446105 L538.456618,423.116913 L538.546959,426.367643 L538.546959,217.794186 L657.631754,217.794186 Z M1397.51269,215.88371 L1513.09645,215.88371 L1513.09645,606.575911 L1397.51269,606.575911 L1397.51269,215.88371 Z M193.510957,216.861703 C294.032998,216.861703 377.002855,293.516291 386.871251,391.420314 L266.341225,391.420314 C257.400653,358.536714 227.534009,335.713327 193.443158,335.713327 C159.352308,335.713327 129.485664,358.536714 120.545092,391.420314 L119.309659,396.435241 L119.309659,609.441624 L0.286258811,609.441624 L0.286258811,391.420314 L0,391.420314 C0.0753312662,390.561903 0.195861292,389.718552 0.286258811,388.875201 L0.286258811,0 L119.309659,0 L119.309659,231.575167 C142.833152,221.835561 168.049324,216.835416 193.510957,216.861703 Z M1868.29408,335.632555 L1868.44485,335.632555 C1826.95586,336.21644 1793.62927,369.959814 1793.62927,411.3838 C1793.62927,452.807787 1826.95586,486.55116 1868.44485,487.135045 L1868.44485,605.9136 C1812.3854,605.931452 1759.04692,581.789435 1722.11743,539.683003 C1685.16492,582.184256 1631.55957,606.589105 1575.18689,606.575911 L1575.18689,487.782299 C1617.08881,487.782299 1651.05703,453.870681 1651.05703,412.03858 C1651.05703,370.206479 1617.08881,336.294861 1575.18689,336.294861 L1575.18689,217.501254 C1631.21749,217.516899 1684.51955,241.654872 1721.43894,283.731851 C1758.37419,241.25044 1811.94772,216.847558 1868.29408,216.838948 L1868.29408,335.632555 Z M1994.05861,614.217813 C1952.11733,614.217813 1918.11721,580.217693 1918.11721,538.276419 C1918.11721,496.335145 1952.11733,462.335025 1994.05861,462.335025 C2035.99988,462.335025 2070,496.335145 2070,538.276419 C2070,580.217693 2035.99988,614.217813 1994.05861,614.217813 Z" id="Combined-Shape" fill="url(#radialGradient-H)"></path>
              <path d="M906.316006,221.38826 C1008.08388,221.38826 1090.8814,308.226676 1090.8814,414.944854 C1090.8814,521.663032 1008.08388,608.486387 906.316006,608.486387 C877.109551,608.487511 848.3595,601.242708 822.644551,587.40179 L822.644551,606.754438 L709.741578,606.754438 L709.741578,0 L822.644551,0 L822.644551,242.472857 C848.3595,228.631939 877.109551,221.387136 906.316006,221.38826 Z M906.316006,490.111439 C945.868963,490.111439 978.023633,456.376085 978.023633,414.914733 C978.023633,373.45338 945.853895,339.718027 906.316006,339.718027 C866.778117,339.718027 834.608379,373.43832 834.608379,414.914733 C834.608379,456.391146 866.778117,490.111439 906.316006,490.111439 Z M1253.1816,218.749423 L1253.1816,239.554449 C1278.87131,226.132511 1307.38779,219.006472 1336.37748,218.764467 L1336.37748,337.502041 C1291.24842,338.419688 1254.68741,377.321927 1253.1816,425.671422 L1253.1816,609.441624 L1139.59852,609.441624 L1139.59852,218.749423 L1253.1816,218.749423 Z M657.631754,217.794186 L657.601641,430.385906 L658.158745,430.385906 C657.993119,432.10157 657.812437,433.817233 657.601641,435.517846 L657.601641,838.698662 L538.516846,838.698662 L538.516846,591.582984 C515.115433,601.220391 490.048139,606.170094 464.738176,606.151071 C363.811968,606.151071 280.622754,528.855935 271.287494,430.385906 L391.531668,430.385906 C399.949933,463.757124 429.892034,487.207115 464.323635,487.394963 C498.755237,487.58281 528.951663,464.460917 537.733888,431.183539 L536.815419,431.183539 L536.649794,430.446105 L538.456618,423.116913 L538.546959,426.367643 L538.546959,217.794186 L657.631754,217.794186 Z M1397.51269,215.88371 L1513.09645,215.88371 L1513.09645,606.575911 L1397.51269,606.575911 L1397.51269,215.88371 Z M193.510957,216.861703 C294.032998,216.861703 377.002855,293.516291 386.871251,391.420314 L266.341225,391.420314 C257.400653,358.536714 227.534009,335.713327 193.443158,335.713327 C159.352308,335.713327 129.485664,358.536714 120.545092,391.420314 L119.309659,396.435241 L119.309659,609.441624 L0.286258811,609.441624 L0.286258811,391.420314 L0,391.420314 C0.0753312662,390.561903 0.195861292,389.718552 0.286258811,388.875201 L0.286258811,0 L119.309659,0 L119.309659,231.575167 C142.833152,221.835561 168.049324,216.835416 193.510957,216.861703 Z M1868.29408,335.632555 L1868.44485,335.632555 C1826.95586,336.21644 1793.62927,369.959814 1793.62927,411.3838 C1793.62927,452.807787 1826.95586,486.55116 1868.44485,487.135045 L1868.44485,605.9136 C1812.3854,605.931452 1759.04692,581.789435 1722.11743,539.683003 C1685.16492,582.184256 1631.55957,606.589105 1575.18689,606.575911 L1575.18689,487.782299 C1617.08881,487.782299 1651.05703,453.870681 1651.05703,412.03858 C1651.05703,370.206479 1617.08881,336.294861 1575.18689,336.294861 L1575.18689,217.501254 C1631.21749,217.516899 1684.51955,241.654872 1721.43894,283.731851 C1758.37419,241.25044 1811.94772,216.847558 1868.29408,216.838948 L1868.29408,335.632555 Z M1994.05861,614.217813 C1952.11733,614.217813 1918.11721,580.217693 1918.11721,538.276419 C1918.11721,496.335145 1952.11733,462.335025 1994.05861,462.335025 C2035.99988,462.335025 2070,496.335145 2070,538.276419 C2070,580.217693 2035.99988,614.217813 1994.05861,614.217813 Z" id="Combined-Shape" fill="url(#radialGradient-I)"></path>
              <circle id="Oval" fill="#68B6C7" cx="1994.05861" cy="538.276419" r="75.9413936"></circle>
            </g>
          </g>
        </svg>
        </div>
        <div class="pure-u-1 pure-u-lg-3-4 content">
        </div>
      </div>
    </div>
    <div class="main">
      <div class="pure-g">
        <div class="pure-u-1 pure-u-lg-1-4 sidebar">
          <div id="navigation"></div>
        </div>
        <div class="pure-u-1 pure-u-lg-3-4 content">
          <div id="console-wrapper" style="display:none;"></div>


`;

  var parentNode = null;
  var tree = global.hybrixd.routetree;

  tree['_help'] = `
    <h1>Documentation</h1> <h2>hybrixd REST API</h2>

    <p>This Application Programming Interface can be used to retrieve information from hybrixd. The requests are formatted as forward slash ('/') separated commands. (Similar to a website url or file path.)</p>

    <p><a onclick="document.getElementById('more').style.display='block'; event.target.style.display='none';">Read more...</a></p>

    <div id="more" style="display:none;">

      <h3>Examples</h3>
      <ul>
      <li><code><span style="color:#4782bc">/asset</span></code> returns the assets supported by the hybrixd node.<input type="submit" value="Try it" onclick="rout('/asset');"> </li>
      <li><code><span style="color:#4782bc">/asset/btc/balance/32FCGFdRGeho2HBeWQPaAYawJfPqHHvsCJ</span></code> returns the balance of the Bitcoin address 32FCGFdRGeho2HBeWQPaAYawJfPqHHvsCJ.<input type="submit" value="Try it" onclick="rout('/asset/btc/balance/32FCGFdRGeho2HBeWQPaAYawJfPqHHvsCJ');"></li>
      <li><code>/command/reload</code> reload hybrixd and reinitialize modules and recipes.<input type="submit" disabled value="Try it" onclick="rout('/asset');"> <span class="root-only">(Root only)</span></li>
      <li><code><span style="color:#5DBEC8">/proc</span></code> returns the list of processes running on the hybrixd node.<input type="submit" value="Try it" onclick="rout('/proc');"></li>
      <li><code><span style="color:#5DBEC8">/proc/1543921378626236</span></code> returns the progress and result of process 1543921378626236.
      </ul>

      <p>The response will be in JSON format. For the balance request <code>/asset/btc/balance/32FCGFdRGeho2HBeWQPaAYawJfPqHHvsCJ</code> this will be of the form:</p>

      <p><code>{"error":0,"info":"Process data.","id":"1543921378626236","progress":1,"started":1543923093402,"stopped":1543923093695,"data":"<span style="color:orange;">0.00000000</span>","request":"<span style="color:#4782bc">/asset/btc/balance/32FCGFdRGeho2HBeWQPaAYawJfPqHHvsCJ</span>"}</code></p>

      <p>From which we see that the balance on this address is <span style="color:orange;">0.00000000</span>.</p>

      <h3>Two Stage Requests</h3>

      <p>For some requests the response will consist of a process reference. This means that the response to your request is not yet finished but you can follow up on it using the given process id.</p>

      <p><code><span style="color:#4782bc">/asset/btc/balance/32FCGFdRGeho2HBeWQPaAYawJfPqHHvsCJ</span></code><input type="submit" value="Try it" onclick="rout('/asset/btc/balance/32FCGFdRGeho2HBeWQPaAYawJfPqHHvsCJ');"></p>

      <p>then returns</p>

      <p><code>{"error":0,"info":"Command process ID.","id":"id","request":"<span style="color:#4782bc">/asset/btc/balance/32FCGFdRGeho2HBeWQPaAYawJfPqHHvsCJ</span>","data":"<span style="color:#5DBEC8;">1543921378626236</span>"}</code></p>

      <p>and the request <code><span style="color:#5DBEC8">/proc/1543921378626236</span></code> then returns</p>

      <p><code>{"error":0,"info":"Process data.","id":"<span style="color:#5DBEC8;">1543921378626236</span>","progress":1,"started":1543923093402,"stopped":1543923093695,"data":"<span style="color:orange;">0.00000000</span>","request":"<span style="color:#4782bc">/asset/btc/balance/32FCGFdRGeho2HBeWQPaAYawJfPqHHvsCJ</span>"}</code></p>

      <h3>hybrixd-lib.js - a Javascript Library</h3>

      <p>To facilitate integration of the API into you Javascript projects we have created a library. This library will handle two stage request and all client side steps for the encyrption and signing of transactions.</p>

      <p><a href="/api/help/hybrix-lib.js">Learn more...</a></p>
    </div>

    <h3>Reference</h3>
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
  data += '</div></div></div>';
  data += '<script>initNavigation("REST API")</script>';
  data += '<div id="noResults">No results.</div>';
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
