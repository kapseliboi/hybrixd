function display (result) {
  document.getElementById('console-results').style.height = '150px';
  document.getElementById('console-close').innerHTML = 'Hide';
  var r = '';
  if (result.error === 0) {
    if (result.id === 'id') {
      r += '<div class="result">[.] Waiting for result ' + result.data + '...';
      rout('/proc/' + result.data);
    } else {
      r += '<div class="result">[i] <span class="result">' + result.path + '</span> - <code>' + JSON.stringify(result.data) + '</code>';
    }
  } else {
    r += '<div class="error">[!] <span class="result">' + result.path + '</span> - ';
    if (result.hasOwnProperty('info')) { r += result.info; }
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
  if (!noHistory) {
    commands.push(path); commandIndex = commands.length;
  }
  var url = window.location.protocol + '//' + window.location.host + (window.location.pathname.startsWith('/api') ? '/api' : '') + path;
  var xhr = new XMLHttpRequest();
  xhr.open('GET', url, true);
  xhr.onreadystatechange = e => {
    if (xhr.readyState == 4) {
      if (xhr.status >= 200 && xhr.status <= 299) {
        var header = xhr.getResponseHeader('Content-Type');
        if (header === 'application/json') {
          var result;
          try {
            result = JSON.parse(xhr.responseText);
          } catch (e) {
            result = {info: 'Unknown Error', error: 1};
          }
          if (result.error === 0 && result.hasOwnProperty('progress') && result.progress !== 1) {
            setTimeout(() => { rout(path, true); }, 500);
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

function toggleSearch () {
  var button = document.querySelector('#toggle-search');
  var search = document.querySelector('#search');
  if (search.style.opacity == 0) {
      search.style.opacity = 1;
  } else {
      search.style.opacity = 0;
  }
}

function search (e) {
  if (e.target.value == '') { return; }
  var es = document.getElementsByClassName('command-body');
  var first = true;
  for (let i = 0; i < es.length; ++i) {
    if (es[i].innerHTML.toLowerCase().indexOf(e.target.value.toLowerCase()) !== -1) {
      es[i].style.display = 'block';
      if (first) { es[i].previousSibling.scrollIntoView(); }
      first = false;
    } else {
      es[i].style.display = 'none';
    }
  }
}

function toggleCommand (id) {
  var e = document.getElementById(id);
  e.style.display = e.style.display === 'block' ? 'none' : 'block';
  var collapseAll = document.getElementById('collapseAll');
  if (e.style.display === 'none') {
    var es = document.getElementsByClassName('command-body');
    collapseAll.style.opacity = 1;
    for (let i = 1; i < es.length; ++i) {
      if (es[i].style.display !== 'none') {
        collapseAll.style.opacity = 1;
        collapseAll.style.visibility = 'visible';
      }
    }
  } else {
    collapseAll.style.opacity = 1;
    collapseAll.style.visibility = 'visible';
  }
}

function collapseAll () {
  var es = document.getElementsByClassName('command-body');
  for (let i = 0; i < es.length; ++i) {
    es[i].style.display = 'none';
  }
  var collapseAll = document.getElementById('collapseAll');
  collapseAll.style.opacity = 0;
  collapseAll.style.visibility = 'hidden';
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
  'HelloWorld': '/api/help/HelloWorld',
  'REST API': '/api/help',
  'hybrix-lib.js': '/api/help/hybrix-lib.js',
  'hybrixd': '/api/help/hybrixd'
//  'cli': '/api/help/cli',
//  'qrtz': '/api/help/qrtz'
};

function initNavigation (currentMenuItem) {
  var data = '';
  data += '<img src="data:image/png;base64,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"><br/>';
  for (var menuItem in menuItems) {
    if (currentMenuItem === menuItem) {
      data += '<a class="menuItem current">' + menuItem + '</a> ';
    } else {
      data += '<a href="' + menuItems[menuItem] + '" class="menuItem">' + menuItem + '</a> ';
    }
  }

  data += '<a id="toggle-search" onclick="toggleSearch()" class="menuItem">&nbsp;</a>';
  data += '<div class="subnav"> ';
  data += '<input id="search" onkeyup="search(event)" placeholder="Search" onclick="search" style="opacity:0;"><br/>';
  data += '</div>';
  data += '<a id="collapseAll" onclick="collapseAll()">Collapse all blocks</a>';
  data += '</div>';
  document.getElementById('navigation').innerHTML = data;
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
      progressBar.style.backgroundColor = 'red';
    };
    progressBar.style.width = 0;
    progressBar.style.backgroundColor = 'blue';
    progressBar.innerHTML = '0%';
    eval(document.getElementById('try').value);
  };
  script.src = 'hybrix-lib.web.js';
  document.head.appendChild(script);
}
