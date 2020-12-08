try {
  window.addEventListener('load', () => {
    request('/c/conf/list', conf => {
      let html = '<table>';
      for (let id in conf) {
        html += '<tr class="header"><td colspan="3">' + id + '</td></tr>';
        for (let key in conf[id]) {
          const c = conf[id][key];
          const info = c.info || '';
          const confId = id + '.' + key;
          let type;
          console.log(c.type);
          switch (c.type) {
            case 'boolean':
              type = 'checkbox';
              break;
            case 'string':
              type = '';
              break;
            case 'int':
              type = 'number';
              break;
            case 'password':
              type = 'password';
              break;
            default:
              type = '';
              break;
          }
          // TODO edit: <td>' + info + '</td><td><input type="' + type + '"id="' + confId + '"/>
          //
          html += '<tr><td>&nbsp;&nbsp;&nbsp;&nbsp;' + key + '</td><td><i>' + info + '</i></td><td><span id="' + confId + '">...</span></td></tr>';
          request('/c/conf/get/' + confId, value => {
            const isDefault = c.hasOwnProperty('default') && value === c.default;
            value = typeof value === 'string' || typeof value === 'undefined' ? value : JSON.stringify(value);
            const unit = c.unit ? ' ' + c.unit : '';
            if (type === 'password') value = '***';
            document.getElementById(confId).innerHTML = value + unit + (isDefault ? ' (default)' : '');
          });
        }
      }
      html += '</table>';
      document.getElementById('conf').innerHTML = html;
    }, console.error);
  });
} catch (e) {

}
