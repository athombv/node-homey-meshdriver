'use strict';

module.exports = {
	get: 'batteryVoltage',
	reportParser(value) {
		/* check if setting bat_thres exists otherwise if batteryThreshold in device.js exist use that.
 		* if both not exist use value 1
		*/
		const batThreshold = this.getSetting('bat_thres') || this.batteryThreshold || 1;
		// console.log(batThreshold);
		if (value <= batThreshold) return true;
		return false;
	},
	report: 'batteryVoltage',
};
