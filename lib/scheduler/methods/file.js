const scheduler = require('../scheduler');
const fs = require('fs');

/**
   * File reads the data of a filekey into process memory.
   * @param {Number} [success=1] - Where to jump when the data is found
   * @param {Number} [failure=1] - Where to jump when the data is not found
   * @example
   * file 2 1   // reads file contents and if successful jumps two steps, on failure jump one step
   */
exports.file = data => function (p, success, failure) { // TODO: pass offset and length
  if (p.getMime().startsWith('file:')) {
    const filePath = '../' + data.replace('..', ''); // 'file://*' => file : '$HYBRIXD_HOME/*'   //TODO Make safer MAYBE warning on '..' usage?
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath).toString('utf8');
      p.mime(p.processID, undefined); // reset type
      this.jump(p, isNaN(success) ? 1 : success || 1, data);
    } else {
      this.jump(p, isNaN(failure) ? 1 : failure || 1, data);
    }
  } else {
    this.jump(p, isNaN(failure) ? 1 : failure || 1, data);
  }
};
