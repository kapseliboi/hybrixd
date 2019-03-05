let fs = require('fs');

let files = {
  qrtz: '../../lib/scheduler/quartz.js',
  'hybrix-lib.js': '../../../interface/lib/interface.js',
  'hybrixd': '../../docs/source/hybrixd.html',
  'Introduction': '../../docs/source/Introduction.html',
  'cli': '../../docs/source/cli.html'
};

function getMatches (re, str) {
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

for (let id in files) {
  var body = fs.readFileSync(files[id]).toString();

  let data = fs.readFileSync('../../docs/source/header.html').toString();

  let intro = fs.readFileSync('../../docs/source/' + id + '.html').toString();
  data += intro;
  if (files[id].substr(-5) !== '.html') {
    data += '<div id="filterBox"></div>';
  }

  data += '<script>initNavigation("' + id + '")</script>';

  if (files[id].substr(-5) !== '.html') {
    let re = /\/\*\*([\s\S]+?)this\.(\w*)/g; // match jsdoc templates

    let f = getMatches(re, body);

    let funcs = [];
    for (var i = 0; i < f.length; ++i) {
      let m = f[i];
      var name = m[2];
      let content = m[1].replace(/\*\//g, '').replace(/\n \*/g, '\n');
      let lines = content.split(' @');
      let description = lines[0].replace(/\*/g, '');
      let parameters = [];
      let examples = [];
      let category = 'Misc';
      for (var j = 0; j < lines.length; ++j) {
        let line = lines[j];
        if (line.startsWith('param')) {
          parameters.push(line.substr(6));
        } else if (line.startsWith('category')) {
          category = line.substr(9).replace(/(\*|\s)/g, '');
        } else if (line.startsWith('example')) {
          examples.push(line.substr(8).replace(/\*/g, ''));
        }
      }
      for (var j = 0; j < parameters.length; ++j) {
        var parameter = parameters[j].substr(1);
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

    for (var i = 0; i < funcs.length; ++i) {
      let func = funcs[i];
      if (i === 0 || funcs[i - 1].category !== func.category) {
        data += '<div class="category">' + func.category.trim() + '</div>';
      }
      data += '<div class="command-header" onclick="toggleCommand(\'' + func.name.trim() + '\')"><b>' + func.name.trim() + '</b>';

      data += '<span class="quickDescription">';

      if (id === 'hybrix-lib.js') { data += '{'; }

      for (var j = 0; j < func.parameters.length; ++j) {
        var parameter = func.parameters[j];
        if (parameter.name.indexOf('.') !== -1 || id === 'qrtz') {
          var name;
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
      for (var j = 0; j < func.parameters.length; ++j) {
        var parameter = func.parameters[j];
        data += '<tr><td>' + parameter.name.trim() + '</td><td>' + parameter.description.trim() + '</td></tr>';
      }
      data += '</table>';
      for (var j = 0; j < func.examples.length; ++j) {
        data += '<code class="example" title="' + func.name + '" id="example' + exampleId + '">' + func.examples[j].trim() + '</code>';
        exampleId++;
      }
      data += '</div>';
    }
  }
  data += '</div></div></div><div id="noResults">No results.</div>';
  data += fs.readFileSync('../../docs/source/footer.html').toString();

  fs.writeFileSync('../../docs/' + id + '.html', data);
}
