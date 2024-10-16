export const translate = (key, options) => {
	const locale = options.data.root.locale;
	return locale[key] || key;
};
