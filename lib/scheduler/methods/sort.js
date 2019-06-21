/**
   * Sort data by using a certain method.
   * @category Array/String
   * @param {String} method - Array of methods to employ.
   * @example
   *  sort()                                          // input: 'BADEFC', sorts the object ascending by value: 'ABCDEF'
   *  sort('desc')                                    // input: [10,8,5,9], sorts the object descending by value: [10,9,8,5]
   *  sort(['val','asc'])                             // input: {'a':'z','b':'x','c':'y'}, sorts the object ascending by value: [{'b':'x'},{'c':'y'},{'c':'z'}]
   *  sort(['key','desc'])                            // input: {'a':2,'b':1,'c':3}, sorts the object descending by key:  [{'c':3},{'b':1},{'a':2}]
   *  sort(['val','num','asc'])                       // input: {'a':1,'b':10,'c':3}, sorts the object ascending by numeric value:  [{'a':1},{'c':3},{'b':10}]
   *  sort('.b')                                      // input: [{'a':4,'b':'B'},{'a':2,'b':'A'}], sorts the array by object key 'b': [{'a':2,'b':'A'},{'a':4,'b':'B'}]
   */
exports.sort = object => function (p, method) {
  if (!method) { method = ['asc']; }
  // set default sorting method if unspecified
  if (typeof method === 'string') { method = [method]; }
  function intSort (a, b) { return a - b; }
  function sortAssocObject (list, reverse, sortInteger, sortByKey) {
    let sortable = [];
    let ind = sortByKey ? 0 : 1;
    for (let key in list) {
      sortable.push([key, list[key]]);
    }
    if (sortInteger) {
      sortable.sort(function (a, b) {
        return a[ind] - b[ind];
      });
    } else {
      sortable.sort(function (a, b) {
        return (String(a[ind]) === String(b[ind]) ? 0 : (String(a[ind]) > String(b[ind]) ? 1 : -1));
      });
    }
    if (reverse) { sortable.reverse(); }
    let orderedList = [];
    let listObj;
    for (let i = 0; i < sortable.length; i++) {
      listObj = {};
      listObj[String(sortable[i][0])] = sortable[i][1];
      orderedList.push(listObj);
    }
    return orderedList;
  }
  function sortArrayByObjKey (arr, key, reverse, sortInteger) {
    // make key value index
    let unordered = {};
    for (let i in arr) {
      if (typeof arr[i][key] !== 'undefined') {
        unordered[arr[i][key]] = i;
      }
    }
    // sort object list
    let ordered = [];
    let cnt = 0;
    let list;
    if (sortInteger) {
      list = Object.keys(unordered).sort(intSort);
    } else {
      list = Object.keys(unordered).sort();
    }
    list.forEach((key) => {
      ordered[cnt] = arr[unordered[key]];
      cnt++;
    });
    if (reverse) { ordered = ordered.reverse(); }
    return ordered;
  }
  let sortDesc = 0;
  let sortByKey = 0;
  let sortByObj = 0;
  let sortInteger = 0;
  let isArray = 0;
  let isString = 0;
  let methodCase;
  let objName;
  if (Object.prototype.toString.call(object) === '[object Array]') {
    isArray = 1;
  } else if (typeof object === 'string') {
    isArray = 1;
    isString = 1;
    object = object.split('');
  }
  for (let i = 0; i < method.length; i++) {
    if (method[i].substr(0, 1) === '.') {
      sortByObj = 1;
      methodCase = 'obj';
      objName = method[i].substr(1);
    } else {
      methodCase = method[i];
    }
    switch (methodCase) {
      case 'val':
        sortByKey = 0;
        sortByObj = 0;
        break;
      case 'key':
        sortByKey = 1;
        sortByObj = 0;
        break;
      case 'num':
        sortInteger = 1;
        break;
      case 'idx':
        sortInteger = 0;
        break;
      case 'obj':
        sortByKey = 0;
        sortByObj = 1;
        break;
      case 'asc':
        sortDesc = 0;
        break;
      case 'desc':
        sortDesc = 1;
        break;
    }
  }
  if (sortDesc) {
    if (isArray) {
      if (sortByObj) {
        object = sortArrayByObjKey(object, objName, 1, sortInteger);
      } else {
        object = sortInteger ? object.sort(intSort).reverse() : object.sort().reverse();
      }
    } else {
      object = sortAssocObject(object, 1, sortInteger, sortByKey);
    }
  } else {
    if (isArray) {
      if (sortByObj) {
        object = sortArrayByObjKey(object, objName, 0, sortInteger);
      } else {
        object = sortInteger ? object.sort(intSort) : object.sort();
      }
    } else {
      object = sortAssocObject(object, 0, sortInteger, sortByKey);
    }
  }
  if (isString) {
    object = object.join('');
  }
  this.next(p, 0, object);
};
