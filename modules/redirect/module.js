// (C) 2019 Internet of Coins / hybrix / Joachim de Koning

// required libraries in this context
let functions = require('../../lib/functions');
let fs = require('fs');

// exports
exports.redirect = redirect;
function redirect (proc) {
  const command = proc.command;
  const protocol = command[1];

  switch (protocol) {
    case 'http':
    case 'https':
      const id = command[0];
      const redirectJSON = command[2];
      const path = command.slice(2);

      let commandPath = '/' + path.join('/');

      let redirectObj = JSON.parse(functions.JSONfix(redirectJSON));
      if (!(redirectObj.success && redirectObj.failure)) {
        proc.fail('Redirection JSON object must contain success and failure keys!');
      } else {
        let filePath = 'modules/' + id + '/redirect.html';
        if (fs.existsSync('../' + filePath)) {
          let data = fs.readFileSync('../' + filePath).toString('utf8')
            .replace(/%PATH%/g, commandPath)
            .replace(/%PROTOCOL%/g, protocol) // replace two occurrences of protocol
            .replace(/%SUCCESS%/g, redirectObj.success)
            .replace(/%FAILURE%/g, redirectObj.failure);
          proc.mime('blob');
          proc.pass(data);
        } else {
          proc.fail('File redirect.html not found!');
        }
      }
      break;
  }
}
