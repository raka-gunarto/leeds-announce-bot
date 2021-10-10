# Uni of Leeds Calendar Announce Bot
This Discord bot fetches UoL modules and their timetables. Servers can subscribe to specific modules for daily timetable announcements, optional per event reminders available.

Bot automatically fetches modules on startup / every 1st of September, and will fetch the timetables for each module daily.

### Why? Can't I just sync my iCal to whatever calendar app I use?
Wanted to make a Discord bot owo

### Command reference
Integrates with discord slash commands, but here they are anyway  
`/info` - Lists subscribed modules and settings  
`/search <query>` - Searches modules where the name / code matches `<query>`, accepts regex. Returns max. 10 results  
`/subscribe <module code>` - Subscribes to first module found with module code match  
`/bulksubscribe <regexp>` - Subscribes to all modules where the module code has a match with given regexp. Useful for bulk subscribes for entire courses, etc. Note that this doesn't expect the match to be the entire module code. Eg. `COMP3` and `COMP3.*` will work for COMP3xxxxxx modules since they both will have a match.  
`/unsub <module code>` - Does the opposite of `/subscribe`  
`/bulkunsub <regexp>` - Does the opposite of `/bulksubscribe`  
`/toggle_per_event` - Toggles per-event reminder setting  
`/setannounce <channel_id>` - Sets the announce channel to given channel. Default is to find "#calendar-events", if not found bot will not announce until channel is set  