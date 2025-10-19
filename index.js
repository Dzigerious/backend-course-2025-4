const { program } = require("commander");
const http = require('http');
const fs = require('fs');


program
    .option('-i, --input <path>', 'Input JSON file')
    .option('-h, --host <host>', 'Input the host ')
    .option('-p, --port <number>', 'Input server port'); //can use requiredOption

program.parse(process.argv);
const options = program.opts();

if (!options.input) {
  console.error("Please, specify input file");
  process.exit(1);
}

if (!fs.existsSync(options.input)) {
  console.error("Cannot find input file");
  process.exit(1);
}

if (!options.host) {
  console.error("Please, specify correct host");
  process.exit(1);
}

const port = parseInt(options.port, 10);

if (Number.isNaN(port)) {
    console.error("Please specify correct -port");
    process.exit(1);
}

const server = http.createServer((req, res) => { //can send inf to client cuz of res
    res.writeHead(200, {'Content-Type': 'text/plain'});
    res.end("Сервер працює");
});

server.listen(port, options.host, () => {
    console.log(` сервер працює на адресі: http://${options.host}:${options.port}`);
});

let data = JSON.parse(fs.readFileSync(options.input, 'utf-8'));


