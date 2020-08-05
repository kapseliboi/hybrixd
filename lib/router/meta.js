//
// (c)2020 hybrixd - Rouke Pouw
//

function addNonRootMetaOnly (target, source) {
  if (source._access === 'root') return;
  for (let key in source) {
    const node = source[key];
    if (typeof node === 'string') target[key] = node;
    else {
      target[key] = {};
      addNonRootMetaOnly(target[key], source[key]);
      if (Object.keys(target[key]).length === 0) delete target[key];
    }
  }
}

function process (request, xpath) {
  // TODO  add sub results using xpath
  if (request.sessionID === 1) {
    return {
      error: 0,
      data: global.hybrixd.routetree
    };
  } else {
    const routeTree = {};
    addNonRootMetaOnly(routeTree, global.hybrixd.routetree);
    return {
      error: 0,
      data: routeTree
    };
  }
}

exports.process = process;
