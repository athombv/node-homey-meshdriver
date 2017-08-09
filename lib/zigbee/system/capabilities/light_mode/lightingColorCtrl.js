'use strict';

const ZigBeeDevice = require('./../../../ZigBeeDevice');

const maxHue = 254;
const maxSaturation = 254;

module.exports = {
	set: 'moveToColorTemp',
	setParser(value) {
		switch (value) {
			case 'temperature': {
				return this.node.endpoints[this.getClusterEndpoint('lightingColorCtrl')].clusters.lightingColorCtrl
					.do('moveToColorTemp', {
						colortemp: Math.round(ZigBeeDevice.mapValueRange(0, 1, this._colorTempMin, this._colorTempMax,
							this.getCapabilityValue('light_temperature'))),
						transtime: Math.round(this.getSetting('transition_time') * 10),
					})
					.then(res => {
						this.log('did moveToColorTemp', res);
						return null;
					})
					.catch(err => new Error('failed_to_do_move_to_color_temp', err));
			}
			case 'color': {
				const lightHue = this.getCapabilityValue('light_hue');
				const lightSaturation = this.getCapabilityValue('light_saturation');

				return this.node.endpoints[this.getClusterEndpoint('lightingColorCtrl')].clusters.lightingColorCtrl
					.do('moveToHueAndSaturation', {
						hue: Math.round(lightHue * maxHue),
						saturation: Math.round(lightSaturation * maxSaturation),
						transtime: Math.round(this.getSetting('transition_time') * 10),
					}).then(() => {
						this.log('did moveToHueAndSaturation');
						return null;
					})
					.catch(err => new Error('failed_to_do_move_to_hue_and_saturation', err));
			}
			default:
				return null;
		}
	},
	get: 'colorMode',
	reportParser(value) {
		switch (value) {
			case 0:
				return 'color';
			case 2:
				return 'temperature';
			default:
				return 'color';
		}
	},
	report: 'colorMode',
};
