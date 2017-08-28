'use strict';

const ZigbeeDevice = require('./../../../ZigBeeDevice');

module.exports = {
	set: 'moveToColorTemp',
	setParser(value) {
		return {
			colortemp: Math.round(ZigbeeDevice.mapValueRange(0, 1, this._colorTempMin, this._colorTempMax, value)),
			transtime: Math.round(this.getSetting('transition_time') * 10),
		};
	},
	get: 'colorTemperature',
	reportParser(value) {
		return ZigbeeDevice.mapValueRange(this._colorTempMin, this._colorTempMax, 0, 1, value);
	},
	report: 'colorTemperature',
	getOpts: {
		getOnStart: true,
	},
};
