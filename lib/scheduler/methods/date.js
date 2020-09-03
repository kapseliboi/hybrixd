const dateFormat = require('../../../common/node_modules/dateformat');
/**
   * Convert a date String and return it's Unix timestamp.
   * @param {String} [format='epoch'] - Specify the format for the date
   * @param {String} [timestamp=''] - Specify 'now' to use the current time.
   * @category Array/String
   * @example
   * date                            // input 07-01-1985, output: '473904000' (The date/time epoch for January 7th 1985.)
   * date now                        // output: '1549468836' (The current date/time epoch.)
   * date 'yyyy-mm-dd hh:MM:ss'      // input 07-01-1985, output: '1985-01-07 00:00:00' (Formatted date/time epoch for January 7th 1985.)
   * date 'yyyy-mm-dd hh:MM:ss' now  // output: '2020-09-02 18:30:55' (Formatted current date/time.)
   * date epoch '1985-01-07'         // output: '473904000' (Formatted date/time epoch for January 7th 1985.)
   * date 'isoUtcDateTime'           // output: '2020-09-02T18:30:55Z' (ISO formatted current date/time.)
   */
exports.date = data => function (p, timestampOrFormat, timestamp) {
  let format = 'epoch';
  let d;
  if (typeof timestampOrFormat === 'undefined' && typeof timestamp === 'undefined') {
    d = new Date(data).getTime();
  } else if (typeof timestampOrFormat !== 'undefined' && typeof timestamp === 'undefined') {
    if (timestampOrFormat === 'now') {
      d = Date.now();
    } else if (!isNaN(Date.parse(timestampOrFormat))) {
      d = new Date(timestampOrFormat).getTime();
    } else {
      d = new Date(data).getTime();
      format = timestampOrFormat;
    }
  } else {
    d = timestamp === 'now'
      ? Date.now()
      : new Date(timestamp).getTime();
    format = timestampOrFormat;
  }

  if (isNaN(d)) return p.fail('date: could not parse date.');

  const dateOutput = format === 'epoch'
    ? d / 1E3
    : dateFormat(d, format);
  return p.next(dateOutput);
};
