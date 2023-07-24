# Invite Bot

Discord Bot that uses snoowrap to pull reddit Mod Mail into a Discord Channel for moderating invite requests.

## Installation

- Create a discord bot here: https://discord.com/developers/applications
- `git clone https://github.com/Jykinturah/invitebot.git`
- `cd invitebot`
- `npm install`
- `cp config.json.sample config.json`
- Edit the `config.json` file with your credentials and other information.
- `node index.js`
- The bot is now running.

## Using PM2

- PM2 can be used to run the process in the background.
- `npm install pm2@latest -g`
- `pm2 startup`
- Follow the onscreen instructions to enable pm2 autostart on reboot.
- `pm2 start index.js --name invitebot`
- `pm2 save`
- `pm2 status`
- invitebot should be running now.

## How it works

Invite Bot will use the configured Reddit credentials to check for Reddit Mod Mail at the target subreddit. It will then generate entries in the configured Discord Server Channel using Reddit's Thread ID as a record to keep track of entries it has posted to allow for reading requests for Discord invites.

## Warnings

- Uses message based prefix commands instead of slash commands implemented by discord.js.
- Uses emoji reactions instead of interactions implement by discord.js.
- Snoowrap has been not under active development.
- Requires Messages Intent which is very permissive to look for prefix commands.
