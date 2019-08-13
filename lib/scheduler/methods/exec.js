const Hybrix = require('../../../interface/hybrix-lib.nodejs');
const hybrix = new Hybrix.Interface({http: require('http')});

/**
   * Execute a client stack program.
   * @category Interface
   * @example
   * TODO: There is not yet an example of exec in this documentation.
   */
exports.exec = data => function (p, onSuccess, onError, xdata) {
  const ydata = typeof xdata === 'undefined' && typeof xdata !== 'number' ? data : xdata;
  const dataCallback = (data) => {
    global.hybrixd.proc[p.processID].data = data;
    this.jump(p, isNaN(onSuccess) ? 1 : onSuccess || 1);
  };
  const errorCallback = (error) => {
    if (typeof onError === 'undefined') {
      this.next(p, 1, error);
    } else {
      global.hybrixd.proc[p.processID].data = error;
      this.jump(p, isNaN(onError) ? 1 : onError || 1);
    }
  };
  const progressCallback = () => {};
  hybrix.sequential(ydata, dataCallback, errorCallback, progressCallback);
};
