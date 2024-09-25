const express = require("express");
const session = require("express-session");
const dotenv = require("dotenv");
const websocket = require("ws");
const path = require("path");
const cookies = require("cookie-parser");
const yaml = require("js-yaml");
const fs = require("fs");
const hbs = require("hbs");
const sass = require("sass");
const ts = require("typescript");

const _ = require("lodash");

const handlebars = require("./helpers/handlebars.ts");

hbs.registerHelper("translate", handlebars.translate);

const app = express();
dotenv.config({ path: path.join(__dirname, ".env") });

app.set("view engine", "hbs");
app.set("views", path.join(__dirname, "views"));

app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));
app.use(cookies());
app.use(
  session({
    secret: process.env.EXPRESS_SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
  }),
);

const wss = new websocket.Server({ port: 8080 });

const connections = new Map();

wss.on("connection", (ws, req) => {
  const query = req.url.split("?");
  query.shift();
  const params = {};
  query.forEach((item) => {
    const [key, value] = item.split("=");
    params[key] = value;
  });
  connections.set(ws, params);
  ws.on("close", () => {
    connections.delete(ws);
  });
});

const acceptedLanguages = fs.readdirSync(path.join(__dirname, "./locale")).map((file) => file.split(".")[0]);

const renderPage = (req, res, page) => {
  const userLang = req.acceptsLanguages(...acceptedLanguages) || "en";
  const langFile = fs.readFileSync(path.join(__dirname, `./locale/${userLang}.yml`), "utf8");
  const returnLang = yaml.load(langFile);
  const dataFile = fs.readFileSync(path.join(__dirname, "./data/data.yml"), "utf8");
  const returnData = yaml.load(dataFile);
  res.render(page, { query: req.query, session: req.session, lang: returnLang, data: returnData });
};

app.get("/ts/:file", (req, res) => {
  const file = req.params.file;
  const tsFile = fs.readFileSync(path.join(__dirname, `./ts/${file}`), "utf8");
  const options = {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES5,
  };
  const result = ts.transpileModule(tsFile, options);
  res.setHeader("Content-Type", "text/javascript");
  res.send(result.outputText);
});

app.get("/scss/:file", (req, res) => {
  const file = req.params.file;
  const scssFile = fs.readFileSync(path.join(__dirname, `./scss/${file}`), "utf8");
  const result = sass.compileString(scssFile, {
    sourceMap: true,
    loadPaths: [path.join(__dirname, "scss")],
  });
  res.setHeader("Content-Type", "text/css");
  res.send(result.css);
});

app.get("/", (req, res) => {
  renderPage(req, res, "index");
});

app.get("/404", (req, res) => {
  renderPage(req, res, "404");
});

app.use((req, res) => {
  res.status(404);
  res.redirect("/404");
});

app.listen(4000, () => {
  console.log("Server running at http://localhost:4000");
});
