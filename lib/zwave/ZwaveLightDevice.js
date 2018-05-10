'use strict';

const util = require('./../util');
const ZwaveDevice = require('homey-meshdriver').ZwaveDevice;

/**
 * The ZwaveLightDevice class has built-in functionality for the debounced light capabilities and custom set parser
 * First create a list of groupedCapabilities, then call this.registerGroupedCapabilities(groupedCapabilities)
 *
 * It only works with the SWITCH_COLOR commandClass.
 *
 * @extends ZwaveDevice
 * @example
 *
 * // device.js
 * const ZwaveLightDevice = require('homey-meshdriver').ZwaveLightDevice;
 *
 * class myDevice extends ZwaveLightDevice {
 * 
 * 	async onMeshInit() {
 * 		await super.onMeshInit();
 * 
 * 		const groupedCapabilities = [];
 * 		if (this.hasCapability('onoff')) {
 * 			groupedCapabilities.push({
 * 				capability: 'onoff',
 * 				commandClass: 'SWITCH_MULTILEVEL'
 * 			});
 * 		}
 * 		if (this.hasCapability('dim')) {
 * 			groupedCapabilities.push({
 * 				capability: 'dim',
 * 				commandClass: 'SWITCH_MULTILEVEL'
 * 			});
 * 		}		
 * 		if (this.hasCapability('light_hue')) {
 * 			groupedCapabilities.push({
 * 				capability: 'light_hue',
 * 				commandClass: 'SWITCH_COLOR',
 * 				opts: {
 * 					setParser:this.switchColorSetParser
 * 				}
 * 			});
 * 		}
 * 		if (this.hasCapability('light_saturation')) {
 * 			groupedCapabilities.push({
 * 				capability: 'light_saturation',
 * 				commandClass: 'SWITCH_COLOR',
 * 				opts: {
 * 					setParser:this.switchColorSetParser
 * 				}
 * 			});
 * 		}
 * 		if (this.hasCapability('light_temperature')) {
 * 			groupedCapabilities.push({
 * 				capability: 'light_temperature',
 * 				commandClass: 'SWITCH_COLOR',
 * 				opts: {
 * 					setParser:this.switchColorSetParser
 * 				}
 * 			});
 * 		}
 * 		if (this.hasCapability('light_mode')) {
 * 			groupedCapabilities.push({
 * 				capability: 'light_mode',
 * 				commandClass: 'SWITCH_COLOR',
 * 				opts: {
 * 					setParser:this.switchColorSetParser
 * 				}
 * 			});
 * 		}
 * 		this.registerGroupedCapabilities(groupedCapabilities);
 * 	}
 * }
 */

class ZwaveLightDevice extends ZwaveDevice {

	async onMeshInit() {


	}

	/**
	 * Register multiple capabilities, they will be debounced when one of them is called
	 * @param groupedCapabilities
	 */
	registerGroupedCapabilities(groupedCapabilities) {
		this.registerMultipleCapabilities(groupedCapabilities, (valueObj, optsObj) => {

			//only handle onoff capability when:
			//- it is set to off
			//- or it is the only property
			if (valueObj.hasOwnProperty('onoff') && (valueObj.onoff === false || Object.keys(valueObj).length === 1)) {

				//run default capability 
				return false;

			} else {

				//get changed capabiltities per command so we can process each command once
				const capabilityValuesPerCommand = this._getCapabilityValuesPerCommand(groupedCapabilities, valueObj);

				let calls = [];

				//handle SWITCH_COLOR command class
				if (capabilityValuesPerCommand.hasOwnProperty('SWITCH_COLOR')) {

					//get capabilityset object for the first changed capability of commandClass 'SWITCH_COLOR'
					const capabilityObj = groupedCapabilities.find(
						function(x) { 
							return x.commandClass === 'SWITCH_COLOR' && this.hasOwnProperty(x.capability)
						},
						capabilityValuesPerCommand['SWITCH_COLOR']
					);
					const capabilitySetObj = this._getCapabilityObj('set', capabilityObj.capability, capabilityObj.commandClass);

					//check if capability set object is valid
					if (capabilitySetObj instanceof Error) {
						return Promise.reject(capabilitySetObj);
					}

					//call parser class (switchColorSetParser)
					const parsedPayload = capabilitySetObj.parser.call(this, capabilityValuesPerCommand['SWITCH_COLOR'], {});
					if (parsedPayload instanceof Error) {
						return Promise.reject(parsedPayload);
					}

					//add call to calls list to execute at the end
					try {
						const commandClass = capabilitySetObj.node.CommandClass['COMMAND_CLASS_SWITCH_COLOR'];
						const command = commandClass[capabilitySetObj.commandId];

						calls.push({
							'command': command,
							'parsedPayload': parsedPayload
						});
					} catch (err) {
						return Promise.reject(err);
					}
				}

				//handle SWITCH_MULTILEVEL command class
				if (capabilityValuesPerCommand.hasOwnProperty('SWITCH_MULTILEVEL')) {

					//handle dim capability
					if (capabilityValuesPerCommand['SWITCH_MULTILEVEL'].hasOwnProperty('dim')) {

						const capabilitySetObj = this._getCapabilityObj('set', 'dim', 'SWITCH_MULTILEVEL');

						//check if capability set object is valid
						if (capabilitySetObj instanceof Error) {
							return Promise.reject(capabilitySetObj);
						}

						//call parser class
						const parsedPayload = capabilitySetObj.parser.call(this, capabilityValuesPerCommand['SWITCH_MULTILEVEL']['dim'], {});
						if (parsedPayload instanceof Error) {
							return Promise.reject(parsedPayload);
						}

						//add call to calls list to execute at the end
						try {
							const commandClass = capabilitySetObj.node.CommandClass['COMMAND_CLASS_SWITCH_MULTILEVEL'];
							const command = commandClass[capabilitySetObj.commandId];

							calls.push({
								'command': command,
								'parsedPayload': parsedPayload
							});
						} catch (err) {
							return Promise.reject(err);
						}
					}

					//TODO: add more commands and parsedPayloads to calls for changing color when color capability is handled by SWITCH_MULTILEVEL command
				}

				//return and execute single command when only one call has to be made
				if (calls.length == 1) {
					const singleCall = calls[0];
					return singleCall.command.call(singleCall.command, singleCall.parsedPayload);
				}

				//run calls sequencly when multiple calls must be made
				if (calls.length > 0) {
					const funcs = calls.map(call => () => call.command.call(call.command, call.parsedPayload));
					this._promiseSerial(funcs);
					return true;
				}

				//fallback
				return false;
			}
		});
	}

	/**
	 * custom set parser for SWITCH_COLOR command class 
	 * used to get 1 property set for all debounced light capabilities
	 * @param values
	 */
	switchColorSetParser(values) {

		//array for all light capabilities
		var lightCapabilities = [];

		//add default light capabilities
		['light_hue','light_saturation','light_temperature','light_mode'].forEach(capability => {
			if (this.hasCapability(capability)) {
				lightCapabilities[capability] = (values.hasOwnProperty(capability) ? values[capability] : this.getCapabilityValue(capability));
			}

		},this);

		//add dim when dim is has the same command class
		//when dim command class is different, dim value is not needed for color convertion
		if (this.hasCapability("dim") && typeof this._capabilities["dim"]["SWITCH_COLOR"] !== "undefined") {
			lightCapabilities["dim"] = (values.hasOwnProperty("dim") ? values.dim : this.getCapabilityValue("dim"));
		}

		//default values
		let rgb = {
			red: 0,
			green: 0,
			blue: 0
		};
		let white = {
			ww: 0,
			cw: 0
		};

		//set RGB when light_mode is not set or is set to color
		//use convertHSVToRGB to calculate rgb value. Unknown or not used lightcapabilities are also handled by this method
		if (lightCapabilities.hasOwnProperty("light_mode") == false || lightCapabilities.light_mode === "color" || lightCapabilities.light_mode === null) {
			rgb = util.convertHSVToRGB({
				hue: lightCapabilities.light_hue,
				saturation: lightCapabilities.light_saturation,
				value: lightCapabilities.dim
			});
		}

		//set white when capability light_mode is not available and light temperature is set
		//or light temperature is known and light mode is set to temperature
		//light_mode is used for devices which cannot handle white and rgb colors at the same time
		if ((values.hasOwnProperty("light_temperature") && lightCapabilities.hasOwnProperty("light_mode") == false) || (lightCapabilities.hasOwnProperty("light_temperature") && lightCapabilities.light_mode === "temperature")) {
			white.ww = (lightCapabilities.light_temperature >= 0.5) ? this._map(0.5, 1, 10, 255, lightCapabilities.light_temperature) : 0;
			white.cw = (lightCapabilities.light_temperature < 0.5) ? this._map(0, 0.5, 255, 10, lightCapabilities.light_temperature) : 0;
		}

		//return parsed parameters
		return {
			'Properties1': {
				'Color Component Count': 5
			},
			'vg1': [
				{
					'Color Component ID': 0,
					'Value': white.ww
				},
				{
					'Color Component ID': 1,
					'Value': white.cw
				},
				{
					'Color Component ID': 2,
					'Value': rgb.red
				},
				{
					'Color Component ID': 3,
					'Value': rgb.green
				},
				{
					'Color Component ID': 4,
					'Value': rgb.blue
				}
			]
		}
	}

	/**
	 * this function groups the given values into commandclasses
	 * @param groupedCapabilities
	 * @param values
	 * @private
	 */
	_getCapabilityValuesPerCommand(groupedCapabilities, values) {
		const groupedCapabilitiesPerCommand = [];
		for (const groupedCapability of groupedCapabilities) {
			//check if capabilty is set in values
			if (values.hasOwnProperty(groupedCapability.capability)) {
				groupedCapabilitiesPerCommand[groupedCapability.commandClass] = groupedCapabilitiesPerCommand[groupedCapability.commandClass] || [];

				//add value to groupedCapabilitiesPerCommand
				const value = values[groupedCapability.capability];
				groupedCapabilitiesPerCommand[groupedCapability.commandClass][groupedCapability.capability] = value;
			}
		}
		return groupedCapabilitiesPerCommand;
	}

	/**
	 * map function for calculating the right white value
	 * @param inputStart
	 * @param inputEnd
	 * @param outputStart
	 * @param outputEnd
	 * @param input
	 * @private
	 */
	_map(inputStart, inputEnd, outputStart, outputEnd, input) {
		return outputStart + ((outputEnd - outputStart) / (inputEnd - inputStart)) * (input - inputStart);
	}

	_promiseSerial(funcs) {
		funcs.reduce((promise, func) =>
			promise.then(result => func().then(Array.prototype.concat.bind(result)).catch(function(error) {console.log(error);})),
			Promise.resolve([])
		)
	}
}

module.exports = ZwaveLightDevice;