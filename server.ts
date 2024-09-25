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

const renderPage = (req, res, page) => {
  const userLang = req.acceptsLanguages("en", "sv") || "en";
  const langFile = fs.readFileSync(path.join(__dirname, `./locale/${userLang}.yml`), "utf8");
  const returnLang = yaml.load(langFile);
  const dataFile = fs.readFileSync(path.join(__dirname, "./data/data.yml"), "utf8");
  const returnData = yaml.load(dataFile);
  res.render(page, { query: req.query, session: req.session, lang: returnLang, data: returnData });
};

// app.get("/style.css", (req, res) => {
//     res.setHeader('Content-Type', 'text/css');
//     res.send(
//         "body {   background-color: #ff00ff;    font-family: Arial, sans-serif;}"
//     );
// });

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
