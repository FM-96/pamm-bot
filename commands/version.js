const version = require('../package.json').version;

module.exports = {
	command: 'version',
	run: async (message, context) => message.channel.send(`v${version}`),
};
