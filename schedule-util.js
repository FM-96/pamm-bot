const EMOJI = require('./emoji.js');

const TABLE_AVAILABLE = 'Yes';
const TABLE_UNAVAILABLE = 'No';
const TABLE_UNDECIDED = '';

module.exports = {
	buildTable,
	refreshTable,
};

// https://en.wikipedia.org/wiki/Box-drawing_character
function buildTable(numColumns, fields, title) {
	if (numColumns > fields.length) {
		return undefined;
	}

	let builtTable = '';

	const tableCells = fields.slice();
	if (tableCells.length % numColumns !== 0) {
		for (let i = 0; i < tableCells.length % numColumns; ++i) {
			tableCells.push('');
		}
	}

	let colWidths = [];
	for (let i = 0; i < numColumns; ++i) {
		colWidths.push(0);
	}

	for (let i = 0; i < numColumns; ++i) {
		for (let j = i; j < tableCells.length; j += numColumns) {
			if (colWidths[i] < tableCells[j].length) {
				colWidths[i] = tableCells[j].length;
			}
		}
	}

	let titleLength = 0;
	if (title) {
		titleLength = colWidths.reduce((prev, curr) => prev + curr, 0) + ((colWidths.length - 1) * 3); // 3 = padding between columns
		while (titleLength < title.length) {
			colWidths = colWidths.map(e => e + 1);
			titleLength += colWidths.length;
		}
	}

	// table start
	builtTable += '╔═';
	for (let i = 0; i < numColumns - 1; ++i) {
		builtTable += '═'.repeat(colWidths[i]);
		builtTable += title ? '═══' : '═╤═';
	}
	builtTable += '═'.repeat(colWidths[numColumns - 1]);
	builtTable += '═╗\n';

	if (title) {
		// table title
		builtTable += '║ ';
		builtTable += tablePad(title, titleLength, 'center');
		builtTable += ' ║\n';

		// table title-head seperator
		builtTable += '╠═';
		for (let i = 0; i < numColumns - 1; ++i) {
			builtTable += '═'.repeat(colWidths[i]);
			builtTable += '═╤═';
		}
		builtTable += '═'.repeat(colWidths[numColumns - 1]);
		builtTable += '═╣\n';
	}

	// table head
	builtTable += '║ ';
	for (let i = 0; i < numColumns - 1; ++i) {
		builtTable += tablePad(tableCells[i], colWidths[i], 'center');
		builtTable += ' │ ';
	}
	builtTable += tablePad(tableCells[numColumns - 1], colWidths[numColumns - 1], 'center');
	builtTable += ' ║\n';

	// table head-body seperator
	builtTable += '╠═';
	for (let i = 0; i < numColumns - 1; ++i) {
		builtTable += '═'.repeat(colWidths[i]);
		builtTable += '═╪═';
	}
	builtTable += '═'.repeat(colWidths[numColumns - 1]);
	builtTable += '═╣\n';

	// table body
	for (let i = 0; i < (tableCells.length / numColumns) - 1; ++i) {
		builtTable += '║ ';
		for (let j = numColumns * (i + 1); j < (numColumns * (i + 2)) - 1; ++j) {
			builtTable += tablePad(tableCells[j], colWidths[j % numColumns], j === 0 ? 'left' : 'center');
			builtTable += ' │ ';
		}
		builtTable += tablePad(tableCells[(numColumns * (i + 2)) - 1], colWidths[numColumns - 1], 'center');
		builtTable += ' ║\n';

		if (i + 1 < (tableCells.length / numColumns) - 1) {
			// table row seperator
			builtTable += '╟─';
			for (let j = 0; j < numColumns - 1; ++j) {
				builtTable += '─'.repeat(colWidths[j]);
				builtTable += '─┼─';
			}
			builtTable += '─'.repeat(colWidths[numColumns - 1]);
			builtTable += '─╢\n';
		}
	}

	// table end
	builtTable += '╚═';
	for (let i = 0; i < numColumns - 1; ++i) {
		builtTable += '═'.repeat(colWidths[i]);
		builtTable += '═╧═';
	}
	builtTable += '═'.repeat(colWidths[numColumns - 1]);
	builtTable += '═╝';

	return builtTable;
}

async function refreshTable(message) {
	const tableStringLines = message.content.slice(4, -4).split('\n');

	// parse title
	let tableTitle = false;
	if (!tableStringLines[0].includes('╤')) {
		tableTitle = tableStringLines[1].slice(1, -1).trim();
	}

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

	const reactions = message.reactions.filterArray(e => Object.values(EMOJI).includes(e.emoji.name));

	const reactionUsers = await Promise.all(reactions.map(e => e.fetchUsers()));

	const reactionUserMap = new Map();

	for (let i = 0; i < reactions.length; ++i) {
		reactionUserMap.set(reactions[i].emoji.name, reactionUsers[i].map(e => e.id));
	}

	const fields = [
		'',
		'1 Mon',
		'2 Tue',
		'3 Wed',
		'4 Thu',
		'5 Fri',
		'6 Sat',
		'7 Sun',
	];
	for (const member of nonBotMembers) {
		const isDone = (reactionUserMap.get(EMOJI.DONE) || []).includes(member.id);
		fields.push(member.displayName);

		if ((reactionUserMap.get(EMOJI.MONDAY) || []).includes(member.id)) {
			fields.push(TABLE_AVAILABLE);
		} else {
			fields.push(isDone ? TABLE_UNAVAILABLE : TABLE_UNDECIDED);
		}
		if ((reactionUserMap.get(EMOJI.TUESDAY) || []).includes(member.id)) {
			fields.push(TABLE_AVAILABLE);
		} else {
			fields.push(isDone ? TABLE_UNAVAILABLE : TABLE_UNDECIDED);
		}
		if ((reactionUserMap.get(EMOJI.WEDNESDAY) || []).includes(member.id)) {
			fields.push(TABLE_AVAILABLE);
		} else {
			fields.push(isDone ? TABLE_UNAVAILABLE : TABLE_UNDECIDED);
		}
		if ((reactionUserMap.get(EMOJI.THURSDAY) || []).includes(member.id)) {
			fields.push(TABLE_AVAILABLE);
		} else {
			fields.push(isDone ? TABLE_UNAVAILABLE : TABLE_UNDECIDED);
		}
		if ((reactionUserMap.get(EMOJI.FRIDAY) || []).includes(member.id)) {
			fields.push(TABLE_AVAILABLE);
		} else {
			fields.push(isDone ? TABLE_UNAVAILABLE : TABLE_UNDECIDED);
		}
		if ((reactionUserMap.get(EMOJI.SATURDAY) || []).includes(member.id)) {
			fields.push(TABLE_AVAILABLE);
		} else {
			fields.push(isDone ? TABLE_UNAVAILABLE : TABLE_UNDECIDED);
		}
		if ((reactionUserMap.get(EMOJI.SUNDAY) || []).includes(member.id)) {
			fields.push(TABLE_AVAILABLE);
		} else {
			fields.push(isDone ? TABLE_UNAVAILABLE : TABLE_UNDECIDED);
		}
	}

	const table = buildTable(8, fields, tableTitle);

	if (table === undefined) {
		throw new Error('buildTable returned undefined');
	}

	const newMessageContent = '```\n' + table + '\n```';

	if (message.content !== newMessageContent) {
		return message.edit(newMessageContent);
	}
}

function tablePad(str, padLength, align) {
	let paddedStr;
	if (str.length < padLength) {
		if (align === 'center') {
			const left = Math.floor((padLength - str.length) / 2);
			const right = Math.ceil((padLength - str.length) / 2);
			paddedStr = ' '.repeat(left) + str + ' '.repeat(right);
		} else if (align === 'auto') {
			if (isNaN(str)) {
				paddedStr = str + ' '.repeat(padLength - str.length);
			} else {
				paddedStr = ' '.repeat(padLength - str.length) + str;
			}
		} else if (align === 'left') {
			paddedStr = str + ' '.repeat(padLength - str.length);
		} else if (align === 'right') {
			paddedStr = ' '.repeat(padLength - str.length) + str;
		}
	} else if (str.length > padLength) {
		return undefined;
	} else {
		paddedStr = str;
	}
	return paddedStr;
}
