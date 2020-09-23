const commandHandler = require('command-handler');
const Discord = require('discord.js');

const path = require('path');

const auth = require('./auth.json');
const EMOJI = require('./emoji.js');
const scheduleUtil = require('./schedule-util.js');

commandHandler.setGlobalPrefixes('pamm!');

// register commands
try {
	const registerResults = commandHandler.registerCommandsFolder(path.join(__dirname, 'commands'));
	console.log(`${registerResults.registered} commands registered`);
	console.log(`${registerResults.disabled} commands disabled`);
} catch (err) {
	console.error('Error while registering commands:');
	console.error(err);
	process.exit(1);
}

// register tasks
try {
	const registerResults = commandHandler.registerTasksFolder(path.join(__dirname, 'tasks'));
	console.log(`${registerResults.registered} tasks registered`);
	console.log(`${registerResults.disabled} tasks disabled`);
} catch (err) {
	console.error('Error while registering tasks:');
	console.error(err);
	process.exit(1);
}

const client = new Discord.Client({
	partials: [
		'MESSAGE',
		'REACTION',
		'USER',
	],
	ws: {
		intents: Discord.Intents.NON_PRIVILEGED | Discord.Intents.FLAGS.GUILD_MEMBERS,
	},
});

client.on('ready', () => {
	console.log('Bot is ready');
});

client.on('message', async (message) => {
	if (message.author.bot) {
		return;
	}

	// explicit commands
	let commandMatch = false;
	try {
		const commandResults = await commandHandler.checkCommand(message);
		commandMatch = commandResults.match;
	} catch (err) {
		console.error('Error while checking commands:');
		console.error(err);
	}

	// tasks
	try {
		await commandHandler.checkTasks(message, commandMatch);
	} catch (err) {
		console.error('Error while checking tasks:');
		console.error(err);
	}
});

client.on('messageReactionAdd', async (reaction, user) => {
	if (reaction.partial) {
		try {
			await reaction.fetch();
		} catch (err) {
			console.error('Error while fetching reaction:');
			console.error(err);
		}
	}
	if (reaction.message.author.id !== client.user.id) {
		return;
	}
	if (user.id === client.user.id) {
		return;
	}
	if (!Object.values(EMOJI).includes(reaction.emoji.name)) {
		return;
	}
	scheduleUtil.refreshTable(reaction.message).catch(err => {
		console.error(err);
	});
});

client.on('messageReactionRemove', (reaction, user) => {
	if (reaction.message.author.id !== client.user.id) {
		return;
	}
	if (user.id === client.user.id) {
		return;
	}
	if (!Object.values(EMOJI).includes(reaction.emoji.name)) {
		return;
	}
	scheduleUtil.refreshTable(reaction.message).catch(err => {
		console.error(err);
	});
});

client.login(auth.token).then(() => {
	console.log('Successfully logged in');
}).catch(err => {
	console.error('Error while logging in:');
	console.error(err);
	process.exit(1);
});
