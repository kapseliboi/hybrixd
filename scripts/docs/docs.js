let fs = require('fs');

let files = {
  qrtz: '../../lib/scheduler/quartz.js',
  'hybrix-lib.js': '../../../interface/lib/interface.js',
  'hybrixd': '../../docs/source/hybrixd.html',
  'Introduction': '../../docs/source/Introduction.html',
  'cli': '../../docs/source/cli.html',
  'featured-products': '../../docs/source/featured-products.html'
};

function getMatches (re, body) {
  re.lastIndex = 0;
  let m;
  let array = [];
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
  if (id === 'hybrix-lib.js') { // add all methods
    const path = '../../../interface/lib/methods';
    const files = fs.readdirSync(path);
    files.forEach(function (file, index) {
      body += '\n' + fs.readFileSync(path + '/' + file, 'utf8').toString();
    });
  }

  let data = fs.readFileSync('../../docs/source/header.html').toString();

  let intro = fs.readFileSync('../../docs/source/' + id + '.html').toString();
  data += intro;

  data += '<script>initNavigation("' + id + '")</script>';

  if (files[id].substr(-5) !== '.html') {
    let re = /\/\*\*([\s\S]+?)exports\.(\w*)/g; // match jsdoc templates

    let f = getMatches(re, body);

    let funcs = [];
    for (let i = 0; i < f.length; ++i) {
      let m = f[i];
      let name = m[2];
      let content = m[1].replace(/\*\//g, '').replace(/\n \*/g, '\n');
      let lines = content.split(' @');
      let description = lines[0].replace(/\*/g, '');
      let parameters = [];
      let examples = [];
      let category = 'Misc';
      for (let j = 0; j < lines.length; ++j) {
        let line = lines[j];
        if (line.startsWith('param')) {
          parameters.push(line.substr(6));
        } else if (line.startsWith('category')) {
          category = line.substr(9).replace(/(\*|\s)/g, '');
        } else if (line.startsWith('example')) {
          examples.push(line.substr(8).replace(/\*/g, ''));
        }
      }
      for (let j = 0; j < parameters.length; ++j) {
        let parameter = parameters[j].substr(1);
        let elements = parameter.split(' '); // "{Integer} offset - the offset" -> ["{Integer}", "offset", ...]
        let type = elements[0].substr(0, elements[0].length - 1);
        let pname = elements[1];
        let pDescription = elements.slice(2).join(' ').replace(/\*/g, '');
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
      let func = funcs[i];
      if (i === 0 || funcs[i - 1].category !== func.category) {
        data += '<div class="category">' + func.category.trim() + '</div>';
      }
      data += '<div class="command-header" onclick="toggleCommand(\'' + func.name.trim() + '\')"><b>' + func.name.trim() + '</b>';

      data += '<span class="quickDescription">';

      if (id === 'hybrix-lib.js') { data += '{'; }

      for (let j = 0; j < func.parameters.length; ++j) {
        let parameter = func.parameters[j];
        if (parameter.name.indexOf('.') !== -1 || id === 'qrtz') {
          let name;
          if (id === 'hybrix-lib.js' && j > 1) { data += ', '; }

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
      if (id === 'hybrix-lib.js') { data += '}'; }
      data += '' + func.description.trim() + '</span></div><div style="display:none;" class="command-body" id="' + func.name.trim() + '">';
      data += func.description;
      data += '<table class="parameters">';
      data += '<tr><td><strong>Name</strong></td><td><strong>Type<strong></td><td><strong>Description</strong></td></tr>';
      for (let j = 0; j < func.parameters.length; ++j) {
        let parameter = func.parameters[j];
        let type = typeConverter(parameter.type);
        let dataTest = /data./.test(parameter.name);
        if (parameter.optional && dataTest) {
          data += '<tr><td>' + parameter.name + '</td><td>' + type + '</td><td><span style="color:grey;">[Optional]</span>' + parameter.description.trim().replace(/-/g, '') + '</td></tr>';
        } else if (dataTest) {
          data += '<tr><td>' + parameter.name + '</td><td>' + type + '</td><td>' + parameter.description.trim().replace(/-/g, '') + '</td></tr>';
        } else {
          data += '<tr><td>' + parameter.name.trim() + '</td><td>' + type + '</td><td>' + parameter.description.trim().replace(/-/g, '') + '</td></tr>';
        }
      }
      data += '</table>';
      for (let j = 0; j < func.examples.length; ++j) {
        data += '<code class="example" title="' + func.name + '" id="example' + exampleId + '">' + func.examples[j].trim() + '</code>';
        exampleId++;
      }
      data += '</div>';
    }
  }
  data += fs.readFileSync('../../docs/source/footer.html').toString();

  fs.writeFileSync('../../docs/' + id + '.html', data);
}
