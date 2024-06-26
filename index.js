const { EmbedBuilder, Client, GatewayIntentBits } = require('discord.js');
const config = require('./config.json');
const snoowrap = require('snoowrap');
const client = new Client( { intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.GuildMessageReactions, GatewayIntentBits.MessageContent] });

var intervalModmail = (config.intervalModmail * 1000);

client.once('ready', () => {
	console.log('ready!');
});

client.on('ready', () => {
	// Query Reddit Modmail on client ready
	getModmail();
	// Query Reddit Modmail every [intervalModmail] seconds
	setInterval(getModmail, intervalModmail);
});

const r = new snoowrap({
	userAgent: 'invite-bot',
	clientId: config.clientId,
	clientSecret: config.clientSecret,
	refreshToken: config.refreshToken
});

function getModmail() {
	r.getSubreddit( config.subReddit || 'GGDiscordInvites' ) // Target Subreddit (defaults to GGDiscordInvites if 'config.subReddit' isn't set)
		.getNewModmailConversations({limit: 10}) // Read 10 Modmail Conversations that are not archived
		.then(modmailConversations => {
			// If there are no Modmail Conversations that are not archived, exit
			if (modmailConversations.length < 1) return;

			// forEach to iterate through all Modmail Conversations
			modmailConversations.forEach(modmail => {

				// If there are no messages, exit this iteration
				if (modmail.messages === undefined ) return;

				// Thread ID used to link to Modmail and later Archive
				let modmailThreadID = modmail.id 

				// Fetch the entire Modmail Conversation
				r.getNewModmailConversation(modmail.id).fetch().then(fetchedModmail => {

					// Human readable variable names
					let modmailBody = fetchedModmail.messages[0].bodyMarkdown
					let modmailAuthor = fetchedModmail.messages[0].author.name.name
					let modmailSubject = fetchedModmail.subject
					
					// If body is longer than 1000 characters, trim
					if (modmailBody.length > 1000) modmailBody = modmailBody.slice(0,1000) + '... [Continued]';

					// Generate Discord Embed
					const inviteEmbed = new EmbedBuilder()
						.setColor(config.embedColor)
						.setTitle(modmailSubject)
						.addFields(
							{name: 'Message', value: modmailBody},
							{name: 'Author', value: modmailAuthor, inline: true},
							{name: 'Profile', value: `[Go to Overview](https://www.reddit.com/user/${modmailAuthor}) ➡`, inline: true},
							{name: 'Thread ID', value: modmailThreadID, inline: true},
						)
						.addFields(
							{name: 'Link', value: `[Go to Thread](https://mod.reddit.com/mail/all/${modmailThreadID}) ➡`, inline: true},
							{name: 'Responses', value: `✅ Accept | 👨 Man | ℹ Request Info | 🔄 Resend Invite \n 🔥 Archive | ❓ Second Opinion`}
						)

					// Send Invite Card to Invite Channel
					client.channels.cache.get(config.modmailID).send({ embeds: [inviteEmbed] }).then(embed => {
						embed.react('✅'),
						embed.react('👨'),
						embed.react('ℹ'),
						embed.react('🔄'),
						embed.react('🔥'),
						embed.react('❓')
					});

					// Send automatic Response and Archive Modmail Conversation
					r.getNewModmailConversation(modmailThreadID)
						.reply(`Hi there,\n\nThis is an automated message letting you know your message has been received.` +
							`\n\nPlease be aware that we sometimes receive hundreds of applications per week, and our moderation ` +
							`team is all volunteers, so it may take some time to respond. We appreciate your patience.`, true, false)
						.then(() => {
							r.getNewModmailConversation(modmailThreadID).archive().then(() => {
								console.log(`Autoreplied and Archived Thread ID: ${modmailThreadID}`)
							});
						});
				});
			});
		});
};

client.on('messageReactionAdd', async (reaction, user) => {

	/** Removed Report Code Block */

	// Moved these out of `if` to keep the code D.R.Y.
	if (reaction.message.partial) await reaction.message.fetch();
	if (!reaction.message.author.bot) return;
	if (user.bot) return;
	if (!(reaction.message.channel.id === config.modmailID)) return;
	
	/** START Invite Post Reactions Code Block **/

	// Accept
	if (reaction.emoji.name === '✅') {
		let channel = client.channels.cache.get(config.inviteID);
		channel.createInvite({maxUses: 1, unique: true }).then(invite => {
			r.getNewModmailConversation(reaction.message.embeds[0].fields[3].value).reply(`Hi! \n\n Thanks for applying to join the r/GirlGamers Discord \n\n Before accepting the invite below, please be sure to COMPLETELY shut down and restart your Discord application to ensure it is fully updated. Otherwise, you may have difficulty accepting our Server Rules page via Discord's [Rule Screening service.](https://support.discord.com/hc/en-us/articles/1500000466882-Rules-Screening-FAQ) \n\n*Link expires in 24 hours; feel free to ask for another if needed* \n\n https://discord.gg/${invite.code}`,'true','false')
				.then(() => r.getNewModmailConversation(reaction.message.embeds[0].fields[3].value).reply(`Invite issued by ${user.tag}`,`false`,`true`))
				.then(() => r.getNewModmailConversation(reaction.message.embeds[0].fields[3].value).archive());
		});
		reaction.message.delete()
	};

	// Man
	if (reaction.emoji.name === '👨') {
		r.getNewModmailConversation(reaction.message.embeds[0].fields[3].value).reply('Hi! \n\n Thanks for applying; however, this is a female-identifying space so we will have to decline.','true','false')
			.then(() => r.getNewModmailConversation(reaction.message.embeds[0].fields[3].value).reply(`Denied by ${user.tag}`,`false`,`true`))
			.then(() => r.getNewModmailConversation(reaction.message.embeds[0].fields[3].value).archive());
		reaction.message.delete();
	};

	// Request Info
	if (reaction.emoji.name === 'ℹ') {
		r.getNewModmailConversation(reaction.message.embeds[0].fields[3].value).reply(`Thanks for applying; however, due to your posting history we will need more information. \n\n Do you mind providing a link to a public text-based social media (not TikTok or Instagram) to verify? \n\n Please note that we aren't looking for photo or voice verification, \n we want to make sure we're inviting users that contribute to a positive and supportive environment.`,'true','false')
			.then(() => r.getNewModmailConversation(reaction.message.embeds[0].fields[3].value).reply(`Requested by ${user.tag}`,`false`,`true`))
			.then(() => r.getNewModmailConversation(reaction.message.embeds[0].fields[3].value).archive());
		reaction.message.delete();
	};

	// Resend Invite
	if (reaction.emoji.name === '🔄') {
		let channel = client.channels.cache.get(config.inviteID);
		channel.createInvite({maxUses: 1, unique: true }).then(invite => {
			r.getNewModmailConversation(reaction.message.embeds[0].fields[3].value).reply(`Here's another invite \n\n https://discord.gg/${invite.code}`,'true','false')
				.then(() => r.getNewModmailConversation(reaction.message.embeds[0].fields[3].value).reply(`Re-issued by ${user.tag}`,`false`,`true`))
				.then(() => r.getNewModmailConversation(reaction.message.embeds[0].fields[3].value).archive());
		});
		reaction.message.delete();
	};

	// Archive
	if (reaction.emoji.name === '🔥') {
		r.getNewModmailConversation(reaction.message.embeds[0].fields[3].value).reply(`Archived by ${user.tag} with no reason given`,`false`,`true`)
			.then(() => r.getNewModmailConversation(reaction.message.embeds[0].fields[3].value).archive());
		reaction.message.delete();
	};

	// Second Opinion
	if (reaction.emoji.name === '❓') {
		if (reaction.message.embeds[0].fields[5].name === 'Second Opinion By') return;
		const inviteEdit = new EmbedBuilder(reaction.message.embeds[0]).spliceFields(5, 1)
            .addFields(
                {name: 'Second Opinion By', value: user.tag, inline: true},
                {name: 'Responses', value: '✅ Accept | 👨 Man | ℹ Request Info | 🔄 Resend Invite \n 🔥 Archive'}
            )
			.setColor(config.secondOpinionColor);
		reaction.message.edit({ embeds: [inviteEdit] });
		reaction.remove();
	};

	/** END Invite Post Reactions Code Block **/
});

client.on('messageCreate', async (message) => {

	// Ignore bot messages
	if (message.author.bot) return;

	// Ignore PMs
	if (message.guild === null) return;

	// Ignore Message without Command Prefix [Single Character]
	if (message.content.indexOf(config.prefix) !== 0) return;

	// Ignore Message if Author is no longer Guild Member before checking for Roles
	if (!message.member) return;

	// Ignore Messages that are not made by a user with Moderator Role or Community Role matched by ID
	let isModId = false;
	let isComID = false;

	if (Array.isArray(config.modID)) for (let i = 0; i < config.modID.length; i++) if (message.member.roles.cache.has(config.modID[i])) isModId = true;
	else if (message.member.roles.cache.has(config.modID)) isModId = true;
	if (message.member.roles.cache.has(config.communityID)) isComID = true;

	if (!isModId && !isComID) return;

	/** START Command Logic */
	const args = message.content.slice(config.prefix.length).trim().split(/ +/)
	const command = args.shift().toLowerCase()

	// Invite Code Block
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

	// Cone of Shame Code Block
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
	
	// Report Code Block
	if (command === 'report') {
		if (!args.length) {
			return message.channel.send(`You didn't provide any arguments, ${message.author}!`);
		} else if (args[0] === 'create') {
			const member = message.guild.members.cache.get(args[1]);
			const cardEmbed = new EmbedBuilder()
			.setColor(config.embedColor)
			.setTitle('Report Profile')
			.setDescription(`**Username:** ${member.user.tag}\n**ID:** ${member.user.id}`)
			.setThumbnail(member.user.avatarURL())
			client.channels.cache.get(config.reportID).send({ embeds: [cardEmbed] });
		} else if (args[0] === 'add') {
			const chnl = client.channels.cache.get(config.reportID);
			const card = await chnl.messages.fetch(args[1]);
			if (!(card.channel.id === config.reportID)) return;
			if (!(card.embeds[0].title === 'Report Profile')) return;
			const getCard = card.embeds[0]
			const cardEdit = new EmbedBuilder(getCard)
				.addFields(
					{name: message.author.tag, value: args.slice(2).join(' ')}
				)
			card.edit({ embeds: [cardEdit] });
		} else if (args[0] === 'remove') {
			const chnl = client.channels.cache.get(config.reportID);
			const card = await chnl.messages.fetch(args[1]);
			if (!(card.channel.id === config.reportID)) return;
			if (!(card.embeds[0].title === 'Report Profile')) return;
			let field = args[2] - 1;
			const getCard = card.embeds[0].spliceFields(field, 1);
			const cardEdit = new EmbedBuilder(getCard)
			card.edit({ embeds: [cardEdit] });
		};
	};
});

client.login(config.token);
