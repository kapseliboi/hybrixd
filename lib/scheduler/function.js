const QrtzStatement = require('./statement').QrtzStatement;

function QrtzFunction (lines, signature) {
  // signature = 'functionName/namedCommandVar1=default1/...'
  // todo pass name and signature
  const labels = {}; // {[label]:step}
  const trimmedLines = []; // 'func parameter1 ...'

  let step = 0;
  // for the qrtz 'with' command we want to pass parameters direclty without parsing them.
  // Those statements/lines are passed as arrays of the form: ['head',param1,param2,...]
  for (let line of lines) { // parse labels and remove comments
    if (line instanceof Array) { // line = ['head',param1,param2,...]
      if (line[0].trim().startsWith('@')) { // line = ['@label',...]
        labels[line[0].trim().substr(1)] = step;
      } else if (!line[0].trim().startsWith('#')) { // line != ['#comment',...]
        trimmedLines.push(line);
        ++step;
      }
    } else if (line.trim().startsWith('@')) { // define labels. line = '@label'
      labels[line.trim().substr(1)] = step;
    } else if (!line.trim().startsWith('#')) { // remove comments. line != '#comment'
      trimmedLines.push(line);
      ++step;
    }
  }

  const statements = trimmedLines.map((line, step) => new QrtzStatement(line, labels, step));

  this.setNamedCommandVars = (command, vars) => {
    if (!(signature instanceof Array)) return;
    for (let i = 1; i < signature.length; ++i) { // skip functionName
      const [variableName, variableDefault] = signature[i].split('=');
      if (i < command.length) {
        vars[variableName] = command[i];
      } else if (typeof variableDefault === 'string') {
        vars[variableName] = /^(-?\d+\.\d+)$|^(-?\d+)$/.test(variableDefault) // make number if it's a number
          ? Number(variableDefault)
          : variableDefault;
      } else {
        vars[variableName] = undefined;
      }
    }
  };

  this.getSyncFunctionName = qrtzProcessStep => {
    // if this function consists of a single step 'sync functionName' return functionName
    if (statements.length === 0) return null;
    return statements[0].getSyncFunctionName(qrtzProcessStep);
  };

  this.getLabels = () => labels;
  this.getStepCount = () => statements.length;
  this.getStatements = () => statements;
  this.getName = () => signature instanceof Array ? signature[0] : 'undefined';
  this.getSignature = () => signature instanceof Array ? signature.join('/') : 'undefined';
  this.getLines = () => {
    const lines = statements.map(statement => statement.toString()); // get statements
    const labelsOrdered = Object.fromEntries( // get labels, sort them
      Object.entries(labels)
        .map(([label, step]) => [step, '@' + label])
        .sort((a, b) => b[0] - a[0])
    );
    for (let step in labelsOrdered) { // insert labels
      lines.splice(step, 0, labelsOrdered[step]);
    }

    return lines;
  };
  this.getStatement = step => { // todo check if used
    // TODO bounds check
    return statements[step];
  };
}

exports.QrtzFunction = QrtzFunction;
