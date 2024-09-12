const express = require("express");
const session = require("express-session");
const dotenv = require("dotenv");
const WebSocket = require("ws");

const app = express();
dotenv.config({ path: ".env" });

app.set("view engine", "hbs");

app.use(
  session({
    secret: process.env.EXPRESS_SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
  })
);

app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(express.static("public"));

app.get("/", (req, res) => {
  res.render("index", { user: req.session, query: req.query });
});

app.get("/404", (req, res) => {
  res.render("404", { user: req.session, query: req.query });
});

app.use((req, res) => {
  res.redirect("/404");
});

app.listen(4000, () => {
  console.log("Server running at http://localhost:4000");
});
