'use strict';

const MeshDevice = require('../MeshDevice.js');

const Homey = require('homey');

const SYSTEM_CAPABILITIES = [
	'onoff'	
];

class ZwaveDevice extends MeshDevice {

	/*
		Homey methods
	*/
	
	onInit() {
		super.onInit('zwave');
		
		this._capabilities = {};
		this._settings = {};
		this._reportListeners = {};
		this._pollIntervals = {};
		this._pollIntervalsKeys = {};
		
		this.once('__meshInit', () => {
			this._debug('ZwaveDevice has been inited')
		});
	}
	
	onSettings( oldSettings, newSettings, changedKeysArr ) {
		
		for( let i = 0; i < changedKeysArr.length; i++ ) {
			let changedKey = changedKeysArr[i];
			let newValue = newSettings[changedKey];
			
			// check for poll interval
			if( this._pollIntervalsKeys[ changedKey ] ) {
				this._setPollInterval(
					this._pollIntervalsKeys[ changedKey ].capabilityId,
					this._pollIntervalsKeys[ changedKey ].commandClassId,
					newValue
				);
				continue;
			}
			
			let manifestSetting;
			let manifest = this.getDriver().getManifest();
			if( manifest && manifest.settings ) {
				for( let j = 0; j < manifest.settings.length; j++ ) {
					let setting = manifest.settings[j];
					if( setting.id !== changedKey ) continue;
					manifestSetting = setting.zwave;
				}
			}
			
			if( typeof manifestSetting === 'undefined' ) continue;
			
			// get the parser
			let parser = this._settings[changedKey] || this._systemSettingParser;
			if( typeof parser !== 'function' )
				return Promise.reject( new Error('invalid_parser') );
			
			let parsedValue = parser( newValue, manifestSetting );
			if( parsedValue instanceof Error )
				return Promise.reject( parsedValue );
			
			if( !Buffer.isBuffer(parsedValue) )
				return Promise.reject( new Error('invalid_buffer') );
				
			if( parsedValue.length !== manifestSetting.size )
				return Promise.reject( new Error('invalid_buffer_length') );
							
			this.node.CommandClass.COMMAND_CLASS_CONFIGURATION.CONFIGURATION_SET({
				'Parameter Number': manifestSetting.index,
				'Level': {
					'Size': parsedValue.length,
					'Default': false,
				},
				'Configuration Value': parsedValue,
			}, ( err, result ) => {
				if( err ) return this._debug('CONFIGURATION_SET', err);
			});
			
		}
			
		return Promise.resolve();
	}
	
	/*
		Private methods
	*/
	
	_systemSettingParser( newValue, manifestSetting ) {
		
		if( typeof newValue === 'boolean' ) {
			return new Buffer([ (newValue === true ) ? 1 : 0]);
		}
		
		if( typeof newValue === 'number' || parseInt(newSettingsObj[changedKey], 10).toString() === newSettingsObj[changedKey] ) {
			if( manifestSetting.signed === false ) {

				try {
					let buf = new Buffer(manifestSetting.size);
						buf.writeUIntBE(newValue, 0, manifestSetting.size);
					return buf;
				} catch( err ) {
					return err;
				}

			} else {

				try {
					let buf = new Buffer(manifestSetting.size);
						buf.writeIntBE(newValue, 0, manifestSetting.size);
					return buf;
				} catch( err ) {
					return err;
				}

			}
		}
	}
	
	_registerCapabilityGet( capabilityId, commandClassId ) {
		
		let capabilityGetObj = this._getCapabilityObj('get', capabilityId, commandClassId);
		if( capabilityGetObj instanceof Error ) return capabilityGetObj;
		
		// get initial value on start, unless it's an offline battery device and the getOnWakeUp flag is also set
		if( capabilityGetObj.opts.getOnStart
		 && !(this.node.battery && this.node.online === false && capabilityGetObj.opts.getOnWakeUp === true) ) {
			this._getCapabilityValue( capabilityId, commandClassId );
		}
		
		if( capabilityGetObj.opts.getOnWakeUp ) {
			this.node.on('online', () => {
				this._debug(`Node online, getting commandClassId '${commandClassId}' for capabilityId '${capabilityId}'`);
				this._getCapabilityValue( capabilityId, commandClassId );
			});
		}
		
		if( capabilityGetObj.opts.pollInterval ) {
			
			let pollInterval;			
				
			if( typeof capabilityGetObj.opts.pollInterval === 'number' ) {
				pollInterval = capabilityGetObj.opts.pollInterval;
			}
			
			if( typeof capabilityGetObj.opts.pollInterval === 'string' ) {
				pollInterval = this.getSetting( capabilityGetObj.opts.pollInterval );
				this._pollIntervalsKeys[ capabilityGetObj.opts.pollInterval ] = {
					capabilityId: capabilityId,
					commandClassId: commandClassId
				}
			}
			
			this._setPollInterval( capabilityId, commandClassId, pollInterval );
			
		}
				
	}
	
	_setPollInterval( capabilityId, commandClassId, pollInterval ) {
				
		this._pollIntervals[ capabilityId ] = this._pollIntervals[ capabilityId ] || {};
		
		if( this._pollIntervals[ capabilityId ][ commandClassId ] )
			clearInterval(this._pollIntervals[ capabilityId ][ commandClassId ]);
			
		if( pollInterval < 1 ) return;
		
		this._pollIntervals[ capabilityId ][ commandClassId ] = setInterval(() => {
			this._debug(`Polling commandClassId '${commandClassId}' for capabilityId '${capabilityId}'`);
			this._getCapabilityValue( capabilityId, commandClassId );					
		}, pollInterval);
		
	}
	
	_getCapabilityValue( capabilityId, commandClassId ) {
		
		let capabilityGetObj = this._getCapabilityObj('get', capabilityId, commandClassId);
		if( capabilityGetObj instanceof Error ) return capabilityGetObj;
			
		let parsedPayload = {};
		
		if( typeof capabilityGetObj.parser === 'function' ) {
			parsedPayload = capabilityGetObj.parser();
			if( parsedPayload instanceof Error ) return this.error( parsedPayload );
		}
					
		try {
			let commandClass = this.node.CommandClass[ `COMMAND_CLASS_${capabilityGetObj.commandClassId}` ];
			let command = commandClass[ capabilityGetObj.commandId ];
							
			return command.call( command, parsedPayload, ( err, payload ) => {
				if( err ) return this.error( err );
				return this._onReport( capabilityId, payload );
			});
		} catch( err ) {
			return this.error( err );
		}
		
	}
	
	_registerCapabilitySet( capabilityId, commandClassId ) {
		
		let capabilitySetObj = this._getCapabilityObj('set', capabilityId, commandClassId);
		if( capabilitySetObj instanceof Error ) return capabilitySetObj;
				
		this.registerCapabilityListener( capabilityId, ( value, opts ) => {
			
			if( typeof capabilitySetObj.parser !== 'function' ) return Promise.reject( new Error('missing_parser') );
			
			let parsedPayload = capabilitySetObj.parser( value, opts );
			if( parsedPayload instanceof Error ) return Promise.reject( parsedPayload );
			
			try {
				let commandClass = this.node.CommandClass[ `COMMAND_CLASS_${capabilitySetObj.commandClassId}` ];
				let command = commandClass[ capabilitySetObj.commandId ];
				
				return command.call( command, parsedPayload );
			} catch( err ) {
				return Promise.reject( err );
			}
			
		});
		
	}
	
	_registerCapabilityRealtime( capabilityId, commandClassId ) {
		
		let capabilityReportObj = this._getCapabilityObj('report', capabilityId, commandClassId);
		if( capabilityReportObj instanceof Error ) return capabilityReportObj;
		
			let commandClass = this.node.CommandClass[ `COMMAND_CLASS_${capabilityReportObj.commandClassId}` ];
			if( typeof commandClass === 'undefined' ) return this.error('Invalid commandClass:', capabilityReportObj.commandClassId);
				
			commandClass.on('report', ( command, payload ) => {
				if( command.name !== capabilityReportObj.commandId ) return;
				
				let parsedPayload = this._onReport( capabilityId, payload );
				if( parsedPayload instanceof Error ) return;
				
				if( this._reportListeners[ commandClassId ]
				 && this._reportListeners[ commandClassId ][ command.name ] ) {
					 this._reportListeners[ commandClassId ][ command.name ]( payload, parsedPayload );
				 }
			});
	}
	
	_onReport( capabilityId, payload ) {
		
		let capabilityReportObj = this._getCapabilityObj('report', capabilityId);
		if( capabilityReportObj instanceof Error ) return capabilityReportObj;
		if( typeof capabilityReportObj.parser !== 'function' ) return;
				
		let parsedPayload = capabilityReportObj.parser( payload );
		if( parsedPayload instanceof Error ) return;
		if( parsedPayload === null ) return;
				
		this.setCapabilityValue( capabilityId, parsedPayload );
		
		return parsedPayload;
		
		
	}
	
	_getCapabilityObj( commandType, capabilityId, commandClassId ) {
				
		let capability = this._capabilities[ capabilityId ];
		let commandClass;
		
		if( typeof commandClassId !== 'undefined' ) {
			commandClass = capability[ commandClassId ];
		} else {		
			for( let commandClassId in capability ) {
				commandClass = capability[ commandClassId ];
			}
		}
		
		if( typeof commandClass === 'undefined' )
			return new Error('missing_zwave_capability');				
			
		let commandId = commandClass[ commandType ];
		let parser = commandClass[`${commandType}Parser`] || null;
		
		let opts = commandClass[`${commandType}Opts`] || {};
					
		if( typeof commandId === 'string' ) return {
			commandClassId	: commandClassId,
			commandId		: commandId,
			parser			: parser,
			opts			: opts
		}
		
		return new Error('missing_zwave_capability');		
		
	}
	
	/*
		Public methods
	*/
	
	registerCapability( capabilityId, commandClassId, userOpts ) {
		
		// register the Z-Wave capability listener
		this._capabilities[ capabilityId ] = this._capabilities[ capabilityId ] || {};
		this._capabilities[ capabilityId ][ commandClassId ] = this._capabilities[ capabilityId ][ commandClassId ] || {};
		
		// merge systemOpts & userOpts
		let systemOpts = {};
		try {
			systemOpts = require(`./system/capabilities/${capabilityId}/${commandClassId}.js`);
		} catch( err ) {
			if( err.code !== 'MODULE_NOT_FOUND' ) {
				process.nextTick(() => {
					throw err;
				});
			}
		}
		
		this._capabilities[ capabilityId ][ commandClassId ] = Object.assign(
			systemOpts || {},
			userOpts || {}
		);
		
		// register get/set/realtime
		this._registerCapabilityRealtime( capabilityId, commandClassId );
		this._registerCapabilitySet( capabilityId, commandClassId );
		this._registerCapabilityGet( capabilityId, commandClassId );
	}
	
	registerSetting( settingId, parserFn ) {
		this._settings[ settingId ] = parserFn;
	}
	
	registerReportListener( commandClassId, commandId, triggerFn ) {
		this._reportListeners[ commandClassId ] = this._reportListeners[ commandClassId ] || {};
		this._reportListeners[ commandClassId ][ commandId ] = triggerFn;
	}
	
}

module.exports = ZwaveDevice;