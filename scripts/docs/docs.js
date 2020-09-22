const fs = require('fs');

const files = {
  'introduction': '../../docs/source/introduction.html',
  'getting-started': '../../docs/source/getting-started.html',
  'hybrixd': '../../docs/source/hybrixd.html',
  'hybrix-jslib': '../../docs/source/hybrix-jslib.html',
  'qrtz': '../../docs/source/qrtz.html',
  'block-explorer': '../../docs/source/block-explorer.html',
  'web-wallet': '../../docs/source/web-wallet.html',
  '404': '../../docs/source/404.html',

  'asset': '../../docs/source/extend/asset.html',
  'client': '../../docs/source/extend/client.html',
  'index': '../../docs/source/extend/index.html',
  'node': '../../docs/source/extend/node.html',
  'setup': '../../docs/source/extend/setup.html'
};

function getMatches (re, body) {
  re.lastIndex = 0;
  let m;
  const array = [];
  do {
    m = re.exec(body);
    if (m) {
      array.push(m);
    }
  } while (m);
  return array;
}

let exampleId = 0;

function typeConverter (type) {
  if (/Array./g.test(type)) {
    return 'Array';
  } else {
    let res = type.replace(/\|/g, ' | ');
    return res;
  }
}

for (let id in files) {
  let body = fs.readFileSync(files[id]).toString();
  if (id === 'hybrix-jslib') { // add all methods
    const path = '../../../interface/lib/methods';
    const methodFiles = fs.readdirSync(path);
    methodFiles.forEach(function (file, index) {
      if (file.endsWith('.js')) {
        body += '\n' + fs.readFileSync(path + '/' + file, 'utf8').toString();
      }
    });
  } else if (id === 'qrtz') { // add all methods
    const path = '../../lib/scheduler/methods';
    const methodFiles = fs.readdirSync(path);
    methodFiles.forEach(function (file, index) {
      if (file.endsWith('.js')) {
        body += '\n' + fs.readFileSync(path + '/' + file, 'utf8').toString();
      }
    });
  }

  let data = fs.readFileSync('../../docs/source/header.html').toString();

  const intro = fs.readFileSync(files[id]).toString();
  data += intro;
  data += '<script>initNavigation("' + id + '")</script>';

  if (id === 'hybrix-jslib' || id === 'qrtz') { // add search/filter ui
    data += `<div id="filterBox">
  <input id="search" onkeyup="search(event)" placeholder="Apply filter..." onclick="search"><input type="submit" value="&#215;" onclick="clearSearch()"/>
</div>
<div id="noResults">No results. Change your search filter or <a onclick="clearSearch()" style="cursor: pointer;">reset the filter</a>.</div>`;
  }

  if (id === 'hybrix-jslib' || id === 'qrtz') {
    let re;
    if (id === 'hybrix-jslib' || id === 'qrtz') {
      re = /\/\*\*([\s\S]+?)exports\.(\w*)/g; // match jsdoc templates
    } else {
      re = /\/\*\*([\s\S]+?)this\.(\w*)/g; // match jsdoc templates
    }

    let f = getMatches(re, body);

    let funcs = [];
    for (let i = 0; i < f.length; ++i) {
      const m = f[i];
      const name = m[2];
      const content = m[1].replace(/\*\//g, '').replace(/\n \*/g, '\n');
      const lines = content.split(' @');
      const description = lines[0].replace(/\*/g, '');
      const parameters = [];
      const examples = [];
      let category = 'Misc';
      for (let j = 0; j < lines.length; ++j) {
        const line = lines[j];
        if (line.startsWith('param')) {
          parameters.push(line.substr(6));
        } else if (line.startsWith('category')) {
          category = line.substr(9).replace(/(\*|\s)/g, '');
        } else if (line.startsWith('example')) {
          examples.push(line.substr(8).replace(/\*/g, ''));
        }
      }
      for (let j = 0; j < parameters.length; ++j) {
        const parameter = parameters[j].substr(1);
        const elements = parameter.split(' '); // "{Integer} offset - the offset" -> ["{Integer}", "offset", ...]
        const type = elements[0].substr(0, elements[0].length - 1);
        let pname = elements[1];
        const pDescription = elements.slice(2).join(' ').replace(/\*/g, '');
        let optional = false;
        if (pname.startsWith('[')) {
          optional = true;
          pname = pname.substr(1, pname.length - 2);
        }

        parameters[j] = {type, name: pname.split('=')[0], description: pDescription, default: pname.split('=')[1], optional};
        // TODO description
      }

      funcs.push({name, description, category, parameters, examples});
    }

    funcs.sort((a, b) => {
      if (a.category === b.category) {
        return a.name.localeCompare(b.name);
      } else {
        let ac = a.category;
        let bc = b.category;
        if (ac === 'Misc' || ac === 'Depreciated') { ac = 'ZZZZZZ' + ac.slice(-1); }
        if (bc === 'Misc' || bc === 'Depreciated') { bc = 'ZZZZZZ' + bc.slice(-1); }
        return ac.localeCompare(bc);
      }
    });

    for (let i = 0; i < funcs.length; ++i) {
      const func = funcs[i];
      if (i === 0 || funcs[i - 1].category !== func.category) {
        data += '<div class="category"><h3>' + func.category.trim() + '</h3></div>';
      }
      const name = func.name.trim();
      data += '<div class="command-header" onclick="toggleCommand(\'' + func.name.trim() + '\')"><b><a id="' + name + '">' + name + '</a></b>';

      data += '<span class="quickDescription">';

      if (id === 'hybrix-jslib') data += '{';

      for (let j = 0; j < func.parameters.length; ++j) {
        const parameter = func.parameters[j];
        if (parameter.name.indexOf('.') !== -1 || id === 'qrtz') {
          let name;
          if (id === 'hybrix-jslib' && j > 1) data += ', ';

          if (id === 'qrtz') {
            data += ' ';
            name = parameter.name;
          } else {
            name = parameter.name.split('.').slice(1);
          }
          if (parameter.optional) {
            data += '[<i>' + name + (typeof parameter.default === 'undefined' ? '' : ('=' + parameter.default)) + '</i>]';
          } else {
            data += '<i>' + name + '</i>';
          }
        }
      }
      if (id === 'hybrix-jslib') { data += '}'; }
      data += '' + func.description.trim() + '</span><span class="toggleIcon"><svg width="18px" height="18px" viewBox="0 0 18 18" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"> <g stroke="none" stroke-width="1" fill="none" fill-rule="evenodd"> <path d="M9,0 C11.4848182,0 13.7356364,1.00881818 15.3638182,2.63618182 C16.992,4.26354545 18,6.51518182 18,9 C18,11.4848182 16.9911818,13.7356364 15.3638182,15.3638182 C13.7364545,16.992 11.4848182,18 9,18 C6.51518182,18 4.26436364,16.9911818 2.63618182,15.3638182 C1.008,13.7364545 0,11.4848182 0,9 C0,6.51518182 1.00881818,4.26436364 2.63618182,2.63618182 C4.26354545,1.008 6.51518182,0 9,0 Z M9,4.90909091 C8.54836364,4.90909091 8.18181818,5.27563636 8.18181818,5.72727273 L8.18181818,8.18181818 L5.72727273,8.18181818 C5.27563636,8.18181818 4.90909091,8.54836364 4.90909091,9 C4.90909091,9.45163636 5.27563636,9.81818182 5.72727273,9.81818182 L8.18181818,9.81818182 L8.18181818,12.2727273 C8.18181818,12.7243636 8.54836364,13.0909091 9,13.0909091 C9.45163636,13.0909091 9.81818182,12.7243636 9.81818182,12.2727273 L9.81818182,9.81818182 L12.2727273,9.81818182 C12.7243636,9.81818182 13.0909091,9.45163636 13.0909091,9 C13.0909091,8.54836364 12.7243636,8.18181818 12.2727273,8.18181818 L9.81818182,8.18181818 L9.81818182,5.72727273 C9.81818182,5.27563636 9.45163636,4.90909091 9,4.90909091 Z" fill="#5DBDC9" fill-rule="nonzero"></path> </g> </svg></span></div><div style="display:none;" id="' + name + '" class="command-body">';
      data += func.description;
      data += '<table class="parameters">';
      data += '<tr><th>Name</th><th>Type</th><th>Description</th></tr>';
      for (let j = 0; j < func.parameters.length; ++j) {
        const parameter = func.parameters[j];
        const type = typeConverter(parameter.type);
        const dataTest = /data./.test(parameter.name) || id !== 'hybrix-jslib';
        if (parameter.optional && dataTest) {
          data += '<tr><td>' + parameter.name + '</td><td>' + type + '</td><td><span style="color:grey;">[Optional';
          if (parameter.default) {
            data += ', default = ' + parameter.default;
          }
          data += ']</span>' + parameter.description.trim().replace(/-/g, '') + '</td></tr>';
        } else if (dataTest) {
          data += '<tr><td>' + parameter.name + '</td><td>' + type + '</td><td>' + parameter.description.trim().replace(/-/g, '') + '</td></tr>';
        } else {
          data += '<tr><td>' + parameter.name.trim() + '</td><td>' + type + '</td><td>' + parameter.description.trim().replace(/-/g, '') + '</td></tr>';
        }
      }
      data += '</table>';
      for (let j = 0; j < func.examples.length; ++j) {
        data += '<pre class="example" title="' + func.name + '" id="example' + exampleId + '"><code class="language-javascript">' + func.examples[j].replace(/\s+$/, '') + '</code></pre>';
        exampleId++;
      }
      data += '</div>';
    }
  }
  data += fs.readFileSync('../../docs/source/footer.html').toString();

  fs.writeFileSync('../../docs/' + id + '.html', data);
}
