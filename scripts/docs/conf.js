const id = 'hybrixd';
let fs = require('fs');

const meta = JSON.parse(fs.readFileSync('../../lib/conf/metaconf.json').toString());

const html = fs.readFileSync('../../docs/source/hybrixd.html').toString();

let data = '';
data += fs.readFileSync('../../docs/source/header.html').toString();

data += html;
data += '<script>initNavigation("' + id + '")</script>';

function describe (meta, name) {
  if (name) {
    data += '<div class="command-header" onclick="toggleCommand(\'' + name.trim() + '\')"><b>' + name.trim() + '</b>';

    data += '<span class="quickDescription">';

    data += 'description' + '</span></div><div style="display:none;" class="command-body" id="' + name.trim() + '">';
  }
  for (let key in meta) {
    const item = meta[key];
    if (item.hasOwnProperty('default') || item.hasOwnProperty('info') || item.hasOwnProperty('type') || item.hasOwnProperty('unit')) {
      const unit = item.hasOwnProperty('unit') ? ('&nbsp;' + item.unit) : '';

      data += '<b>' + key + ' : </b>';
      if (item.hasOwnProperty('info')) { data += item['info']; }
      if (item.hasOwnProperty('default')) { data += ' [default = ' + JSON.stringify(item['default']) + unit + ']'; }

      data += '<br/>';
    } else { // subcategory;
      describe(item, key);
    }
  }
  if (name) {
    data += '</div>';
  }
}

describe(meta);

data += fs.readFileSync('../../docs/source/footer.html').toString();

fs.writeFileSync('../../docs/' + id + '.html', data);
