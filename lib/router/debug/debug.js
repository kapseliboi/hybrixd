/* eslint no-octal-escape: "off"*/


const sortNumeric = (n, m) => {
  if (n === m) return 0;

  const nLabel = n.endsWith('@') ? 1 : 0;
  const mLabel = m.endsWith('@') ? 1 : 0;
  n = n.replace('@', '');
  m = m.replace('@', '');
  if (n === m) return nLabel >= mLabel ? -1 : 1;

  const nSplit = n.split('.');
  const mSplit = m.split('.');
  const nLength = nSplit.length;
  const mLength = mSplit.length;
  const baseLength = Math.min(nLength, mLength);

  const nBase = nSplit.slice(0, baseLength);
  const mBase = mSplit.slice(0, baseLength);

  const getValueByComparison = (n, m) => {
    let equal = true;
    for (let i = 0; i < baseLength; ++i) {
      if (Number(nSplit[i]) < Number(mSplit[i])) { return -1; }
      if (Number(nSplit[i]) > Number(mSplit[i])) { return 1; }
      equal = equal && Number(nSplit[i]) === Number(mSplit[i]);
    }
    if (equal) {
      if (mSplit.length > nSplit.length) {
        return -1;
      }else if (mSplit.length < nSplit.length) {
        return 1;
      } else {
        return nLabel > mLabel ? -1 : 1;
      }
    } else {
      return -1;
    }
  };

  return getValueByComparison(nBase, mBase);
};

const red= '\033[0;31m';
const green= '\033[0;32m';
const blue= '\033[0;34m';
const grey= '\033[0;37m';
const noColor = '\033[0m';

const labelRegex  =/@([\w]+)/g;
const variableRegex = /\$([\w-\[\]{}\.]*)/g
const bold = '\033[1m';

function renderQrtz (type,color, line) {
  if (type === 'html') {
    if (line.startsWith('@')) {
      return `<a class="reference" name="${line.substr(1)}">${line}</a>` ;
    }else if (line.startsWith('#')) {
      return '<span style="color:grey">'+line+'</span>';
    }else if (line.startsWith('/')) {
      return '<b>'+line+'</b>';
    } else {
      const head = line.substr(0, 4);
      return '<b><a class="head" href="../help/qrtz#' + head + '" target="_blank">' + head + '</a></b>' + line.substr(4).replace(labelRegex, (a, b) => ('<a class="reference" href="#' + b + '">@' + b + '</a>')).replace(variableRegex, (a, b) => ('<span class="variable">$' + b + '</span>'));
    }
  } else {

    if (line.startsWith('@') || line.startsWith('/') ) {
      return line;
    } else {
      return bold + line.substr(0, 4) + noColor + color + line.substr(4).replace(labelRegex, (a, b) => (`${green}@${b}${color}`)).replace(variableRegex, (a, b) => (`${blue}\$${b}${color}`));
    }
    return line;
  }
}

const pipe = type => type === 'html' ? '&#9475;' : '┃';
const sideStep = type => type === 'html' ? '&#9507;' : '┣';
const firstStep = type => type === 'html' ? '&#9523;' : '┳';
const endStep = type => type === 'html' ? '&#9495;' : '┗';
const singleStep = type => type === 'html' ? '&#9473;' : '━';
const empty = type => type === 'html' ? '&nbsp;' : ' ';
const root = type => type === 'html' ? '&#9595;' : '╻';

function symbols (type, pid, prevPid, nextPids) {
  if (!prevPid && nextPids.length === 0) {
    return 'x';
  } else if (!prevPid) {
    return root(type);
  } else {
    const pidSplit = pid.split('.');
    const prevPidSplit = prevPid.split('.');
    let s = '';
    const depth = pidSplit.length;
    for (let i = 0; i < pidSplit.length; ++i) {
      if (i < depth - 1) {
        let found = false;
        for (let nextPid of nextPids) {
          if (nextPid.split('.').length === i + 1) { found = true; }
          if (nextPid.split('.').length < i + 1) { break; }
        }
        if (nextPids.length > 0 && nextPids[0].split('.').length > depth
        ) {
          if (prevPidSplit.length === i + 1) {
            s += found ? sideStep(type) : endStep(type);
          } else {
            s += found ? pipe(type) : empty(type);
          }
        } else if (prevPid.split('.').length === i + 1) {
          s += found ? pipe(type) : endStep(type);
        } else {
          s += found ? pipe(type) : empty(type);
        }
      } else if (!prevPid || prevPid.split('.').length < depth) {
        s += nextPids.length === 0 ? singleStep(type) : firstStep(type);
      } else if (nextPids.lenght === 0 || (nextPids[0] && nextPids[0].split('.').length < depth)) {
        s += endStep(type);
      } else {
        s += sideStep(type);
      }
    }
    return s;
  }
}

function directProcess (data) {
  if (typeof data !== 'object' || data === null) { return true; }
  for (let key in data) {
    if (typeof data[key] !== 'object' || data[key] === null) {
      return true;
    } else
    if (!data[key].hasOwnProperty('labels')) {
      return true;
    }
  }
  return false;
}

function header (type, pid, process) {
  if (type === 'html') {
    const style = process.error ===0? '':'"color:red;"';
    return `<table><tr><td colspan="2" ${style} >pid: ${pid}</td><td>${process.name}</td></tr>`;
  } else if(process.error===0){
    return `\n${stringify(process.data)}\n\npid: ${pid}          ${process.name}\n`;
  }else{
    return `\n${red}[!] Error ${process.error} : ${stringify(process.data)}\n\npid: ${pid}${noColor}\n`;
  }
}

function footer (type) {
  if (type === 'html') {
    return `</table>`;
  } else {
    return ``;
  }
}

function clamp (string, length) {
  if (string.length >= length) {
    return string.substr(0, length);
  } else {
    return string + ' '.repeat(length - string.length);
  }
}

function stringify(data){
  return typeof data === 'undefined' ? 'undefined' : JSON.stringify(data);
}

function row (type, label, pid, prevPid, nextPids, started, progress, pdata, maxDepth, fail) {
  if (type === 'html') {
    if (label.startsWith('@')) {
      return `<tr class="">
          <td></td>
          <td>${symbols(type, pid, prevPid, nextPids)}&nbsp;<a class="label" name="${label.substr(1)}">${label}</a></td>
          <td></td>
          </tr>`;
    } else {
      const pDataString = stringify(pdata);
      const pDataHtml = pDataString.replace(/</g, '&lt').replace(/>/g, '&gt').replace(/\n/g, '<br/>');
      const title = pDataString.replace(/"/g, '');
      return `<tr class="${started ? 'started' : 'notStarted'} ${fail ? 'fail' : ''}">
          <td class="pid" style="width:${maxDepth}ch; min-width:${maxDepth}ch"><div class="progress"
          style="width:${progress * 100}%">&nbsp;</div><div class="pid">.${pid.split('.').slice(1).join('.')}</div></td>
          <td>${symbols(type, pid, prevPid, nextPids)}&nbsp;${renderQrtz(type,'',label)}</td>
          <td class="data" title="${title}">${pDataHtml.substr(0, 40) + (pDataHtml.length > 40 ? '...' : '')}</td>
        </tr>`;
    }
  } else {
    if (label.startsWith('@')) {
      return `${clamp('', maxDepth)}${symbols(type, pid, prevPid, nextPids)} ${green}${clamp(label, 20)}${noColor}\n`;
    } else {
      const pDataStr = stringify(pdata);
      const s = symbols(type, pid, prevPid, nextPids);
      let color = noColor;
      if(!started){color=grey;}
      if(fail){color=red;}

      return `${color}${clamp('.' + pid.split('.').slice(1).join('.'), maxDepth)}${color}${s +' '+renderQrtz(type,color,clamp(label, 50-s.length))} ${color}${clamp(pDataStr, 30)}${noColor}\n`;
    }
  }
}

function display (type, data) {
  if (directProcess(data)) {
    return 'Direct response (no debug possible): ' + JSON.stringify(data);
  }
  let maxDepth = 0;
  for (let pid in data) {
    maxDepth = Math.max(maxDepth, pid.split('.').slice(1).join('.').length + 2);
    const process = data[pid];
    for (let spid in process.labels) {
      const step = pid + '.' + process.labels[spid] + '@';
      data[step] = {qrtz: '@' + spid};
    }
  }

  const procs = {};

  Object.keys(data).join(',').split(',').sort(sortNumeric).forEach(function (key) {
    procs[key] = data[key];
  });

  const mainData = Object.values(data)[0];
  const mainPID = Object.keys(procs)[0];

  let output = header(type, mainPID, mainData);
  let prevPid;
  let i = 0;
  for (let pid in procs) {
    const nextPids = Object.keys(procs).slice(i + 1);
    const process = procs[pid];
    const label = typeof process.qrtz === 'undefined'
      ? (process.path ? ('/' + process.path.join('/')) : 'with')
          :  process.qrtz.toString();
    const progress = process.progress;
    const pdata = process.data;

    const fail = process.started !== null && process.error !== null && process.error !== 0 && typeof process.error !== 'undefined';
    const started = process.started;
    output += row(type, label, pid, prevPid, nextPids, started, progress, pdata, maxDepth, fail);
    ++i;
    prevPid = pid;
  }
  output += footer(type);
  return output;
}

function go () {
  let xpath = document.getElementById('request').value;
  if(/^[0-9.]+$/.test(xpath)) xpath = '/p/debug/' + xpath;
  if(!xpath.startsWith('/')) xpath = '/'+xpath;
  document.getElementById('request').value = xpath;

  request(xpath,
          data => { document.getElementById('output').innerHTML = display('html', data); },
          error => {
            document.getElementById('output').innerHTML = error;
          },
          (progress, data) => { document.getElementById('output').innerHTML = display('html', data); },
          true // debug=true
         );
}



try {
  // silently fail web based elements
  if(window.location.pathname.endsWith('/p/debug')||window.location.pathname.endsWith('/proc/debug')){

    window.addEventListener('load', ()=>{

      const hash = window.location.hash.substr(1); // '#...' -> '#'
      if(hash!==''){
        document.getElementById('request').value= hash;
        go();
      }
    });
  }
}catch(e){

}


try {
  // silently fail nodejs based elements
  if (exports) exports.display = display;
}catch(e){

}
