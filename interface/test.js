const knownIssues = {

  bch_seedSign: {message:"Not yet functioning. Perhaps funds missing for test", link:""},
  bch_seedSignHash: {message:"Not yet functioning. Perhaps funds missing for test", link:""},

  btc_seedSignHash: {message:"Signing still holds a dynamic componement", link:""},

  burst_seedUnspent: {message:"Not yet functioning. Perhaps funds missing for test", link:""},
  burst_seedSign: {message:"Not yet functioning. Perhaps funds missing for test", link:""},
  burst_seedSignHash: {message:"Not yet functioning. Perhaps funds missing for test / Signing still holds a dynamic componement", link:""},

  'dash_seedSign': {message:"Unstable host. Should work", link:""},
  'dash_seedSignHash': {message:"Unstable host. Should work", link:""},
  dash_sampleHistory: {message:"Unstable host. Should work", link:""},

  dgb_sampleHistory: {message:"Not yet functioning", link:""},
  'dgb_seedSign': {message:"Not yet functioning. Perhaps funds missing for test", link:""},
  'dgb_seedSignHash': {message:"Not yet functioning. Perhaps funds missing for test", link:""},

  etc_sampleHistory: {message:"Not yet functioning", link:"https://gitlab.com/hybrix/hybrixd/node/issues/699"},
  //  etc_sampleTransaction: {message:"Not yet functioning", link:""},
  'eth.xhy_sampleHistory':{message: "Eth token history not yet supported", link:"https://gitlab.com/hybrix/hybrixd/node/issues/701"},
  exp_sampleHistory: {message:"Not yet functioning", link:""},

  flo_seedSign:{message: "Not yet functioning. Perhaps funds missing for test", link:""},
  flo_seedSignHash: {message:"Not yet functioning. Perhaps funds missing for test", link:""},

  nxt_seedSignHash: {message:"Signing still holds a dynamic componement", link:""},
  'nxt.xhy_seedSignHash': {message:"Signing still holds a dynamic componement", link:""},

  omni_seedSignHash:{message: "Not yet functioning. Perhaps funds missing for test", link:""},
  'omni.xhy_seedSignHash': {message:"Not yet functioning. Perhaps funds missing for test", link:""},



  ubq_sampleHistory: {message:"Not yet functioning", link:"https://gitlab.com/hybrix/hybrixd/node/issues/697"},
  rise_sampleTransaction: {message:"Not yet functioning", link:"https://gitlab.com/hybrix/hybrixd/node/issues/703"},
  shift_sampleTransaction: {message:"Not yet functioning", link:"https://gitlab.com/hybrix/hybrixd/node/issues/704"},

  xcp_seedSignHash: {message:"Signing still holds a dynamic componement", link:""},
  'xcp.xhy_seedSignHash': {message:"Signing still holds a dynamic componement", link:""},

  xcp_sampleTransaction:  {message:"Missing data for source,dest,amount, fee", link:"https://gitlab.com/hybrix/hybrixd/node/issues/705"},
  'xcp.xhy_sampleTransaction':  {message:"Missing data for source,dest,amount, fee", link:"https://gitlab.com/hybrix/hybrixd/node/issues/705"},
  xrp_seedSignHash:{message: "Signing still holds a dynamic componement", link:""},
  'zec_seedSign': {message:"Not yet functioning. Perhaps funds missing for test", link:""},
  'zec_seedSignHash': {message:"Not yet functioning. Perhaps funds missing for test", link:""},
  zec_sampleHistory: {message:"Unstable", link:"https://gitlab.com/hybrix/hybrixd/node/issues/702"}


};



let ProgressBar;

const DEFAULT_AMOUNT = 0.00001;


function makeProgressBar (title) {
  bar = new ProgressBar(' [.] ' + title + ': [:bar] :percent, eta: :etas', {
    complete: '▓',
    incomplete: '░',
    width: 76 - title.length,
    total: 100
  });
}

function getParameterByName (name, url) {
  if (!url) url = window.location.href;
  name = name.replace(/[[\]]/g, '\\$&');
  let regex = new RegExp('[?&]' + name.toLowerCase() + '(=([^&#]*)|&|#|$)');

  let results = regex.exec(url);
  if (!results) return null;
  if (!results[2]) return '';
  return decodeURIComponent(results[2].replace(/\+/g, ' '));
}

function testAsset (symbol) {
  return { data: [
    {symbol: symbol}, 'addAsset',
    {
      sample: {data: {query: '/asset/' + symbol + '/sample'}, step: 'rout'},
      test: {data: {query: '/asset/' + symbol + '/test'}, step: 'rout'},
      details: {data: {query: '/asset/' + symbol + '/details'}, step: 'rout'},
      address: {data: {symbol: symbol}, step: 'getAddress'},
      publicKey: {data: {symbol: symbol}, step: 'getPublicKey'}
    },
    'parallel',
    (result) => {
      if(typeof result.sample === 'undefined'){result.sample={};}
      if(typeof result.details === 'undefined'){result.details={};}
      if(typeof result.test === 'undefined'){result.test={};}
      return {
        sample: {data: result.sample, step: 'id'},
        test: {data: result.test, step: 'id'},
        details: {data: result.details, step: 'id'},
        address: {data: result.address, step: 'id'},

        sampleValid: {data: {query: '/asset/' + symbol + '/validate/' + result.sample.address}, step: 'rout'},
        sampleBalance: {data: {query: '/asset/' + symbol + '/balance/' + result.sample.address}, step: 'rout'},
        sampleUnspent: {data: {query: '/asset/' + symbol + '/unspent/' + result.sample.address + '/' + (Number(DEFAULT_AMOUNT) + Number(result.details.fee)) + '/' + result.address + '/' + result.sample.publicKey}, step: 'rout'},
        sampleHistory: {data: {query: '/asset/' + symbol + '/history/' + result.sample.address}, step: 'rout'},
        sampleTransaction: {data: {query: '/asset/' + symbol + '/transaction/' + result.sample.transaction}, step: 'rout'},

        seedValid: {data: {query: '/asset/' + symbol + '/validate/' + result.address}, step: 'rout'},
        seedBalance: {data: {query: '/asset/' + symbol + '/balance/' + result.address}, step: 'rout'},
        seedUnspent: {data: {query: '/asset/' + symbol + '/unspent/' + result.address + '/' + (Number(DEFAULT_AMOUNT) + Number(result.details.fee)) + '/' + result.sample.address + '/' + result.publicKey}, step: 'rout'}
        // seedHistory: {data: {query: '/asset/' + symbol + '/history/' + result.address}, step: 'rout'}
      };
    },
    'parallel',
    result => {
      return {
        test: {data: result.test, step: 'id'},
        sample: {data: result.sample, step: 'id'},
        details: {data: result.details, step: 'id'},
        sampleValid: {data: result.sampleValid + ' ' + result.sample.address, step: 'id'},
        sampleBalance: {data: result.sampleBalance, step: 'id'},
        sampleUnspent: {data: result.sampleUnspent, step: 'id'},
        sampleHistory: {data: result.sampleHistory, step: 'id'},
        sampleTransaction: {data: result.sampleTransaction, step: 'id'},

        seedValid: {data: result.seedValid + ' ' + result.address, step: 'id'},
        seedBalance: {data: result.seedBalance, step: 'id'},
        seedUnspent: {data: result.seedUnspent, step: 'id'},
        seedSign: {data: {symbol: symbol, amount: DEFAULT_AMOUNT, target: result.sample.address, validate:false, unspent:result.test.hasOwnProperty('unspent')?result.test.unspent:result.seedUnspent, time: result.test.time}, step: 'rawTransaction'}
        // seedHistory: {data: result.seedHistory, step: 'id'},
      };
    },
    'parallel',
    result => {
      return {
        test: {data: result.test, step: 'id'},
        sample: {data: result.sample, step: 'id'},
        details: {data: result.details, step: 'id'},
        sampleValid:{data: result.sampleValid, step: 'id'},
        sampleBalance: {data: result.sampleBalance, step: 'id'},
        sampleUnspent: {data: result.sampleUnspent, step: 'id'},
        sampleHistory: {data: result.sampleHistory, step: 'id'},
        sampleTransaction: {data: result.sampleTransaction, step: 'id'},

        seedValid: {data: result.seedValid, step: 'id'},
        seedBalance: {data: result.seedBalance, step: 'id'},
        seedUnspent: {data: result.seedUnspent, step: 'id'},
        seedSign:  {data: result.seedSign, step: 'id'},
        seedSignHash: {data: {data:result.seedSign}, step: 'hash'}
        // seedHistory: {data: result.seedHistory, step: 'id'},
      };
    },
    'parallel'
  ],
           step: 'sequential'
         };
}

let validDetails = details => typeof details === 'object' && details !== null && details.hasOwnProperty('symbol') && details.hasOwnProperty('name') && details.hasOwnProperty('fee') && details.hasOwnProperty('factor')&& details.hasOwnProperty('contract')&& details.hasOwnProperty('mode')&& details.hasOwnProperty('fee-symbol')&& details.hasOwnProperty('fee-factor')&& details.hasOwnProperty('keygen-base');
let validValid = valid => typeof valid === 'string' && valid.startsWith('valid');
let validBalance = (balance, factor) => typeof balance !== 'undefined' && balance !== null && !isNaN(balance) && balance.toString().indexOf('.') !== -1 && balance.toString().split('.')[1].length === Number(factor);
let validUnspent = unspent => typeof unspent !== 'undefined' && unspent !== null;
let validHistory = history => typeof history === 'object' && history !== null;
let validSample = sample => typeof sample === 'object' && sample !== null && sample.hasOwnProperty('address')&& sample.hasOwnProperty('transaction');

let validTransaction = transaction => typeof transaction === 'object' && transaction !== null  && transaction.hasOwnProperty('id')  && transaction.hasOwnProperty('timestamp') && transaction.hasOwnProperty('amount')   && transaction.hasOwnProperty('symbol')  && transaction.hasOwnProperty('fee')  && transaction.hasOwnProperty('fee-symbol')  && transaction.hasOwnProperty('source') && transaction.hasOwnProperty('target')  && transaction.hasOwnProperty('confirmed') ;
let validSign = sign => typeof sign === 'string';
let validSignHash = (signHash,testHash) => signHash===testHash || (testHash=='dynamic' && signHash!=='00000000');

let renderCellCLI = (symbol,type,valid, data, counter, messages,newMessages) => {
  let title;
  if (typeof data === 'object') {
    title = JSON.stringify(data);
  } else {
    title = String(data);
  }
  title = title.replace(/"/g, '');
  if(knownIssues.hasOwnProperty(symbol+'_'+type)){
    const issue= knownIssues[symbol+'_'+type]
    if(valid){
      counter.total++;
      counter.valid++;
      if(issue.link){
        messages.push('\033[36m'+symbol+ ' '+type+'\033[0m : '+issue.message);
      }else{
        messages.push('\033[36m'+symbol+ ' '+type+'\033[0m : '+issue.message+ ' \033[31m [Create issue]\033[0m');
      }
      return '\033[36m OK \033[0m';
    }else{
      if(issue.link){
        messages.push('\033[33m'+symbol+ ' '+type+'\033[0m : '+issue.message);
      }else{
        messages.push('\033[33m'+symbol+ ' '+type+'\033[0m : '+issue.message+ ' \033[31m [Create issue]\033[0m');
      }
      return '\033[33mWARN\033[0m';
    }
  } else if (valid) {
    counter.total++;
    counter.valid++;
    return '\033[32m OK \033[0m';
  } else {
    newMessages.push('\033[31m'+symbol+ ' '+type+'\033[0m : returned '+title+' \033[31m [Create issue]\033[0m');
    counter.total++;
    return '\033[31mFAIL\033[0m';
  }
};

function issueLink(symbol,type,issue){

  return `https://gitlab.com/hybrix/hybrixd/node/issues/new?issue[description]=${encodeURIComponent('/label ~"\\* Development Team \\*"\n/milestone %"Coin support : Test Issues"\n')}&issue[title]=${encodeURIComponent(symbol+ ' '+type+' '+(issue?issue.message:''))} `
}

let renderCellWeb = (symbol,type,valid, data, counter, messages, newMessages) => {
  let title;
  if (typeof data === 'object') {
    title = JSON.stringify(data);
  } else {
    title = String(data);
  }
  title = title.replace(/"/g, '');
  if(knownIssues.hasOwnProperty(symbol+'_'+type)){
    if(valid){
      counter.total++;
      counter.valid++;

      const issue= knownIssues[symbol+'_'+type]
      if(issue.link){
        messages.push('<b style="color:purple;">'+symbol+ ' '+type+'</b> : <a  name="'+symbol+'_'+type+'" target="_blank" href="'+issue.link+'">'+issue.message+'</a>');
      }else{
        messages.push('<b style="color:purple;">'+symbol+ ' '+type+'</b> : <a name="'+symbol+'_'+type+'">'+issue.message+' </a><a style="color:red;"target="_blank" href="'+issueLink(symbol,type,issue)+'"><b>Create issue</b></a>');
      }


      return '<td style="text-align:center;background-color:purple" title="' + title + '"><a style="text-decoration:none; width: 100%;height: 100%;display: block;" href="#'+symbol+'_'+type+'">&nbsp;</a></td>';

    }else{
      const issue= knownIssues[symbol+'_'+type]
      if(issue.link){
        messages.push('<b style="color:orange;">'+symbol+ ' '+type+'</b> : <a  name="'+symbol+'_'+type+'" target="_blank" href="'+issue.link+'">'+issue.message+'</a>');
      }else{
        messages.push('<b style="color:orange;">'+symbol+ ' '+type+'</b> : <a name="'+symbol+'_'+type+'">'+issue.message+' </a><a style="color:red;"target="_blank" href="'+issueLink(symbol,type,issue)+'"><b>Create issue</b></a>');
      }
      return '<td style="text-align:center;background-color:orange" title="' + title + '"><a style="text-decoration:none; width: 100%;height: 100%;display: block;" href="#'+symbol+'_'+type+'">&nbsp;</a></td>';
    }
  } else if (valid) {
    counter.total++;
    counter.valid++;
    return '<td style="text-align:center;background-color:green" title="' + title + '">&nbsp;</td>';
  } else {

    newMessages.push('<b style="color:red;">'+symbol+ ' '+type+'</b> : returned '+title+' <a  name="'+symbol+'_'+type+'" style="color:red;"target="_blank" href="'+issueLink(symbol,type)+'"><b>Create issue</b></a>');

    counter.total++;
    return '<td style="text-align:center;background-color:red"  title="' + title + '"><a style="text-decoration:none; width: 100%;height: 100%;display: block;" href="#'+symbol+'_'+type+'">&nbsp;</a></td>';
  }
};



let renderCellXML = (symbol,type,valid, data, counter, messages,newMessages) => {
  let title;
  if (typeof data === 'object') {
    title = JSON.stringify(data);
  } else {
    title = String(data);
  }
  title = title.replace(/"/g, '\\"');

  let r =  `<testcase id="${symbol+'_'+type}" name="${symbol+' '+type}" time="0.001">`
  if (valid) {
    counter.total++;
    counter.valid++;
  }else{
    counter.total++;
    r+=`<failure message="${title}" type="ERROR"></failure>`
  }

  r+=`</testcase>`
  return r;
};


let renderTableXML = (unorderdedData) => {
  const data = {};
  Object.keys(unorderdedData).sort().forEach(function(key) {
    data[key] = unorderdedData[key];
  });

  let counter = {valid: 0, total: 0};
  const messages = [];
  const newMessages = [];

  let r='';
  for (let symbol in data) {

    if (typeof data[symbol] !== 'undefined') {
      r += renderCellXML(symbol,'details',validDetails(data[symbol].details), data[symbol].details, counter, messages,newMessages);
      r += renderCellXML(symbol,'sample',validSample(data[symbol].sample), data[symbol].sample, counter, messages,newMessages);
      r += renderCellXML(symbol,'sampleValid',validValid(data[symbol].sampleValid), data[symbol].sampleValid, counter, messages,newMessages);
      r += renderCellXML(symbol,'sampleBalance',validBalance(data[symbol].sampleBalance, data[symbol].details.factor), data[symbol].sampleBalance, counter, messages,newMessages);
      r += renderCellXML(symbol,'sampleUnspent',validUnspent(data[symbol].sampleUnspent), data[symbol].sampleUnspent, counter, messages,newMessages);
      r += renderCellXML(symbol,'sampleHistory',validHistory(data[symbol].sampleHistory), data[symbol].sampleHistory, counter, messages,newMessages);
      r += renderCellXML(symbol,'sampleTransaction',validTransaction(data[symbol].sampleTransaction), data[symbol].sampleTransaction, counter, messages,newMessages);
      r += renderCellXML(symbol,'seedValid',validValid(data[symbol].seedValid), data[symbol].seedValid, counter, messages,newMessages);
      r += renderCellXML(symbol,'seedBalance',validBalance(data[symbol].seedBalance, data[symbol].details.factor), data[symbol].seedBalance, counter, messages,newMessages);
      r += renderCellXML(symbol,'seedUnspent',validUnspent(data[symbol].seedUnspent), data[symbol].seedUnspent, counter, messages,newMessages);
      //      r += renderCellXML(symbol,validHistory(data[symbol].seedHistory), data[symbol].seedHistory, counter, messages,newMessages);
      r += renderCellXML(symbol,'seedSign',validSign(data[symbol].seedSign), data[symbol].seedSign, counter, messages,newMessages);
      r += renderCellXML(symbol,'seedSignHash',validSignHash(data[symbol].seedSignHash,data[symbol].test.hash), data[symbol].seedSignHash+"|"+data[symbol].test.hash, counter, messages,newMessages);
    } else {

      r+= `<testcase id="${symbol}" name="${symbol}" time="0.001">
<failure message="Complete failure for ${symbol}" type="FATAL ERROR"></failure>
</testcase>`
      counter.total+=11;
    }

  }
  r='<?xml version="1.0" encoding="UTF-8" ?><testsuites id="hybrix" name="hybrix" tests="'+counter.total+'" failures="'+(counter.total-counter.valid)+'" time="0.001"><testsuite id="testsuite.hybrix" name="hybrix" tests="'+counter.total+'" failures="'+(counter.total-counter.valid)+'" time="0.001">'+r;
  r+='</testsuite></testsuites>';

  return r;
}


let renderTableCLI = (unorderdedData) => {
  const data = {};
  Object.keys(unorderdedData).sort().forEach(function(key) {
    data[key] = unorderdedData[key];
  });
  let counter = {valid: 0, total: 0};
  const messages = [];
  const newMessages = [];
  let r = '\n';
  r += '   #   SAMPLE                                    GENERATED                    ' + '\n';
  r += '      ┌──────┬─────┬────┬──────┬──────┬────┬────┬────┬──────┬──────┬────┬────┐' + '\n';
  r += '      │Detail│Sampl│Vald│Balnce│Unspnt│Hist│Tran│Vald│Balnce│Unspnt│Sign│Hash│' + '\n';
  for (let symbol in data) {
    r += '      ├──────┼─────┼────┼──────┼──────┼────┼────┼────┼──────┼──────┼────┼────┤' + '\n';
    r += symbol.substr(0, 5) + '     '.substr(0, 5 - symbol.length) + ' │';
    if (typeof data[symbol] !== 'undefined') {
      r += ' ' + renderCellCLI(symbol,'details',validDetails(data[symbol].details), data[symbol].details, counter, messages,newMessages) + ' │';
      r +=       renderCellCLI(symbol,'sample',validSample(data[symbol].sample), data[symbol].sample, counter, messages,newMessages) + ' │';
      r +=       renderCellCLI(symbol,'sampleValid',validValid(data[symbol].sampleValid), data[symbol].sampleValid, counter, messages,newMessages) + '│';
      r += ' ' + renderCellCLI(symbol,'sampleBalance',validBalance(data[symbol].sampleBalance, data[symbol].details.factor), data[symbol].sampleBalance, counter, messages,newMessages) + ' │';
      r += ' ' + renderCellCLI(symbol,'sampleUnspent',validUnspent(data[symbol].sampleUnspent), data[symbol].sampleUnspent, counter, messages,newMessages) + ' │';
      r +=       renderCellCLI(symbol,'sampleHistory',validHistory(data[symbol].sampleHistory), data[symbol].sampleHistory, counter, messages,newMessages) + '│';
      r +=       renderCellCLI(symbol,'sampleTransaction',validTransaction(data[symbol].sampleTransaction), data[symbol].sampleTransaction, counter, messages,newMessages) + '│';
      r +=       renderCellCLI(symbol,'seedValid',validValid(data[symbol].seedValid), data[symbol].seedValid, counter, messages,newMessages) + '│';
      r += ' ' + renderCellCLI(symbol,'seedBalance',validBalance(data[symbol].seedBalance, data[symbol].details.factor), data[symbol].seedBalance, counter, messages,newMessages) + ' │';
      r += ' ' + renderCellCLI(symbol,'seedUnspent',validUnspent(data[symbol].seedUnspent), data[symbol].seedUnspent, counter, messages,newMessages) + ' │';
      //      r += renderCellCLI(symbol,validHistory(data[symbol].seedHistory), data[symbol].seedHistory, counter, messages,newMessages) + '│';
      r +=       renderCellCLI(symbol,'seedSign',validSign(data[symbol].seedSign), data[symbol].seedSign, counter, messages,newMessages) + '│';
      r +=       renderCellCLI(symbol,'seedSignHash',validSignHash(data[symbol].seedSignHash,data[symbol].test.hash), data[symbol].seedSignHash+"|"+data[symbol].test.hash, counter, messages,newMessages)+'│';
      r += '\n';
    } else {
      counter.total+=11;
      r += ' \033[31mFAIL\033[0m │\033[31mFAIL\033[0m │\033[31mFAIL\033[0m│ \033[31mFAIL\033[0m │ \033[31mFAIL\033[0m │\033[31mFAIL\033[0m│\033[31mFAIL\033[0m│\033[31mFAIL\033[0m│ \033[31mFAIL\033[0m │ \033[31mFAIL\033[0m │\033[31mFAIL\033[0m│\033[31mFAIL\033[0m│ !' + '\n';
    }
  }
  r += '      └──────┴─────┴────┴──────┴──────┴────┴────┴────┴──────┴──────┴────┴────┘' + '\n';
  r += '\n';
  r += 'New Issues:\n';
  newMessages.sort();
  for (let i =0;i<newMessages.length;++i) {
    r+= ' - '+newMessages[i]+'\n';
  }
  r += '\n';
  r += 'Known Issues:\n';
  messages.sort();
  for (let i =0;i<messages.length;++i) {
    r+= ' - '+messages[i]+'\n';
  }
  r += '\n';
  r += '      SUCCESS RATE: ' + Math.floor(((counter.valid / counter.total) || 0) * 100) + '%' + '\n';
  return r;
}

let renderTableWeb = (unorderdedData) => {
  const data = {};
  Object.keys(unorderdedData).sort().forEach(function(key) {
    data[key] = unorderdedData[key];
  });

  let counter = {valid: 0, total: 0};
  const messages = [];
  const newMessages = [];
  let r = `
<style>
:target {
 background-color: yellow;
}
</style>
<table><tr><td>Symbol</td><td colspan="2"></td><td colspan="6" style="text-align:center;">Sample</td><td colspan="5"  style="text-align:center;">Generated</td></tr>`;
  r += '<tr><td></td><td>Details</td><td>Sample</td><td>Valid</td><td>Balance</td><td>Unspent</td>';
  r+='<td>History</td>';
  r+='<td>Transaction</td>';
  r += '<td>Valid</td><td>Balance</td><td>Unspent</td>';
  // r+='<td>History</td>'
  r += '<td>Sign</td><td>Hash</td></tr>';
  for (let symbol in data) {
    r += '<tr>';
    r += '<td>' + symbol + '</td>';
    if (typeof data[symbol] !== 'undefined') {
      r += renderCellWeb(symbol,'details',validDetails(data[symbol].details), data[symbol].details, counter, messages,newMessages);
      r += renderCellWeb(symbol,'sample',validSample(data[symbol].sample), data[symbol].sample, counter, messages,newMessages);
      r += renderCellWeb(symbol,'sampleValid',validValid(data[symbol].sampleValid), data[symbol].sampleValid, counter, messages,newMessages);
      r += renderCellWeb(symbol,'sampleBalance',validBalance(data[symbol].sampleBalance, data[symbol].details.factor), data[symbol].sampleBalance, counter, messages,newMessages);
      r += renderCellWeb(symbol,'sampleUnspent',validUnspent(data[symbol].sampleUnspent), data[symbol].sampleUnspent, counter, messages,newMessages);
      r += renderCellWeb(symbol,'sampleHistory',validHistory(data[symbol].sampleHistory), data[symbol].sampleHistory, counter, messages,newMessages);
      r += renderCellWeb(symbol,'sampleTransaction',validTransaction(data[symbol].sampleTransaction), data[symbol].sampleTransaction, counter, messages,newMessages);

      r += renderCellWeb(symbol,'seedValid',validValid(data[symbol].seedValid), data[symbol].seedValid, counter, messages,newMessages);
      r += renderCellWeb(symbol,'seedBalance',validBalance(data[symbol].seedBalance, data[symbol].details.factor), data[symbol].seedBalance, counter, messages,newMessages);
      r += renderCellWeb(symbol,'seedUnspent',validUnspent(data[symbol].seedUnspent), data[symbol].seedUnspent, counter, messages,newMessages);
      r += renderCellWeb(symbol,'seedSign',validSign(data[symbol].seedSign), data[symbol].seedSign, counter, messages,newMessages);
      r += renderCellWeb(symbol,'seedSignHash',validSignHash(data[symbol].seedSignHash,data[symbol].test.hash), data[symbol].seedSignHash+"|"+data[symbol].test.hash, counter, messages,newMessages);
    } else {
      counter.total+=11;
      r += '<td colspan="15" style="background-color:red">Fail</td>';
    }
    r += '</tr>';
  }
  r += '</table>';
  r += '<h3>New Issues</h3>';
  r += '<ul>';
  newMessages.sort();
  for (let i =0;i<newMessages.length;++i) {
    r += '<li>'+newMessages[i]+'</li>';
  }
  r += '</ul>';
  r += '<h3><a href="https://gitlab.com/groups/hybrix/-/issues?milestone_title=Coin+support+%3A+Test+Issues" target="_blank">Known Issues</a></h3>';
  r += '<ul>';
  messages.sort();
  for (let i =0;i<messages.length;++i) {
    r += '<li>'+messages[i]+'</li>';
  }
  r += '</ul>';


  r += '<h1>' + (counter.valid / counter.total * 100) + '%</h1>';
  console.log(data);
  document.body.innerHTML = r;
};

let lastP;

function go (mode) {
  // TODO retrieve all asset
  // TODO filter tokens

  let host = 'http://localhost:1111/';
  let path = '../dist/'
  let hybrix;
  let renderTable;
  let progressCallback;
  let symbolsToTest;
  if (mode === 'node') {
    ProgressBar = require('progress');
    makeProgressBar('test progress');
    progressCallback = progress => {
      if(!ops.quiet){
        if(ops.verbose){
          const s = String(progress*100).split('.')
          let P;
          if(s.length===1){
            P=  s[0]+'.0';
          }else{
            P=  s[0]+'.'+s[1][0];
          }
          if(P!==lastP){
            process.stdout.write(P+'%\r');
            lastP=P;
          }
        }else{
          bar.update(progress);
        }
      }
    };
    // cli options
    const stdio = require('stdio');
    const fs = require('fs');

    // command line options and init
    const ops = stdio.getopt({
      'symbol': {key: 's', args: 1, description: 'Select a symbol or comma separated symbols to run test'},
      'debug': {key: 'd', args: 0, description: 'Output debug messages.'},
      'host': {key: 'h', args: 1, description: 'Set host Defaults to :' + host},
      'path': {key: 'p', args: 1, description: 'Set path for interface files Defaults to :' + path },
      'verbose': {key:'v', args: 0, description: 'Output verbose progress' },
      'quiet': {key: 'q', args: 0, description: 'No extra output other than raw data'},
      'xml': {key: 'x', args: 1, description: 'Write xml test results to file'}
    });
    if (typeof ops.host !== 'undefined') { host = ops.host; }
    symbolsToTest = ops.symbol;
    if(ops.path){ path = ops.path};

    Hybrix = require(path+'/hybrix-lib.nodejs.js');
    hybrix = new Hybrix.Interface({http: require('http'),https: require('https')});
    DEBUG = ops.debug;
    renderTable = data => {
      if(ops.xml){
        fs.writeFileSync(ops.xml,renderTableXML(data));
      }
      console.log(renderTableCLI(data));
    }
  } else {
    symbolsToTest = getParameterByName('symbol');

    hybrix = new Hybrix.Interface({XMLHttpRequest: XMLHttpRequest});
    DEBUG = getParameterByName('debug') === 'true';
    if (getParameterByName('host')) { host = getParameterByName('host'); }

    renderTable = renderTableWeb;
    progressCallback = progress => {
      document.body.innerHTML = '<div style="border-style:solid; border-width:1px; border-radius:10px; height:20px;"><div style="text-align:center;color:white;background-color:blue; border-radius:10px; height:20px; width:' + (progress * 100) + '%">' + Math.floor(progress * 100) + '%</div></div>';
    };
  }

  let tests = {};
  if (symbolsToTest && symbolsToTest!=='*') {
    symbolsToTest = symbolsToTest.split(',');
    for (let i = 0; i < symbolsToTest.length; ++i) {
      tests[symbolsToTest[i]] = testAsset(symbolsToTest[i]);
    }
  } else {
    tests = {
      bch: testAsset('bch'),
      dummy: testAsset('dummy'),
      eth: testAsset('eth'),
      flo: testAsset('flo'),
      ark: testAsset('ark'),
      btc: testAsset('btc'),
      burst: testAsset('burst'),
      dash: testAsset('dash'),
      dgb: testAsset('dgb'),
      etc: testAsset('etc'),
      exp: testAsset('exp'),
      lsk: testAsset('lsk'),
      ltc: testAsset('ltc'),
      nxt: testAsset('nxt'),
      omni: testAsset('omni'),
      rise: testAsset('rise'),
      shift: testAsset('shift'),
      ubq: testAsset('ubq'),
      waves: testAsset('waves'),
      xcp: testAsset('xcp'),
      xem: testAsset('xem'),
      xrp: testAsset('xrp'),
      zec: testAsset('zec'),

      'mock.btc': testAsset('mock.btc'),

      'eth.xhy': testAsset('eth.xhy'),
      'waves.xhy': testAsset('waves.xhy'),
      'nxt.xhy': testAsset('nxt.xhy'),
      'omni.xhy': testAsset('omni.xhy'),
      'xcp.xhy': testAsset('xcp.xhy'),
      'xem.xhy': testAsset('xem.xhy')
      // bts: testAsset('bts'), -> FAUCET, ETC!
      // xel: testAsset('xel'), //-> HOST issues
    };
  }

  hybrix.sequential(
    [
      'init',
      {username: 'POMEW4B5XACN3ZCX', password: 'TVZS7LODA5CSGP6U'}, 'session',
      {host: host}, 'addHost',

      tests,
      'parallel'

    ]
    , renderTable
    , (error) => { console.error(error); }
    , progressCallback

  );
}

/*
 *  Test if browser or nodejs and run go()
 */

if (typeof window === 'undefined') {
  go('node');
}
