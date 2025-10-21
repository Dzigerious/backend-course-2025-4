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

fs.access(options.input)
  .then(() => {
    const validHosts = ["localhost", "127.0.0.1", "::1"];
    const hostRegex =
      /^(?!-)[A-Za-z0-9-]{1,63}(?<!-)(\.[A-Za-z]{2,})+$|^localhost$|^(\d{1,3}\.){3}\d{1,3}$/;

    if (!validHosts.includes(options.host) && !hostRegex.test(options.host)) {
      console.error(`Please, specify correct host (e.g., localhost or 127.0.0.1)`);
      process.exit(1);
    }

    // Перевірка порту
    const port = parseInt(options.port, 10);
    if (Number.isNaN(port) || port <= 0 || port > 65535) {
      console.error("Please, specify correct --port (1-65535)");
      process.exit(1);
    }

    const server = http.createServer((req, res) => {
      const url = new URL(req.url, `http://${options.host}:${options.port}`);
      const furnished = url.searchParams.get("furnished");
      const maxPrice = url.searchParams.get("max_price");

      fs.readFile(options.input, { encoding: "utf8" })
        .then((data) => {
          let jsonData;
          try {
            jsonData = JSON.parse(data);
          } catch (e) {
            res.writeHead(422, { "Content-Type": "text/plain; charset=utf-8" });
            return res.end("Unprocessable Entity: Помилка розбору JSON");
          }

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
          if (err && err.code === "ENOENT") {
            res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
            return res.end("Not Found: Файл не знайдено");
          }

          const message =
            err.name === "SyntaxError"
              ? "Помилка розбору JSON"
              : "Помилка читання файлу";

          res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
          res.end(`Internal Server Error: ${message}`);
        });
    });

    server.on("error", (err) => {
      if (err.code === "EADDRINUSE") {
        console.error(`Port ${options.port} is already in use`);
      } else if (err.code === "EACCES") {
        console.error(`Permission denied for port ${options.port}`);
      } else {
        console.error("Server error:", err.message);
      }
      process.exit(1);
    });

    server.listen(port, options.host, () => {
      console.log(`Сервер працює на адресі: http://${options.host}:${options.port}`);
    });
  })
  .catch(() => {
    console.error("Cannot find input file");
    process.exit(1);
  });