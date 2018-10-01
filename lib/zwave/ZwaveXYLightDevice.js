'use strict';

const ZwaveDevice = require('homey-meshdriver').ZwaveDevice;
const ZwaveUtils = require('homey-meshdriver').Util;
const FACTORY_DEFAULT_COLOR_DURATION = 255;
let DebounceColorMode;

/**
 * ZwaveXYLightDevice takes care of all commands used by XY Lighting devices (COMMAND_CLASS_SWITCH_COLOR).
 * Set the capabilitiesOptions "setOnDim" to false for the onoff capability
 *
 * Duration(s) can be given for:
 * - dim (SWITCH_MULTILEVEL >= V2)
 * - light_hue (SWITCH_COLOR >= V2)
 * - light_saturation (SWITCH_COLOR >= V2)
 * - light_temperature (SWITCH_COLOR >= V2)
 *
 * @extends ZwaveDevice
 * @example
 *
 * // app.json
 * {
 * 	"id": YOUR_APP_ID,
 * 	...
 * 	"drivers": [
 * 		{
 *			"id": "YOUR_DRIVER_ID",
 * 			"capabilitiesOptions": {
 * 				"onoff": {
 * 					"setOnDim": false
 * 				},
 * 				"dim": {
 * 					"opts": {
 * 						"duration": true
 * 					}
 * 				},
 * 				"light_hue": {
 * 					"opts": {
 * 						"duration": true
 * 					}
 * 				},
 * 				"light_saturation": {
 * 					"opts": {
 * 						"duration": true
 * 					}
 * 				}
 * 				"light_temperature": {
 * 					"opts": {
 * 						"duration": true
 * 					}
 * 				}
 * 			}
  * 	]
 * }
 *
 * // device.js
 * const ZwaveXYLightDevice = require('homey-meshdriver').ZwaveXYLightDevice;
 *
 * class myDevice extends ZwaveXYLightDevice {
 *
 * 	async onMeshInit() {
 *
 * 		await super.onMeshInit();
 * 		// YOUR CODE COMES HERE
 * 		}
 * 	}
 */

class ZwaveXYLightDevice extends ZwaveDevice {

  onMeshInit() {

    // Check if all used capabilities are present
    if (!this.hasCapability('onoff')) return this.error('Missing capability: onoff');
    if (!this.hasCapability('dim')) return this.error('Missing capability: dim');
    if (!this.hasCapability('light_mode')) return this.error('Missing capability: light_mode');
    if (!this.hasCapability('light_hue')) return this.error('Missing capability: light_hue');
    if (!this.hasCapability('light_saturation')) return this.error('Missing capability: light_saturation');
    if (!this.hasCapability('light_temperature')) return this.error('Missing capability: light_temperature');

    // Register capabilities
    if (this.hasCommandClass('SWITCH_MULTILEVEL')) {

      this.registerCapability('onoff', 'SWITCH_MULTILEVEL');
      this.registerCapability('dim', 'SWITCH_MULTILEVEL');

    // If Multilevel Switch is not available fall back to basic
    } else if(this.hasCommandClass('BASIC')) {

      this.registerCapability('onoff', 'BASIC');
      this.registerCapability('dim', 'BASIC');

    }

    this.registerMultipleCapabilityListener(['light_hue', 'light_saturation'], async (values, options) => {
      let hue, saturation;
      typeof values.light_hue === 'number' ? hue = values.light_hue : hue = this.getCapabilityValue('light_hue');
      typeof values.light_saturation === 'number' ? saturation = values.light_saturation : saturation = this.getCapabilityValue('light_saturation');
      const value = 1; // Bightness value is not determined in SWITCH_COLOR but with SWITCH_MULTILEVEL, changing this throws the dim value vs reallife brightness out of sync

      const rgb = ZwaveUtils.convertHSVToRGB({hue, saturation, value});

      DebounceColorMode = setTimeout(() => {
        DebounceColorMode = false
      }, 200);

      return await this._sendColors({warm: 0, cold: 0, red: rgb.red, green: rgb.green, blue: rgb.blue, duration: options.duration || FACTORY_DEFAULT_COLOR_DURATION});
    });


    this.registerCapabilityListener(['light_temperature'], async (value, options) => {
      const warm = Math.floor(value * 255);
      const cold = Math.floor((1 - value) * 255);

      DebounceColorMode = setTimeout(() => {
        DebounceColorMode = false
      }, 200);

      return await this._sendColors({warm: warm, cold: cold, red: 0, green: 0, blue: 0, duration: options.duration || FACTORY_DEFAULT_COLOR_DURATION});
    });

    this.registerCapability('light_mode', 'SWITCH_COLOR', {
      set: 'SWITCH_COLOR_SET',
      setParser: (value, options) => {

        // set Light_mode is always triggered with the set color/temperature flow cards, timeout is needed because of homey's async nature surpassing the debounce
        setTimeout(async () => {
          if (DebounceColorMode) {
            clearTimeout(DebounceColorMode);
            DebounceColorMode = false;
            return this.setCapabilityValue('light_mode', value);
          }

          if (value === 'color') {
            const hue = this.getCapabilityValue('light_hue') || 1;
            const saturation = this.getCapabilityValue('light_saturation') || 1;
            const value = 1; // Bightness value is not determined in SWITCH_COLOR but with SWITCH_MULTILEVEL, changing this throws the dim value vs reallife brightness out of sync

            const rgb = ZwaveUtils.convertHSVToRGB({hue, saturation, value});

            return await this._sendColors({warm: 0, cold: 0, red: rgb.red, green: rgb.green, blue: rgb.blue, duration: options.duration || FACTORY_DEFAULT_COLOR_DURATION});

          } else if (value === 'temperature') {
            const temperature = this.getCapabilityValue('light_temperature') || 1;
            const warm = temperature * 255;
            const cold = (1 - temperature) * 255;

            return await this._sendColors({warm: warm, cold: cold, red: 0, green: 0, blue: 0, duration: options.duration || FACTORY_DEFAULT_COLOR_DURATION});
          }
        }, 50);
      }
    });

    // Getting all color values during boot
    let CC_ColorSwitch = this.getCommandClass('SWITCH_COLOR');

    if (!(CC_ColorSwitch instanceof Error) && typeof CC_ColorSwitch.SWITCH_COLOR_GET === 'function') {

      // Timeout mandatory for stability, often fails getting 1 (or more) value without it
      setTimeout(() => {
        // Warm White
        const WarmWhite = new Promise((resolve, reject) => {
          CC_ColorSwitch.SWITCH_COLOR_GET({
            'Color Component ID': 0,
          })
          .catch(error => {
            this.error(error);
            return resolve(0);
            })
          .then(result => resolve((result && typeof result.Value === 'number') ? result.Value : 0));
        });

        // Cold White
        const ColdWhite = new Promise((resolve, reject) => {
          CC_ColorSwitch.SWITCH_COLOR_GET({
            'Color Component ID': 1
          })
          .catch(error => {
            this.error(error);
            return resolve(0);
          })
          .then(result => resolve((result && typeof result.Value === 'number') ? result.Value : 0));
        });

        // Red
        const Red = new Promise((resolve, reject) => {
          CC_ColorSwitch.SWITCH_COLOR_GET({
            'Color Component ID': 2
          })
          .catch(error => {
            this.error(error);
            return resolve(0);
          })
          .then(result => resolve((result && typeof result.Value === 'number') ? result.Value : 0));
        });

        // Green
        const Green = new Promise((resolve, reject) => {
          CC_ColorSwitch.SWITCH_COLOR_GET({
            'Color Component ID': 3
          })
          .catch(error => {
            this.error(error);
            return resolve(0);
          })
          .then(result => resolve((result && typeof result.Value === 'number') ? result.Value : 0));
        });

        // Blue
        const Blue = new Promise((resolve, reject) => {
          CC_ColorSwitch.SWITCH_COLOR_GET({
            'Color Component ID': 4
          })
          .catch(error => {
            this.error(error);
            return resolve(0);
          })
          .then(result => resolve((result && typeof result.Value === 'number') ? result.Value : 0));
        });

        // Wait for all color values to arrive
        Promise.all([WarmWhite, ColdWhite, Red, Green, Blue])
          .then(result => {
            if (result[0] === 0 && result[1] === 0) {
              const hsv = ZwaveUtils.convertRGBToHSV({
                red: result[2],
                green: result[3],
                blue: result[4]
              });

              this.setCapabilityValue('light_mode', 'color');
              this.setCapabilityValue('light_hue', hsv['hue']);
              this.setCapabilityValue('light_saturation', hsv['saturation']);
            } else {
              const temperature = Math.round(result[0] / 255 * 100) / 100;

              this.setCapabilityValue('light_mode', 'temperature');
              this.setCapabilityValue('light_temperature', temperature);
            }
          });
      }, 500);
    }
  }

  async _sendColors({warm, cold, red, green, blue, duration}) {
    const SwitchColorVersion =  this.getCommandClass('SWITCH_COLOR').version || 1;

    let setCommand = {
      Properties1: {
      	'Color Component Count': 5,
      },
      vg1: [
        {
          'Color Component ID': 0,
          Value: Math.round(warm),
        },
        {
          'Color Component ID': 1,
          Value: Math.round(cold),
        },
        {
          'Color Component ID': 2,
          Value: Math.round(red),
        },
        {
          'Color Component ID': 3,
          Value: Math.round(green),
        },
        {
          'Color Component ID': 4,
          Value: Math.round(blue),
        },
      ]
    };

    if (typeof duration === 'number' && SwitchColorVersion > 1) {
      setCommand.duration = ZwaveUtils.calculateZwaveDimDuration(duration) || FACTORY_DEFAULT_COLOR_DURATION;
    }

    await this.node.CommandClass.COMMAND_CLASS_SWITCH_COLOR.SWITCH_COLOR_SET(setCommand)
      .catch(error => {
        return Promise.reject(error);
      })
      .then(result => {
        if (result !== 'TRANSMIT_COMPLETE_OK') return Promise.reject(result);

        return Promise.resolve(true);
      });
  }
}

module.exports = ZwaveXYLightDevice;
