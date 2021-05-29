var tick = require('./models/Tick.js');

const publishTick = new tick(new Date());
publishTick.publish();

//