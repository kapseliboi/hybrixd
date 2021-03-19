try {
  window.addEventListener('load', () => {
    request('/c/conf/list', conf => {
      let html = '<table>';
      for (const id in conf) {
        html += '<tr class="header"><td colspan="3">' + id + '</td></tr>';
        for (const key in conf[id]) {
          const c = conf[id][key];
          const info = c.info || '';
          const confId = id + '.' + key;
          let type;
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
          html += '<tr><td>&nbsp;&nbsp;&nbsp;&nbsp;' + key + '</td><td><i>' + info + '</i></td><td><span id="' + confId + '"></span></td></tr>';
          request('/c/conf/get/' + confId, value => {
            const hasDefault = c.hasOwnProperty('default');
            const isDefault = hasDefault && value === c.default;
            value = typeof value === 'string' || typeof value === 'undefined' ? value : JSON.stringify(value);
            const unit = c.unit ? ' ' + c.unit : '';

            const SPAN = document.getElementById(confId);
            const INPUT = document.createElement('INPUT');
            if (type === 'checkbox' && value === 'true') INPUT.checked = true;
            else INPUT.value = value;
            INPUT.type = type;
            SPAN.appendChild(INPUT);
            const SPAN_unit = document.createElement('SPAN');
            SPAN_unit.innerHTML = unit;
            SPAN.appendChild(SPAN_unit);
            let SPAN_default;

            const update = value => {
              if (hasDefault) {
                const isDefault = value === c.default;
                if (isDefault) SPAN_default.classList.remove('active');
                else SPAN_default.classList.add('active');
              }
              request('/c/conf/set/' + confId + '/' + value, () => {}, console.error);
            };
            if (hasDefault) {
              SPAN_default = document.createElement('SPAN');
              SPAN_default.innerHTML = 'default';
              SPAN_default.classList.add('default');
              if (!isDefault) SPAN_default.classList.add('active');
              SPAN_default.onclick = () => {
                update(c.default);
                if (type === 'checkbox' && c.default === 'true') INPUT.checked = true;
                else if (type === 'checkbox' && c.default === 'false') INPUT.removeAttribute('checked');
                else INPUT.value = c.default;
              };
              SPAN.appendChild(SPAN_default);
            }

            INPUT.onchange = () => {
              const value = type === 'checkbox' ? INPUT.checked : INPUT.value;
              update(value);
            };
          });
        }
      }
      html += '</table>';
      document.getElementById('conf').innerHTML = html;
    }, console.error);
  });
} catch (e) {

}
