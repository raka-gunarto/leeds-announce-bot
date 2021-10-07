const axios = require('axios').default;
const cheerio = require('cheerio');

module.exports = {
  getDetails: async () => {
    console.log('[*] Fetching date details...');
    try {
      const resp = await axios.get(
        'http://timetable.leeds.ac.uk/js/settings.js'
      );
      global.details = {
        academicYear: resp.data.match(/AcademicYear = "(\d*)"/)[1],
        startDate: {
          year: resp.data.match(/StartYear = (\d*)/)[1],
          month: resp.data.match(/StartMonth = (\d*)/)[1],
          day: resp.data.match(/StartDay = (\d*)/)[1],
        },
      };
      console.log('[*] Dates fetched');
    } catch (e) {
      console.error('[!!!] Unable to fetch dates!');
    }
  },
  getModules: async () => {
    try {
      let modulearray;
      console.log('[*] Fetching modules...');
      const resp = await axios.get(
        `http://timetable.leeds.ac.uk/teaching/${global.details.academicYear}/js/filter_module.js`
      );

      // identify array size & initialise
      const size = resp.data.match(/new Array\((\d*)\)/)[1];
      modulearray = new Array(size);
      for (let i = 0; i < size; i++) {
        modulearray[i] = new Array(2);
      }

      // evaluate modules
      eval(
        resp.data
          .split('\n')
          .filter((t) => /modulearray\[\d*\] \[\d*\] =/.test(t))
          .join('')
      );
      for (let i = 0; i < size; i++) {
        try {
          modulearray[i][2] = decodeURI(modulearray[i][2]);
          // eslint-disable-next-line no-empty
        } catch {}
      }

      // store modules
      if (global.modules) delete global.modules;
      global.modules = modulearray;

      console.log('[*] Modules fetched');
    } catch (e) {
      console.error(e);
      console.error('[!!!] Failed to fetch modules');
    }
  },
  getTimetables: async () => {
    console.log('[*] Fetching timetable events...');
    // fetch all subscribed modules only
    let modulesToFetch = new Set();
    for (let subscription of Object.values(global.subscriptions))
      for (let module of subscription.modules) modulesToFetch.add(module);

    modulesToFetch = Array.from(modulesToFetch);
    if (modulesToFetch.length == 0) return;

    // call API
    try {
      let now = new Date();
      const resp = await axios.get(
        `http://timetable.leeds.ac.uk/teaching/202122/reporting/TextSpreadsheet?objectclass=module&idtype=name&${modulesToFetch
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
        )}`
      );
      console.log(resp.config.url);
      const $ = cheerio.load(resp.data);

      // sort out timetable data
      if (global.events) delete global.events;
      global.events = {};

      let moduleName = '';
      $('body>table').each((idx, elem) => {
        if (elem.attribs.class.includes('header-border-args'))
          moduleName = $('.header-3-0-7', elem)[0].children[0].data;
        if (!elem.attribs.class.includes('spreadsheet')) return;
        let rows = $('tr', elem).slice(1);
        for (let row of rows) {
          let evt = $('td', row);
          let activityName = evt[0].children[0].data;
          let startStr = evt[3].children[0].data.split(':');
          let start = new Date();
          start.setHours(startStr[0]);
          start.setMinutes(startStr[1]);
          start.setSeconds(0);
          start.setMilliseconds(0);
          let endStr = evt[4].children[0].data.split(':');
          let end = new Date();
          end.setHours(endStr[0]);
          end.setMinutes(endStr[1]);
          end.setSeconds(0);
          end.setMilliseconds(0);
          let location = evt[5].children[0].data;
          let addInfo = evt[6].children[0].data;
          let addInfo2 = evt[8].children[0].data;
          let type = evt[10].children[0].data;

          $('a', evt[1]).each((idx, elem) => {
            let moduleCode = elem.children[0].data;
            if (!global.events[moduleCode]) global.events[moduleCode] = {};
            global.events[moduleCode][activityName] = {
              activityName,
              moduleName,
              start,
              end,
              location,
              addInfo,
              addInfo2,
              type,
            };
          });
        }
      });
      console.log('[*] Timetable events fetched');
    } catch (e) {
      console.error(e);
      console.error('[!!!] Unable to fetch timetable events!');
    }
  },
};
