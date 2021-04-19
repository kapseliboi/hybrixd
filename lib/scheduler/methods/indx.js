/**
   * Find a string in a string or an array of strings, and return the index(es) of it.
   * @category Array/String
   * @param {String} needle - The string to find the index of
   * @param {Boolean} [backwardSearch=false] - Search backwards
   * @param {Boolean} [arraySearch=false] - Return index from every array element
   * @example
   * indx 'needle'             // input: 'This is a needle and not a needle...', output: 10
   * indx 'needle' true        // input: 'This is a needle and not a needle...', output: 27
   * indx 'needle'             // input: ['This is a needle...','This is not','needle'] output: 3
   * indx 'needle' false true  // input: ['This is a needle...','This is not','needle'] output: [10,-1,0]
   */
exports.indx = ydata => function (p, needle, backwards, arraysearch) {
  if (arraysearch && ydata instanceof Array) {
    const matches = [];
    for (let i = 0; i < ydata.length; i++) {
      const tdata = (typeof ydata[i] !== 'string') ? String(ydata[i]) : ydata[i];
      const indx = backwards ? tdata.lastIndexOf(needle) : tdata.indexOf(needle);
      matches.push(indx);
    }
    this.next(p, 0, matches);
  } else {
    if (typeof ydata !== 'string' && !(ydata instanceof Array)) {
      ydata = String(ydata);
    }
    const matches = backwards ? ydata.lastIndexOf(needle) : ydata.indexOf(needle);
    this.next(p, 0, matches);
  }
};

exports.tests = {
  indx: [
    "data 'This is a needle and not a needle...'",
    "indx 'needle'",
    'flow 10 1 2',
    'done $OK',
    'fail'
  ],
  indx2: [
    "data 'This is a needle and not a needle...'",
    "indx 'needle' true",
    'flow 27 1 2',
    'done $OK',
    'fail'
  ],
  indx3: [
    "data ['This is a needle and not a needle...',0,null,'needle','nein']",
    "indx 'needle'",
    'flow 3 1 2',
    'done $OK',
    'fail'
  ],
  indx4: [
    "data ['This is a needle and not a needle...',0,null,'needle','nein']",
    "indx 'needle' true",
    'flow 3 1 2',
    'done $OK',
    'fail'
  ],
  indx5: [
    "data ['This is a needle and not a needle...',0,null,'needle','nein']",
    "indx 'needle' false true",
    'flow [10,-1,-1,0,-1] 1 2',
    'done $OK',
    'fail'
  ],
  indx6: [
    "data ['This is a needle and not a needle...',0,null,'needle','nein']",
    "indx 'needle' true true",
    'flow [27,-1,-1,0,-1] 1 2',
    'done $OK',
    'fail'
  ]
};
