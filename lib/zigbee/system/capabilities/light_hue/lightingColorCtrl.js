'use strict';

const maxHue = 254;

module.exports = {
	set: 'moveToHue',
	setParser(value) {
		return {
			hue: Math.round(value * maxHue),
			direction: 0,
			transtime: Math.round(this.getSetting('transition_time') * 10),
		};
	},
	get: 'currentHue',
	reportParser(value) {
		return value / maxHue;
	},
	report: 'currentHue',
	getOpts: {
		getOnStart: true,
	},
};
