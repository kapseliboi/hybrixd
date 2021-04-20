const fs = require('fs');

const pendingWrites = {};

function clearPendingWrite (recipe) {
  delete pendingWrites[recipe.filename];
}

function write (recipe) {
  if (pendingWrites.hasOwnProperty(recipe.filename)) { // check if a file write is in progresss
    pendingWrites[recipe.filename] = true; // signal that an update needs to be written.
    return {e: 0};
  } else {
    pendingWrites[recipe.filename] = false; // signal that a file write is in progress
    let content;
    try {
      content = JSON.stringify(recipe.vars);
    } catch (e) {
      global.hybrixd.logger(['error', 'vars'], 'Error stringifying local variable for file:' + recipe.filename);
      clearPendingWrite(recipe);
      return {e: 1, v: 'poke error: Failed to store local variable.'};
    }
    if (typeof content === 'string' && content !== '') {
      fs.writeFile('../var/recipes/' + recipe.filename, content, error => {
        if (error) {
          global.hybrixd.logger(['error', 'vars'], 'Error writing local variable to file:' + recipe.filename, error);
        }
        if (pendingWrites.hasOwnProperty(recipe.filename)) { // (should be the case)
          const pendingWrite = pendingWrites[recipe.filename]; // check if an update signal has been set
          clearPendingWrite(recipe);
          if (pendingWrite) write(recipe); // fire a new write
        }
      });
      return {e: 0};
    } else {
      clearPendingWrite(recipe);
      global.hybrixd.logger(['error', 'vars'], ' Error storing local variable content to file:' + recipe.filename, content);
      return {e: 1, v: 'poke error: Failed to store local variable.'};
    }
  }
}

function writeSync (recipe) {
  let content;
  try {
    content = JSON.stringify(recipe.vars);
  } catch (e) {
    global.hybrixd.logger(['error', 'vars'], 'Error stringifying local variable for file:' + recipe.filename);
    return {e: 1, v: 'poke error: Failed to store local variable.'};
  }
  if (typeof content === 'string' && content !== '') {
    fs.writeFile('../var/recipes/' + recipe.filename, content, error => {
      if (error) {
        global.hybrixd.logger(['error', 'vars'], 'Error writing local variable to file:' + recipe.filename, error);
      }
    });
    return {e: 0};
  } else {
    global.hybrixd.logger(['error', 'vars'], ' Error storing local variable content to file:' + recipe.filename, content);
    return {e: 1, v: 'poke error: Failed to store local variable.'};
  }
}

exports.write = writeSync;
