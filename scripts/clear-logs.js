// Script to clear logs in server/logs directory if there are no errors in them.

const fs = require("fs");
const path = require("path");

const logsDir = path.join(__dirname, "..", "server", "logs");

fs.readdir(logsDir, (err, files) => {
	if (err) {
		console.error(err);
		return;
	}

	if (files.length === 0) {
		console.log("No logs to clear.");
		return;
	}

	files.forEach((file) => {
		fs.readFile(path.join(logsDir, file), "utf8", (err, data) => {
			if (err) {
				console.error(err);
				return;
			}

			if (!data.length) {
				fs.unlink(path.join(logsDir, file), (err) => {
					if (err) {
						console.error(err);
						return;
					}
					console.log(`Cleared ${file}`);
				});
			}
		});
	});
});
