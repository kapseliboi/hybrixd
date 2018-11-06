var fs = require('fs');
// var id = 'hybridd-lib.js';
var files = {
  qrtz: '../../lib/scheduler/quartz.js',
  'hybrid-lib.js': '../../../interface/lib/interface.js',
  'Hybridd': '../../docs/source/Hybridd.html',
  'HelloWorld': '../../docs/source/HelloWorld.html',
  'cli': '../../docs/source/cli.html'
};

function getMatches (re, str) {
  re.lastIndex = 0;
  var m;
  var array = [];
  do {
    m = re.exec(body);
    if (m) {
      array.push(m);
    }
  } while (m);
  return array;
}

for (var id in files) {
  var body = fs.readFileSync(files[id]).toString();

  var data = `<style>` + fs.readFileSync(__dirname + '/../../docs/docs.css').toString() + `</style><script>` + fs.readFileSync(__dirname + '/../../docs/docs.js').toString() + `</script>`;

  data += '<div id="navigation"></div><script>initNavigation("' + id + '")</script>';

  var intro = fs.readFileSync('../../docs/source/' + id + '.html').toString();
  data += intro;

  if (files[id].substr(-5) !== '.html') {
    var re = /\/\*\*([\s\S]+?)this\.(\w*)/g; // match jsdoc templates

    var f = getMatches(re, body);

    var funcs = [];
    for (var i = 0; i < f.length; ++i) {
      var m = f[i];
      var name = m[2];
      var content = m[1].replace(/\*\//g, '').replace(/\n \*/g, '\n');
      var lines = content.split(' @');
      var description = lines[0].replace(/\*/g, '');
      var parameters = [];
      var examples = [];
      var category = 'Misc';
      for (var j = 0; j < lines.length; ++j) {
        var line = lines[j];
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
        var elements = parameter.split(' '); // "{Integer} offset - the offset" -> ["{Integer}", "offset", ...]
        var type = elements[0].substr(0, elements[0].length - 1);
        var pname = elements[1];
        var pDescription = elements.slice(2).join(' ').replace(/\*/g, '');
        var optional = false;
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
        var ac = a.category;
        var bc = b.category;
        if (ac === 'Misc' || ac === 'Depreciated') { ac = 'ZZZZZZ' + ac.slice(-1); }
        if (bc === 'Misc' || bc === 'Depreciated') { bc = 'ZZZZZZ' + bc.slice(-1); }
        return ac.localeCompare(bc);
      }
    });

    for (var i = 0; i < funcs.length; ++i) {
      var func = funcs[i];
      if (i === 0 || funcs[i - 1].category !== func.category) {
        data += '<div class="category">' + func.category + '</div>';
      }
      data += '<div class="command-header" onclick="toggleCommand(\'' + func.name + '\')"><b>' + func.name + '</b>';

      if (id === 'hybrid-lib.js') { data += ' {'; }
      for (var j = 0; j < func.parameters.length; ++j) {
        var parameter = func.parameters[j];
        if (parameter.name.indexOf('.') !== -1 || id === 'qrtz') {
          var name;
          if (id === 'hybrid-lib.js' && j > 1) { data += ', '; }

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
      if (id === 'hybrid-lib.js') { data += '}'; }
      data += '<span class="quickDescription">' + func.description + '</span></div><div style="display:none;" class="command-body" id="' + func.name + '">';
      data += description;
      data += '<table>';
      for (var j = 0; j < func.parameters.length; ++j) {
        var parameter = func.parameters[j];
        data += '<tr><td>' + parameter.name + '</td><td>' + parameter.description + '</td></tr>';
      }
      data += '</table>';
      for (var j = 0; j < func.examples.length; ++j) {
        data += '<code style="display:block;white-space: pre;">' + func.examples[j] + '</code>';
      }
      data += '</div></div>';
    }
  }

  fs.writeFileSync('../../docs/' + id + '.html', data);
}
