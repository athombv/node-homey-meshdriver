'use strict';

// TODO docs of new Z-Wave stuff

module.exports.Util = require('./lib/util');

module.exports.ZwaveDevice = require('./lib/zwave/ZwaveDevice.js');
module.exports.ZwaveLockDevice = require('./lib/zwave/ZwaveLockDevice.js');
module.exports.ZwaveLightDevice = require('./lib/zwave/ZwaveLightDevice.js');
module.exports.ZwaveSensorDevice = require('./lib/zwave/ZwaveSensorDevice.js');
module.exports.ZwaveSocketDevice = require('./lib/zwave/ZwaveSocketDevice.js');
module.exports.ZwaveMeteringDevice = require('./lib/zwave/ZwaveMeteringDevice.js');
module.exports.ZwaveWindowCoveringsDevice = require('./lib/zwave/ZwaveWindowCoveringsDevice.js');

module.exports.ZigBeeDevice = require('./lib/zigbee/ZigBeeDevice.js');
module.exports.ZigBeeLightDevice = require('./lib/zigbee/ZigBeeLightDevice.js');
module.exports.ZigBeeXYLightDevice = require('./lib/zigbee/ZigBeeXYLightDevice.js');
