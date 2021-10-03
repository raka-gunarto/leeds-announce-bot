const Discord = require('discord.js');
const client = new Discord.Client({
  intents: [Discord.Intents.FLAGS.GUILDS, Discord.Intents.FLAGS.GUILD_MESSAGES],
});
global.client = client;
const config = require('./config.json');
client.login(config.token);

const { REST } = require('@discordjs/rest');
const rest = new REST({ version: 9 }).setToken(config.token);
const { Routes } = require('discord-api-types/v9');
const { SlashCommandBuilder } = require('@discordjs/builders');

const fs = require('fs');
const dedent = require('dedent');

require('./jobs');

let commands = [
  new SlashCommandBuilder()
    .setName('info')
    .setDescription('Lists subscribed modules & settings')
    .toJSON(),
  new SlashCommandBuilder()
    .setName('search')
    .setDescription(
      'Searches modules where the name / code matches the query, accepts regex'
    )
    .addUserOption((opt) =>
      opt.setName('query').setDescription('string / regex')
    )
    .toJSON(),
  new SlashCommandBuilder()
    .setName('subscribe')
    .setDescription(
      'Subscribes to first module found with module code EXACT match'
    )
    .addUserOption((opt) =>
      opt.setName('module_code').setDescription('exact match string')
    )
    .toJSON(),
  new SlashCommandBuilder()
    .setName('bulksubscribe')
    .setDescription(
      'Subscribes to all modules where the module code has a match with given regexp'
    )
    .addUserOption((opt) => opt.setName('regexp').setDescription('regex'))
    .toJSON(),
  new SlashCommandBuilder()
    .setName('unsub')
    .setDescription('Does the opposite of /subscribe')
    .addUserOption((opt) =>
      opt.setName('module_code').setDescription('exact match string')
    )
    .toJSON(),
  new SlashCommandBuilder()
    .setName('bulkunsub')
    .setDescription('Does the opposite of /bulksubscribe')
    .addUserOption((opt) => opt.setName('regexp').setDescription('regex'))
    .toJSON(),
  new SlashCommandBuilder()
    .setName('toggle_per_event')
    .setDescription('Toggle per-event reminder setting')
    .toJSON(),
  new SlashCommandBuilder()
    .setName('setannounce')
    .setDescription(
      'Sets the announce channel to given channel. Default is "#calendar-events"'
    )
    .addUserOption((opt) =>
      opt
        .setName('channel_id')
        .setDescription('channel ID, use # to find the channel')
    )
    .toJSON(),
];

// do some setup
client.on('ready', () => {
  client.guilds.cache.map((guild) =>
    rest.put(Routes.applicationGuildCommands(config.clientID, guild.id), {
      body: commands,
    })
  );
});

client.on('guildCreate', (guild) => {
  rest.put(Routes.applicationGuildCommands(config.clientID, guild.id), {
    body: commands,
  });

  if (global.subscriptions[guild.id]) return;

  global.subscriptions[guild.id] = {
    modules: [],
    channelID: null,
    perEvent: false,
  };

  fs.writeFileSync(
    './subscriptions.json',
    JSON.stringify(global.subscriptions)
  );
});

client.on('interactionCreate', (interaction) => {
  if (!interaction.isCommand()) return;
  const subscription = global.subscriptions[interaction.guildId];
  switch (interaction.commandName) {
    case 'info':
      interaction.reply({
        ephemeral: true,
        content: dedent`
      Server: ${interaction.guild.name}\n
      Modules Subscribed: ${subscription.modules.join(',')}
      Announce Channel: ${
        subscription.channelID
          ? interaction.guild.channels.cache.find(
              (chan) => chan.id === subscription.channelID
            ).name
          : ''
      }
      Per Event Reminders: ${subscription.perEvent}`,
      });
      break;
    case 'search':
      break;
    case 'subscribe':
      break;
    case 'bulksubscribe':
      break;
    case 'unsub':
      break;
    case 'bulkunsub':
      break;
    case 'toggle_per_event':
      break;
    case 'setannounce':
      break;

    default:
      return;
  }
});
