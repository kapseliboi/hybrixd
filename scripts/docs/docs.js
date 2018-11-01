var fs = require('fs');

var body = fs.readFileSync('../../lib/scheduler/quartz.js').toString();

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

var re = /\/\*\*([\s\S]+?)this\.(\w*)/g; // match jsdoc templates

var f = getMatches(re, body);
var data = `
<style>

body {
  font-family: Open Sans;
  width: 80%;
  line-height: 24px;
  font-size: 14px;
  margin: 50px auto;
  word-break: break-word;
  min-width: 400px;
  padding-bottom:200px;
}

body > dl > dt, body > dt {
  border-top: 1px solid #eee;
  padding-top: 20px;
  margin-top: 40px;
}


.command-header {
  font-family: verdana;
  background-color:  #7174D8;
  color:white;
  margin-top:5px;
  padding:8px;
  border-radius:3px;
  cursor: pointer;
-webkit-touch-callout: none; /* iOS Safari */
    -webkit-user-select: none; /* Safari */
     -khtml-user-select: none; /* Konqueror HTML */
       -moz-user-select: none; /* Firefox */
        -ms-user-select: none; /* Internet Explorer/Edge */
            user-select: none; /* Non-prefixed version, currently
                                  supported by Chrome and Opera */
}


.command-body{
  padding:15px;
  border-style:solid;
  border-width:1px;
  border-radius:2px;
}

.quickDescription{
  max-width:50%;
  float:right;
  font-size:80%;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

code {
  background-color: #EEEEEE;
  padding: 3px;
  margin: 4px;
  display:block;
}
</style>
<script>
function toggleCommand(id){
  var e = document.getElementById(id);
  e.style.display=e.style.display==='block'?'none':'block';
}
</script>
`;

for (var i = 0; i < f.length; ++i) {
  var m = f[i];
  var func = m[2];
  var content = m[1].replace(/\*\//g, '').replace(/\n \*/g, '\n');
  var lines = content.split(' @');
  var description = lines[0];
  var parameters = [];
  var examples = [];
  for (var j = 0; j < lines.length; ++j) {
    var line = lines[j];
    if (line.startsWith('param')) {
      parameters.push(line.substr(6));
    } else if (line.startsWith('example')) {
      examples.push(line.substr(8).replace(/\n/g, '<br/>'));
    }
  }
  for (var j = 0; j < parameters.length; ++j) {
    var parameter = parameters[j].substr(1);
    var elements = parameter.split(' '); // "{Integer} offset - the offset" -> ["{Integer}", "offset", ...]
    var type = elements[0].substr(0, elements[0].length - 1);
    var name = elements[1];
    var optional = false;
    if (name.startsWith('[')) {
      optional = true;
      name = name.substr(1, name.length - 2);
    }
    parameters[j] = {type, name, optional};
    // TODO description
  }

  data += '<div class="command-header" onclick="toggleCommand(\'' + func + '\')">' + func;
  for (var j = 0; j < parameters.length; ++j) {
    var parameter = parameters[j];
    if (parameter.optional) {
      data += ' [<i>' + parameter.name + '</i>]';
    } else {
      data += ' <i>' + parameter.name + '</i>';
    }
  }
  data += '<span class="quickDescription">' + description + '</span></div><div style="display:none;" class="command-body" id="' + func + '">';
  data += description;
  for (var j = 0; j < examples.length; ++j) {
    data += '<code>' + examples[j] + '</code>';
  }
  data += '</div></div>';
}

fs.writeFileSync('../../docs/qrtz.html', data);
