/*

icon,qr

implement copy buttons

history: pagination

choose currency

history: smart time stamp (x minutes ago, yesterday, hide year etc)

valid html


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
    return '<span title="Unknown" class="unknown">?</span>';
  }else if(confirmations>0){
    return '<span title="Confirmed ('+confirmations+ ')" class="confirmed">V</span>';
  }else{
    return '<span  title="Unconfirmed" class="unconfirmed">X</span>';
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
      e.innerHTML = '('+amount+'&nbsp;'+currency+')';
    }
  }
}

const failCurrency = (currency,id,type) => amount => {
  const e = document.getElementById(id);
  if(e){
    e.classList.add('error');
    if(type==='currency'){
      e.innerHTML = '(?&nbsp;'+currency+')';
    }else{
      e.innerHTML = '?&nbsp;'+currency+'';
    }
  }
}

const renderAmount = (amount,symbol,currency,type) => {
  currency=currency||'USD';
  if(type==='undefined' || type === 'both'){
    const id = Math.floor(Math.random()*100000)
    request('/e/valuations/rate/'+symbol+'/'+currency+'/'+amount,renderCurrency(currency,id,type),failCurrency(currency,id,type));
    return amount+'&nbsp;'+symbol+'&nbsp;<span id="'+id+'">(...&nbsp;'+currency+')</span>';
  }else if (type==='amount'){
    return amount+'&nbsp;'+symbol;
  }else if (type==='currency'){
    const id = Math.floor(Math.random()*100000)
    request('/e/valuations/rate/'+symbol+'/'+currency+'/'+amount,renderCurrency(currency,id,type),failCurrency(currency,id,type));
    return '&nbsp;<span id="'+id+'">...&nbsp;'+currency+'</span>';
  }
};

const renderBalance = (symbol,currency) => balance => {
  const e = document.getElementById('balance');
  e.innerHTML=renderAmount(balance,symbol,currency);
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
    e.rows[5].cells[1].innerHTML=`${confirmed(transaction.confirmed)}`+'&nbsp;confirmed'
  }else if(!isNaN(transaction.confirmed)){
    e.rows[5].cells[1].innerHTML=`${confirmed(transaction.confirmed)}`+'&nbsp;'+transaction.confirmed+'&nbsp;confirmations'
  }else{
    e.rows[5].cells[1].innerHTML=`${confirmed(transaction.confirmed)}`;
  }
}

const renderHistory = (symbol,address) => history => {
  const e = document.getElementById('history');
  for(let i=0;i<history.length;++i){
    const transactionId = history[i];
    e.innerHTML+='<tr id="'+transactionId+'"><td class="transactionId"><a title="'+transactionId+'" href="?symbol='+symbol+'&transactionId='+transactionId+'">'+transactionId+'</a></td><td>...</td><td>...</td><td>...</td><td>...</td><td>...</td><tr>';
    request('/a/'+symbol+'/transaction/'+transactionId,renderTransactionRow(symbol,transactionId,address),failTransactionRow(symbol,transactionId,address),progressTransactionRow(symbol,transactionId,address));
  }
};

function switchToResultMode(){
  document.getElementById('searchWrapper').classList.remove('no-result');
  document.getElementById('result').classList.remove('no-result');
  document.getElementById('poweredby').classList.remove('no-result');
}

const handleTransaction= (symbol,transactionId) => {
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
  request('/a/'+symbol+'/transaction/'+transactionId,renderTransaction(symbol,transactionId),fail);
  request('/a/'+symbol+'/message/'+transactionId,renderMessage(symbol,transactionId),fail);
}

const fail = err => {
  switchToResultMode();
  const e = document.getElementById('result');
  e.innerHTML='<div class="error">'+err+'</div>'+e.innerHTML;
}

const handleAddress = (symbol,address)=>{
  setParameter('symbol',symbol);
  setParameter('address',address);
  switchToResultMode();
  const e = document.getElementById('result');
  e.innerHTML = `
<h2>Address: ${address}${clipboard(address)}</h2>
<table id="history">
<tr><td colspan="3">Balance:</td><td id="balance">...</td></tr>
<tr class="header"><td class="transactionId">id</td><td>Time</td><td>From/To</td><td>Amount</td><td></td><td> </td><tr>
</table>`;
  request('/a/'+symbol+'/balance/'+address,renderBalance(symbol),fail);
  request('/a/'+symbol+'/history/'+address,renderHistory(symbol,address),fail);
}

const handleQuery = (symbol,query) => data =>{
  query=query.trim();
  if(data==='valid'){
    handleAddress(symbol,query);
  }else if(data === 'invalid'){
    handleTransaction(symbol,query);
  }else{
    fail('Could not determine whether query "'+query+'" was a a valid address.')
  }
};

function find(symbol,query){
  query=query.trim();
  if(query==='transaction:sample'||query==='tx:sample'){
    request('/a/'+symbol+'/sample/',sample=>handleTransaction(symbol,sample.transaction),fail);
  }else if(query==='address:sample'){
    request('/a/'+symbol+'/sample/',sample=>handleAddress(symbol,sample.address),fail);
  }else{
    request('/a/'+symbol+'/validate/'+query,handleQuery(symbol,query),fail);
  }
}

function go(){
  const e = document.getElementById("symbol");
  const symbol = e.options[e.selectedIndex].value;
  const query = document.getElementById('query').value;
  find(symbol,query);
}

function setParameter(key, value)
{
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
  var newurl = window.location.protocol + "//" + window.location.host + window.location.pathname + '?'+kvp.join('&');
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
  const symbol = e.options[e.selectedIndex].value;
  const query = document.getElementById('query').value;
  console.log(symbol,query);
  if(symbol!=='...' & query !==''){
    document.getElementById('go').disabled=false
  }else{
    document.getElementById('go').disabled=true
  }
}

function handleAssets(assets){

  const e = document.getElementById("symbol");
  for(let symbol in assets){
    const option = document.createElement("option");
    option.value = symbol;
    option.text = symbol+' ('+assets[symbol].split('(')[0]+')';
    e.add(option);
  }

  const symbol = getParameter('symbol');
  const address = getParameter('address');
  const transactionId = getParameter('transactionId');
  const query = document.getElementById('query');

  if(symbol){
    let flagFound=false;
    for(let i=0;i<e.options.length;++i){
      if(e.options[i].value===symbol){
        e.options[i].selected=true;

        flagFound=true;
      }
    }
    if(!flagFound){
      fail('Could not find symbol '+symbol);
      return
    }
  }
  if(symbol && address){
    query.value=address;
    handleAddress(symbol,address);
  }else if(symbol && transactionId){
    query.value=transactionId;
    handleTransaction(symbol,transactionId);
  }
}

function onLoad(){
  request('/list/asset/names',handleAssets,fail)
}

function onKeyUp(event){
  if(event.keyCode === 13 && !document.getElementById('go').disabled){
    go();
  }
}
