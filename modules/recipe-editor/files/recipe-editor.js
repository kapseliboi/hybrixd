const DEFAULT_RETRIES = 30;
const DEFAULT_RETRY_DELAY = 300;

const host = window.location.href + '/api';

function request (url, data, dataCallback, errorCallback, progressCallback, retries, originalUrl) {
  if (typeof retries === 'undefined') { retries = DEFAULT_RETRIES; }
  if (typeof progressCallback === 'function') {
    progressCallback(1.0 - retries / DEFAULT_RETRIES);
  }

  const xhr = new XMLHttpRequest();
  xhr.open(data ? 'POST' : 'GET', host + url, true);

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
          request('/p/' + result.data, undefined, dataCallback, errorCallback, progressCallback, undefined, url);
        } else if (result.stopped !== null) { // done
          dataCallback(result.data);
        } else { // not yet finished
          if (retries === 0) {
            errorCallback('Timeout');
          } else {
            setTimeout(() => {
              request(url, undefined, dataCallback, errorCallback, progressCallback, retries - 1, originalUrl);
            }, DEFAULT_RETRY_DELAY);
          }
        }
      } else {
        try { // Catch bad parse
          const result = JSON.parse(xhr.responseText);
          if (typeof result === 'object' && result !== null && result.hasOwnProperty('error') && result.hasOwnProperty('data')) {
            errorCallback(result.data);
          }
        } catch (e) {
          errorCallback('Server error');
        }
      }
    }
  };
  if (data) {
    xhr.send(JSON.stringify(data));
  } else {
    xhr.send();
  }
}

let symbols;

request('/l/asset/names', undefined,
  list => {
    symbols = Object.keys(list);
    const base = document.getElementById('base');
    const x = symbols.join('|');
    for (let symbol in list) {
      if (symbol.indexOf('.') === -1 && x.indexOf(symbol + '.') !== -1 && symbol.indexOf('mock') === -1) {
        const option = document.createElement('option');
        option.text = list[symbol] + ' (' + symbol + ')';
        option.value = symbol;
        base.add(option);
      }
    }
  }, () => fail('Failed to retrieve existings assets.'));

function changeBase (event) {
  const base = event.target.value;
  request('/asset/' + base + '/details', undefined, details => {
    document.getElementById('factor').placeholder = details.factor;
  });

  for (let symbol of symbols) {
    if (symbol.startsWith(base + '.')) {
      document.getElementById('baseLabel').innerHTML = base;
      request('/asset/' + symbol + '/details', undefined, details => {
        const contract = details.contract;
        // TODO update example using the contract
      });
      return;
    }
  }
}

function done (url) {
  document.getElementById('form').style.display = 'none';
  document.getElementById('thankyou').style.display = 'block';
  document.getElementById('link').innerHTML = url;
  document.getElementById('link').href = url;
}

function fail (errorMessage) {
  document.getElementById('errorMessage').innerHTML = errorMessage;
  document.getElementById('form').style.display = 'none';
  document.getElementById('problem').style.display = 'block';
}

function retry () {
  document.getElementById('form').style.display = 'block';
  document.getElementById('problem').style.display = 'none';
}

function submit () {
  let missingRequiredField = false;
  const subSymbol = document.getElementById('symbol').value;
  const base = document.getElementById('base').value;
  const symbol = base + '.' + subSymbol;
  if (symbols.includes(symbol)) {
    fail(symbol + ' already exists.');
    return;
  }
  const tags = ['input', 'select', 'textarea'];

  tags.forEach(tag => {
    for (let elem of document.getElementsByTagName(tag)) {
      if (elem.hasAttribute('required') && !elem.value) {
        missingRequiredField = true;
        elem.classList.add('missing');
      }
    }
  });

  if (!missingRequiredField) {
    const data = {};
    tags.forEach(tag => {
      for (const node of document.getElementsByTagName(tag)) {
        data[node.id] = node.value;
      }
    });

    request('/s/recipe-editor/submit', data, done, fail);
  }
}
