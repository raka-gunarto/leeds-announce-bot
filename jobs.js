const cron = require('node-cron');
const { getDetails, getModules, getTimetables } = require('./datafetch');

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
  console.log(global.events);
  // now set cronjobs
  cron.schedule('0 0 1 9 *', async () => {
    await getDetails();
    await getModules();
  }); // update modules every 1st September
  cron.schedule('1 0 * * *', async () => {
    await getTimetables();
    console.log(global.events);
    // TODO: announce timetables to subscribers
  }); // update timetables at 00:01 everyday
})();
