const path = process.argv[2];

const exec = require('child_process').exec;
const fs = require('fs');



const yourscript = exec('sh '+path+'/cli-wallet --help',
                        (error, stdout, stderr) => {


                          let r =`<table class="ref-table">
                          <tr><th>Short</th>                     <th>Command</th>                            <th>Description</th>
                          <tr><td><code class="ref">-h</code></td>   <td><code class="ref">--help</code></td>    <td>Display help</td>`

                          const lines = stdout.split('\n');
                          for(let i=2; i<lines.length;++i){
                            const data = /\s*-(\w+),\s*--(\w+)(\s<ARG1>)?(\s<ARG2>)?(\s<ARG3>)?(\s<ARG4>)?\s+(.+)$/g.exec(lines[i]);
                            if(data!==null){
                              r+=`<tr><td><code class="ref">-${data[1]}</code></td><td><code class="ref">--${data[2]}</code></td><td>${data[7]}</td>`;
                            }
                          }
                          r+='</table>';

                          let html = fs.readFileSync('../../docs/source/header.html').toString()
                          html+=fs.readFileSync('../../docs/source/cli.html').toString().replace('<table></table>',r);
                          html += fs.readFileSync('../../docs/source/footer.html').toString()
                          fs.writeFileSync('../../docs/cli.html',html);
        });
