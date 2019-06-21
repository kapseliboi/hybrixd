const scheduler = require('../scheduler');
/**
   * Wait for one or more processes to finish and return the results.
   * @category Process
   * @param {String|Array<String>|Object<String>} processIDs - A string containing the processID or an array of strings containing multiple processIDs
   * @param {Number} [interval=500] - The amount of millisecs between each check if processes are finished
   * @example
   * read("123456")                   //Wait for process 123456 to finish and return its data.
   * read(["123456","654321"])        //Wait for processes 123456 and 654321 to finish and return their data combined into an array.
   * read({"a":null,"b":34})          //Wait for processes 123456 and 654321 to finish and return their data combined into an object with property labels a and b.
   */
exports.read = () => function (p, processIDs, millisecs) {
  scheduler.wait(p, processIDs, millisecs, this.next);
};
