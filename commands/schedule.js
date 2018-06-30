const EMOJI = require('../emoji.js');
const scheduleUtil = require('../schedule-util.js');

module.exports = {
	command: 'schedule',
	inDms: false,
	run: async (message, context) => {
		const tableTitle = message.content.slice(context.prefix.length + 'schedule'.length);

		await message.guild.fetchMembers();
		const nonBotMembers = message.guild.members.filterArray(e => !e.user.bot);
		nonBotMembers.sort((a, b) => {
			if (a.displayName.toLowerCase() < b.displayName.toLowerCase()) {
				return -1;
			}
			if (a.displayName.toLowerCase() > b.displayName.toLowerCase()) {
				return 1;
			}
			return 0;
		});

		const fields = [
			'User',
			'1 Mon',
			'2 Tue',
			'3 Wed',
			'4 Thu',
			'5 Fri',
			'6 Sat',
			'7 Sun',
		];
		for (const member of nonBotMembers) {
			fields.push(member.displayName);
			for (let i = 0; i < 7; ++i) {
				fields.push('');
			}
		}

		const table = scheduleUtil.buildTable(8, fields, tableTitle);

		if (table === undefined) {
			throw new Error('buildTable returned undefined');
		}

		const sentMessage = await message.channel.send('```\n' + table + '\n```');

		await sentMessage.react(EMOJI.MONDAY);
		await sentMessage.react(EMOJI.TUESDAY);
		await sentMessage.react(EMOJI.WEDNESDAY);
		await sentMessage.react(EMOJI.THURSDAY);
		await sentMessage.react(EMOJI.FRIDAY);
		await sentMessage.react(EMOJI.SATURDAY);
		await sentMessage.react(EMOJI.SUNDAY);
		await sentMessage.react(EMOJI.DONE);
	},
};
