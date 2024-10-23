const express = require("express");
const session = require("express-session");
const dotenv = require("dotenv");
const { WebSocketServer } = require("ws");
const path = require("path");
const cookies = require("cookie-parser"); // Imported but not used in this snippet
const yaml = require("js-yaml");
const fs = require("fs");
const { engine: handlebars } = require("express-handlebars");
const sass = require("sass");
const sharp = require("sharp"); // Imported but not used in this snippet
const _ = require("lodash"); // Imported but not used in this snippet
const bcrypt = require("bcryptjs"); // Imported but not used in this snippet
const xss = require("xss");
const Joi = require("joi");

const handlebarsHelpers = require("./helpers/handlebars");

const logsDir = path.join(__dirname, "logs");
if (!fs.existsSync(logsDir)) {
	fs.mkdirSync(logsDir);
}

const logFile = path.join(logsDir, `${new Date().toISOString().replace(/:/g, "-")}.log`);
const logStream = fs.createWriteStream(logFile, { flags: "a" });

dotenv.config({ path: path.join(__dirname, "..", ".env") });

const app = express();

const hbs = handlebars({
	extname: "hbs",
	helpers: handlebarsHelpers,
	defaultLayout: false,
});

app.engine("hbs", hbs);
app.set("view engine", "hbs");
app.set("views", path.join(__dirname, "src", "views"));

app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(express.static(path.join(__dirname, "..", "public")));
// app.use(cookies());
app.use(
	session({
		secret: process.env.SESSION_SECRET,
		resave: false,
		saveUninitialized: false,
		cookie: { secure: false }, // Change to true when using HTTPS
	}),
);

const acceptedLanguages = fs.readdirSync(path.join(__dirname, "src", "locale")).map((file) => file.split(".")[0]);

const renderPage = (req, res, page) => {
	const schema = Joi.object({
		query: Joi.object().required(),
		session: Joi.object().required(),
	});

	const userLang = req.acceptsLanguages(...acceptedLanguages) || "en";
	const locale = yaml.load(fs.readFileSync(path.join(__dirname, "src", "locale", `${userLang}.yml`), "utf8"));
	const data = yaml.load(fs.readFileSync(path.join(__dirname, "src", "data", "data.yml"), "utf8"));

	const { error, value } = schema.validate({
		query: req.query,
		session: req.session,
	});

	if (error) {
		console.error(error);
		logStream.write(`${new Date().toISOString()} - ${error}\n`);
		return res.status(400).send("Bad request.");
	}

	res.render(page, {
		query: xss(JSON.stringify(value.query)),
		session: xss(JSON.stringify(value.session)),
		locale: locale,
		data: data,
	});
};

app.get("/scss/:file", (req, res) => {
	const file = req.params.file;
	const scssFile = fs.readFileSync(path.join(__dirname, "src", "scss", file), "utf8");
	const result = sass.compileString(scssFile, {
		sourceMap: true,
		loadPaths: [path.join(__dirname, "src", "scss")],
	});
	res.setHeader("Content-Type", "text/css");
	res.send(result.css);
});

app.get("/assets/images/:file", (req, res) => {
	// Get the users viewport size and the image's vw and vh sizes.
});

app.get("/", (req, res) => {
	renderPage(req, res, "index");
});

app.get("/noscript", (req, res) => {
	renderPage(req, res, "noscript");
});

app.get("/404", (req, res) => {
	renderPage(req, res, "404");
});

app.use((req, res) => {
	res.redirect("/404");
});

app.use((err, req, res, next) => {
	console.error(err.stack);
	logStream.write(`${new Date().toISOString()} - ${err.stack}\n`);
	res.status(500).send("Something broke!");
});

const server = app.listen(4000, () => {
	console.log("Server running at http://localhost:4000");
});

const wss = new WebSocketServer({ server });

const connections = new Map();

wss.on("connection", (ws) => {
	console.log("New client connected");
	connections.set(ws, ws);
	ws.addEventListener("message", (event) => {
		const message = event.data;
		console.log(`Received message: ${message}`);
		ws.send(`Server received your message: ${message}`);
	});

	ws.addEventListener("close", () => {
		connections.delete(ws);
		console.log("Client disconnected");
	});

	ws.addEventListener("error", (err) => {
		console.error(err);
		logStream.write(`${new Date().toISOString()} - ${err}\n`);
	});
});
