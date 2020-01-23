const id = 'hybrixd';
const fs = require('fs');
const path = require('path');

const recipesDirectory = '../../recipes/';
const modulesDirectory = '../../modules/';

const meta = JSON.parse(fs.readFileSync('../../lib/conf/metaconf.json').toString());

function collectRecipesRecursivelySync (dir) {
  const results = [];
  const files = fs.readdirSync(dir);
  for (let file of files) {
    const filePath = path.resolve(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      const dirFiles = collectRecipesRecursivelySync(filePath);
      results.push(...dirFiles);
    } else if (path.extname(filePath) === '.json') { // Ignore non json files
      results.push(filePath);
    }
  }
  return results;
}

function getModulesDirectory (modules, moduleName) {
  if (fs.statSync(modulesDirectory + moduleName).isDirectory()) {
    const moduleRecipeFiles = fs.readdirSync(modulesDirectory + moduleName);
    const filesInDirectory = moduleRecipeFiles.map(fileName => modulesDirectory + moduleName + '/' + fileName).filter(fileName => fileName.endsWith(moduleName + '.json'));
    return modules.concat(filesInDirectory);
  } else {
    return modules;
  }
}

const moduleDirectories = fs.readdirSync(modulesDirectory).reduce(getModulesDirectory, []);

const recipeFiles = collectRecipesRecursivelySync(recipesDirectory);
recipeFiles.concat(moduleDirectories).forEach(filePath => {
  const recipe = JSON.parse(fs.readFileSync(filePath));
  if (recipe.hasOwnProperty('conf')) {
    console.log(filePath);

    const id = recipe.asset || recipe.engine || recipe.source;
    meta[id] = recipe.conf;
  }
});

const html = fs.readFileSync('../../docs/source/hybrixd.html').toString();

let data = '';
data += fs.readFileSync('../../docs/source/header.html').toString();

data += html;
data += '<script>initNavigation("' + id + '")</script>';

function describe (meta, name) {
  if (name) {
    data += '<div class="command-header" onclick="toggleCommand(\'' + name.trim() + '\')"><b>' + name.trim() + '</b>';

    data += '<span class="quickDescription">';

    data += 'description' + '</span></div><div style="display:none;" class="command-body" id="' + name.trim() + '">';
  }
  for (let key in meta) {
    const item = meta[key];
    if (item.hasOwnProperty('default') || item.hasOwnProperty('info') || item.hasOwnProperty('type') || item.hasOwnProperty('unit')) {
      const unit = item.hasOwnProperty('unit') ? ('&nbsp;' + item.unit) : '';

      data += '<code class="ref">' + key + '</code>: &nbsp;';
      if (item.hasOwnProperty('info')) { data += item['info']; }
      if (item.hasOwnProperty('default')) { data += ' [default = ' + JSON.stringify(item['default']) + unit + ']'; }

      data += '<br/>';
    } else { // subcategory;
      describe(item, key);
    }
  }
  if (name) {
    data += '</div><br/>';
  }
}

describe(meta);

data += fs.readFileSync('../../docs/source/footer.html').toString();

fs.writeFileSync('../../docs/' + id + '.html', data);
