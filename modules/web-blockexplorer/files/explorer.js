let protocol = location.protocol;
let slashes = protocol.concat('//');
let host = slashes.concat(window.location.hostname) + ':' + location.port + '/api';

const DEFAULT_RETRIES = 60;
const DEFAULT_PAGE_SIZE = 10;
const FIRST_RETRY_DELAY = 100;
const DEFAULT_RETRY_DELAY = 500;

const cache = {};

const currencies = ['USD', 'EUR'];
let assets = {};
let icons;

// check if url should be cached
function cacheCheck (url) {
  const xpath = url.split('/');
  xpath.shift(); //  remove first empty
  if (xpath[0] === 'a' && xpath[2] === 'transaction') { return true; }
  if (xpath[0] === 'a' && xpath[2] === 'details') { return true; }
  if (xpath[0] === 'a' && xpath[2] === 'sample') { return true; }
  if (xpath[0] === 'a' && xpath[2] === 'message') { return true; }
  if (xpath[0] === 'a' && xpath[2] === 'validate') { return true; }
  if (url === '/list/asset/names') { return true; }
  if (url === '/engine/valuations/list') { return true; }
  return false;
}

function request (url, dataCallback, errorCallback, progressCallback, retries, originalUrl) {
  if (originalUrl && cache.hasOwnProperty(originalUrl)) { // Use cached data if available.
    dataCallback(cache[originalUrl]);
    return;
  } else if (cache.hasOwnProperty(url)) {
    dataCallback(cache[url]);
    return;
  }

  if (typeof retries === 'undefined') { retries = DEFAULT_RETRIES; }

  if (typeof progressCallback === 'function') {
    progressCallback(1.0 - retries / DEFAULT_RETRIES);
  }

  const xhr = new XMLHttpRequest();
  xhr.open('GET', host + url, true);

  xhr.onreadystatechange = (e) => {
    if (xhr.readyState === 4) {
      if (xhr.status >= 200 && xhr.status <= 299) {
        let result;

        try { // Catch bad parse
          result = JSON.parse(xhr.responseText);
        } catch (e) {
          errorCallback(e);
          return;
        }
        if (typeof result !== 'object' || result === null) {
          errorCallback('Invalid response: ' + xhr.responseText);
          return;
        }

        if (result.error !== 0) {
          errorCallback(result.data);
          return;
        }

        if (result.hasOwnProperty('id') && result.id === 'id') { // requires follow up
          request('/p/' + result.data, dataCallback, errorCallback, progressCallback, undefined, url);
        } else if (result.stopped !== null) { // done
          if (originalUrl && cacheCheck(originalUrl)) {
            cache[originalUrl] = result.data;
          } else if (cacheCheck(url)) {
            cache[url] = result.data;
          }
          dataCallback(result.data);
        } else { // not yet finished
          if (retries === 0) {
            errorCallback('Timeout');
          } else {
            setTimeout(() => {
              request(url, dataCallback, errorCallback, progressCallback, retries - 1, originalUrl);
            }, retries === DEFAULT_RETRIES ? FIRST_RETRY_DELAY : DEFAULT_RETRY_DELAY);
          }
        }
      } else {
        errorCallback('Received ' + xhr.status);
      }
    }
  };
  xhr.send();
}

function setCookie (fields, exdays) {
  let d = new Date();
  d.setTime(d.getTime() + (exdays || 30 * 24 * 60 * 60 * 1000));
  let expires = 'expires=' + d.toUTCString();

  let r = '';
  for (let key in fields) {
    document.cookie = key + '=' + fields[key] + ';' + expires + ';path=/';
  }
}

function getCookie () {
  if (document.cookie === '') { return {}; }
  let fields = document.cookie.split(';');
  let r = {};
  for (let i = 0; i < fields.length; i++) {
    let values = fields[i].split('=');
    r[values[0].trim()] = values[1].trim();
  }
  return r;
}

function nth (d) {
  if (d > 3 && d < 21) return 'th';
  switch (d % 10) {
    case 1: return 'st';
    case 2: return 'nd';
    case 3: return 'rd';
    default: return 'th';
  }
}

function padd (x) {
  return x < 10 ? '0' + x : x;
}

function prettyTime (timestamp) {
  // const now = Date.now();

  const date = new Date(timestamp * 1000);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const year = date.getFullYear();
  const month = months[date.getMonth()];
  const day = date.getDate();
  const ord = nth(day);

  const hour = date.getHours();
  const min = date.getMinutes();
  const sec = date.getSeconds();
  const time = month + ' ' + day + '<sup>' + ord + '</sup> ' + year + ' ' + padd(hour) + ':' + padd(min) + ':' + padd(sec);
  return time;
}

function copyText (text) {
  const node = document.createElement('span');
  node.style.position = 'absolute';
  node.style.left = '-10000px';
  node.textContent = text;

  document.body.appendChild(node);

  let selection = document.getSelection();
  selection.removeAllRanges();

  let range = document.createRange();
  range.selectNodeContents(node);
  selection.addRange(range);

  document.execCommand('copy');
  selection.removeAllRanges();

  document.body.removeChild(node);
}

function clipboard (text) {
  return `<div class="clipboard" onclick="copyText('${text}');" title="${text}"></div>`;
}

function paddCurrency (amount) {
  // round to 2 decimals and stringify
  const rounded = '' + Math.round(Number(amount) * 100) / 100;
  const frac = rounded.split('.')[1];
  if (typeof frac !== 'string') {
    return rounded + '.00';
  } else if (frac.length === 1) {
    return rounded + '0';
  } else {
    return rounded;
  }
}

function renderProgress (progress) {
  const duration = DEFAULT_RETRY_DELAY / 1000 * DEFAULT_RETRIES;
  // set negative animation delay to force animation to current position.
  return `<div class="spinner">
    <div class="bounce1"></div>
    <div class="bounce2"></div>
    <div class="bounce3"></div>
  </div>`;
}
function renderLink (symbol, address, transactionId, currency) {
  if ((address && address.toString().toLowerCase() === 'unknown') || (transactionId && transactionId.toString().toLowerCase() === 'unknown')) {
    return 'unknown';
  } else if (symbol && typeof address !== 'undefined') {
    return `<a onclick="handleAddress('${symbol}','${address}',0,'${currency}'); return false;" href="?symbol=${symbol}&address=${address}">${address}</a>`;
  } else if (symbol && typeof transactionId !== 'undefined') {
    return `<a onclick="handleTransaction('${symbol}','${transactionId}','${currency}'); return false;" href="?symbol=${symbol}&transactionId=${transactionId}">${transactionId}</a>`;
  } else {
    return 'Broken link';
  }
}

const renderCurrency = (currency, id, type) => amount => {
  const e = document.getElementById(id);
  if (e) {
    if (type === 'currency') {
      e.innerHTML = paddCurrency(amount) + '&nbsp;' + currency.toUpperCase();
    } else {
      e.innerHTML = '(' + paddCurrency(amount) + '&nbsp;' + currency.toUpperCase() + ')';
    }
  }
};

const handleCurrencies = currency => list => {
  currencies.splice.apply(currencies, [0, currencies.length].concat(list));
  const currencySelectors = document.getElementsByClassName('currencySelector');
  for (let i = 0; i < currencySelectors.length; i++) {
    currencySelectors[i].innerHTML = currencySelector(currency);
  }
};

function selectCurrency (currency) {
  const valuationElems = document.querySelectorAll('.amount-valuation');
  const symbol = document.querySelector('.data-symbol').getAttribute('symbol');

  valuationElems.forEach(requestUpdatedCurrency(currency));
  request('/e/valuations/rate/' + symbol + '/' + currency, renderRate(currency), failRate(currency), progressRate(currency));
  setParameter()('currency', currency);
  setCookie({currency});
}

const requestUpdatedCurrency = currency => elem => {
  const amountID = elem.id;
  const amountAmount = elem.getAttribute('amount');
  const amountType = elem.getAttribute('type');
  const symbol = elem.getAttribute('symbol');

  request('/e/valuations/rate/' + symbol + '/' + currency + '/' + amountAmount, renderCurrency(currency, amountID, amountType), failCurrency(currency, amountID, amountType), progressCurrency(currency, amountID, amountType));
};

function currencySelector (currency) {
  let r = '<select class="currencySelector" onchange="selectCurrency(event.target.options[event.target.selectedIndex].value);">';
  for (let i = 0; i < currencies.length; ++i) {
    if (currency && currency.toUpperCase() === currencies[i].toUpperCase()) {
      r += '<option SELECTED>' + currencies[i].toUpperCase() + '</option>';
    } else {
      r += '<option>' + currencies[i].toUpperCase() + '</option>';
    }
  }
  return r + '</select>';
}

const failCurrency = (currency, id, type) => error => {
  const e = document.getElementById(id);
  if (e) {
    e.classList.add('error');
    e.title = error;
    if (type === 'currency') {
      e.innerHTML = '?&nbsp;' + currency;
    } else {
      e.innerHTML = '(?&nbsp;' + currencySelector(currency) + ')';
    }
  }
};

const progressCurrency = (currency, id, type) => progress => {
  const e = document.getElementById(id);
  if (e) {
    if (type === 'currency') {
      e.innerHTML = '(' + renderProgress(progress) + '&nbsp;' + currency.toUpperCase() + ')';
    } else {
      e.innerHTML = '' + renderProgress(progress) + '&nbsp;' + currency.toUpperCase() + '';
    }
  }
};

const renderAmount = (amount, symbol, currency, type) => {
  currency = currency || 'USD';
  if (typeof type === 'undefined' || type === 'both') {
    const id = Math.floor(Math.random() * 100000);
    request('/e/valuations/rate/' + symbol + '/' + currency + '/' + amount, renderCurrency(currency, id, type), failCurrency(currency, id, type), progressCurrency(currency, id, type));
    return amount + '&nbsp;' + symbol.toUpperCase() + '&nbsp;<span class="amount-valuation" amount="' + amount + '" symbol="' + symbol + '" type="' + type + '" id="' + id + '">(' + renderProgress(0) + '&nbsp;' + currency.toUpperCase() + ')</span>';
  } else if (type === 'amount') {
    return amount + '&nbsp;' + symbol.toUpperCase();
  } else if (type === 'currency') {
    const id = Math.floor(Math.random() * 100000);
    request('/e/valuations/rate/' + symbol + '/' + currency + '/' + amount, renderCurrency(currency, id, type), failCurrency(currency, id, type), progressCurrency(currency, id, type));
    return '&nbsp;<span class="amount-valuation" amount="' + amount + '" symbol="' + symbol + '" type="' + type + '" id="' + id + '">' + renderProgress(0) + '&nbsp;' + currency.toUpperCase() + '</span>';
  }
};

const failAmount = (symbol, currency, type) => {
  currency = currency || 'USD';
  if (typeof type === 'undefined' || type === 'both') {
    return '?&nbsp;' + symbol.toUpperCase() + '&nbsp;<span>(?&nbsp;' + currency.toUpperCase() + ')</span>';
  } else if (type === 'amount') {
    return '?&nbsp;' + symbol.toUpperCase();
  } else if (type === 'currency') {
    return '&nbsp;<span>?&nbsp;' + currency.toUpperCase() + '</span>';
  }
};

const renderBalance = (symbol, currency) => balance => {
  document.getElementById('amount').innerHTML = renderAmount(balance, symbol, currency, 'amount');
  document.getElementById('converted').innerHTML = renderAmount(balance, symbol, currency, 'currency');
};

// progressBalancealready handled by progressCurrency

const renderTransactionRow = (symbol, transactionId, address, currency) => transaction => {
  const e = document.getElementById(transactionId);
  if (e) {
    const sources = (transaction.source || '').toString().split(',');
    const targets = (transaction.target || '').toString().split(',');

    e.cells[1].innerHTML = prettyTime(transaction.timestamp);

    const addressIsSource = sources.indexOf(address) !== -1;
    const noSource = sources.length === 0 || (sources.length === 1 && sources[0] === '');
    const fromAdress = targets.indexOf(address) !== -1;
    const adressIsSourceAndTarget = sources.length === 1 && targets.length === 1 && sources[0] === targets[0];
    const zeroValueTransaction = Number(transaction.amount) === 0;

    if (adressIsSourceAndTarget) {
      e.cells[2].innerHTML = '<i>self</i>';
      e.cells[3].innerHTML = '<img src="./img/self.svg" alt="self" title="Transaction to self" />';
    } else if (noSource) {
      e.cells[2].innerHTML = '<i>No source</i>';
      e.cells[3].innerHTML = '<img src="./img/mint.svg" alt="mint" title="Transaction is sourceless (Mint or Mine)" />';
    } else if (addressIsSource) {
      e.cells[2].innerHTML = '';
      for (let target of targets) {
        e.cells[2].innerHTML += renderLink(symbol, target, undefined, currency) + clipboard(target) + ' ';
      }
      e.cells[3].innerHTML = '<img src="./img/out.svg" alt="to" title="Outgoing transaction"/>';
    } else {
      e.cells[2].innerHTML = '';
      for (let source of sources) {
        e.cells[2].innerHTML += renderLink(symbol, source, undefined, currency) + clipboard(source) + ' ';
      }
      e.cells[3].innerHTML = '<img src="./img/in.svg" alt="from" title="Incoming transaction" />';
    }

    if (zeroValueTransaction) {
      e.cells[4].innerHTML = renderAmount(transaction.amount, symbol, currency, 'amount');
      e.cells[4].style.color = '#aaa';
      e.cells[5].innerHTML = renderAmount(transaction.amount, symbol, currency, 'currency');
      e.cells[5].style.color = '#aaa';
    } else if (adressIsSourceAndTarget) {
      e.cells[4].innerHTML = renderAmount(transaction.amount, symbol, currency, 'amount');
      e.cells[4].style.color = 'black';
      e.cells[5].innerHTML = renderAmount(transaction.amount, symbol, currency, 'currency');
      e.cells[5].style.color = 'black';
    } else if (addressIsSource) {
      e.cells[4].innerHTML = '-' + renderAmount(transaction.amount, symbol, currency, 'amount');
      e.cells[4].style.color = '#DB4D48';
      e.cells[5].innerHTML = '-' + renderAmount(transaction.amount, symbol, currency, 'currency');
      e.cells[5].style.color = '#DB4D48';
    } else {
      e.cells[4].innerHTML = renderAmount(transaction.amount, symbol, currency, 'amount');
      e.cells[4].style.color = '#4FBA79';
      e.cells[5].innerHTML = renderAmount(transaction.amount, symbol, currency, 'currency');
      e.cells[5].style.color = '#4FBA79';
    }
    e.cells[4].style.textAlign = 'right';
    e.cells[5].style.textAlign = 'right';
  }
};

const failTransactionRow = (symbol, transactionId, address) => error => {
  const e = document.getElementById(transactionId);
  if (e) {
    e.title = error;
    e.classList.add('error'); // TODO retry button?
    e.cells[0].innerHTML = transactionId;
    e.cells[1].innerHTML = '?';
    e.cells[2].innerHTML = '?';
    e.cells[3].innerHTML = '?';
    e.cells[4].innerHTML = '?';
    e.cells[5].innerHTML = '?';
  }
};

const progressTransactionRow = (symbol, transactionId, address) => progress => {
  const e = document.getElementById(transactionId);
  if (e) {
    let dots = renderProgress(progress);
    e.cells[1].innerHTML = dots;
    e.cells[2].innerHTML = dots;
    e.cells[3].innerHTML = dots;
    e.cells[4].innerHTML = dots;
    e.cells[5].innerHTML = dots;
  }
};

const progressAddressgressMessage = (symbol, transactionId) => progress => {
  const e = document.getElementById('transaction');
  if (e) {
    e.rows[6].cells[1].innerHTML = renderProgress(progress);
  }
};

const renderMessage = (symbol, transactionId) => message => {
  const e = document.getElementById('transaction');
  if (e) {
    e.rows[6].cells[1].innerHTML = message || '-';
  }
};

const progressMessage = (symbol, transactionId) => progress => {
  const e = document.getElementById('transaction');
  if (e) {
    e.rows[6].cells[1].innerHTML = renderProgress(progress);
  }
};

const failMessage = (symbol, transactionId) => error => {
  const e = document.getElementById('transaction');
  if (e) {
    e.rows[6].cells[1].innerHTML = '?';
    e.rows[6].cells[1].title = error;
    e.rows[6].cells[1].classList.add('error');
  }
};

const progressTransaction = (symbol, transactionId, currency) => progress => {
  // note: amount and converted al already handled by progressCurrency
  document.getElementById('amount').innerHTML = failAmount(symbol, currency, 'amount');
  document.getElementById('converted').innerHTML = failAmount(symbol, currency, 'currency');
  const e = document.getElementById('transaction');
  if (e) {
    for (let i = 0; i <= 4; ++i) { // skip 5 =confirmed, 6=message
      e.rows[i].cells[1].innerHTML = renderProgress(progress);
    }
  }
};

const renderTransaction = (symbol, transactionId, currency) => transaction => {
  document.getElementById('amount').innerHTML = renderAmount(transaction.amount, symbol, currency, 'amount');
  document.getElementById('converted').innerHTML = renderAmount(transaction.amount, symbol, currency, 'currency');

  const e = document.getElementById('transaction');
  if (e) {
    e.rows[0].cells[1].innerHTML = prettyTime(transaction.timestamp);
    e.rows[1].cells[1].innerHTML = '';
    const sources = (transaction.source || '').toString().split(',');
    const targets = (transaction.target || '').toString().split(',');

    for (let source of sources) {
      e.rows[1].cells[1].innerHTML += renderLink(symbol, source, undefined, currency) + ' ';
    }
    e.rows[2].cells[1].innerHTML = '';
    for (let target of targets) {
      e.rows[2].cells[1].innerHTML += renderLink(symbol, target, undefined, currency) + ' ';
    }
    e.rows[3].cells[1].innerHTML = renderAmount(transaction.amount, symbol, currency, 'both');

    let feeHTML = '';
    if (typeof transaction.fee === 'string' || typeof transaction.fee === 'number') { // FIXME remove after multi asset fees are implemented
      feeHTML = renderAmount(transaction.fee, transaction['fee-symbol'], currency, 'both');
    } else if (transaction.fee !== null && typeof transaction.fee === 'object') {
      for (let feeSymbol in transaction.fee) {
        feeHTML += renderAmount(transaction.fee[feeSymbol], feeSymbol, currency, 'both') + ' ';
      }
    }
    e.rows[4].cells[1].innerHTML = feeHTML;
  }
};

function prettyPrintConfirmed (confirmed) {
  if (confirmed === true) {
    return '<span  class="confirmed">confirmed</span>';
  } else if (confirmed === 1) {
    return '<span   class="confirmed">1 confirmation</span>';
  } else if (confirmed === false) {
    return '<span  class="unconfirmed">unconfirmed</span>';
  } else if (confirmed === 0) {
    return '<span  class="unconfirmed">no confirmations</span>';
  } else if (!isNaN(confirmed)) {
    return `<span  class="confirmed">${confirmed} confirmations</span>`;
  } else {
    return '<span  class="unconfirmed">Unconfirmed</span>';
  }
}

const renderConfirmed = (symbol, transactionId) => confirmed => {
  const e = document.getElementById('transaction');
  if (e) {
    e.rows[5].cells[1].innerHTML = prettyPrintConfirmed(confirmed);
  }
};

const progressConfirmed = (symbol, transactionId, currency) => progress => {
  // note: amount and converted al already handled by progressCurrency
  const e = document.getElementById('transaction');
  if (e) {
    e.rows[5].cells[1].innerHTML = renderProgress(progress);
  }
};

const failTransaction = (symbol, transactionId, currency) => error => {
  const e = document.getElementById('result');
  if (e) {
    e.classList.add('error');
    e.innerHTML = `Format not recognized for ${symbol}. Please check for a typo or paste error.`;
  }
};

const loadMoreHistory = (symbol, address, page, currency) => () => {
  request('/a/' + symbol + '/history/' + address + '/' + DEFAULT_PAGE_SIZE + '/' + (page - 1) * DEFAULT_PAGE_SIZE, renderHistory(symbol, address, page, currency), failMoreHistory, progressMoreHistory);
};

const failMoreHistory = error => {
  const more = document.getElementById('more');
  if (more) {
    more.classList.remove('click');
    more.classList.add('error');
    more.innerHTML = 'Failed to retrieve more history.';
  }
};

const progressMoreHistory = progress => {
  const more = document.getElementById('more');
  if (more) {
    more.innerHTML = renderProgress(progress);
  }
};

const renderHistory = (symbol, address, page, currency) => history => {
  const e = document.getElementById('history');
  for (let i = 0; i < history.length; ++i) {
    const transactionId = history[i];
    e.innerHTML += '<tr class="row" id="' + transactionId + '"><td class="transactionId">' +
      renderLink(symbol, undefined, transactionId, currency) + '</td><td>' + renderProgress(0) + '</td><td>' + renderProgress(0) + '</td><td>' + renderProgress(0) + '</td><td style="text-align: right; font-weight: 500;">' + renderProgress(0) + '</td><td style="text-align: right; font-weight: 500;">' + renderProgress(0) + '</td></tr>';
    request('/a/' + symbol + '/transaction/' + transactionId, renderTransactionRow(symbol, transactionId, address, currency), failTransactionRow(symbol, transactionId, address), progressTransactionRow(symbol, transactionId, address));
  }
  const more = document.getElementById('more');

  if (history.length < DEFAULT_PAGE_SIZE) {
    more.innerHTML = 'Nothing more to show.';
    more.onclick = '';
    more.classList.remove('click');
  } else {
    more.onclick = loadMoreHistory(symbol, address, page + 1, currency);
    more.classList.add('click');
    more.innerHTML = 'load more...';
  }
};

const failHistory = (symbol, address, page, currency) => error => {
  const e = document.getElementById('history');

  e.innerHTML += '<tr class="row"><td colspan="7">Could not retrieve history...</td></tr>';

  const more = document.getElementById('more');
  if (more) {
    more.innerHTML = '';
    more.onclick = '';
    more.classList.remove('click');
  }
};

const renderRate = currency => rate => {
  const e = document.getElementById('rate');
  if (e) {
    e.innerHTML = rate;
  }
};

const progressRate = currency => progress => {
  const e = document.getElementById('rate');
  if (e) {
    e.innerHTML = renderProgress(progress);
  }
};

const failRate = currency => error => {
  const e = document.getElementById('rate');
  if (e) {
    e.innerHTML = '?';
    e.title = error;
    e.classList.add('error');
  }
};

function switchToResultMode () {
  const noResults = document.getElementsByClassName('no-result');

  document.getElementById('query').focus();

  const list = [];
  for (let i = 0; i < noResults.length; i++) {
    list.push(noResults[i]);
  }
  document.getElementById('banner').classList.remove('no-result');
  document.getElementById('header').classList.remove('no-result');
  document.getElementById('main').classList.remove('no-result');
  document.getElementById('above-the-fold').classList.remove('no-result');

  document.getElementById('sample').classList.remove('no-result');
  document.getElementById('footer').classList.remove('no-result');

  document.getElementById('symbolIcon').classList.remove('no-result');
  document.getElementById('symbolInfo').classList.remove('no-result');
  document.getElementById('symbolAbout').classList.remove('no-result');
  document.getElementById('symbols').style.display = 'none';
}

const handleTransaction = (symbol, transactionId, currency) => {
  switchToResultMode();
  setParameter(symbol + ' transaction ' + transactionId)('transactionId', transactionId, 'symbol', symbol, 'address', undefined, 'currency', currency, 'page', undefined);

  const e = document.getElementById('result');
  if (e) {
    e.innerHTML = `
<table id="info" class="transaction-info">
<tr class="data-symbol" symbol=${symbol}>
<td>Transaction</td>
<td class="align-right"><span id="amount">${renderProgress(0)}</span></td>
</tr>
<tr>
<td>${transactionId}${clipboard(transactionId)}</td>
<td class="align-right"><span id="converted">${renderProgress(0)}</span> <span id="compared">1 ${symbol.toUpperCase()} / <span id="rate">${renderProgress(0)}</span></span> ${currencySelector(currency)} </td>
</tr>
</table>

<table id="transaction">
<tr><td>timestamp</td><td>${renderProgress(0)}</td></tr>
<tr><td>from</td><td>${renderProgress(0)}</td></tr>
<tr><td>to</td><td>${renderProgress(0)}</td></tr>
<tr><td>amount</td><td>${renderProgress(0)}</td></tr>
<tr><td>fee</td><td>${renderProgress(0)}</td></tr>
<tr><td>confirmed</td><td>${renderProgress(0)}</td></tr>
<tr><td>message</td><td>${renderProgress(0)}</td></tr>
</table>
`;
    request('/a/' + symbol + '/transaction/' + transactionId, renderTransaction(symbol, transactionId, currency), failTransaction(symbol, transactionId, currency), progressTransaction(symbol, transactionId, currency));
    request('/a/' + symbol + '/confirmed/' + transactionId, renderConfirmed(symbol, transactionId), failTransaction(symbol, transactionId, currency), progressConfirmed(symbol, transactionId, currency));
    request('/a/' + symbol + '/message/' + transactionId, renderMessage(symbol, transactionId), failMessage(symbol, transactionId), progressMessage(symbol, transactionId));
    request('/e/valuations/rate/' + symbol + '/' + currency, renderRate(currency), failRate(currency), progressRate(currency));
  }
};

const fail = err => {
  switchToResultMode();
  const e = document.getElementById('result');
  e.innerHTML = e.innerHTML + '<div class="error">' + err + '</div>';
};

const progressAddress = (symbol, address, page, currency) => progress => {
  const e = document.getElementById('more');
  if (e) {
    e.innerHTML = renderProgress(progress);
  }
};

const handleAddress = (symbol, address, page, currency) => {
  if (isNaN(page) || page === 0) {
    page = 1;
  }
  setParameter(symbol + ' address ' + address)('symbol', symbol, 'address', address, 'transactionId', undefined, 'currency', currency, 'page', page);

  switchToResultMode();
  const e = document.getElementById('result');
  e.innerHTML = `
<table id="info" class="address-info">
<tr class="data-symbol" symbol=${symbol}>
<td>Address</td>
<td class="align-right"><span id="amount">${renderProgress(0)}</span></td>
</tr>
<tr>
<td>${address}${clipboard(address)}</td>
<td class="align-right"><span id="converted">${renderProgress(0)}</span> <span id="compared">1 ${symbol.toUpperCase()} / <span id="rate">${renderProgress(0)}</span></span> ${currencySelector(currency)} </td>
</tr>
</table>


<table id="history">
<tr class="header"><td class="transactionId">id</td><td>timestamp</td><td>contra account</td><td>type</td><td style="text-align:right;">amount&nbsp;(${symbol.toUpperCase()})</td><td style="text-align:right;"> amount&nbsp;(${currency.toUpperCase()})</td></tr>
</table>
<a id="more"></a>
`;

  request('/a/' + symbol + '/balance/' + address, renderBalance(symbol, currency), fail);
  request('/a/' + symbol + '/history/' + address + '/' + DEFAULT_PAGE_SIZE + '/' + (page - 1) * DEFAULT_PAGE_SIZE, renderHistory(symbol, address, page, currency), fail, progressAddress(symbol, address, page, currency));
  request('/e/valuations/rate/' + symbol + '/' + currency, renderRate(currency), failRate(currency), progressRate(currency));
};

const handleQuery = (symbol, query, currency) => data => {
  query = query.trim();
  if (data === 'valid') {
    handleAddress(symbol, query, 1, currency);
  } else if (data === 'invalid') {
    handleTransaction(symbol, query, currency);
  } else {
    fail('Could not determine whether query "' + query + '" was a a valid address.');
  }
};

function progressFind (progress) {
  const e = document.getElementById('result');
  if (e) {
    e.innerHTML = renderProgress(progress);
  }
}

function find (symbol, query, currency) {
  query = query.trim();
  if (query === 'transaction:sample' || query === 'tx:sample') {
    request('/a/' + symbol + '/sample/', sample => handleTransaction(symbol, sample.transaction, currency), fail, progressFind);
  } else if (query === 'address:sample') {
    request('/a/' + symbol + '/sample/', sample => handleAddress(symbol, sample.address, 1, currency), fail, progressFind);
  } else {
    request('/a/' + symbol + '/validate/' + query, handleQuery(symbol, query, currency), fail);
  }
}

function go () {
  switchToResultMode();
  const e = document.getElementById('symbol');
  const symbol = e.value;
  const query = document.getElementById('query').value;
  const currency = getParameter('currency') || 'USD'; // TOOD cookie
  find(symbol, query, currency);
}

function updateParameter () {
  const args = Array.prototype.slice.call(arguments);

  const kvp = document.location.search.substr(1).split('&');

  for (let j = 0; j < args.length; j += 2) {
    const key = encodeURI(args[j]);
    if (typeof args[j + 1] === 'undefined') {
      var i = kvp.length; var x; while (i--) {
        x = kvp[i].split('=');

        if (x[0] == key) {
          kvp.splice(i, 1);
        }
      }
    } else {
      const value = encodeURI(args[j + 1]);

      var i = kvp.length; var x; while (i--) {
        x = kvp[i].split('=');

        if (x[0] == key) {
          x[1] = value;
          kvp[i] = x.join('=');
          break;
        }
      }

      if (i < 0) { kvp[kvp.length] = [key, value].join('='); }
    }
  }
  return window.location.protocol + '//' + window.location.host + window.location.pathname + '?' + kvp.join('&');
}

const setParameter = title => function () {
  const newurl = updateParameter.apply({}, arguments);
  window.history.pushState({ path: newurl }, title, newurl);
};

function getParameter (parameterName) {
  let result = null;
  let tmp = [];
  location.search
    .substr(1)
    .split('&')
    .forEach(function (item) {
      tmp = item.split('=');
      if (tmp[0] === parameterName) result = decodeURIComponent(tmp[1]);
    });
  return result;
}

function validateQuery () {
  const e = document.getElementById('symbol');
  const symbol = e.value;
  const query = document.getElementById('query').value;
  if (assets.hasOwnProperty(symbol.toLowerCase()) && query !== '') {
    document.getElementById('go').disabled = false;
  } else {
    document.getElementById('go').disabled = true;
  }
}

function validateSymbol () {
  hideInfo();
  showSymbols(true);
  validateQuery();
}

const handleAssets = currency => (newAssets) => {
  assets = newAssets;
  const symbols = document.getElementById('symbols');
  for (let symbol in assets) {
    if (icons) {
      const id = symbol.split('.')[symbol.split('.').length - 1];
      if (icons.hasOwnProperty(id)) {
        symbols.innerHTML += `<div class="symbol" onclick="selectSymbol('${symbol}');">${icons[id]}${assets[symbol].split('(')[0]}&nbsp;(${symbol})</div>`;
      } else {
        symbols.innerHTML += `<div class="symbol" onclick="selectSymbol('${symbol}');">${icons.default}${assets[symbol].split('(')[0]}&nbsp;(${symbol})</div>`;
      }
    } else {
      symbols.innerHTML += `<div class="symbol" onclick="selectSymbol('${symbol}');">${assets[symbol].split('(')[0]}&nbsp;(${symbol})</div>`;
    }
  }

  const symbol = getParameter('symbol');
  const address = getParameter('address');
  const transactionId = getParameter('transactionId');
  const query = document.getElementById('query');
  const page = Number(getParameter('page'));

  if (symbol && !assets.hasOwnProperty(symbol)) {
    fail('Could not find symbol ' + symbol);
    return;
  }

  if (symbol && address) {
    query.value = address;
    handleAddress(symbol, address, page, currency);
  } else if (symbol && transactionId) {
    query.value = transactionId;
    handleTransaction(symbol, transactionId, currency);
  }
};

function selectSymbol (selectedSymbol) {
  const symbols = document.getElementById('symbols');
  const symbol = document.getElementById('symbol');
  hideInfo();
  symbol.value = selectedSymbol;
  symbols.style.display = 'none';
  validateQuery();
}

function showSymbols (applyFilter) {
  const symbols = document.getElementById('symbols');
  if (symbols) {
    if (applyFilter) {
      const symbol = document.getElementById('symbol');
      const rect = symbol.getBoundingClientRect();
      const filter = symbol.value;

      const children = symbols.childNodes;
      children.forEach(function (item) {
        if (filter !== '' && item.innerHTML.toLowerCase().indexOf(symbol.value.toLowerCase()) === -1) {
          item.style.display = 'none';
        } else {
          item.style.display = 'block';
        }
      });
    }
    symbols.style.display = 'block';
  }
}

function handleIcons (newIcons) {
  icons = newIcons;
  const symbols = document.getElementById('symbols');
  if (symbols) {
    const children = symbols.childNodes;
    children.forEach(function (item) {
      const id = symbol.split('.')[symbol.split('.').length - 1];
      if (icons.hasOwnProperty(id)) {
        symbols.innerHTML += `<div class="symbol" onclick="selectSymbol('${symbol}');">${icons[id]}${assets[symbol].split('(')[0]}&nbsp;(${symbol})</div>`;
      } else {
        symbols.innerHTML += `<div class="symbol" onclick="selectSymbol('${symbol}');">${icons.default}${assets[symbol].split('(')[0]}&nbsp;(${symbol})</div>`;
      }

      item.innerHTML = 'test ' + item.innerHTML;
    });
  }
}

function handleIcon (iconSVG) {
  const icon = document.getElementById('symbolIcon');
  if (icon) {
    icon.innerHTML = iconSVG.replace('width="32" height="32"', 'width="100%" height="100%"');
  }
}

function handleInfo (infoText) {
  if (typeof infoText !== 'undefined' && infoText !== 'undefined') {
    const info = document.getElementById('symbolInfo');
    if (info) {
      info.innerHTML = infoText;
    }
  } else {
    hideInfo();
  }
}

function handleDetails (details) {
  if (typeof details === 'object' && details !== null && details.hasOwnProperty('name')) {
    const name = document.getElementById('symbolName');
    if (name) {
      name.innerHTML = details.name;
    }
  } else {
    hideInfo();
  }
}

function hideInfo () {
  document.getElementById('symbolIcon').style.display = 'none';
  document.getElementById('symbolAbout').style.display = 'none';
  document.getElementById('symbolInfo').style.display = 'none';
}

window.addEventListener('click', function (e) {
  const symbols = document.getElementById('symbols');
  if (symbols && symbols.style.display !== 'none') {
    const symbol = document.getElementById('symbol');
    if (!symbols.contains(e.target) && !(symbol && symbol.contains(e.target))) {
      // If clicked outside the box
      symbols.style.display = 'none';
    }
  }
  const menu = document.getElementById('menu');
  if (menu && menu.style.visibility !== 'hidden' && !menu.contains(e.target)) {
    const menuToggle = document.getElementById('menuToggle');
    if (menuToggle && !menuToggle.contains(e.target)) {
      menu.style.visibility = 'hidden';
    }
  }
});

// Revert to a previously saved state
window.addEventListener('popstate', function (event) {
  onLoad(event.state);
});

function onLoad () {
  // hide homepage immediatly
  if (getParameter('symbol') && getParameter('address') || getParameter('transactionId')) {
    switchToResultMode();
  }

  if (getParameter('symbol')) {
    const symbol = getParameter('symbol');
    document.getElementById('symbol').value = symbol;
    if (!getParameter('address') && !getParameter('transactionId')) {
      request('/a/' + symbol + '/details', handleDetails, fail); // TODO specific failure + progress    }
      request('/a/' + symbol + '/icon', handleIcon, fail); // TODO specific failure + progress    }
      request('/a/' + symbol + '/info', handleInfo, hideInfo); // TODO progress    }
    } else {
      hideInfo();
    }
  } else if (document.getElementById('symbol').value) {
    const symbol = document.getElementById('symbol').value;
    request('/a/' + symbol + '/details', handleDetails, fail); // TODO specific failure + progress    }
    request('/a/' + symbol + '/icon', handleIcon, fail); // TODO specific failure + progress    }
    request('/a/' + symbol + '/info', handleInfo, hideInfo); // TODO specific failure + progress    }
  } else {
    hideInfo();
  }

  if (getParameter('address')) {
    document.getElementById('query').value = getParameter('address');
  }
  if (getParameter('transactionId')) {
    document.getElementById('query').value = getParameter('transactionId');
  }

  const currency = getParameter('currency') || getCookie().currency || 'USD';
  // TODO too slow for now  request('/list/asset/icons',handleIcons,fail) //TODO specific failure + progress
  request('/list/asset/names', handleAssets(currency), fail); // TODO specific failure + progress
  request('/engine/valuations/list', handleCurrencies(currency), fail); // TODO specific failure + progress
}

function onKeyUp (event) {
  if (event.keyCode === 13 && !document.getElementById('go').disabled) {
    go();
  }
}

const insertSample = (symbol, type) => sample => {
  document.getElementById('symbol').value = symbol;
  document.getElementById('query').value = sample[type];
  validateQuery();
};

function trySample (type) {
  const symbol = document.getElementById('symbol').value || 'btc';
  request('/a/' + symbol + '/sample/', insertSample(symbol, type), fail);
}

function toggleMenu () {
  const menu = document.getElementById('menu');
  if (menu) {
    if (menu.style.visibility === 'hidden') {
      menu.style.visibility = 'visible';
    } else {
      menu.style.visibility = 'hidden';
    }
  }
}

function showSymbolInfo () {
  const symbolInfo = document.getElementById('symbolInfo');
  if (symbolInfo.style.visibility == 'hidden') {
    symbolInfo.style.visibility = 'visible';
    symbolInfo.style.height = 'unset';
  } else {
    symbolInfo.style.visibility = 'hidden';
    symbolInfo.style.height = '0px';
  }
}

function isChain (value) {
  return value.indexOf('.') === -1 && value.indexOf('dummy') === -1 && value.indexOf('mock') === -1;
}

function isTokenOnChain (value) {
  return value.indexOf('.') !== -1 && value.indexOf('mock') === -1;
}

// Stats
request('/asset', assets => {
  const chains = assets.filter(isChain);
  const tokens = assets.filter(isTokenOnChain);

  document.getElementById('stats-tokens').innerHTML = tokens.length;
  document.getElementById('stats-chains').innerHTML = chains.length;
});
