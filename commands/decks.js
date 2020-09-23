const got = require('got');

const auth = require('../auth.json');

let isRunning = false;

module.exports = {
	command: 'decks',
	run: async (message, context) => {
		if (isRunning) {
			// request is already in progress, don't send a second one
			await message.channel.send('I\'m already doing this. Please have a bit of patience.');
		} else {
			isRunning = true;
			let success;

			got(auth.decksUrl, {responseType: 'json'}).then((result) => {
				success = result.body.success;
				if (!success) {
					console.error('Script execution returned an error:');
					console.error(result.body.error);
				}
			}).catch((err) => {
				success = false;
				console.error('Got error:');
				console.error(err);
			}).then(async (res) => {
				try {
					if (success) {
						await message.channel.send('Deck ratings overview was successfully rebuilt.');
					} else {
						await message.channel.send('There seems to have been a problem; I could not complete the request.');
					}
				} catch (err) {
					console.error(err);
				}
				isRunning = false;
			});
		}
	},
};
