const Discord = require('discord.js');
const config = require('./config.json');
const snoowrap = require('snoowrap');
const client = new Discord.Client({ partials: ['MESSAGE', 'CHANNEL', 'REACTION'] });

var intervalPrune = (config.intervalPrune * 1000);
var intervalModmail = (config.intervalModmail * 1000);

client.once('ready', () => {
	console.log('ready!');
});

client.on('ready', () => {
	pruneMembers();
	client.setInterval(pruneMembers, intervalPrune);
	getModmail();
	client.setInterval(getModmail, intervalModmail);
});

function pruneMembers() {
	let guild = client.guilds.cache.get(config.guildID);
	guild.members.prune({ days: 7 });
};

const r = new snoowrap({
	userAgent: 'invite-bot',
	clientId: config.clientId,
	clientSecret: config.clientSecret,
	refreshToken: config.refreshToken
});

function getModmail() {
	r.getSubreddit('GGDiscordInvites').getNewModmailConversations({limit: 1}).then(modmail => {
		if (modmail[0].messages[0].author.name.name === 'Byeuji' || modmail[0].messages[0].author.name.name === 'GirlGamersDiscord' || modmail[0].messages[0].author.name.name === 'ILuffhomer') return;
		const inviteEmbed = new Discord.MessageEmbed()
		.setColor(config.embedColor)
		.setTitle(modmail[0].subject)
		.addFields(
			{name: 'Message', value: modmail[0].messages[0].bodyMarkdown},
			{name: 'Author', value: modmail[0].messages[0].author.name.name, inline: true},
			{name: 'Profile', value: `[Go to Overview](https://www.reddit.com/user/${modmail[0].messages[0].author.name.name}) ➡`, inline: true},
			{name: 'Thread ID', value: modmail[0].id, inline: true},
		)
		.addFields(
			{name: 'Link', value: `[Go to Thread](https://mod.reddit.com/mail/all/${modmail[0].id}) ➡`, inline: true},
			{name: 'Responses', value: `✅ Accept | 👨 Man | ℹ Request Info | 🔄 Resend Invite \n 🔥 Archive | ❓ Second Opinion`}
		)
		client.channels.cache.get(config.modmailID).send(inviteEmbed).then(embed => {
			embed.react('✅'),
			embed.react('👨'),
			embed.react('ℹ'),
			embed.react('🔄'),
			embed.react('🔥'),
			embed.react('❓')
		});
		r.getNewModmailConversation(modmail[0].id).reply(`Hi there,\n\nThis is an automated message letting you know your message has been received.\n\nPlease be aware that we sometimes receive hundreds of applications per week, and our moderation team is all volunteer, so it may take some time to respond. We appreciate your patience.`,true,false)
			.then(() => r.getNewModmailConversation(modmail[0].id).archive());
	});
};

client.on('messageReactionAdd', async (reaction, user) => {
	if (reaction.emoji.id === config.emojiID) {
		reaction.remove();
		if (reaction.message.partial) await reaction.message.fetch();
		if (reaction.message.content.length > 0) {
			var message = reaction.message.content
		} else {
			var message = 'Embedded Content'
		}
		const reportEmbed = new Discord.MessageEmbed()
		.setColor(config.embedColor)
		.setTitle('User Report')
		.addFields(
			{name: 'Message', value: message},
			{name: 'Author', value: reaction.message.author.tag, inline: true},
			{name: 'Channel', value: `#${reaction.message.channel.name}`, inline: true},
			{name: 'Reported By', value: user.tag, inline: true},
		)
		.addFields(
			{name: 'Link', value: `[Go to Message](https://discordapp.com/channels/${config.guildID}/${reaction.message.channel.id}/${reaction.message.id}) ➡`, inline: true},
			{name: 'Response', value: '👍 Acknowledge', inline: true}
		)
		client.channels.cache.get(config.channelID).send('@here', reportEmbed).then(embed => {
		});
		user.send(config.message);
		return;
	};
	if (reaction.emoji.name === '👍') {
		if (reaction.message.partial) await reaction.message.fetch();
		if (!reaction.message.author.bot) return;
		if (user.bot) return;
		if (!(reaction.message.embeds[0].fields[5].name === 'Response')) return;
		const getReport = reaction.message.embeds[0].spliceFields(5, 1);
		const reportEdit = new Discord.MessageEmbed(getReport)
			.addFields(
				{name: 'Acknowledged by', value: user.tag, inline: true}
			)
		reaction.message.edit(reportEdit);
		reaction.remove();
	};
	if (reaction.emoji.name === '✅') {
		if (reaction.message.partial) await reaction.message.fetch();
		if (!reaction.message.author.bot) return;
		if (user.bot) return;
		if (!(reaction.message.channel.id === config.modmailID)) return;
		let channel = client.channels.cache.get(config.inviteID);
		channel.createInvite({maxUses: 1, unique: true }).then(invite => {
			r.getNewModmailConversation(reaction.message.embeds[0].fields[3].value).reply(`Hi! \n\n Thanks for applying to join the r/GirlGamers Discord \n\n Before accepting the invite below, please be sure to COMPLETELY shut down and restart your Discord application to ensure it is fully updated. Otherwise, you may have difficulty accepting our Server Rules page via Discord's [Rule Screening service.](https://support.discord.com/hc/en-us/articles/1500000466882-Rules-Screening-FAQ) \n\n*Link expires in 24 hours; feel free to ask for another if needed* \n\n https://discord.gg/${invite.code}`,'true','false')
				.then(() => r.getNewModmailConversation(reaction.message.embeds[0].fields[3].value).reply(`Invite issued by ${user.tag}`,`false`,`true`))
				.then(() => r.getNewModmailConversation(reaction.message.embeds[0].fields[3].value).archive());
		});
		reaction.message.delete()
	};
	if (reaction.emoji.name === '👨') {
		if (reaction.message.partial) await reaction.message.fetch();
		if (!reaction.message.author.bot) return;
		if (user.bot) return;
		if (!(reaction.message.channel.id === config.modmailID)) return;
		r.getNewModmailConversation(reaction.message.embeds[0].fields[3].value).reply('Hi! \n\n Thanks for applying; however, this is a female-identifying space so we will have to decline.','true','false')
			.then(() => r.getNewModmailConversation(reaction.message.embeds[0].fields[3].value).reply(`Denied by ${user.tag}`,`false`,`true`))
			.then(() => r.getNewModmailConversation(reaction.message.embeds[0].fields[3].value).archive());
		reaction.message.delete();
	};
	if (reaction.emoji.name === 'ℹ') {
		if (reaction.message.partial) await reaction.message.fetch();
		if (!reaction.message.author.bot) return;
		if (user.bot) return;
		if (!(reaction.message.channel.id === config.modmailID)) return;
		r.getNewModmailConversation(reaction.message.embeds[0].fields[3].value).reply(`Thanks for applying; however, due to your posting history we will need more information. \n\n Do you mind providing a link to a public text-based social media (not TikTok or Instagram) to verify? \n\n Please note that we aren't looking for photo or voice verification, \n we want to make sure we're inviting users that contribute to a positive and supportive environment.`,'true','false')
			.then(() => r.getNewModmailConversation(reaction.message.embeds[0].fields[3].value).reply(`Requested by ${user.tag}`,`false`,`true`))
			.then(() => r.getNewModmailConversation(reaction.message.embeds[0].fields[3].value).archive());
		reaction.message.delete();
	};
	if (reaction.emoji.name === '🔄') {
		if (reaction.message.partial) await reaction.message.fetch();
		if (!reaction.message.author.bot) return;
		if (user.bot) return;
		if (!(reaction.message.channel.id === config.modmailID)) return;
		let channel = client.channels.cache.get(config.inviteID);
		channel.createInvite({maxUses: 1, unique: true }).then(invite => {
			r.getNewModmailConversation(reaction.message.embeds[0].fields[3].value).reply(`Here's another invite \n\n https://discord.gg/${invite.code}`,'true','false')
				.then(() => r.getNewModmailConversation(reaction.message.embeds[0].fields[3].value).reply(`Re-issued by ${user.tag}`,`false`,`true`))
				.then(() => r.getNewModmailConversation(reaction.message.embeds[0].fields[3].value).archive());
		});
		reaction.message.delete();
	};
	if (reaction.emoji.name === '🔥') {
		if (reaction.message.partial) await reaction.message.fetch();
		if (!reaction.message.author.bot) return;
		if (user.bot) return;
		if (!(reaction.message.channel.id === config.modmailID)) return;
		r.getNewModmailConversation(reaction.message.embeds[0].fields[3].value).reply(`Archived by ${user.tag} with no reason given`,`false`,`true`)
			.then(() => r.getNewModmailConversation(reaction.message.embeds[0].fields[3].value).archive());
		reaction.message.delete();
	};
	if (reaction.emoji.name === '❓') {
		if (reaction.message.partial) await reaction.message.fetch();
		if (!reaction.message.author.bot) return;
		if (user.bot) return;
		if (!(reaction.message.channel.id === config.modmailID)) return;
		if (reaction.message.embeds[0].fields[5].name === 'Second Opinion By') return;
		const getInvite = reaction.message.embeds[0].spliceFields(5, 1);
		const inviteEdit = new Discord.MessageEmbed(getInvite)
			.addFields(
				{name: 'Second Opinion By', value: user.tag, inline: true},
				{name: 'Responses', value: '✅ Accept | 👨 Man | ℹ Request Info | 🔄 Resend Invite \n 🔥 Archive'}
			)
		reaction.message.edit(inviteEdit);
		reaction.remove();
	};
});

client.on('message', async (message) => {

	if (message.author.bot) return;

	if (message.guild === null) return;

	if (message.content.indexOf(config.prefix) !== 0) return;
	if (!message.member) return;
	  
	if (!(message.member.roles.cache.has(config.modID) || message.member.roles.cache.has(config.communityID))) return;

	const args = message.content.slice(config.prefix.length).trim().split(/ +/)
	const command = args.shift().toLowerCase()

	if (command === 'invite') {
		if (!args.length) {
			return message.channel.send(`You didn't provide any arguments, ${message.author}!`);
		} else if (args[0] === 'link') {
			let channel = client.channels.cache.get(config.inviteID);
			channel.createInvite({ maxUses: 1, unique: true }).then(invite => {
				message.channel.send(`https://discord.gg/${invite.code}`)
			});
			return;
		} else if (args[0] === 'reply') {
			r.getNewModmailConversation(args[1]).reply(args.slice(2).join(' '))
				.then(() => r.getNewModmailConversation(args[1]).archive());
			message.react('🏐')
		};
	};

	if (command === 'shame') {
		if (!args.length) {
			return message.channel.send(`You didn't provide any arguments, ${message.author}!`);
		} else if (args[0] === 'add') {
			const member = message.guild.members.cache.get(args[1]);
			if (member.roles.cache.has(config.shameID)) {
				return message.channel.send(`That user already has **Cone of Shame**, ${message.author}!`);
			} else {
				const role = message.guild.roles.cache.get(config.shameID);
				member.roles.add(role);
				message.channel.send(`Applied **Cone of Shame** to ${member.user.tag}!`);
			};
		} else if (args[0] === 'remove') {
			const member = message.guild.members.cache.get(args[1]);
			if (!member.roles.cache.has(config.shameID)) {
				return message.channel.send(`That user does not have **Cone of Shame**, ${message.author}!`);
			} else {
				const role = message.guild.roles.cache.get(config.shameID);
				member.roles.remove(role);
				message.channel.send(`Removed **Cone of Shame** on ${member.user.tag}!`);
			};
		};
	};

	if (command === 'report') {
		if (!args.length) {
			return message.channel.send(`You didn't provide any arguments, ${message.author}!`);
		} else if (args[0] === 'create') {
			const member = message.guild.members.cache.get(args[1]);
			const cardEmbed = new Discord.MessageEmbed()
			.setColor(config.embedColor)
			.setTitle('Report Profile')
			.setDescription(`**Username:** ${member.user.tag}\n**ID:** ${member.user.id}`)
			.setThumbnail(member.user.avatarURL())
			client.channels.cache.get(config.reportID).send(cardEmbed);
		} else if (args[0] === 'add') {
			const chnl = client.channels.cache.get(config.reportID);
			const card = await chnl.messages.fetch(args[1]);
			if (!(card.channel.id === config.reportID)) return;
			if (!(card.embeds[0].title === 'Report Profile')) return;
			const getCard = card.embeds[0]
			const cardEdit = new Discord.MessageEmbed(getCard)
				.addFields(
					{name: message.author.tag, value: args.slice(2).join(' ')}
				)
			card.edit(cardEdit);
		} else if (args[0] === 'remove') {
			const chnl = client.channels.cache.get(config.reportID);
			const card = await chnl.messages.fetch(args[1]);
			if (!(card.channel.id === config.reportID)) return;
			if (!(card.embeds[0].title === 'Report Profile')) return;
			let field = args[2] - 1;
			const getCard = card.embeds[0].spliceFields(field, 1);
			const cardEdit = new Discord.MessageEmbed(getCard)
			card.edit(cardEdit);
		};
	};
});

client.login(config.token);
