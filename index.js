const Discord = require('discord.js');

const path = require('path');

const auth = require('./auth.json');
const commandHandler = require('./command-handler.js');

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

client.login(auth.token).then(() => {
	console.log('Successfully logged in');
}).catch(err => {
	console.error('Error while logging in:');
	console.error(err);
	process.exit(1);
});
