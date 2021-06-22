const padd = x => (x < 10 ? '0' : '') + x;

function render (pairs) {
  const INPUT_search = document.getElementById('search');
  const TABLE_output = document.getElementById('output');
  INPUT_search.oninput = () => {
    for (const TR of TABLE_output.firstChild.children) {
      TR.style.display = INPUT_search.value === '' || TR.innerText.includes(INPUT_search.value) || TR.classList.contains('header')
        ? 'table-row'
        : 'none';
    }
  };
  TABLE_output.innerHTML = `<tr class="header">
  <td>from</td>
  <td>to</td>
  <td>ask</td>
  <td>bid</td>
  <td>volume</td>
  <td>fee</td>
  <td>sufficiency</td>
  <td>liquidity</td>
  <td>updated</td>
  </tr>`;
  for (const pair in pairs) {
    const {base, ask, bid, volume, fee, sufficiency, liquidity, updated} = pairs[pair];
    const [to, from] = pair.split(':');
    const TR_pair = document.createElement('TR');
    const date = new Date(updated * 1000);

    const dateString = date.getFullYear() +
          '-' + padd(date.getMonth() + 1) +
          '-' + padd(date.getDate()) +
          ' ' + padd(date.getHours()) +
          ':' + padd(date.getMinutes()) +
          ':' + padd(date.getSeconds());

    TR_pair.innerHTML = `
    <td>${from}</td>
    <td>${to}</td>
    <td>${ask}</td>
    <td>${bid}</td>
    <td>${volume}</td>
    <td>${fee}</td>
    <td>${sufficiency}</td>
    <td>${liquidity}</td>
    <td>${dateString}</td>
    `;
    TABLE_output.firstChild.appendChild(TR_pair);
  }
  // return JSON.stringify(data);
}

function go () {
  request('https://swap.hybrix.io/e/allocation/pair/stats',
    render,
    error => {
      document.getElementById('output').innerHTML = error;
    }
    , (progress, data) => { document.getElementById('output').innerHTML = '...'; }
  );
}

window.addEventListener('load', go);
