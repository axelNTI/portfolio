const translate = (key, options) => {
	const lang = options.data.root.lang;
	return lang[key] || key;
};

module.exports = { translate };
