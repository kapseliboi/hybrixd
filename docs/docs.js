function display (result) {
  document.getElementById('console-results').style.height = '150px';
  document.getElementById('console-close').innerHTML = 'Hide';
  var r = '';
  if (result.error === 0) {
    if (result.id === 'id') {
      r += '<div class="result">[.] Waiting for result ' + result.data + '...';
      rout('/p/' + result.data);
    } else {
      r += '<div class="result">[i] <span class="result">' + result.path + '</span> - <code>' + JSON.stringify(result.data) + '</code>';
    }
  } else {
    r += '<div class="error">[!] <span class="result">' + result.path + '</span> - ';
    if (result.hasOwnProperty('help')) {
      r += result.help.replace(/\`([^\`])*\`/g, (a, x) => {
        var url = a.substr(1, a.length - 2);
        return '<a href="/api/help' + url + '">' + url + '</a>';
      }
      );
    }

    if (result.hasOwnProperty('data')) { r += result.data; }
  }

  r += '</div>';
  var consoleResults = document.getElementById('console-results');
  consoleResults.innerHTML += r;
  setTimeout(() => { consoleResults.lastChild.scrollIntoView(false); }, 100);
}

function rout (path, noHistory) {
  // make console visible
  var consoleWrapper = document.getElementById('console-wrapper');
  if (consoleWrapper) {
    consoleWrapper.style.display = 'block';
  }

  // update history
  if (!noHistory) {
    commands.push(path); commandIndex = commands.length;
  }

  // make call to hybrixd
  var url = window.location.protocol + '//' + window.location.host + (window.location.pathname.startsWith('/api') ? '/api' : '') + path;
  var xhr = new XMLHttpRequest();
  xhr.open('GET', url, true);
  xhr.onreadystatechange = e => {
    if (xhr.readyState === 4) {
      if (xhr.status >= 200 && xhr.status <= 299) {
        var header = xhr.getResponseHeader('Content-Type');
        if (header === 'application/json') {
          var result;
          try {
            result = JSON.parse(xhr.responseText);
          } catch (e) {
            result = {data: 'Unknown Error', error: 1};
          }
          if (result.error === 0 && result.hasOwnProperty('progress') && result.progress !== 1) {
            setTimeout(() => {
              rout(path, true);
            }, 500);
          } else {
            display(result);
          }
        } else {
          document.write(xhr.responseText);
        }
      }
    }
  };

  xhr.send();
}

function clearSearch () {
  var es = document.getElementById('search').value = '';
  search();
}

function foldItem (e) {
  e.style.display = 'none';
  var collapseAll = document.getElementById('collapseAll');
  var es = document.getElementsByClassName('command-body');
  collapseAll.style.opacity = 0;
  for (let i = 0; i < es.length; ++i) {
    if (es[i].style.display !== 'none') {
      collapseAll.style.opacity = 1;
      collapseAll.style.visibility = 'visible';
    }
  }
}

function unfoldItem (e) {
  e.style.display = 'block';
  var collapseAll = document.getElementById('collapseAll');
  collapseAll.style.opacity = 1;
  collapseAll.style.visibility = 'visible';
}

function search () {
  var search = document.getElementById('search');
  var es = document.getElementsByClassName('command-body');
  var collapseAll = document.getElementById('collapseAll');

  if (search.value == '') {
    // Show all items
    for (let i = 0; i < es.length; ++i) {
      es[i].previousSibling.style.display = 'block';
      es[i].previousSibling.childNodes[1].style.opacity = 1;
      es[i].style.display = 'none';
    }
    collapseAll.style.opacity = 0;
    collapseAll.style.visibility = 'hidden';

    // Show category section headers
    var categories = document.getElementsByClassName('category');
    for (let i = 0; i < categories.length; ++i) {
      categories[i].style.display = 'block';
    }
    // hide no results text
    document.getElementById('noResults').style.display = 'none';
    document.getElementById('filterBox').classList.remove('active');
  } else {
    document.getElementById('filterBox').classList.add('active');

    // Hide read more
    var more = document.getElementById('more');
    if (more) {
      more.style.display = 'none';
    }

    // Hide category section headers
    var categories = document.getElementsByClassName('category');
    for (let i = 0; i < categories.length; ++i) {
      categories[i].style.display = 'none';
    }
    // Show relevant items
    var first = true;
    for (let i = 0; i < es.length; ++i) {
      if (es[i].innerHTML.toLowerCase().indexOf(search.value.toLowerCase()) !== -1) {
        es[i].style.display = 'block';
        es[i].previousSibling.style.display = 'block';
        es[i].previousSibling.childNodes[1].style.opacity = 0;
        collapseAll.style.opacity = 1;
        collapseAll.style.visibility = 'visible';
        if (first) { es[i].previousSibling.scrollIntoView(); }
        first = false;
      } else {
        es[i].previousSibling.style.display = 'none';
        es[i].style.display = 'none';
      }
    }
    if (first) {
      // hide no results text
      document.getElementById('noResults').style.display = 'block';
    }
  }
}

function toggleCommand (id) {
  var e = document.getElementById(id);
  if (e.style.display === 'block') {
    foldItem(e);
  } else {
    unfoldItem(e);
  }
}

function collapseAll () {
  var es = document.getElementsByClassName('command-body');
  for (let i = 0; i < es.length; ++i) {
    foldItem(es[i]);
  }
}

function toggleConsole () {
  var e = document.getElementById('console-results');
  var c = document.getElementById('console-close');
  if (e.style.height === '150px') {
    c.innerHTML = 'Show';
    e.style.height = '0';
  } else {
    c.innerHTML = 'Hide';
    e.style.height = '150px';
  }
}
var commands = [];
var lastCommand = -1;

const copyToClipboard = str => {
  const el = document.createElement('textarea');
  el.value = str;
  document.body.appendChild(el);
  el.select();
  document.execCommand('copy');
  document.body.removeChild(el);
};

var menuItems = {
  'Introduction': '/api/help/HelloWorld',
  'REST API': '/api/help',
  'hybrix Javascript Library': '/api/help/hybrix-lib.js',
  'hybrixd daemon': '/api/help/hybrixd',
  'Featured products': '/api/help/FeaturedProducts'
//  'cli': '/api/help/cli',
//  'qrtz': '/api/help/qrtz'
};

function initAPIConsole () {
  var consoleWrapper = document.getElementById('console-wrapper');
  if (consoleWrapper) {
    consoleWrapper.innerHTML += '<span class="title">REST API Console</span><span id="console-close" onclick = "toggleConsole()" class="close">Show</span></div><div id="console-results"><div class="result">[?] Try our REST API. For example: /asset/btc/balance/$YOUR_ADDRESS.</div></div><div class="prompt"> >> <input class="text" type="text" onkeyup="if(event.keyCode===13){rout(event.target.value);event.target.value=\'\';}else if(event.keyCode===38 && commandIndex>0){ commandIndex--; event.target.value=commands[commandIndex];}else if(event.keyCode===40 && commandIndex<commands.length-1){ commandIndex++; event.target.value=commands[commandIndex];}"/></div>';
  }
}

function initNavigation (currentMenuItem) {
  var data = '';
  for (var menuItem in menuItems) {
    if (currentMenuItem === menuItem) {
      data += '<a class="menuItem current">' + menuItem + '</a> ';
    } else {
      data += '<a href="' + menuItems[menuItem] + '" class="menuItem">' + menuItem + '</a> ';
    }
  }

  data += '<a id="collapseAll" onclick="collapseAll()">Collapse all blocks</a>';
  data += '</div>';
  document.getElementById('navigation').innerHTML = data;

  var filterBox = document.getElementById('filterBox');
  if (filterBox) {
    filterBox.innerHTML = '<input id="search" onkeyup="search(event)" placeholder="Filter" onclick="search"><input type="submit" value="&#215;" onclick="clearSearch()"/>';
  }
  setTimeout(initAPIConsole, 100);
}

function runExample (event) {
  var script = document.createElement('script');
  script.onload = function () {
    var hybrix = new Hybrix.Interface({XMLHttpRequest: XMLHttpRequest});
    var progressBar = document.getElementById('progress');
    var onProgress = progress => {
      progressBar.style.width = (progress * 100) + '%';
      progressBar.innerHTML = Math.floor(progress * 100) + '%';
    };
    var onSuccess = data => {
      onProgress(1);
      var result = document.getElementById('result');
      result.classList.remove('error');
      result.innerHTML = typeof data === 'string' ? data : JSON.stringify(data);
    };
    var onError = error => {
      var result = document.getElementById('result');
      result.classList.add('error');
      result.innerHTML = 'Error: ' + (typeof error === 'string' ? error : JSON.stringify(error));
      progressBar.style.backgroundColor = 'tomatored';
    };
    progressBar.style.width = 0;
    progressBar.style.backgroundColor = '#5DBEC8';
    progressBar.innerHTML = '0%';
    eval(codeMirrorEditor.getValue());
  };
  script.src = 'hybrix-lib.web.js';
  document.head.appendChild(script);
}
