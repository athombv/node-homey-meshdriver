'use strict';

const MeshDevice = require('../MeshDevice.js');

const Homey = require('homey');

const SYSTEM_CAPABILITIES = [
	'onoff'	
];

class ZwaveDevice extends MeshDevice {

	onInit() {
		super.onInit('zwave');
		
		this._capabilities = {};
		this._settings = {};
		this._pollIntervals = {};
		
		this.on('__meshInit', () => {
			this._debug('ZwaveDevice has been inited')
		});
	}
	
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
	
	_registerCapabilityGet( capabilityId, commandClassId ) {
		
		let capabilityGetObj = this._getCapabilityObj('get', capabilityId, commandClassId);
		if( capabilityGetObj instanceof Error ) return capabilityGetObj;
		
		if( capabilityGetObj.opts.getOnStart ) {
			this._getCapabilityValue( capabilityId, commandClassId );
		}
		
		if( capabilityGetObj.opts.pollInterval ) {
			if( typeof capabilityGetObj.opts.pollInterval === 'number' ) {
				
				this._pollIntervals[ capabilityId ] = this._pollIntervals[ capabilityId ] || {};
				this._pollIntervals[ capabilityId ][ commandClassId ] = setInterval(() => {
					this._debug(`Polling commandClassId '${commandClassId}' for capabilityId '${capabilityId}'`);
					this._getCapabilityValue( capabilityId, commandClassId );					
				}, capabilityGetObj.opts.pollInterval);
				
			} else {
				
			}
			this._getCapabilityValue( capabilityId, commandClassId );
		}
				
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
				
				return this._onReport( capabilityId, payload );
			});
	}
	
	_onReport( capabilityId, payload ) {
		
		let capabilityReportObj = this._getCapabilityObj('report', capabilityId);
		if( capabilityReportObj instanceof Error ) return capabilityReportObj;
		if( typeof capabilityReportObj.parser !== 'function' ) return;
				
		let parsedPayload = capabilityReportObj.parser( payload );
		if( parsedPayload instanceof Error ) return parsedPayload;
				
		this.setCapabilityValue( capabilityId, parsedPayload );
		
	}
	
	registerSetting( settingId, parserFn ) {
		this._settings[ settingId ] = parserFn;
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
	
}

module.exports = ZwaveDevice;