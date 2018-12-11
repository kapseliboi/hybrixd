var fs = require('fs');

var files = {
  qrtz: '../../lib/scheduler/quartz.js',
  'hybrix-lib.js': '../../../interface/lib/interface.js',
  'hybrixd': '../../docs/source/hybrixd.html',
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

  var data = `<!DOCTYPE html><html lang="en"><head><title>hybrixd : Help</title><meta name="viewport" content="width=device-width, initial-scale=1, minimum-scale=0.5, maximum-scale=2.0"><meta http-equiv="Content-Type" content="text/html;charset=UTF-8"><link href="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAAAXNSR0IArs4c6QAABS1JREFUWAntVn2IVFUUP+feNx+7M7trqa3Grru6O2pBVmCZICImYUFkCEGJfwRmf2iazu64psnTBdfdHT/CUgJLqahQMYKKQDLCJCEpiaLacdfVLTet1dz52Jn3cU/nzvimkV1RkOifPX/Mve/cc8/5nd8757wBGJVRBkYZ+J8ZwNuJb5pkZDKJiCoXA3Gz8dLNfBERslCp3W0BeDnWtUUoWgGCfiGUy6E62DM9VOP094Nrmqi8QKvXdU9C116GKGVVyGg1zclZ7+ymADhLfyp00RdvnpD2Luk1FvuzwoErH5JSTxT0eBoR/uD8XAWU5UyHQGAaCHJKwQMIaq62E8Joirc37PCYEIXLI/82m2cnXE117XMuXf0ouqF7TqlVR8f4JID6HgFTgHBKSrWJpHwJDGOzEvIdlOIrcKGPAZFgFEUhVVvc8+aGDHDmgoMfAKCl+gIbfuuT8nnOIemWUdZvGXLIyn3KWX4QlOVvt7XVDGg700xUptOi2ueTqa1b6/u1LhrtqVPCOYBEDwrwzY3Hp/yg9VqKAEzz7JiCqn4wlTpXpyD7HCAuIoL7GYRPgPgGBHzNWVdwZn4+m8pUzxGIRwnhMoIYIOVqEDMAxTwi1W9gcElnZ/132m/+ldHAYUB5bEdHpL0Q6xqAaCyxRBEtY6WDQL0E6jEB8jj4jQ2YU7NBuONAyYPxeOMlzUwKuse5KToiUGU4+JdM8xSucE3tdCa7rugcxd7KUGSlV5DRdYlN5KoFPmk82d7ecFXbGdENPXVk2a1ANFkrCHBQoIhWhMLvm+bdGQ7Y5zngvZFMdzVx0Me54GaTpBekG/hMoX0fX31K+0ABFilmSPsiZevVEyH8Xzgq+4pSzgzWHdd6ISzXYNRjPSNu0/MC/J/o4FrnBdf7wfSZF7mmWknRXM5YoAvLXLKOMXuHmcy7yDBWC4UrucI/Rom7q8Ly1dL7ZDtlzNaQC7hm/frEeO1ThEKhfq7kI+yAceRVv0opcoX99b8K3UauCcPTMlv3chGdwqCYV1+LS3dua/w8HJ76Fk0sf7aybOpa04wMerbNzd0Rhc6bnMAYZubpnOMe0gUrdKaVofAKCbCYQezhw8W2k9vX1NQ7eU3LmYVr1nVrevMipTzBZVuklRGfdUWgbfuWxtOrVkXyoHlmlPkvWpxdb/jgQWK3BXHIeohZm+I98zpTd0uxC/SB7oRk0tqvkBZxoAwXRDnT+RdPuc1V5Q172EQk04kWDjwLSP1OSI/rOuYO2B0wyvcD5MZajrOXAzVwe/ax/jUDxVFb0UKeT8u5KObrOAURCQyIR68DoA9isd9qHEqdYKonXbPkGOK8NOAZ2zX+FkK5fqJAfh4gNbqu+zo7vofb8iS/RIspzk88fZedpxTgT7w+zA8/st0p3s/nL8IVYYgd29si7xbfpxfM9qVJWDjEjjwVl7Oa5Npwkgtct4llE2YJVY73TDsVfBA9UnIjf5efwzxqZ3LQ93zSvykYrL8waHdXl5HheENqGACffeegA5d/Zg/TPATsoIv7JQkKqjjgeAZXVYrPs7vB2orVVfFt/35L+krt2PdwiW3smebkrDc4SC0HPgMB3Oi3/b2uqwJSQpB8qkJlnVqFWOMqmsjTsJq9jOMpOav01fGsuKAwuGBXR71OaEQZEYC21C2SyUClPSE4sHNt7dCIt0uUekImhxJzlEMmSpjGw6iXC3BXZ2fkUInZsO0NAQyzvEVFS8u5OxxjaAx/FdO38iflFt2Omo0yMMrAf8fAP8fXR9N4is8VAAAAAElFTkSuQmCC" rel="icon" type="image/x-icon" />

<link href="https://fonts.googleapis.com/css?family=Open+Sans:400italic,600italic,700italic,400,600,700" rel="stylesheet" type="text/css">
<link rel="stylesheet" type="text/css" href="./docs.css">
<script src="./docs.js"></script>
</head><body>`;

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

      if (id === 'hybrix-lib.js') { data += ' {'; }
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
      data += '<span class="quickDescription">' + func.description + '</span></div><div style="display:none;" class="command-body" id="' + func.name + '">';
      data += func.description;
      data += '<table class="parameters">';
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
  data += '</body></html>';
  fs.writeFileSync('../../docs/' + id + '.html', data);
}
