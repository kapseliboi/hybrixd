// (C) 2019 Internet of Coins / hybrix / Joachim de Koning

// required libraries in this context
let JSONfix = require('../../lib/util/jsonfix').parse;
let fs = require('fs');

// exports
exports.redirect = redirect;
function redirect (proc) {
  proc.sync();
  const command = proc.command;
  const protocol = command[0];

  switch (protocol) {
    case 'http':
    case 'https':
      const id = 'redirect';

      const redirectJSON = command[1];
      const path = command.slice(2);

      let commandPath = '/' + path.join('/');

      let redirectObj = JSON.parse(JSONfix(redirectJSON));
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
          proc.done(data);
        } else {
          proc.fail('File redirect.html not found!');
        }
      }
      break;
    default:
      proc.fail('Unknown protocol!');
  }
}
