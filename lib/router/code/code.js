/*
TODO
make public? for non root : replace debug with try it (if not root only)

function
- show where this function was imported from
- indicate if function is private
- disable execute on private functions

id
- show imports
- show where functions have come from   /engine/bitcore/bitcore

type

 */
function unfoldTokens () {
  [...document.getElementsByClassName('token')].forEach(TR => (TR.style.display = TR.style.display === 'none' ? 'table-row' : 'none'));
}

const renderType = (meta, type) => list => {
  const TABLE = document.getElementById('code');
  const TR = document.createElement('TR');
  const TD = document.createElement('TD');
  TD.innerHTML = type + 's';
  TR.appendChild(TD);
  TR.className = type;
  TABLE.appendChild(TR);
  const router = meta[type];
  let prevId, prevTD;
  for (let id of list.sort()) {
    const TR = document.createElement('TR');
    if (type === 'asset' && id.includes('.')) {
      TR.style.display = 'none';
      TR.classList.add('token');
      if (!prevId.includes('.')) prevTD.innerHTML += '<span onclick="unfoldTokens();event.stopPropagation(); return false;">[+]</span>';
    }

    TR.onclick = () => renderCode(meta, type, id);
    const TD = document.createElement('TD');
    if (type === 'asset' && id.includes('.')) TD.innerHTML = '&nbsp;&nbsp;&nbsp;<a>' + id + '</a>';
    else if (type === 'asset' || (typeof router[id] === 'object' && router[id] !== null && router[id]._hidden !== true)) TD.innerHTML = '<a>' + id + '</a>';
    else TD.innerHTML = '<a class="private">' + id + ' (hidden)</a>';

    TR.appendChild(TD);
    TABLE.appendChild(TR);
    prevId = id;
    prevTD = TD;
  }
};

function getHelp (router, default_) {
  if (typeof router === 'string') return router;
  else if (typeof router !== 'object' || router === null) return default_;
  else if (typeof router._help === 'string') return router._help;
  else if (typeof router._this === 'string') return router._this;
  else return default_;
}

const renderId = (meta, type, id) => quartz => {
  setBreadCrumbs(meta, type, id);

  const TABLE = document.getElementById('code');

  const router = type === 'asset' ? meta[type]._ref : meta[type][id];
  document.getElementById('info').innerHTML = getHelp(router, 'This is an overview of all methods of ' + id + '. Click to view qrtz code.');

  for (let func of Object.keys(quartz).sort()) {
    const TR = document.createElement('TR');
    const TD = document.createElement('TD');
    if (router.hasOwnProperty(func)) { // TODO init && cron
      TD.innerHTML = '<a>' + func + '</a>';
    } else {
      TD.innerHTML = '<a class="private">' + func + ' (private)</a>';
    }
    TD.onclick = () => renderCode(meta, type, id, func);
    TR.appendChild(TD);
    TABLE.appendChild(TR);
  }
};
function executeDebug (type, id, func) {
  const args = [...document.getElementsByClassName('argInput')].map(INPUT => INPUT.value);
  const path = '/' + [type, id, func, ...args].join('/');
  window.open('./debug#' + path, '_blank');
}

const renderFunc = (meta, type, id, func, step) => statements => {
  document.getElementById('info').innerHTML = '';
  setBreadCrumbs(meta, type, id, func);
  const TABLE = document.getElementById('code');
  TABLE.innerHTML = '';
  let i = 0;
  const router = type === 'asset' ? meta[type]._ref[func] : meta[type][id][func];

  document.getElementById('info').innerHTML = getHelp(router, '');
  // const n = type==='asset'?2:3
  for (let statement of statements) {
    if (i === 0 && statement.startsWith('#/')) {
      const args = statement.substr(2).split('/');
      if (args.length > 0) {
        const DIV_breadcrumbs = document.getElementById('breadcrumbs');
        DIV_breadcrumbs.innerHTML = '/' + args.slice(0, 3).map(a => '<span>' + a + '</span>').join('/') +
      (args.length >= 3 ? '/' : '') + args.slice(3).map(a => (a === '' ? '' : '<input class="argInput" onclick="event.stopPropagation(); return false;" placeholder="' + a + '"/>')).join('/') +
      `<button onclick="executeDebug('${type}','${id}','${func}'); event.stopPropagation(); return false;">Execute</button>`;

      // TODO disable on private
      }
    } else {
      ++i;

      const TR = document.createElement('TR');
      if (i === Number(step)) TR.classList.add('selectedStep');
      const TD_step = document.createElement('TD');
      TD_step.className = 'noSelect';
      TD_step.setAttribute('data-pseudo-content', i);
      const TD = document.createElement('TD');
      TD.innerHTML = renderQrtz('html', '', statement);
      TR.appendChild(TD_step);

      TR.appendChild(TD);
      TABLE.appendChild(TR);
    }
  }
};

function setBreadCrumbs (meta, type, id, func, step) {
  const DIV_breadcrumbs = document.getElementById('breadcrumbs');
  DIV_breadcrumbs.innerHTML = '';
  if (func && id) {
    DIV_breadcrumbs.innerHTML += '/' + type + '/' + id;
    DIV_breadcrumbs.onclick = () => renderCode(meta, type, id);
    DIV_breadcrumbs.innerHTML += '/' + func;
  } else if (id) {
    DIV_breadcrumbs.innerHTML += '/' + type + '/' + id;
    DIV_breadcrumbs.onclick = () => renderCode(meta, type);
  } else if (type) {
    DIV_breadcrumbs.innerHTML += '/' + type;
    DIV_breadcrumbs.onclick = () => renderCode(meta);
  }
}

const fail = error => {
  document.getElementById('info').innerHTML = error;
};

function renderCode (meta, type, id, func, step) {
  const TABLE = document.getElementById('code');
  TABLE.innerHTML = '';
  if (!type) {
    setBreadCrumbs(meta);
    document.getElementById('info').innerHTML = 'This is an overview of all assets, engines and sources. Click to navigate to the qrtz methods and code.';
    request('/asset', renderType(meta, 'asset'), fail);
    request('/engine', renderType(meta, 'engine'), fail);
    request('/source', renderType(meta, 'source'), fail);
  } else if (!id) {
    setBreadCrumbs(meta, type);
    if (['asset', 'source', 'engine'].includes(type)) {
      // TODO error
    }
    document.getElementById('info').innerHTML = ''; // TODO
    request('/' + type, renderType(meta, type), fail);
  } else if (!func) request('/p/code/' + type + '/' + id, renderId(meta, type, id), fail);
  else request('/p/code/' + type + '/' + id + '/' + func, renderFunc(meta, type, id, func, step), fail);
}

function onLoad () {
  request('/meta', meta => {
    let hash = window.location.hash.substr(1);
    if (hash.startsWith('/')) hash = hash.substr(1);
    let step;
    let [type, id, func] = hash.split('/');
    if (func) [func, step] = func.split(':');
    if (type === 'a') type = 'asset';
    else if (type === 'e') type = 'engine';
    else if (type === 's') type = 'source';
    renderCode(meta, type, id, func, step);
  }, fail);
}

window.addEventListener('load', onLoad);
