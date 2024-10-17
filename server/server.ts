import express, { query, Request, Response } from "express";
import session from "express-session";
import dotenv from "dotenv";
import { WebSocketServer } from "ws";
import path from "path";
import cookies from "cookie-parser";
import yaml from "js-yaml";
import fs from "fs";
import { engine as handlebars } from "express-handlebars";
import * as sass from "sass";
import ts from "typescript";
import sharp from "sharp";
import _ from "lodash";
import bcrypt from "bcryptjs";
import { fileURLToPath } from "url";
import xss from "xss";
import Joi, { x } from "joi";

import * as handlebarsHelpers from "./helpers/handlebars";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

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
app.use(cookies());
app.use(
	session({
		secret: process.env.SESSION_SECRET as string,
		resave: false,
		saveUninitialized: false,
		cookie: { secure: false }, // Change to true when using HTTPS
	}),
);

const acceptedLanguages = fs.readdirSync(path.join(__dirname, "src", "locale")).map((file: string) => file.split(".")[0]);

const renderPage = (req: Request, res: Response, page: string) => {
	const schema = Joi.object({
		query: Joi.object().required(),
		session: Joi.object().required(),
	});

	const userLang = req.acceptsLanguages(...acceptedLanguages) || "en";
	const locale = yaml.load(fs.readFileSync(path.join(__dirname, "src", "locale", `${userLang}.yml`), "utf8"));
	const data = yaml.load(fs.readFileSync(path.join(__dirname, "src", "data", "data.yml"), "utf8"))

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
		query: xss(value.query),
		session: xss(value.session),
		locale: locale, 
		data: data, 
	});
};


app.get("/ts/:file", (req: Request, res: Response) => {
	const file = req.params.file;
	const tsFile = fs.readFileSync(path.join(__dirname, "src", "ts", file), "utf8");
	const options: ts.TranspileOptions = {
		compilerOptions: {
			module: ts.ModuleKind.CommonJS,
			target: ts.ScriptTarget.ES5,
		},
	};
	const result = ts.transpileModule(tsFile, options);
	res.setHeader("Content-Type", "text/javascript");
	res.send(result.outputText);
});

app.get("/scss/:file", (req: Request, res: Response) => {
	const file = req.params.file;
	const scssFile = fs.readFileSync(path.join(__dirname, "src", "scss", file), "utf8");
	const result = sass.compileString(scssFile, {
		sourceMap: true,
		loadPaths: [path.join(__dirname, "src", "scss")],
	});
	res.setHeader("Content-Type", "text/css");
	res.send(result.css);
});

app.get("/assets/images/:file", (req: Request, res: Response) => {
	// Get the users viewport size and the image's vw and vh sizes.
});

app.get("/", (req: Request, res: Response) => {
	renderPage(req, res, "index");
});

app.get("/404", (req: Request, res: Response) => {
	renderPage(req, res, "404");
});

app.post("/POST/viewport", (req: Request, res: Response) => {
	// Save the viewport dimensions to the session.
	req.session!.viewport = {
		width: req.body.width,
		height: req.body.height,
		rem: req.body.rem,
	};
	req.session.save((err: any) => {
		if (err) {
			console.error(err);
			logStream.write(`${new Date().toISOString()} - Error saving viewport dimensions.\n`);
			return res.status(500).send("Error saving viewport dimensions.");
		}
		return res.status(200).send("Viewport dimensions saved.");
	});
});

app.use((req: Request, res: Response) => {
	res.redirect("/404");
});

app.use((err: Error, req: Request, res: Response, next: express.NextFunction) => {
	console.error(err.stack);
	logStream.write(`${new Date().toISOString()} - ${err.stack}\n`);
	res.status(500).send("Something broke!");
});

const server = app.listen(4000, () => {
	console.log("Server running at http://localhost:4000");
});

const wss = new WebSocketServer({ server });

const connections: Map<WebSocket, WebSocket> = new Map();

wss.on("connection", (ws: WebSocket) => {
	console.log("New client connected");
	connections.set(ws, ws);
	ws.addEventListener("message", (event) => {
		const message = event.data as string;
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
