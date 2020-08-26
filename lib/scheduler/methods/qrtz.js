const {QrtzFunction} = require('../function');
/**
   * List all available methods (use call to call them) or the qrtz code for a given method
   * @category Introspection
   * @param {String} [method] - Method to inspect
   * @example
   qrtz
   qrtz myMethod
   */
exports.qrtz = () => function (p, method) {
  const recipe = p.getRecipe();
  if (typeof method === 'undefined') {
    return p.next(recipe.hasOwnProperty('quartz') ? Object.keys(recipe.quartz) : []);
  } else if (typeof method === 'string') {
    if (!recipe.hasOwnProperty('quartz') || !recipe.quartz.hasOwnProperty(method)) return p.fail(`qrtz: method ${method} does not exist.`);
    const qrtzFunction = recipe.quartz[method];
    if (qrtzFunction instanceof QrtzFunction) {
      const qrtzStatements = qrtzFunction.getStatements();
      return p.next(qrtzStatements.map(qrtzStatement => qrtzStatements.toString()));
    } else if (qrtzFunction instanceof Array) return p.next(qrtzFunction.map(qrtzStatement => qrtzStatement.toString()));
    else return p.fail(`qrtz: could not inspect method '${method}'.`);
  } else return p.fail('qrtz: expected string method name.');
};
