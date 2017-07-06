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
	}
	
	registerCapability( capabilityId, commandClassId, userOpts ) {
		
		// register the Z-Wave capability listener
		this._capabilities[ capabilityId ] = this._capabilities[ capabilityId ] || {};
		this._capabilities[ capabilityId ][ commandClassId ] = this._capabilities[ capabilityId ][ commandClassId ] || {};
		
		// merge systemOpts & userOpts
		let systemOpts = {};
		try {
			systemOpts = require(`./system/capabilities/${capabilityId}.js`);
		} catch( err ) {
			if( err.code !== 'MODULE_NOT_FOUND' ) {
				process.nextTick(() => {
					throw err;
				});
			}
		}
		
		this._capabilities[ capabilityId ][ commandClassId ] = Object.assign(
			systemOpts[ commandClassId ] || {},
			userOpts || {}
		);
		
		// register listeners
		this._registerCapabilitySet( capabilityId, commandClassId );
		this._registerCapabilityRealtime( capabilityId, commandClassId );
	}
	
	_registerCapabilitySet( capabilityId, commandClassId ) {
		
		let capabilitySetObj = this._getCapabilityObj('set', capabilityId);
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
		
		let capabilityReportObj = this._getCapabilityObj('report', capabilityId);
		if( capabilityReportObj instanceof Error ) return capabilityReportObj;
		
			let commandClass = this.node.CommandClass[ `COMMAND_CLASS_${capabilityReportObj.commandClassId}` ];
			if( typeof commandClass === 'undefined' ) return this.error('Invalid commandClass:', capabilityReportObj.commandClassId);
			
			commandClass.on('report', ( command, payload ) => {
				if( command.name !== capabilityReportObj.commandId ) return;
				if( typeof capabilityReportObj.parser !== 'function' ) return;
				
				let parsedPayload = capabilityReportObj.parser( payload );
				this.setCapabilityValue( capabilityId, parsedPayload );
			});
	}
	
	registerSetting( settingId, parserFn ) {
		this._settings[ settingId ] = parserFn;
	}
	
	_getCapabilityObj( commandType, capabilityId ) {
				
		let capability = this._capabilities[ capabilityId ];
		
		for( let commandClassId in capability ) {
			let commandClass = capability[ commandClassId ];
			
			let commandId = commandClass[ commandType ];
			let parser = commandClass[`${commandType}Parser`];
						
			if( typeof commandId === 'string' ) return {
				commandClassId	: commandClassId,
				commandId		: commandId,
				parser			: parser
			}
				
		}
		
		return new Error('missing_zwave_capability');		
		
	}
	
}

module.exports = ZwaveDevice;