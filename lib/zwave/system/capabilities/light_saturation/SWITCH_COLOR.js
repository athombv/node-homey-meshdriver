'use strict';

const util = require('./../../../../util');

module.exports = {
	set : 'SWITCH_COLOR_SET',
	setParser(value) {

		// Convert hue to rgb
		let rgb = util.convertHSVToRGB({
			hue: this.getCapabilityValue('light_hue'),
			saturation: value,
			value: 1
		});
		
		return {
			'Properties1': {
				'Color Component Count': 5
			},
			'vg1': [
				{
					'Color Component ID': 0, // WW
					'Value': 0
				},
				{
					'Color Component ID': 1, // CW
					'Value': 0
				},
				{
					'Color Component ID': 2, // R
					'Value': rgb.red
				},
				{
					'Color Component ID': 3, // G
					'Value': rgb.green
				},
				{
					'Color Component ID': 4, // B
					'Value': rgb.blue
				}
			]
		}
	}
};