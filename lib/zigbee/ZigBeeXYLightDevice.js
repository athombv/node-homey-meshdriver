'use strict';

const ZigBeeDevice = require('homey-meshdriver').ZigBeeDevice;

const util = require('../util');

const CIEMultiplier = 65279;

class ZigBeeXYLightDevice extends ZigBeeDevice {

	onMeshInit() {

		this.printNode();

		// Register capabilities if present on device
		if (this.hasCapability('onoff')) this.registerCapability('onoff', 'genOnOff');
		if (this.hasCapability('dim')) this.registerCapability('dim', 'genLevelCtrl');

		// Register debounced capabilities
		const groupedCapabilities = [];
		if (this.hasCapability('light_hue')) {
			groupedCapabilities.push({
				capability: 'light_hue',
				cluster: 'lightingColorCtrl',
				opts: {
					set: 'moveToColor',
					setParser(value) {
						const { x, y } = util.convertHSVToCIE(
							value,
							this.getCapabilityValue('light_saturation'),
							this.getCapabilityValue('dim')
						);
						return {
							colorx: x * CIEMultiplier,
							colory: y * CIEMultiplier,
							transtime: Math.round(this.getSetting('transition_time') * 10),
						};
					},
				},
			});
		}
		if (this.hasCapability('light_saturation')) {
			groupedCapabilities.push({
				capability: 'light_saturation',
				cluster: 'lightingColorCtrl',
				opts: {
					set: 'moveToColor',
					setParser(value) {
						const { x, y } = util.convertHSVToCIE(
							this.getCapabilityValue('light_hue'),
							value,
							this.getCapabilityValue('dim')
						);
						return {
							colorx: x * CIEMultiplier,
							colory: y * CIEMultiplier,
							transtime: Math.round(this.getSetting('transition_time') * 10),
						};
					},
				},
			});
		}
		if (this.hasCapability('light_temperature')) {
			groupedCapabilities.push({
				capability: 'light_temperature',
				cluster: 'lightingColorCtrl',
				opts: {
					set: 'moveToColor',
					setParser(value) {

						// Correct a bit for a nice temperature curve
						const temperature = 0.2 + value / 4;
						return {
							colorx: temperature * CIEMultiplier,
							colory: temperature * CIEMultiplier,
							transtime: Math.round(this.getSetting('transition_time') * 10),
						};
					},
				},
			});
		}
		if (this.hasCapability('light_mode')) {
			groupedCapabilities.push({
				capability: 'light_mode',
				cluster: 'lightingColorCtrl',
				opts: {
					set: 'moveToColor',
					setParser(value) {

						// Set color
						if (value === 'color') {
							const {x, y} = util.convertHSVToCIE(
								this.getCapabilityValue('light_hue') * 360,
								this.getCapabilityValue('light_saturation') * 100,
								this.getCapabilityValue('dim') * 100,
							);
							return {
								colorx: x * CIEMultiplier,
								colory: y * CIEMultiplier,
								transtime: Math.round(this.getSetting('transition_time') * 10),
							};
						}

						// Set light temperature
						const temperature = 0.2 + this.getCapabilityValue('light_temperature') / 4;
						return {
							colorx: temperature * CIEMultiplier,
							colory: temperature * CIEMultiplier,
							transtime: Math.round(this.getSetting('transition_time') * 10),
						};
					},
				},
			});
		}

		// Register multiple capabilities, they will be debounced when one of them is called
		this.registerMultipleCapabilities(groupedCapabilities, (valueObj, optsObj) => {
			this.log('registerMultipleCapabilityListener()', valueObj, optsObj);

			if (valueObj.hasOwnProperty('light_hue') && valueObj.hasOwnProperty('light_saturation')) {

				const lightHue = valueObj.light_hue;
				const lightSaturation = valueObj.light_saturation;

				this.log('registerMultipleCapabilityListener() -> set hue and saturation');
				const { x, y } = util.convertHSVToCIE(
					lightHue,
					lightSaturation,
					this.getCapabilityValue('dim')
				);

				return this.node.endpoints[this.getClusterEndpoint('lightingColorCtrl')].clusters['lightingColorCtrl']
					.do('moveToColor', {
						colorx: x * CIEMultiplier,
						colory: y * CIEMultiplier,
						transtime: Math.round(this.getSetting('transition_time') * 10),
					})
					.catch(() => {
						throw new Error('failed_to_do_move_to_hue_and_saturation');
					});
			}
			else if (valueObj.hasOwnProperty('light_mode') && valueObj.hasOwnProperty('light_temperature')) {

				const lightTemperature = valueObj.light_temperature;

				this.log('registerMultipleCapabilityListener() -> set mode and temperature');

				return this.node.endpoints[this.getClusterEndpoint('lightingColorCtrl')].clusters['lightingColorCtrl']
					.do('moveToColor', {
						colorx: lightTemperature * CIEMultiplier,
						colory: lightTemperature * CIEMultiplier,
						transtime: Math.round(this.getSetting('transition_time') * 10),
					});
			} else if (valueObj.hasOwnProperty('light_mode') && valueObj.hasOwnProperty('light_hue')) {

				const lightHue = valueObj.light_hue;

				this.log('registerMultipleCapabilityListener() -> set mode and hue');

				const { x, y } = util.convertHSVToCIE(
					lightHue,
					this.getCapabilityValue('light_saturation'),
					this.getCapabilityValue('dim')
				);

				return this.node.endpoints[this.getClusterEndpoint('lightingColorCtrl')].clusters['lightingColorCtrl']
					.do('moveToColor', {
						colorx: x * CIEMultiplier,
						colory: y * CIEMultiplier,
						transtime: Math.round(this.getSetting('transition_time') * 10),
					});
			}
		});
	}
}

module.exports = ZigBeeXYLightDevice;
