'use strict';

const maxDim = 254;

module.exports = {
	set: 'moveToLevel',
	setParser(value) {
		if (value === 0) {
			return this.triggerCapabilityListener('onoff', false)
				.then(() => null)
				.catch(err => new Error('failed_to_trigger_onoff'));
		} else if (this.getCapabilityValue('onoff') === false && value > 0) {
			return this.triggerCapabilityListener('onoff', true)
				.then(() => ({
					level: Math.round(value * maxDim),
					transtime: Math.round(this.getSetting('transition_time') * 10),
				}))
				.catch(err => new Error('failed_to_trigger_onoff`', err));
		}
		return {
			level: Math.round(value * maxDim),
			transtime: Math.round(this.getSetting('transition_time') * 10),
		};
	},
	get: 'currentLevel',
	reportParser(value) {
		return value / maxDim;
	},
	report: 'currentLevel',
	getOpts: {
		getOnStart: true,
	},
};
