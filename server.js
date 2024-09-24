const express = require("express");
const session = require("express-session");
const dotenv = require("dotenv");
const WebSocket = require("ws");
const path = require("path");
const cookies = require("cookie-parser");
const yaml = require("js-yaml");
const fs = require("fs");
const Handlebars = require("handlebars");

const { translate } = require("./helpers/handlebars");

Handlebars.registerHelper("translate", translate);

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

const wss = new WebSocket.Server({ port: 8080 });

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
  console.log(typeof returnData.courses);

  res.render(page, { query: req.query, session: req.session, lang: returnLang, data: returnData });
};

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
