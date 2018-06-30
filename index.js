const Discord = require('discord.js');

const path = require('path');

const auth = require('./auth.json');
const commandHandler = require('./command-handler.js');
const EMOJI = require('./emoji.js');
const scheduleUtil = require('./schedule-util.js');

commandHandler.setPrefixes('pamm!');

// register commands
try {
	const registerResults = commandHandler.registerCommandsFolder(path.join(__dirname, 'commands'));
	console.log(`${registerResults.registered} commands registered`);
	console.log(`${registerResults.deactivated} commands deactivated`);
} catch (err) {
	console.error('Error while registering commands:');
	console.error(err);
	process.exit(1);
}

// register tasks
try {
	const registerResults = commandHandler.registerTasksFolder(path.join(__dirname, 'tasks'));
	console.log(`${registerResults.registered} tasks registered`);
	console.log(`${registerResults.deactivated} tasks deactivated`);
} catch (err) {
	console.error('Error while registering tasks:');
	console.error(err);
	process.exit(1);
}

const client = new Discord.Client();

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

client.on('messageReactionAdd', (reaction, user) => {
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

// from https://gist.github.com/Danktuary/27b3cef7ef6c42e2d3f5aff4779db8ba
const events = {
	MESSAGE_REACTION_ADD: 'messageReactionAdd',
	MESSAGE_REACTION_REMOVE: 'messageReactionRemove',
};
client.on('raw', async event => {
	// `event.t` is the raw event name
	if (!events.hasOwnProperty(event.t)) {
		return;
	}

	const {d: data} = event;
	const user = client.users.get(data.user_id);
	const channel = client.channels.get(data.channel_id) || await user.createDM();

	// if the message is already in the cache, don't re-emit the event
	if (channel.messages.has(data.message_id)) {
		return;
	}

	// if you're on the master/v12 branch, use `channel.messages.fetch()`
	const message = await channel.fetchMessage(data.message_id);

	// custom emojis reactions are keyed in a `name:ID` format, while unicode emojis are keyed by names
	// if you're on the master/v12 branch, custom emojis reactions are keyed by their ID
	const emojiKey = (data.emoji.id) ? `${data.emoji.name}:${data.emoji.id}` : data.emoji.name;
	const reaction = message.reactions.get(emojiKey);

	client.emit(events[event.t], reaction, user);
});

client.login(auth.token).then(() => {
	console.log('Successfully logged in');
}).catch(err => {
	console.error('Error while logging in:');
	console.error(err);
	process.exit(1);
});
