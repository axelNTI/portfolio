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
const sharp = require("sharp");
const _ = require("lodash");

const handlebars = require("./helpers/handlebars.ts");

hbs.registerHelper("translate", handlebars.translate);

const app = express();
dotenv.config({ path: path.join(__dirname, ".env") });

const sessionParser = session({
	secret: process.env.EXPRESS_SESSION_SECRET,
	resave: false,
	saveUninitialized: false,
	cookie: { secure: false }, // Change to true when using HTTPS
});

app.set("view engine", "hbs");
app.set("views", path.join(__dirname, "views"));

app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));
app.use(cookies());
app.use(sessionParser);

const acceptedLanguages = fs.readdirSync(path.join(__dirname, "./locale")).map((file) => file.split(".")[0]);

const renderPage = (req, res, page) => {
	console.log(req.session.viewport);
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

app.get("/assets/images/:file", (req, res) => {
	console.log("Image request received.");
	console.log(req.session.viewport);
	// Get the users viewport size and the image's vw and vh sizes.
});

app.get("/", (req, res) => {
	renderPage(req, res, "index");
});

app.get("/404", (req, res) => {
	renderPage(req, res, "404");
});

app.post("/POST/viewport", (req, res) => {
	// Save the viewport dimensions to the session.
	console.log("Viewport dimensions received.");
	req.session.viewport = { width: req.body.width, height: req.body.height, rem: req.body.rem };
	console.log(req.session.viewport);
	req.session.save((err) => {
		if (err) {
			console.error(err);
			return res.status(500).send("Error saving viewport dimensions.");
		}
		return res.status(200).send("Viewport dimensions saved.");
	});
});

app.use((req, res) => {
	res.status(404);
	res.redirect("/404");
});

const server = app.listen(4000, () => {
	console.log("Server running at http://localhost:4000");
});

const wss = new websocket.Server({ noServer: true });
const connections = new Map();

wss.on("connection", (ws, req) => {
	sessionParser(req, {}, () => {
		const sessionID = req.sessionID || req.session.id;

		const query = req.url.split("?");
		query.shift();
		const params = {};
		query.forEach((item) => {
			const [key, value] = item.split("=");
			params[key] = value;
		});

		connections.set(ws, { sessionID, params, session: req.session });

		ws.on("close", () => {
			connections.delete(ws);
		});
	});
});

server.on("upgrade", (req, socket, head) => {
	sessionParser(req, {}, () => {
		if (!req.session) {
			socket.destroy();
			return;
		}

		wss.handleUpgrade(req, socket, head, (ws) => {
			wss.emit("connection", ws, req);
		});
	});
});
