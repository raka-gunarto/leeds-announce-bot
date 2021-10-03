const Discord = require('discord.js');
const client = new Discord.Client();
const config = require('./config.json');
client.login(config.token);

const { REST } = require('@discordjs/rest');
const rest = new REST({ version: 9 }).setToken(config.token);
const { Routes } = require('discord-api-types/v9');
const { SlashCommandBuilder } = require('@discordjs/builders');

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
    .addUserOption((opt) => opt.setName('query'))
    .toJSON(),
  new SlashCommandBuilder()
    .setName('subscribe')
    .setDescription(
      'Subscribes to first module found with module code EXACT match'
    )
    .addUserOption((opt) => opt.setName('module code'))
    .toJSON(),
  new SlashCommandBuilder()
    .setName('bulksubscribe')
    .setDescription(
      "Subscribes to all modules where the module code has a match with given regexp. Useful for bulk subscribes for entire courses, etc. Note that this doesn't expect the match to be the entire module code. Eg. COMP3 and COMP3.* will work for any COMP3xxxxx modules since they both will have a match."
    )
    .addUserOption((opt) => opt.setName('regexp'))
    .toJSON(),
  new SlashCommandBuilder()
    .setName('unsub')
    .setDescription('Does the opposite of /subscribe')
    .addUserOption((opt) => opt.setName('module code'))
    .toJSON(),
  new SlashCommandBuilder()
    .setName('bulkunsub')
    .setDescription('Does the opposite of /bulksubscribe')
    .addUserOption((opt) => opt.setName('regexp'))
    .toJSON(),
  new SlashCommandBuilder()
    .setName('setannounce')
    .setDescription(
      'Sets the announce channel to given channel. Default is to find "#calendar events", if not found bot will not announce until channel is set'
    )
    .addUserOption((opt) => opt.setName('channel_id'))
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
});
