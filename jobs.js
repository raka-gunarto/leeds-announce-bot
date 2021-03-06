const dedent = require('dedent');
const cron = require('node-cron');
const { getDetails, getModules, getTimetables } = require('./datafetch');

async function announceTimetable() {
  for (let [guildID, subscription] of Object.entries(global.subscriptions)) {
    // get channel to announce
    let announceChannel = null;
    if (subscription.channelID) {
      let savedChannel = global.client.guilds.cache
        .get(guildID)
        .channels.cache.get(subscription.channelID);
      if (savedChannel.type === 'GUILD_TEXT') announceChannel = savedChannel;
    } else {
      for (let channel of Object.values(
        global.client.guilds.cache.get(guildID).channels.cache.values()
      ))
        if (
          channel.name === 'calendar-events' &&
          channel.type === 'GUILD_TEXT'
        ) {
          announceChannel = channel;
          break;
        }
    }
    if (!announceChannel) continue;

    // get a dict of events (for module overlaps)
    let evtDict = {};
    for (let moduleID of subscription.modules) {
      for (let [evtName, evt] of Object.entries(
        global.events[moduleID.substr(0, moduleID.length - 2)] ?? {}
      ))
        evtDict[evtName] = evt;
    }

    // sort events by start time
    let evts = Object.values(evtDict);
    evts.sort((a, b) => a.start - b.start);

    // create embed
    let now = new Date();
    let url = `http://timetable.leeds.ac.uk/teaching/202122/reporting/TextSpreadsheet?objectclass=module&idtype=name&${subscription.modules
      .map((x) => `identifier=${encodeURI(x)}`)
      .join('&')}&template=SWSCUST+module+individual+links&days=${
      process.env.TEST ? '1-7' : now.getDay()
    }&periods=1-30&weeks=${Math.ceil(
      (now -
        new Date(
          global.details.startDate.year,
          global.details.startDate.month - 1,
          global.details.startDate.day
        )) /
        1000 /
        60 /
        60 /
        24 /
        7
    )}`;
    let fields = [];
    for (let evt of evts) {
      fields.push({
        name: `${Intl.DateTimeFormat('en', {
          hour12: false,
          timeStyle: 'short',
        }).format(evt.start)} - ${evt.moduleName}`,
        value: dedent`
        > ${evt.activityName} - **${evt.type} ${
          evt.addInfo2.includes('https') ? '(Virtual)' : '(In Person)'
        }** 
        > ${evt.addInfo} ${'\u200b'}
        > ${evt.addInfo2.includes('https') ? evt.addInfo2 : evt.location}
        `,
      });
    }

    let embed = {
      color: 2086281,
      thumbnail: {
        url: 'https://www.leeds.ac.uk/site/custom_scripts/campus_map/imgs/icons/loading.png',
      },
      author: {
        name: 'Leeds Timetable Bot',
        icon_url:
          'https://www.leeds.ac.uk/site/custom_scripts/campus_map/imgs/icons/loading.png',
        url: url,
      },
      fields:
        fields.length > 0
          ? fields
          : [{ name: 'No events today!', value: '\u200b' }],
    };

    // announce events
    announceChannel.send({ embeds: [embed] });
  }
}

(async () => {
  // get initial data
  await getDetails();
  await getModules();
  try {
    global.subscriptions = require('./subscriptions.json');
  } catch {
    global.subscriptions = {};
  }
  await getTimetables();

  // now set cronjobs
  cron.schedule('0 0 1 9 *', async () => {
    await getDetails();
    await getModules();
  }); // update modules every 1st September
  cron.schedule('1 0 * * *', getTimetables); // update timetables at 00:01 everyday
  cron.schedule('0 8 * * *', announceTimetable);
})();
