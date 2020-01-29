let commands = [];
let commandIndex = -1;

let menuItems = {
  'introduction': './introduction',
  'getting-started': './getting-started',
  'run': '',
  'hybrixd': './hybrixd',
  'build': '',
  'api': './api',
  'hybrix-jslib': './hybrix-jslib',
  'qrtz': './qrtz',
  'use': '',
  'block-explorer': './block-explorer',
  'web-wallet': './web-wallet',
  'cli': './cli'
};

let menuLabels = {
  'introduction': 'introduction',
  'getting-started': 'getting started',
  'run': 'run',
  'hybrixd': 'hybrix node',
  'qrtz': 'qrtz',
  'build': 'build',
  'api': 'API reference',
  'hybrix-jslib': 'hybrix-jslib',
  'use': 'use',
  'block-explorer': 'block explorer',
  'web-wallet': 'web wallet',
  'cli': 'command-line wallet'
};

let menuIcons = {
  'introduction': '<?xml version="1.0" encoding="UTF-8"?> <svg width="20px" height="20px" viewBox="0 0 20 20" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"> <g stroke="none" stroke-width="1" fill="none" fill-rule="evenodd"> <g transform="translate(-144.000000, -117.000000)" fill="#000000"> <path d="M153.91368,137 C148.438506,137 144,132.522847 144,127 C144,121.477153 148.438506,117 153.91368,117 C159.388854,117 163.82736,121.477153 163.82736,127 C163.82736,132.522847 159.388854,137 153.91368,137 Z M154,121 L147,127.068966 L148.3125,128.206897 L149.625,127.068966 L149.625,132 L153.125,132 L153.125,129.724138 L154.875,129.724138 L154.875,132 L158.375,132 L158.375,127.068966 L159.6875,128.206897 L161,127.068966 L154,121 Z"></path> </g> </g> </svg>',
  'getting-started': '<?xml version="1.0" encoding="UTF-8"?> <svg width="20px" height="20px" viewBox="0 0 20 21" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"> <g stroke="none" stroke-width="1" fill="none" fill-rule="evenodd"> <g transform="translate(-144.000000, -168.000000)" fill="#000000"> <path d="M154,188.174143 C148.477153,188.174143 144,183.658007 144,178.087072 C144,172.516136 148.477153,168 154,168 C159.522847,168 164,172.516136 164,178.087072 C164,183.658007 159.522847,188.174143 154,188.174143 Z M154,184 C157.313708,184 160,181.313708 160,178 C160,174.686292 157.313708,172 154,172 C150.686292,172 148,174.686292 148,178 C148,181.313708 150.686292,184 154,184 Z M154,182 C151.790861,182 150,180.209139 150,178 C150,175.790861 151.790861,174 154,174 C156.209139,174 158,175.790861 158,178 C158,180.209139 156.209139,182 154,182 Z M154,180 C155.104569,180 156,179.104569 156,178 C156,176.895431 155.104569,176 154,176 C152.895431,176 152,176.895431 152,178 C152,179.104569 152.895431,180 154,180 Z"></path> </g> </g> </svg>',
  'run': '<?xml version="1.0" encoding="UTF-8"?> <svg width="20px" height="20px" viewBox="0 0 20 20" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"> <g stroke="none" stroke-width="1" fill="none" fill-rule="evenodd"> <g transform="translate(-144.000000, -219.000000)" fill="#000000"> <path d="M158.679026,233.935747 L158.672961,232.724806 C158.16756,232.937074 157.61364,233.054328 157.031417,233.058371 C154.785413,233.0705 152.925536,231.358201 152.707203,229.166782 L155.383809,229.152631 C155.571818,229.880409 156.234905,230.418155 157.019288,230.414112 C157.769303,230.410069 158.404087,229.912754 158.614334,229.231474 L158.654767,228.970687 L158.654767,228.843326 L158.654767,228.778634 L158.652745,228.255039 L158.632529,224.401861 L161.282854,224.38771 L161.30307,228.240888 L161.307113,229.122307 L161.319243,229.122307 C161.3152,229.160718 161.311156,229.199128 161.307113,229.235517 L161.331372,233.921596 L161.34148,235.79158 C163.00324,233.996395 164.012021,231.590686 164,228.950471 C163.971589,223.427448 159.471495,218.971832 153.948469,219 C152.262449,219.008221 150.675489,219.434779 149.284624,220.178729 L149.302819,223.575025 L149.308884,224.743512 C149.816307,224.529222 150.37427,224.409947 150.958514,224.407926 C153.19441,224.395796 155.048222,226.091922 155.280707,228.26919 L152.600058,228.283341 C152.40194,227.571737 151.74694,227.048141 150.972665,227.052184 C150.19839,227.056227 149.547433,227.585888 149.357402,228.299514 C149.357402,228.299514 149.321013,228.687662 149.333143,228.79885 C149.333143,228.806937 149.333143,228.813002 149.3291,228.819066 L149.331121,229.178912 L149.351337,233.149343 L146.705056,233.163494 L146.68484,229.193063 L146.680796,228.311644 L146.674732,228.311644 C146.676753,228.293449 146.678775,228.273233 146.680796,228.255039 L146.656537,223.587154 L146.650472,222.216507 C144.992756,224.011691 143.985996,226.415379 144,229.049529 C144.02845,234.572552 148.528544,239.028168 154.05157,239 C155.733546,238.991779 157.316464,238.567243 158.705307,237.827335 L158.679026,233.935747 Z"></path> </g> </g> </svg>',
  'build': '<?xml version="1.0" encoding="UTF-8"?> <svg width="20px" height="20px" viewBox="0 0 20 20" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"> <g stroke="none" stroke-width="1" fill="none" fill-rule="evenodd"> <g transform="translate(-144.000000, -315.000000)" fill="#000000"> <path d="M154,335 C157.632885,335 160.813308,333.062779 162.564606,330.165 C162.580616,330.13851 162.535517,330.16677 162.429309,330.150218 C162.093688,330.097913 160.217251,330.097913 156.8,330.150218 L156.8,333 L152,328.6 L156.8,323.8 L156.8,326.960099 L163.743344,326.960099 C163.798799,326.896428 163.82849,326.853994 163.832417,326.832794 C163.942473,326.238631 164,325.626034 164,325 C164,319.477153 159.522847,315 154,315 C150.072222,315 146.673343,317.264486 145.03769,320.559131 C145.031202,320.572201 145.085305,320.585824 145.2,320.6 L150.8,320.6 L150.8,317.8 L155.2,322.2 L150.8,326.6 L150.8,323.8 C146.318042,323.767436 144.074838,323.769873 144.070388,323.807311 C144.023909,324.198397 144,324.596406 144,325 C144,330.522847 148.477153,335 154,335 Z"></path> </g> </g> </svg>',
  'use': '<?xml version="1.0" encoding="UTF-8"?> <svg width="20px" height="20px" viewBox="0 0 20 20" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"> <g stroke="none" stroke-width="1" fill="none" fill-rule="evenodd"> <g transform="translate(-144.000000, -455.000000)" fill="#000000"> <path d="M152.140114,475 C147.506007,474.120767 144,470.01692 144,465.087072 C144,459.516136 148.477153,455 154,455 C159.522847,455 164,459.516136 164,465.087072 C164,468.149547 162.647022,470.893266 160.511114,472.743216 L160.8,470.685245 L160.8,470.533543 C160.8,470.042124 160.5,469.625749 160.0872,469.436928 L156.4504,467.584223 C156.3,467.546298 156.188,467.508372 156.0376,467.508372 L155.4,467.508372 L155.4,462.666808 C155.4,461.985762 154.8752,461.456417 154.2,461.456417 C153.5248,461.456417 153,461.985762 153,462.666808 L153,471.328366 L150.2624,470.761096 C150.188,470.761096 150.1504,470.72317 150.0752,470.72317 C149.8128,470.72317 149.588,470.83614 149.4376,470.987843 L148.8,471.630964 L152.140114,475 Z M152.212,465.691979 L152.212,462.666001 C152.212,461.569387 153.112,460.661594 154.1992,460.661594 C155.2864,460.661594 156.224,461.569387 156.224,462.666001 L156.224,465.691979 C157.1992,465.048858 157.7992,463.914318 157.7992,462.666001 C157.7992,460.661594 156.1864,459.034829 154.1992,459.034829 C152.212,459.034829 150.5992,460.661594 150.5992,462.666001 C150.5992,463.914318 151.2368,465.048858 152.212,465.691979 Z"></path> </g> </g> </svg>'
};

// Fix transition between main nav and mobile nav
window.addEventListener('resize', function () {
  if (window.innerWidth > 768) {
    document.getElementById('main-nav').style.visibility = 'visible';
    document.getElementById('main-nav').style.height = 'unset';
    document.getElementById('main-nav').style.overflow = 'visible';
    document.getElementById('header').style.paddingTop = '20px';
    document.getElementById('main').style.paddingTop = '0px';
    document.getElementById('main-nav').style.opacity = 1;
  }
  if (window.innerWidth <= 768) {
    document.getElementById('main-nav').style.opacity = 0;
    document.getElementById('main-nav').style.visibility = 'hidden';
    document.getElementById('main-nav').style.height = '0px';
    document.getElementById('main-nav').style.overflow = 'hidden';
    document.getElementById('header').style.paddingTop = '20px';
    document.getElementById('main').style.paddingTop = '0px';
  }
  if (window.innerWidth > 1024) {
    document.getElementById('navigation').classList.remove('mobile-on');
    document.getElementById('navigation').classList.add('mobile-off');
    document.getElementById('navigation').classList.remove('toggle-on');
    document.getElementById('navigation').classList.add('toggle-off');
    document.getElementById('mobile-sub-nav').innerHTML = 'show navigation <img src="./icon-arrow-right.svg" alt=">" style="transform: rotate(90deg);" />';
  }
  if (window.innerWidth <= 1024) {
    document.getElementById('navigation').classList.add('mobile-on');
    document.getElementById('navigation').classList.remove('mobile-off');
    document.getElementById('navigation').classList.remove('toggle-on');
    document.getElementById('navigation').classList.add('toggle-off');
    document.getElementById('mobile-sub-nav').innerHTML = 'show navigation <img src="./icon-arrow-right.svg" alt=">" style="transform: rotate(90deg);" />';
  }
});

function display (result) {
  document.getElementById('console-results').style.height = '150px';
  document.getElementById('console-close').innerHTML = 'Hide';
  let r = '';
  if (result.error === 0) {
    if (result.id === 'id') {
      r += '<div class="result">[.] Waiting for result ' + result.data + '...';
      rout('/proc/' + result.data);
    } else {
      r += '<div class="result">[i] <span class="result">' + result.path + '</span> - <code>' + JSON.stringify(result.data) + '</code>';
    }
  } else {
    r += '<div class="error">[!] <span class="result">' + result.path + '</span> - ';
    if (result.hasOwnProperty('help')) {
      r += result.help.replace(/\`([^\`])*\`/g, (a, x) => {
        let url = a.substr(1, a.length - 2);
        return '<a href="./' + url + '">' + url + '</a>';
      }
      );
    }

    if (result.hasOwnProperty('data')) { r += result.data; }
  }

  r += '</div>';
  let consoleResults = document.getElementById('console-results');
  consoleResults.innerHTML += r;
  setTimeout(() => { consoleResults.lastChild.scrollIntoView(false); }, 100);
}

function rout (path, noHistory) {
  // make console visible
  let consoleWrapper = document.getElementById('console-wrapper');
  if (consoleWrapper) {
    consoleWrapper.style.display = 'block';
  }

  // update history
  if (!noHistory) {
    commands.push(path); commandIndex = commands.length;
  }

  // make call to hybrixd
  let url = window.location.protocol + '//' + window.location.host + (window.location.pathname.startsWith('/api') ? '/api' : '') + path;
  let xhr = new XMLHttpRequest();
  xhr.open('GET', url, true);
  xhr.onreadystatechange = e => {
    if (xhr.readyState === 4) {
      let header = xhr.getResponseHeader('Content-Type');
      if (header === 'application/json') {
        let result;
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
  };

  xhr.send();
}

function clearSearch () {
  let es = document.getElementById('search').value = '';
  search();
}

function foldItem (e) {
  e.style.display = 'none';
  let icon = e.previousElementSibling.getElementsByClassName('toggleIcon');
  for (let i = 0; i < icon.length; ++i) {
    icon[i].innerHTML = '<svg width="18px" height="18px" viewBox="0 0 18 18" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"> <g stroke="none" stroke-width="1" fill="none" fill-rule="evenodd"> <path d="M9,0 C11.4848182,0 13.7356364,1.00881818 15.3638182,2.63618182 C16.992,4.26354545 18,6.51518182 18,9 C18,11.4848182 16.9911818,13.7356364 15.3638182,15.3638182 C13.7364545,16.992 11.4848182,18 9,18 C6.51518182,18 4.26436364,16.9911818 2.63618182,15.3638182 C1.008,13.7364545 0,11.4848182 0,9 C0,6.51518182 1.00881818,4.26436364 2.63618182,2.63618182 C4.26354545,1.008 6.51518182,0 9,0 Z M9,4.90909091 C8.54836364,4.90909091 8.18181818,5.27563636 8.18181818,5.72727273 L8.18181818,8.18181818 L5.72727273,8.18181818 C5.27563636,8.18181818 4.90909091,8.54836364 4.90909091,9 C4.90909091,9.45163636 5.27563636,9.81818182 5.72727273,9.81818182 L8.18181818,9.81818182 L8.18181818,12.2727273 C8.18181818,12.7243636 8.54836364,13.0909091 9,13.0909091 C9.45163636,13.0909091 9.81818182,12.7243636 9.81818182,12.2727273 L9.81818182,9.81818182 L12.2727273,9.81818182 C12.7243636,9.81818182 13.0909091,9.45163636 13.0909091,9 C13.0909091,8.54836364 12.7243636,8.18181818 12.2727273,8.18181818 L9.81818182,8.18181818 L9.81818182,5.72727273 C9.81818182,5.27563636 9.45163636,4.90909091 9,4.90909091 Z" fill="#5DBDC9" fill-rule="nonzero"></path> </g> </svg>';
  }
  let collapseAll = document.getElementById('collapseAll');
  let es = document.getElementsByClassName('command-body');
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
  let icon = e.previousElementSibling.getElementsByClassName('toggleIcon');
  for (let i = 0; i < icon.length; ++i) {
    icon[i].innerHTML = '<svg width="18px" height="18px" viewBox="0 0 18 18" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"> <g stroke="none" stroke-width="1" fill="none" fill-rule="evenodd"> <path d="M9,0 C11.4848182,0 13.7356364,1.00881818 15.3638182,2.63618182 C16.992,4.26354545 18,6.51518182 18,9 C18,11.4848182 16.9911818,13.7356364 15.3638182,15.3638182 C13.7364545,16.992 11.4848182,18 9,18 C6.51518182,18 4.26436364,16.9911818 2.63618182,15.3638182 C1.008,13.7364545 0,11.4848182 0,9 C0,6.51518182 1.00881818,4.26436364 2.63618182,2.63618182 C4.26354545,1.008 6.51518182,0 9,0 Z M9,4.90909091 C8.89363636,4.90909091 8.78645455,4.92954545 8.68663636,4.97127273 C8.59009091,5.01136364 8.50009091,5.07027273 8.42154545,5.14881818 L5.14881818,8.42154545 C4.82890909,8.74145455 4.82890909,9.25936364 5.14881818,9.57845455 C5.46872727,9.89754545 5.98663636,9.89836364 6.30572727,9.57845455 L8.18181818,7.70236364 L8.18181818,12.2727273 C8.18181818,12.7243636 8.54836364,13.0909091 9,13.0909091 C9.45163636,13.0909091 9.81818182,12.7243636 9.81818182,12.2727273 L9.81818182,7.70236364 L11.6942727,9.57845455 C12.0141818,9.89836364 12.5320909,9.89836364 12.8511818,9.57845455 C13.1702727,9.25854545 13.1710909,8.74063636 12.8511818,8.42154545 L9.57845455,5.14881818 C9.49990909,5.07027273 9.40990909,5.01136364 9.31336364,4.97127273 C9.21681818,4.93118182 9.11127273,4.90909091 9,4.90909091 Z" fill="#EA9E5D" fill-rule="nonzero"></path> </g> </svg>';
  }
  let collapseAll = document.getElementById('collapseAll');
  collapseAll.style.opacity = 1;
  collapseAll.style.visibility = 'visible';
}

function search () {
  let search = document.getElementById('search');
  let es = document.getElementsByClassName('command-body');
  let collapseAll = document.getElementById('collapseAll');

  console.log('value:' + search.value);

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
    let more = document.getElementById('more');
    if (more) {
      more.style.display = 'none';
    }

    // Hide category section headers
    var categories = document.getElementsByClassName('category');
    for (let i = 0; i < categories.length; ++i) {
      categories[i].style.display = 'none';
    }
    // Show relevant items
    let first = true;
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
  let e = document.getElementById(id);
  if (e.style.display === 'block') {
    foldItem(e);
  } else {
    unfoldItem(e);
  }
}

function collapseAll () {
  let es = document.getElementsByClassName('command-body');
  for (let i = 0; i < es.length; ++i) {
    foldItem(es[i]);
  }
}

function toggleConsole () {
  let e = document.getElementById('console-results');
  let c = document.getElementById('console-close');
  if (e.style.height === '150px') {
    c.innerHTML = 'Show';
    e.style.height = '0';
  } else {
    c.innerHTML = 'Hide';
    e.style.height = '150px';
  }
}

const copyToClipboard = str => {
  const el = document.createElement('textarea');
  el.value = str;
  document.body.appendChild(el);
  el.select();
  document.execCommand('copy');
  document.body.removeChild(el);
};

function initAPIConsole () {
  let consoleWrapper = document.getElementById('console-wrapper');
  if (consoleWrapper) {
    consoleWrapper.innerHTML = '<span class="title">REST API Console</span><span id="console-close" onclick = "toggleConsole()" class="close">Show</span></div><div id="console-results"><div class="result">[?] Try our REST API. For example: /asset/btc/balance/$YOUR_ADDRESS.</div></div><div class="prompt"> >> <input class="text" type="text" onkeyup="if(event.keyCode===13){rout(event.target.value);event.target.value=\'\';}else if(event.keyCode===38 && commandIndex>0){ commandIndex--; event.target.value=commands[commandIndex];}else if(event.keyCode===40 && commandIndex<commands.length-1){ commandIndex++; event.target.value=commands[commandIndex];}"/></div>';
  }
}

function initNavigation (currentMenuItem) {
  let data = '';
  for (let menuItem in menuItems) {
    if (currentMenuItem === menuItem) {
      if (menuItem in menuIcons) {
        data += '<a class="menuItem-parent current" onclick="hideChildren(this);">' + menuIcons[menuItem] + menuLabels[menuItem] + '</a> ';
      } else {
        data += '<a class="menuItem current">' + menuLabels[menuItem] + '</a> ';
      }
    } else {
      if ((menuItem == 'run') || (menuItem == 'build') || (menuItem == 'use')) {
        data += '<a class="menuItem-parent inactive" onclick="hideChildren(this);">' + menuIcons[menuItem] + menuLabels[menuItem] + '</a> ';
      } else if ((menuItem == 'introduction') || (menuItem == 'getting-started')) {
        data += '<a class="menuItem-parent" href="' + menuItems[menuItem] + '">' + menuIcons[menuItem] + menuLabels[menuItem] + '</a> ';
      } else {
        data += '<a href="' + menuItems[menuItem] + '" class="menuItem">' + menuLabels[menuItem] + '</a> ';
      }
    }
  }
  data += '</div>';

  document.getElementById('navigation').innerHTML = data;

  if (window.innerWidth > 1024) { document.getElementById('navigation').classList.add('mobile-off'); }
  if (window.innerWidth <= 1024) { document.getElementById('navigation').classList.add('mobile-on'); }

  let filterBox = document.getElementById('filterBox');

  setTimeout(initAPIConsole, 100);
}

function initSubNavigation (currentMenuItem) {
  if ((currentMenuItem != 'introduction') && (currentMenuItem != '404')) {
    let data = '';
    data = '<span>On this page</span>';
    data += '<ul>';
    const subheaders = document.querySelectorAll('h2');
    for (let subheader of subheaders) {
      const linkId = subheader.getElementsByTagName('a')[0].id;
      const headerText = subheader.innerText.trim();
      data += '<li><a href="' + window.location.origin + window.location.pathname + '#' + linkId + '">' + headerText + '</a></li>';
    }
    data += '</ul>';
    document.getElementById('subnavigation').innerHTML = data;
  }
}

function runExample (event) {
  let script = document.createElement('script');
  script.onload = function () {
    let hybrix = new Hybrix.Interface({XMLHttpRequest: XMLHttpRequest});
    let progressBar = document.getElementById('progress');
    let onProgress = progress => {
      progressBar.style.width = (progress * 100) + '%';
      progressBar.innerHTML = Math.floor(progress * 100) + '%';
    };
    let onSuccess = data => {
      onProgress(1);
      let result = document.getElementById('result');
      result.classList.remove('error');
      result.innerHTML = typeof data === 'string' ? data : JSON.stringify(data);
    };
    let onError = error => {
      let result = document.getElementById('result');
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

function toggleNav () {
  nav = document.getElementById('main-nav');

  if (nav.style.height == '320px') {
    document.getElementById('nav-btn').innerHTML = '<svg width="20px" height="14px" viewBox="0 0 20 14" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"> <g id="Page-1" stroke="none" stroke-width="1" fill="none" fill-rule="evenodd"> <g id="menu" fill="#FFFFFF"> <path d="M19,6 L1,6 C0.4,6 0,6.4 0,7 C0,7.6 0.4,8 1,8 L19,8 C19.6,8 20,7.6 20,7 C20,6.4 19.6,6 19,6 Z" id="Path"></path> <path d="M1,2 L19,2 C19.6,2 20,1.6 20,1 C20,0.4 19.6,0 19,0 L1,0 C0.4,0 0,0.4 0,1 C0,1.6 0.4,2 1,2 Z" id="Path"></path> <path d="M19,12 L1,12 C0.4,12 0,12.4 0,13 C0,13.6 0.4,14 1,14 L19,14 C19.6,14 20,13.6 20,13 C20,12.4 19.6,12 19,12 Z" id="Path"></path> </g> </g> </svg>';
    document.getElementById('header').style.paddingTop = '23px';
    document.getElementById('main').style.paddingTop = '0px';
    nav.style.height = '0px';
    nav.style.opacity = 0;
    nav.style.visibility = 'hidden';
    nav.style.overflow = 'hidden';
  } else {
    document.getElementById('nav-btn').innerHTML = '<svg width="16px" height="14px" viewBox="0 0 16 14" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"> <g id="Page-1" stroke="none" stroke-width="1" fill="none" fill-rule="evenodd"> <g id="menu" transform="translate(-1.000000, -1.000000)" fill="#FFFFFF"> <path d="M18,7 L0,7 C-0.6,7 -1,7.4 -1,8 C-1,8.6 -0.6,9 0,9 L18,9 C18.6,9 19,8.6 19,8 C19,7.4 18.6,7 18,7 Z" id="Path" transform="translate(9.000000, 8.000000) rotate(41.000000) translate(-9.000000, -8.000000) "></path> <path d="M18,7 L0,7 C-0.6,7 -1,7.4 -1,8 C-1,8.6 -0.6,9 0,9 L18,9 C18.6,9 19,8.6 19,8 C19,7.4 18.6,7 18,7 Z" id="Path" transform="translate(9.000000, 8.000000) scale(-1, 1) rotate(41.000000) translate(-9.000000, -8.000000) "></path> </g> </g> </svg>';
    document.getElementById('header').style.paddingTop = '340px';
    document.getElementById('main').style.paddingTop = '310px';
    nav.style.height = '320px';
    nav.style.opacity = 1;
    nav.style.visibility = 'visible';
    nav.style.overflow = 'auto';
  }
}

function toggleSubNav () {
  subNav = document.getElementById('navigation');

  if (subNav.classList.contains('toggle-off')) {
    subNav.classList.add('toggle-on');
    subNav.classList.remove('toggle-off');

    document.getElementById('mobile-sub-nav').innerHTML = 'hide navigation <img src="./icon-arrow-right.svg" alt=">" style="transform: rotate(-90deg);" />';
  } else {
    subNav.classList.remove('toggle-on');
    subNav.classList.add('toggle-off');

    document.getElementById('mobile-sub-nav').innerHTML = 'show navigation <img src="./icon-arrow-right.svg" alt=">" style="transform: rotate(90deg);" />';
  }
}

function hideChildren (el) {
  elem = el.nextElementSibling;
  while (elem) {
    if (elem.classList.contains('menuItem-parent')) break;
    elem.classList.toggle('hide');
    elem = elem.nextElementSibling;
  }
}
