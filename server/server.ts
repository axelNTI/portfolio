import express, { Request, Response } from "express";
import session from "express-session";
import dotenv from "dotenv";
import websocket from "ws";
import path from "path";
import cookies from "cookie-parser";
import yaml from "js-yaml";
import fs from "fs";
import { engine as handlebars } from "express-handlebars";
import sass from "sass";
import ts from "typescript";
import sharp from "sharp";
import _ from "lodash";
import bcrypt from "bcryptjs";

import * as handlebarsHelpers from "./helpers/handlebars";

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
app.use(express.static(path.join(__dirname, "public")));
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
	console.log(req.session?.viewport);
	const userLang = req.acceptsLanguages(...acceptedLanguages) || "en";
	const langFile = fs.readFileSync(path.join(__dirname, `./src/locale/${userLang}.yml`), "utf8");
	const returnLang = yaml.load(langFile) as Record<string, any>;
	const dataFile = fs.readFileSync(path.join(__dirname, "./src/data/data.yml"), "utf8");
	const returnData = yaml.load(dataFile) as Record<string, any>;

	res.render(page, {
		query: req.query,
		session: req.session,
		lang: returnLang,
		data: returnData,
	});
};

app.get("/ts/:file", (req: Request, res: Response) => {
	const file = req.params.file;
	const tsFile = fs.readFileSync(path.join(__dirname, `./ts/${file}`), "utf8");
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
	const scssFile = fs.readFileSync(path.join(__dirname, `./scss/${file}`), "utf8");
	const result = sass.compileString(scssFile, {
		sourceMap: true,
		loadPaths: [path.join(__dirname, "scss")],
	});
	res.setHeader("Content-Type", "text/css");
	res.send(result.css);
});

app.get("/assets/images/:file", (req: Request, res: Response) => {
	console.log("Image request received.");
	console.log(req.session?.viewport);
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
	console.log("Viewport dimensions received.");
	req.session!.viewport = {
		width: req.body.width,
		height: req.body.height,
		rem: req.body.rem,
	};
	console.log(req.session.viewport);
	req.session.save((err: any) => {
		if (err) {
			console.error(err);
			return res.status(500).send("Error saving viewport dimensions.");
		}
		return res.status(200).send("Viewport dimensions saved.");
	});
});

app.use((req: Request, res: Response) => {
	res.status(404);
	res.redirect("/404");
});

const server = app.listen(4000, () => {
	console.log("Server running at http://localhost:4000");
});

const wss = new websocket.Server({ noServer: true });
const connections = new Map();

wss.on("connection", (ws: websocket, req: Request) => {
	console.log(req.url);
});
