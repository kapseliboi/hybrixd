const router = require('../../router/router');
const scheduler = require('../../scheduler/scheduler');

/**
   * Route a path through hybrixd and pass the result to the next step. /api/help for API information.
   * @param {String} path - Provide the routing path
   * @example
   * rout '/asset/dummy/balance/__dummyaddress__'    // retrieve the balance for the dummy asset
   * rout '/asset/dummy/fee' @success @failure       // retrieve the fee for the dummy asset, on success jump to @success, else jump to @failure
   */
exports.rout = data => function (p, xpath, success, failure) {
  // TODO pass data to post
  const sessionID = global.hybrixd.proc[p.processID.split('.')[0]].sid;
  const result = router.route({url: xpath, sessionID: sessionID});
  if (result.id === 'id') { // if result is a process that has te be awaited, then read that proces until finished
    scheduler.wait(p, result.data, 0, (p, err, xdata) => {
      if (err) {
        this.jump(p, isNaN(failure) ? 1 : failure || 1, xdata);
      } else {
        this.jump(p, isNaN(success) ? 1 : success || 1, xdata);
      }
    });
  } else {
    scheduler.help(p.processID, result.help);
    scheduler.mime(p.processID, result.type);
    if (result.hasOwnProperty('error')) {
      this.jump(p, isNaN(failure) ? 1 : failure || 1, {error: result.hasOwnProperty('error') ? result.error : 1, data: result.hasOwnProperty('data') ? result.data : null});
    } else {
      this.jump(p, isNaN(success) ? 1 : success || 1, result.hasOwnProperty('data') ? result.data : null);
    }
  }
};
