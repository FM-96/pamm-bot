const fs = require('fs');
const path = require('path');

module.exports = {
	name: 'showCard',
	limited: true,
	test: async (message) => !message.author.bot && message.content.match(new RegExp(`^<@!?${message.client.user.id}>$`)),
	run: async (message, context) => {
		const cardImagePath = path.join(__dirname, '..', 'assets', 'Pamm Servant to Planeswalkers.png');
		const cardImage = fs.readFileSync(cardImagePath, null);
		return message.channel.send('', {files: [cardImage]});
	},
};
