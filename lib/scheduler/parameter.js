const parse = require('./parse');

function QrtzParameter (parameter, useWithhoutParsing) {
  // TODO  $recipeProperty   => recipe[recipeProperty]
  // TODO '$recipeProperty'   => String(recipe[recipeProperty])
  // TODO  ${.property}   => data[property]
  // TODO  '${.property}'   =>String( data[property])
  // '$1' '$' etc..

  // TODO reinstating this breaks dummy test
  const setConstantParameter = constantParameter => {
    if (typeof constantParameter === 'object' && constantParameter !== null) {
      // if the parameter is a constant object then we should not pass the original object as it can be altered and thus is no longer constant
      const stringified = JSON.stringify(constantParameter);
      this.getRunTime = () => JSON.parse(stringified);
    } else {
      this.getRunTime = () => constantParameter;
    }
  };

  if (useWithhoutParsing) {
    setConstantParameter(parameter);
  } else if (parameter === '$') { // '$' => data
    this.getRunTime = processStep => processStep.getData();
  } else if (/^\$\d+$/.test(parameter)) { // '$1' => command[1]
    this.getRunTime = processStep => processStep.getCommand(Number(parameter.substr(1)));
  } else if (parameter.indexOf('$') === -1) { // if no dynamic components then the parameter is constant
    const result = parse.parseParameter(parameter, {}, [], null, {}, {});
    if (result.error) {
      throw new Error(result.error);
    } else {
      const constantParameter = result.body;
      setConstantParameter(constantParameter);
    }
  } else { // brute force parsing by default
    this.getRunTime = processStep => {
      // TODO improve encapsulation of processStep methods: pass processStep and let subfunctions of parseParamter use methods
      const parameterResult = parse.parseParameter(parameter, processStep.getRecipe(), processStep.getCommand(), processStep.getData(), processStep.getVars(), processStep.getParentVars());
      if (parameterResult.error) {
        global.hybrixd.logger(['error', 'qrtz'], 'Parameter parsing error: ' + parameterResult.error);
        throw parameterResult.error;
      } else {
        return parameterResult.body;
      }
    };
  }
}

exports.QrtzParameter = QrtzParameter;
