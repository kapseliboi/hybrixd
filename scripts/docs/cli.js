const path = process.argv[2];

const exec = require('child_process').exec;
const fs = require('fs');
let body = '';

function finalize () {
  let html = fs.readFileSync('../../docs/source/header.html').toString();
  html += fs.readFileSync('../../docs/source/cli.html').toString().replace('<table></table>', body);
  html += fs.readFileSync('../../docs/source/footer.html').toString();
  fs.writeFileSync('../../docs/cli.html', html);
}

function renderDoc (stdout) {
  body += `<table class="ref-table">
                        <tr><th>Short</th>                     <th>Command</th>                            <th>Description</th>
                        <tr><td><code class="ref">-h</code></td>   <td><code class="ref">--help</code></td>    <td>Display help</td></tr>`;

  const lines = stdout.split('\n');
  for (let i = 2; i < lines.length; ++i) {
    const data = /\s*-(\w+),\s*--(\w+)(\s<ARG1>)?(\s<ARG2>)?(\s<ARG3>)?(\s<ARG4>)?\s+(.+)$/g.exec(lines[i]);
    if (data !== null) {
      body += `<tr><td><code class="ref">-${data[1]}</code></td><td><code class="ref">--${data[2]}</code></td><td>${data[7]}</td></tr>`;
    }
  }
}

exec('sh ' + path + '/cli-wallet --help', (error, stdout, stderr) => {
  if (error) console.error(stderr);
  else renderDoc(stdout);
  exec('sh ' + path + '/cli-wallet -M help', (error, stdout, stderr) => {
    let command = '';
    if (error) console.error(stderr);
    else {
      const lines = stdout.split('\n');
      for (let i = 4; i < lines.length; ++i) {
        const moduleName = lines[i].trim().split(' ')[0];
        if (moduleName !== '') {
          command += `echo ">${moduleName}"; sh ${path}/cli-wallet -M help ${moduleName};`;
        }
      }
    }
    exec(command, (error, stdout, stderr) => {
      if (error) console.error(stderr);
      else {
        const lines = stdout.split('\n');
        for (const line of lines) {
          if (line.startsWith('>')) {
            const moduleName = line.substr(1);
            body += `<tr><th colspan="3">${moduleName} module</th></tr>`;
          } else {
            const data = /\s*-M (\w+) (\w+) (\s<ARG1>)?(\s<ARG2>)?(\s<ARG3>)?(\s<ARG4>)?\s+(.+)$/g.exec(line);
            if (data !== null) {
              body += `<tr><td colspan="2"><code class="ref">-M ${data[1]} ${data[2]}</code></td><td>${data[7]}</td></tr>`;
            }
          }
        }
      }
      body += '</table>';
      finalize();
    });

    // else renderDoc(stdout);
  });
});
