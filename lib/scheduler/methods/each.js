/**
   * Iterate through elements of a container execute a given function for each element.
   * @category Process
   * @param {Array|Object} input -  TODO
   * @param {String} command -  A string containg the command path. "command/a/b". This calls command using $1 = "a", $2 = "b"
   * @example
   * data ["a","b","c"]
   * each test           //  calls test with data = {key=0, value="a"} and further
   * data {"a":0,"b":1,"c":2}
   * each test/x/y       //  calls test/x/y with data = {key="a", value=0} and further
   */
exports.each = data => function (p, command) {
  let processIDs;
  if (data instanceof Array) { // Array
    processIDs = [];
    for (let key = 0; key < data.length; ++key) {
      processIDs.push(this.fork(p, command, key, {data, key: key, value: data[key]}));
    }
  } else { // Dictionary
    processIDs = {};
    let index = 0;
    for (let key in data) {
      processIDs[key] = this.fork(p, command, index, {data, key: key, value: data[key]});
      ++index;
    }
  }
  this.read(p, processIDs);
};
