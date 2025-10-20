const { program } = require("commander");
const http = require("http");
const fs = require("fs").promises;
const { URL } = require("url");
const { XMLBuilder } = require("fast-xml-parser");

program
  .option("-i, --input <path>", "Input JSON file")
  .option("-h, --host <host>", "Input the host")
  .option("-p, --port <number>", "Input server port");

program.parse(process.argv);
const options = program.opts();

if (!options.input) {
  console.error("Please, specify input file");
  process.exit(1);
}

fs.access(options.input)
  .then(() => {
    if (!options.host) {
      console.error("Please, specify correct host");
      process.exit(1);
    }

    const port = parseInt(options.port, 10);
    if (Number.isNaN(port)) {
      console.error("Please specify correct -port");
      process.exit(1);
    }

    const server = http.createServer((req, res) => {
      const url = new URL(req.url, `http://${options.host}:${options.port}`);
      const furnished = url.searchParams.get("furnished");
      const maxPrice = url.searchParams.get("max_price");

      fs.readFile(options.input, { encoding: "utf8" })
        .then((data) => {
          const jsonData = JSON.parse(data);

          let filteredData = jsonData;
          if (furnished === "true") {
            filteredData = filteredData.filter(
              (h) => h.furnishingstatus === "furnished"
            );
          } else if (furnished === "false") {
            filteredData = filteredData.filter(
              (h) => h.furnishingstatus === "unfurnished"
            );
          }

          if (maxPrice) {
            filteredData = filteredData.filter(
              (h) => Number(h.price) <= Number(maxPrice)
            );
          }

          const builder = new XMLBuilder({
            ignoreAttributes: false,
            format: true,
          });

          const xmlData = {
            houses: {
              house: filteredData.map((h) => ({
                price: h.price,
                area: h.area,
                furnishingstatus: h.furnishingstatus,
              })),
            },
          };

          const xml = builder.build(xmlData);

          res.writeHead(200, { "Content-Type": "application/xml; charset=utf-8" });
          res.end(xml);
        })
        .catch((err) => {
          const message =
            err.code === "ENOENT"
              ? "Файл не знайдено"
              : err.name === "SyntaxError"
              ? "Помилка розбору JSON"
              : "Помилка читання файлу";

          res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
          res.end(`Internal Server Error: ${message}`);
        });
    });

    server.listen(port, options.host, () => {
      console.log(`Сервер працює на адресі: http://${options.host}:${options.port}`);
    });
  })
  .catch(() => {
    console.error("Cannot find input file");
    process.exit(1);
  });
