module.exports = {
	checkCommand,
	checkTasks,
	registerCommandsFolder,
	registerTasksFolder,
	setAdminRoleName,
	setOwnerId,
	setPrefixes,
};

const fs = require('fs');
const path = require('path');

const settings = {
	adminRoleName: false,
	ownerId: false,
	prefixes: [''],
};

const commands = [];
const tasks = [];

/**
 * Checks whether a message matches a command and if so, runs the command
 * @param {Discord.Message} message The message to handle
 * @returns {Promise<Object>} Information about whether the message matched a command
 */
async function checkCommand(message) {
	for (const prefix of settings.prefixes) {
		for (const commandObj of commands) {
			if (message.content.startsWith(`${prefix}${commandObj.command}`) && /^\s|^$/.test(message.content.slice(`${prefix}${commandObj.command}`.length))) {
				if (message.channel.type === 'text' && !message.member) {
					await message.guild.fetchMember(message.author);
				}

				const passOwnerCheck = !commandObj.ownerOnly || settings.ownerId === true || (settings.ownerId !== false && message.author.id === settings.ownerId);
				const passAdminCheck = !commandObj.adminOnly || settings.adminRoleName === true || (settings.adminRoleName !== false && message.channel.type === 'text' && message.member.roles.exists('name', settings.adminRoleName));
				const passChannelTypeCheck = message.channel.type === 'text' ? commandObj.inGuilds !== false : commandObj.inDms !== false;

				if (passOwnerCheck && passAdminCheck && passChannelTypeCheck) {
					const commandContext = {
						command: commandObj.command,
						prefix: prefix,
					};
					await commandObj.run(message, commandContext);
				}
				return {
					match: true,
					command: commandObj.command,
					passOwnerCheck,
					passAdminCheck,
					passChannelTypeCheck,
				};
			}
		}
	}
	return {
		match: false,
	};
}

/**
 * Checks whether a message matches any tasks and if so, runs the tasks
 * @param {Discord.Message} message The message to handle
 * @param {Boolean} excludeLimited Whether or not to exclude limited tasks
 * @returns {Promise<Object>} Information about whether the message matched any tasks
 */
async function checkTasks(message, excludeLimited) {
	let limitedSelected = false;
	const tasksContext = {
		matching: [],
		notMatching: [],
	};
	for (const taskObj of tasks) {
		let testResult;
		try {
			testResult = await taskObj.test(message);
		} catch (err) {
			testResult = false;
		}
		if (testResult && (!taskObj.limited || (!limitedSelected && !excludeLimited))) {
			tasksContext.matching.push(taskObj);
			limitedSelected = taskObj.limited;
		} else {
			tasksContext.notMatching.push(taskObj);
		}
	}
	for (const taskObj of tasksContext.matching) {
		try {
			await taskObj.run(message, tasksContext);
		} catch (err) {
			console.error(`Error while running task "${taskObj.name}":`);
			console.error(err);
		}
	}
	return {
		match: tasksContext.matching.length !== 0,
		matching: tasksContext.matching,
		notMatching: tasksContext.notMatching,
	};
}

/**
 * Registers all files in a folder as commands
 * @param {String} commandsFolder Absolute path to the folder with the command files
 * @returns {Object} Information about how many commands were registered and/or deactivated
 */
function registerCommandsFolder(commandsFolder) {
	let deactivated = 0;
	let registered = 0;

	const commandStrings = commands.map(e => e.command);

	const commandFiles = fs.readdirSync(commandsFolder);
	for (const commandFile of commandFiles) {
		const commandObj = require(path.join(commandsFolder, commandFile)); // eslint-disable-line global-require
		if (typeof commandObj.command !== 'string') {
			throw new Error('Command must be a string');
		}
		if (commandObj.command.trim() === '') {
			// command is deactivated
			deactivated++;
			continue;
		}
		if (commandStrings.includes(commandObj.command)) {
			throw new Error('Duplicate command: ' + commandObj.command);
		}
		commands.push(commandObj);
		commandStrings.push(commandObj.command);
		registered++;
	}
	commands.sort((a, b) => {
		if (a.command.length > b.command.length) {
			return -1;
		}
		if (a.command.length < b.command.length) {
			return 1;
		}
		return 0;
	});

	return {
		deactivated,
		registered,
	};
}

/**
 * Registers all files in a folder as tasks
 * @param {String} tasksFolder Absolute path to the folder with the tasks files
 * @returns {Object} Information about how many tasks were registered and/or deactivated
 */
function registerTasksFolder(tasksFolder) {
	let registered = 0;

	const tasknames = tasks.map(e => e.name);

	const taskFiles = fs.readdirSync(tasksFolder);
	for (const taskFile of taskFiles) {
		const taskObj = require(path.join(tasksFolder, taskFile)); // eslint-disable-line global-require
		if (tasknames.includes(taskObj.name)) {
			throw new Error('Duplicate task: ' + taskObj.name);
		}
		tasks.push(taskObj);
		tasknames.push(taskObj.name);
		registered++;
	}
	tasks.sort((a, b) => {
		if (a.name < b.name) {
			return -1;
		}
		if (a.name > b.name) {
			return 1;
		}
		return 0;
	});

	return {
		deactivated: 0,
		registered,
	};
}

/**
 * Sets the admin role name
 * @param {String|Boolean} adminRoleName The admin role name, or true to allow all, or false to deny all
 * @returns {void}
 */
function setAdminRoleName(adminRoleName) {
	if (typeof adminRoleName !== 'string' && typeof adminRoleName !== 'boolean') {
		throw new Error('adminRoleName must be either a string or a boolean');
	} else if (adminRoleName === '') {
		throw new Error('adminRoleName cannot be an empty string');
	}
	settings.adminRoleName = adminRoleName;
}

/**
 * Sets the owner ID
 * @param {String|Boolean} ownerId The owner ID, or true to allow all, or false to deny all
 * @returns {void}
 */
function setOwnerId(ownerId) {
	if (typeof ownerId !== 'string' && typeof ownerId !== 'boolean') {
		throw new Error('ownerId must be either a string or a boolean');
	} else if (ownerId === '') {
		throw new Error('ownerId cannot be an empty string');
	}
	settings.ownerId = ownerId;
}

/**
 * Sets the prefixes
 * @param {Array<String>|String} prefixes Prefix or list of prefixes to set
 * @returns {void}
 */
function setPrefixes(prefixes) {
	const prefixList = Array.isArray(prefixes) ? prefixes : [prefixes];
	if (prefixList.length === 0) {
		prefixList.push('');
	}

	const uniquePrefixList = [...new Set(prefixList)];
	for (const prefix of uniquePrefixList) {
		if (typeof prefix !== 'string') {
			throw new Error('All prefixes must be strings');
		}
	}

	settings.prefixes = uniquePrefixList;
}
