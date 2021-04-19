
const fs = require('fs');

process.chdir('./lib');

global = {
  hybrixd: {
    logger: console.trace
  }
};

const content = fs.readFileSync('../recipes/engine.testquartz.json');
const recipe = JSON.parse(content);

fs.readdir('./scheduler/methods/', (error, fileNames) => {
  if (error) {
    console.error('[!] Could not list the directory.', error);
    process.exit(1);
  }

  fileNames.filter(fileName => fileName.endsWith('.js')).forEach(fileName => {
    const method = require('../../lib/scheduler/methods/' + fileName);
    if (typeof method !== 'object' || method === null) {
      // TODO error
    } else if (method.hasOwnProperty('tests')) {
      for (const id in method.tests) {
        // TODO check duplicates
        recipe.quartz[id] = method.tests[id];
      }
    } else {
      console.warn('[!] ' + fileName + ' has no tests.');
    }
  });
  const sortedQuartz = {};
  for (const id of Object.keys(recipe.quartz).sort()) sortedQuartz[id] = recipe.quartz[id];
  recipe.quartz = sortedQuartz;
  fs.writeFileSync('../recipes/engine.testquartz.json', JSON.stringify(recipe, null, 2));
});
