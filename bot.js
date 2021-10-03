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
    .addStringOption((opt) =>
      opt.setName('query').setDescription('string / regex').setRequired(true)
    )
    .toJSON(),
  new SlashCommandBuilder()
    .setName('subscribe')
    .setDescription(
      'Subscribes to first module found with module code EXACT match'
    )
    .addStringOption((opt) =>
      opt
        .setName('module_code')
        .setDescription('exact match string')
        .setRequired(true)
    )
    .toJSON(),
  new SlashCommandBuilder()
    .setName('bulksubscribe')
    .setDescription(
      'Subscribes to all modules where the module code has a match with given regexp'
    )
    .addStringOption((opt) =>
      opt.setName('regexp').setDescription('regex').setRequired(true)
    )
    .toJSON(),
  new SlashCommandBuilder()
    .setName('unsub')
    .setDescription('Does the opposite of /subscribe')
    .addStringOption((opt) =>
      opt
        .setName('module_code')
        .setDescription('exact match string')
        .setRequired(true)
    )
    .toJSON(),
  new SlashCommandBuilder()
    .setName('bulkunsub')
    .setDescription('Does the opposite of /bulksubscribe')
    .addStringOption((opt) =>
      opt.setName('regexp').setDescription('regex').setRequired(true)
    )
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
    .addChannelOption((opt) =>
      opt
        .setName('channel_id')
        .setDescription('channel ID, use # to find the channel')
        .setRequired(true)
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
      interaction.reply({
        ephemeral: true,
        content: dedent`
          Matching modules:
          ${global.modules
            .filter(
              (m) =>
                m[0].match(interaction.options.data[0].value) ||
                m[2].match(interaction.options.data[0].value)
            )
            .slice(0, 10)
            .map((m) => `Code: ${m[2]}\n\tName: ${m[0]}`)
            .join('\n\t')}
        `,
      });
      break;
    case 'subscribe':
      {
        let module = global.modules.find(
          (m) => m[2] === interaction.options.data[0].value
        );
        if (!module)
          return interaction.reply({
            content: 'Module not found.',
          });
        global.subscriptions[interaction.guildId].modules.push(module[2]);
        global.subscriptions[interaction.guildId].modules = Array.from(
          new Set(subscription.modules)
        ); // remove duplicates

        fs.writeFileSync(
          './subscriptions.json',
          JSON.stringify(global.subscriptions)
        );

        interaction.reply(`Module "${module[0]}" added!`);
      }
      break;
    case 'bulksubscribe':
      {
        let modules = global.modules.filter((m) =>
          m[2].match(interaction.options.data[0].value)
        );
        if (!modules || modules.length === 0)
          return interaction.reply({
            content: 'Module not found.',
          });
        global.subscriptions[interaction.guildId].modules.push(
          ...modules.map((m) => m[2])
        );
        global.subscriptions[interaction.guildId].modules = Array.from(
          new Set(subscription.modules)
        ); // remove duplicates

        fs.writeFileSync(
          './subscriptions.json',
          JSON.stringify(global.subscriptions)
        );

        interaction.reply(
          `Modules added:\n\t${modules.map((m) => m[0]).join('\n\t')}`
        );
      }
      break;
    case 'unsub':
      global.subscriptions[interaction.guildId].modules =
        subscription.modules.filter(
          (m) => m[2] !== interaction.options.data[0].value
        );
      fs.writeFileSync(
        './subscriptions.json',
        JSON.stringify(global.subscriptions)
      );
      interaction.reply('Modules removed.');
      break;
    case 'bulkunsub':
      global.subscriptions[interaction.guildId].modules =
        subscription.modules.filter(
          (m) => !m[2].match(interaction.options.data[0].value)
        );
      fs.writeFileSync(
        './subscriptions.json',
        JSON.stringify(global.subscriptions)
      );
      interaction.reply('Modules removed.');
      break;
    case 'toggle_per_event':
      global.subscriptions[interaction.guildId].perEvent =
        !subscription.perEvent;
      interaction.reply(
        global.subscriptions[interaction.guildId].perEvent
          ? 'Per event reminders ON'
          : 'Per event reminders OFF'
      );
      break;
    case 'setannounce':
      global.subscriptions[interaction.guildId].channelID =
        interaction.options.data[0].value;
      interaction.reply(
        `Channel set to ${interaction.guild.channels.cache.find(
          (c) => c.id === interaction.options.data[0].value
        )}`
      );
      break;

    default:
      return;
  }
});
