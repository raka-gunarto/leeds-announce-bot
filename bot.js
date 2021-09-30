const axios = require('axios');

(async () => {
  //-- GET DATA FROM UoL
  let modulearray;
  try {
    console.log('[*] Fetching modules...');
    let now = new Date();
    let academicYear =
      now.getMonth() >= 8 ? now.getFullYear() : now.getFullYear() - 1; // academic year starts in Septermber
    const resp = await axios.get(
      `https://timetable.leeds.ac.uk/teaching/${academicYear}${
        (academicYear + 1).toString().substr(2) // we can worry about this when we reach 5 digit years lol
      }/js/filter_module.js`
    );

    // identify array size & initialise
    const size = resp.data.match(/new Array\((\d*)\)/)[1];
    modulearray = new Array(size);
    for (var i = 0; i < size; i++) {
      modulearray[i] = new Array(2);
    }

    // evaluate modules
    eval(
      resp.data
        .split('\n')
        .filter((t) => /modulearray\[\d*\] \[\d*\] =/.test(t))
        .join('')
    );

    console.log('[*] Modules fetched');
  } catch {
    console.error('[!!!] Fetching modules failed');
    process.exit(1);
  }
})();
