const scheduler = require('../scheduler');
const fs = require('fs');

/**
   * File reads the data of a filekey into process memory
   * @example
   * file(2,1)   // reads file contents and if successful jumps two steps
   */
exports.file = data => function (p, success, failure) { // todo pass offest and length
  const process = global.hybrixd.proc[p.parentID]; // TODO handle global different
  const processStep = global.hybrixd.proc[p.processID]; // TODO handle global different
  if (process.type.startsWith('file:')) {
    const filePath = '../' + processStep.data.replace('..', ''); // 'file://*' => file : '$HYBRIXD_HOME/*'   //TODO Make safer MAYBE warning on '..' usage?
    if (fs.existsSync(filePath)) {
      processStep.data = fs.readFileSync(filePath).toString('utf8');
      scheduler.mime(p.processID, undefined); // reset type
      this.jump(p, isNaN(success) ? 1 : success || 1, processStep.data);
    } else {
      this.jump(p, isNaN(failure) ? 1 : failure || 1, processStep.data);
    }
  } else {
    this.jump(p, isNaN(failure) ? 1 : failure || 1, processStep.data);
  }
};
