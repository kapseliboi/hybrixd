/*


Styling
- tables
- confirmations : mooier icoontjes
- clibboard : mooier icoontje
- favicon
- errors

*/
var protocol = location.protocol;
var slashes = protocol.concat("//");
var host = slashes.concat(window.location.hostname)+':'+location.port+'/api';

const defaultRetries=30;

function request(url, dataCallback,errorCallback,progressCallback,retries){
  if(typeof retries==='undefined'){retries = 30;}

  if(typeof progressCallback==='function'){
    progressCallback(retries/30);
  }

  const xhr = new XMLHttpRequest();
  xhr.open('GET', host+url, true);

  xhr.onreadystatechange = function(e) {
    if (xhr.readyState == 4){
      if( xhr.status >= 200 && xhr.status <= 299) {
        let result;

        try{ // Catch bad parse
           result = JSON.parse(xhr.responseText);
        }catch(e){
          errorCallback(e);
          return;
        }
        if(typeof result !== 'object' || result === null){
          errorCallback('Invalid response: '+xhr.responseText);
          return;
        }

        if(result.error!==0){
          errorCallback(result.data);
          return;
        }

        if(result.hasOwnProperty('id') && result.id==='id'){ // requires follow up
          request('/p/'+result.data, dataCallback,errorCallback,progressCallback);
        }else if( result.stopped!== null ){ // done
          dataCallback(result.data);
        }else{  // not yet finished
          if(retries===0){
            errorCallback('Timeout');
          }else{
          setTimeout(()=>{
            request(url, dataCallback,errorCallback,progressCallback,retries-1);
          },300);
          }
        }
      }else{
        errorCallback('Received '+xhr.status);
      }
    }
  }
  xhr.send();
}

function nth(d) {
  if (d > 3 && d < 21) return 'th';
  switch (d % 10) {
    case 1:  return "st";
    case 2:  return "nd";
    case 3:  return "rd";
    default: return "th";
  }
}

function padd(x){
  return x<10?'0'+x:x;
}

function prettyTime(timestamp){
  //const now = Date.now();

  const date = new Date(timestamp * 1000);
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const year = date.getFullYear();
  const month = months[date.getMonth()];
  const day = date.getDate();
  const ord = nth(day);

  const hour = date.getHours();
  const min = date.getMinutes();
  const sec = date.getSeconds();
  const time = month + ' ' + day + '<sup>'+ord+ '</sup> ' + year + ' ' + padd(hour) + ':' + padd(min) + ':' + padd(sec) ;
  return time;
}

function confirmed(confirmations){
  if(isNaN(confirmations)){
    return '<span title="Unknown" class="unknown">unknown</span>';
  }else if(confirmations>0){
    return '<span title="Confirmed ('+confirmations+ ')" class="confirmed">confirmed</span>';
  }else{
    return '<span  title="Unconfirmed" class="unconfirmed">unconfirmed</span>';
  }
}

function clipboard(text){
  return '<div class="clipboard" onclick="alert(\'Werkt nog niet!\');" title="'+text+'"></div>';
}
const renderCurrency = (currency,id,type) => amount => {
  const e = document.getElementById(id);
  if(e){
    if(type==='currency'){
      e.innerHTML = amount+'&nbsp;'+currency;
    }else{
      e.innerHTML = '('+amount+'&nbsp;'+currencySelector(currency)+')';
    }
  }
}

const currencies = ['USD','EUR'];

const handleCurrencies = currency=> list => {
  currencies.splice.apply(currencies, [0,currencies.length].concat(list));
  const currencySelectors = document.getElementsByClassName('currencySelector');
  for (let i = 0; i < currencySelectors.length; i++) {
    currencySelectors[i].innerHTML = currencySelector(currency)
  }
}

function currencySelector(currency){
  let r= '<select class="currencySelector" onchange="window.location = updateParameter(\'currency\',event.target.options[event.target.selectedIndex].value)">';
  for(let i=0; i<currencies.length;++i){
    if(currency===currencies[i]){
      r+='<option SELECTED>'+currencies[i]+'</option>';
    }else{
      r+='<option>'+currencies[i]+'</option>';
    }
  }
  return r+'</select>';
}

const failCurrency = (currency,id,type) => error => {
  const e = document.getElementById(id);
  if(e){
    e.classList.add('error');
    if(type==='currency'){
      e.innerHTML = '?&nbsp;'+currency;
    }else{
      e.innerHTML = '(?&nbsp;'+currencySelector(currency)+')';
    }
  }
}

const progressCurrency = (currency,id,type) => amount => {
  const e = document.getElementById(id);
  if(e){
    if(type==='currency'){
      if(e.innerHTML==='(...&nbsp;'+currency+')'){  e.innerHTML='(.&nbsp;&nbsp;&nbsp;'+currency+')';}
      else if(e.innerHTML==='(..&nbsp;&nbsp;'+currency+')'){  e.innerHTML='(...&nbsp;'+currency+')';}
      else if(e.innerHTML==='(.&nbsp;&nbsp;&nbsp;'+currency+')'){  e.innerHTML='(..&nbsp;&nbsp;'+currency+')';}
    }else{
      if(e.innerHTML==='...&nbsp;'+currency+''){  e.innerHTML='.&nbsp;&nbsp;&nbsp;'+currency+'';}
      else if(e.innerHTML==='..&nbsp;&nbsp;'+currency+''){  e.innerHTML='...&nbsp;'+currency+'';}
      else if(e.innerHTML==='.&nbsp;&nbsp;&nbsp;'+currency+''){  e.innerHTML='..&nbsp;&nbsp;'+currency+'';}
    }
  }
}

const renderAmount = (amount,symbol,currency,type) => {
  currency=currency||'USD';
  if(typeof type==='undefined' || type === 'both'){
    const id = Math.floor(Math.random()*100000)
    request('/e/valuations/rate/'+symbol+'/'+currency+'/'+amount,renderCurrency(currency,id,type),failCurrency(currency,id,type),progressCurrency(currency,id,type));
    return amount+'&nbsp;'+symbol+'&nbsp;<span id="'+id+'">(...&nbsp;'+currency+')</span>';
  }else if (type==='amount'){
    return amount+'&nbsp;'+symbol;
  }else if (type==='currency'){
    const id = Math.floor(Math.random()*100000)
    request('/e/valuations/rate/'+symbol+'/'+currency+'/'+amount,renderCurrency(currency,id,type),failCurrency(currency,id,type),progressCurrency(currency,id,type));
    return '&nbsp;<span id="'+id+'">...&nbsp;'+currency+'</span>';
  }
};

const renderBalance = (symbol,currency) => balance => {
  const e = document.getElementById('balance');
  e.innerHTML=renderAmount(balance,symbol,currency,'both');
};

const renderTransactionRow = (symbol,transactionId,address,currency) => transaction => {
  const e = document.getElementById(transactionId);
  e.cells[1].innerHTML=prettyTime(transaction.timestamp);
  const to = address===transaction.source;

  if(transaction.source===transaction.target){
    e.cells[2].innerHTML='self';
  } else if(to){
    e.cells[2].innerHTML='<a href="?symbol='+symbol+'&address='+transaction.target+'">'+transaction.target+'</a>'+clipboard(transaction.target);
    e.cells[2].style.fontFamily='monospace';
  }else{
    e.cells[2].innerHTML='<a href="?symbol='+symbol+'&address='+transaction.source+'">'+transaction.source+'</a>'+clipboard(transaction.source);
    e.cells[2].style.fontFamily='monospace';
  }

  if(Number(transaction.amount)===0 || transaction.source===transaction.target ){
    e.cells[3].innerHTML=renderAmount(transaction.amount,symbol,currency,'amount');
    e.cells[3].style.color='black';
    e.cells[4].innerHTML=renderAmount(transaction.amount,symbol,currency,'currency');
    e.cells[4].style.color='black';
  }else{
    e.cells[3].innerHTML=(to?'-':'')+renderAmount(transaction.amount,symbol,currency,'amount');
    e.cells[3].style.color = to?'red':'green';
    e.cells[4].innerHTML=(to?'-':'')+renderAmount(transaction.amount,symbol,currency,'currency');
    e.cells[4].style.color = to?'red':'green';
  }
  e.cells[3].style.textAlign='right';
  e.cells[4].style.textAlign='right';
  e.cells[5].innerHTML = confirmed(transaction.confirmed)
}
const failTransactionRow = (symbol,transactionId,address) => transaction => {
  const e = document.getElementById(transactionId);
  e.classList.add('error'); // TODO retry button?
}

const progressTransactionRow = (symbol,transactionId,address) => transaction => {
  const e = document.getElementById(transactionId);
  let dots = e.cells[1].innerHTML;
  if(dots==='...'){dots='.&nbsp;&nbsp;';}
  else if(dots==='..&nbsp;'){dots='...';}
  else if(dots==='.&nbsp;&nbsp;'){dots='..&nbsp;';}
  e.cells[1].innerHTML=dots;
  e.cells[2].innerHTML=dots;
  e.cells[3].innerHTML=dots;
  e.cells[4].innerHTML=dots;
  e.cells[5].innerHTML=dots;
}


const renderMessage= (symbol,transactionId) => message => {
  const e = document.getElementById('transaction');
  e.rows[6].cells[1].innerHTML=message;
}

const renderTransaction = (symbol,transactionId,currency) => transaction => {
  const e = document.getElementById('transaction');
  e.rows[0].cells[1].innerHTML=prettyTime(transaction.timestamp);
  e.rows[1].cells[1].innerHTML=`<a href="?symbol=${symbol}&address=${transaction.source}">${transaction.source}</a>${clipboard(transaction.source)}`;
  e.rows[2].cells[1].innerHTML=`<a href="?symbol=${symbol}&address=${transaction.target}">${transaction.target}</a>${clipboard(transaction.target)}`;
  e.rows[3].cells[1].innerHTML= renderAmount(transaction.amount,symbol,currency);
  e.rows[4].cells[1].innerHTML= renderAmount(transaction.fee,transaction['fee-symbol'],currency);
  if(transaction.confirmed===1){
    e.rows[5].cells[1].innerHTML=`${confirmed(transaction.confirmed)}`+'&nbsp;'+transaction.confirmed+'&nbsp;confirmation'
  }else if(transaction.confirmed===true){
    e.rows[5].cells[1].innerHTML=`${confirmed(transaction.confirmed)}`;
  }else if(!isNaN(transaction.confirmed)){
    e.rows[5].cells[1].innerHTML=`${confirmed(transaction.confirmed)}`+'&nbsp;'+transaction.confirmed+'&nbsp;confirmations'
  }else{
    e.rows[5].cells[1].innerHTML=`${confirmed(transaction.confirmed)}`;
  }
}

const renderHistory = (symbol,address, page,currency) => history => {
  const e = document.getElementById('history');
  for(let i=0;i<history.length;++i){
    const transactionId = history[i];
    e.innerHTML+='<tr id="'+transactionId+'"><td class="transactionId"><a title="'+transactionId+'" href="?symbol='+symbol+'&transactionId='+transactionId+'">'+transactionId+'</a></td><td>...</td><td>...</td><td>...</td><td>...</td><td>...</td><tr>';
    request('/a/'+symbol+'/transaction/'+transactionId,renderTransactionRow(symbol,transactionId,address,currency),failTransactionRow(symbol,transactionId,address),progressTransactionRow(symbol,transactionId,address));
  }
};

function switchToResultMode(){
  document.getElementById('searchWrapper').classList.remove('no-result');
  document.getElementById('result').classList.remove('no-result');
  document.getElementById('logo').classList.remove('no-result');
  document.getElementById('symbols').style.display='none';
}

const handleTransaction= (symbol,transactionId,currency) => {
  switchToResultMode();
  setParameter('transactionId',transactionId);
  const e = document.getElementById('result');
    e.innerHTML =`<h2>Transaction: ${transactionId}${clipboard(transactionId)}</h2><br/>
<table id="transaction">
<tr><td>Time</td><td>...</td></tr>
<tr><td>From</td><td>...</td></tr>
<tr><td>To</td><td>...</td></tr>
<tr><td>Amount</td><td>...</td></tr>
<tr><td>Fee</td><td>...</td></tr>
<tr><td>Confirmed</td><td>...</td></tr>
<tr><td>Message</td><td>...</td></tr>
</table>
`;
  request('/a/'+symbol+'/transaction/'+transactionId,renderTransaction(symbol,transactionId,currency),fail);
  request('/a/'+symbol+'/message/'+transactionId,renderMessage(symbol,transactionId),fail);
}

const fail = err => {
  switchToResultMode();
  const e = document.getElementById('result');
  e.innerHTML=e.innerHTML+'<div class="error">'+err+'</div>';
}

const handleAddress = (symbol,address,page,currency)=>{
  if(isNaN(page) || page===0){
    page=1;
  }
  setParameter('symbol',symbol);
  setParameter('address',address);
  setParameter('page',page);
  switchToResultMode();
  const e = document.getElementById('result');
  e.innerHTML = `
<h2>Address: ${address}${clipboard(address)}</h2>
<table id="history">
<tr><td colspan="6">Balance&nbsp;<span id="balance">...</span></td></tr>

<tr><td colspan="6"><br/>Transaction History</td></tr>

<tr class="header"><td class="transactionId">id</td><td>Time</td><td>From/To</td><td>Amount</td><td>${currencySelector(currency)}</td><td></td><tr>
</table>`;
  for(let p=1;p<=page+1;++p){
    if(page===p){
      e.innerHTML+='<span class="current page">'+p+'</span>';
    }else{
      e.innerHTML+='<span class="page"><a href="'+updateParameter('page',p)+'">'+p+'</a></span>';
    }
  }
  request('/a/'+symbol+'/balance/'+address,renderBalance(symbol,currency),fail);
  request('/a/'+symbol+'/history/'+address+'/10/'+(page-1)*10,renderHistory(symbol,address,page,currency),fail);
}

const handleQuery = (symbol,query,currency) => data =>{
  query=query.trim();
  if(data==='valid'){
    handleAddress(symbol,query,1,currency);
  }else if(data === 'invalid'){
    handleTransaction(symbol,query);
  }else{
    fail('Could not determine whether query "'+query+'" was a a valid address.')
  }
};

function progressFind(){
  const e = document.getElementById('result');
  if(e.innerHTML==='...'){
    e.innerHTML='.';
  }else   if(e.innerHTML==='.'){
    e.innerHTML='..';
  }else{
    e.innerHTML='...';
  }
}

function find(symbol,query,currency){
  query=query.trim();
  if(query==='transaction:sample'||query==='tx:sample'){
    request('/a/'+symbol+'/sample/',sample=>handleTransaction(symbol,sample.transaction,currency),fail,progressFind);
  }else if(query==='address:sample'){
    request('/a/'+symbol+'/sample/',sample=>handleAddress(symbol,sample.address,1,currency),fail,progressFind);
  }else{
    request('/a/'+symbol+'/validate/'+query,handleQuery(symbol,query,currency),fail);
  }
}

function go(){
  switchToResultMode();
  const e = document.getElementById("symbol");
  const symbol = e.value;
  const query = document.getElementById('query').value;
  const currency = getParameter('currency')||'USD'; //TOOD cookie
  find(symbol,query,currency);
}

function updateParameter(key,value){
  key = encodeURI(key); value = encodeURI(value);

  var kvp = document.location.search.substr(1).split('&');

  var i=kvp.length; var x; while(i--)
  {
    x = kvp[i].split('=');

    if (x[0]==key)
    {
      x[1] = value;
      kvp[i] = x.join('=');
      break;
    }
  }

  if(i<0) {kvp[kvp.length] = [key,value].join('=');}
  return window.location.protocol + "//" + window.location.host + window.location.pathname + '?'+kvp.join('&');
}

function setParameter(key, value)
{
  const newurl = updateParameter(key,value)
  window.history.pushState({ path: newurl }, '', newurl);
}

function getParameter(parameterName) {
  var result = null,
      tmp = [];
  location.search
    .substr(1)
    .split("&")
    .forEach(function (item) {
      tmp = item.split("=");
      if (tmp[0] === parameterName) result = decodeURIComponent(tmp[1]);
    });
  return result;
}

function validateQuery(){
  const e = document.getElementById("symbol");
  const symbol = e.value;
  const query = document.getElementById('query').value;
  if(symbol!=='...' & query !==''){
    document.getElementById('go').disabled=false
  }else{
    document.getElementById('go').disabled=true
  }
}

function validateSymbol(){
  showSymbols()
  validateQuery();
}

const  handleAssets = currency => (assets) => {

//  const e = document.getElementById("symbol");
  const symbols = document.getElementById("symbols");
  for(let symbol in assets){
  /*  const option = document.createElement("option");
    option.value = symbol;
    option.text = symbol+' ('+assets[symbol].split('(')[0]+')';
    e.add(option);*/
    symbols.innerHTML+='<div class="symbol" onclick="selectSymbol(\''+symbol+'\')">'+assets[symbol].split('(')[0]+'&nbsp;('+symbol+')</div>'
  }

  const symbol = getParameter('symbol');
  const address = getParameter('address');
  const transactionId = getParameter('transactionId');
  const query = document.getElementById('query');
  const page = Number(getParameter('page'));

  if(symbol && !assets.hasOwnProperty(symbol)){
    fail('Could not find symbol '+symbol);
    return
  }

  if(symbol && address){
    query.value=address;
    handleAddress(symbol,address,page,currency);
  }else if(symbol && transactionId){
    query.value=transactionId;
    handleTransaction(symbol,transactionId,currency);
  }
}

function selectSymbol(selectedSymbol){
  const symbols = document.getElementById("symbols");
  const symbol = document.getElementById("symbol");
  symbol.value=selectedSymbol;
  symbols.style.display='none';
}

function showSymbols(){
  const symbols = document.getElementById("symbols");
  const symbol = document.getElementById("symbol");
  const rect = symbol.getBoundingClientRect();
  const filter = symbol.value;

    const children = symbols.childNodes;
    children.forEach(function(item){
      if(filter!=='' && item.innerHTML.toLowerCase().indexOf(symbol.value.toLowerCase())===-1){
        item.style.display='none';
      }else{
        item.style.display='block';
      }
    });

  symbols.style.display='block';
}

function onLoad(){
  const currency = getParameter('currency')||'USD'; //TODO or cookie

  request('/list/asset/names',handleAssets(currency),fail)
  request('/engine/valuations/list',handleCurrencies(currency),fail)
}

function onKeyUp(event){
  if(event.keyCode === 13 && !document.getElementById('go').disabled){
    go();
  }
}
