const fs = require('fs');

const Quartz = function () {
  const method = name => {
    if (name === '') { return; }
    const source = require('./methods/' + name + '.js')[name];

    if (typeof source !== 'function') {
      console.log(` [!] Error initializing qrtz method '${name}'`);
    } else {
      this[name] = function (p) {
        if(global.hybrixd.proc.hasOwnProperty(p.processID)){
          const data = global.hybrixd.proc[p.processID].data;
          return source(data).apply(this, arguments);
        }else{
          console.log(` [!] Process not availabe '${p.processID}'`);
          return null;
        }
      }.bind(this);
    }
  };

  fs.readdir('./scheduler/methods', (err, files) => {
    if (err) {
      console.error('Could not list the directory.', err);
    } else {
      files.forEach((file) => { method(file.split('.')[0]); });
    }
  });
};

exports.Quartz = Quartz; // initialize a new process
