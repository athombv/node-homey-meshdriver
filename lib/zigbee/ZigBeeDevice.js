'use strict';

const MeshDevice = require('../MeshDevice.js');

// TODO battery node online event

/**
 * @extends MeshDevice
 */
class ZigBeeDevice extends MeshDevice {

	/*
	 *	Homey methods
	 */

	/**
	 * @private
	 */
	onInit() {
		super.onInit('zigbee');

		this._capabilities = {};
		this._settings = {};
		this._reportListeners = {};
		this._pollIntervals = {};
		this._pollIntervalsKeys = {};

		this.once('__meshInit', () => {
			this.log('ZigBeeDevice has been inited');
			this.onMeshInit && this.onMeshInit();
		});
	}

	/*
	 * Private methods
	 */

	/**
	 * @private
	 */
	_registerCapabilityGet(capabilityId, clusterId) {

		const capabilityGetObj = this._getCapabilityObj('get', capabilityId, clusterId);
		if (capabilityGetObj instanceof Error) return capabilityGetObj;

		// get initial value on start if null, unless it's an offline battery device and the getOnOnline flag is also set
		if (capabilityGetObj.opts.getOnStart
			&& this.getCapabilityValue(capabilityId) === null
			&& !(this.node.battery && this.node.online === false && capabilityGetObj.opts.getOnOnline === true)) {
			this._getCapabilityValue(capabilityId, clusterId);
		}

		if (capabilityGetObj.opts.getOnOnline) {
			this.node.on('online', () => {
				this._debug(`Node online, getting clusterId '${clusterId}' for capabilityId '${capabilityId}'`);
				this._getCapabilityValue(capabilityId, clusterId);
			});
		}

		if (capabilityGetObj.opts.pollInterval) {

			let pollInterval;

			if (typeof capabilityGetObj.opts.pollInterval === 'number') {
				pollInterval = capabilityGetObj.opts.pollInterval;
			}

			if (typeof capabilityGetObj.opts.pollInterval === 'string') {
				pollInterval = this.getSetting(capabilityGetObj.opts.pollInterval);
				this._pollIntervalsKeys[capabilityGetObj.opts.pollInterval] = {
					capabilityId,
					clusterId,
				};
			}

			this._setPollInterval(capabilityId, clusterId, pollInterval);
		}
	}

	/**
	 * @private
	 */
	_setPollInterval(capabilityId, clusterId, pollInterval) {

		this._pollIntervals[capabilityId] = this._pollIntervals[capabilityId] || {};

		if (this._pollIntervals[capabilityId][clusterId]) {
			clearInterval(this._pollIntervals[capabilityId][clusterId]);
		}

		if (pollInterval < 1) return;

		this._pollIntervals[capabilityId][clusterId] = setInterval(() => {
			this._debug(`Polling clusterId '${clusterId}' for capabilityId '${capabilityId}'`);
			this._getCapabilityValue(capabilityId, clusterId);
		}, pollInterval);

	}

	/**
	 * @private
	 */
	_getCapabilityValue(capabilityId, clusterId) {

		const capabilityGetObj = this._getCapabilityObj('get', capabilityId, clusterId);
		if (capabilityGetObj instanceof Error) return capabilityGetObj;

		let parsedPayload = {};

		if (typeof capabilityGetObj.parser === 'function') {
			parsedPayload = capabilityGetObj.parser();
			if (parsedPayload instanceof Error) return this.error(parsedPayload);
		}

		try {
			const cluster = capabilityGetObj.node.endpoints[capabilityGetObj.endpoint].clusters[capabilityGetObj.clusterId];
			return cluster.read(capabilityGetObj.commandId)
				.then(res => this._onReport(capabilityId, capabilityGetObj.clusterId, res))
				.catch(err => this.error(err));
		} catch (err) {
			return this.error(err);
		}
	}

	/**
	 * @private
	 */
	_registerCapabilitySet(capabilityId, clusterId) {

		const capabilitySetObj = this._getCapabilityObj('set', capabilityId, clusterId);
		if (capabilitySetObj instanceof Error) return capabilitySetObj;

		this.registerCapabilityListener(capabilityId, async (value, opts) => {
			if (typeof capabilitySetObj.parser !== 'function') return Promise.reject(new Error('parser_is_not_a_function'));

			let commandId = capabilitySetObj.commandId;
			if (typeof capabilitySetObj.commandId === 'function') commandId = capabilitySetObj.commandId(value, opts);
			let parsedPayload = await capabilitySetObj.parser(value, opts);;
			if (parsedPayload instanceof Error) return Promise.reject(parsedPayload);
			if (parsedPayload === null) return Promise.resolve();

			try {
				const cluster = capabilitySetObj.node.endpoints[capabilitySetObj.endpoint].clusters[capabilitySetObj.clusterId];
				return cluster.do(commandId, parsedPayload)
					.catch(err => this.error(`Error: could not perform ${commandId} on ${capabilitySetObj.clusterId}`, err));
			} catch (err) {
				return Promise.reject(err);
			}
		});
	}

	/**
	 * @private
	 */
	_onReport(capabilityId, clusterId, payload) {

		const capabilityReportObj = this._getCapabilityObj('report', capabilityId, clusterId);
		if (capabilityReportObj instanceof Error) return capabilityReportObj;

		if (typeof capabilityReportObj.parser !== 'function') return;

		const parsedPayload = capabilityReportObj.parser(payload);
		if (parsedPayload instanceof Error) return;
		if (parsedPayload === null) return;

		this.setCapabilityValue(capabilityId, parsedPayload);

		return parsedPayload;
	}

	/**
	 * @private
	 */
	_getCapabilityObj(commandType, capabilityId, clusterId) {

		const capability = this._capabilities[capabilityId];
		let cluster;

		if (typeof clusterId !== 'undefined') {
			cluster = capability[clusterId];
		} else {
			return new Error('missing_zigbee_cluster_id');
		}

		if (typeof cluster === 'undefined') return new Error('missing_zigbee_capability');
		const commandId = cluster[commandType];
		const parser = cluster[`${commandType}Parser`] || null;
		const opts = cluster[`${commandType}Opts`] || {};
		const node = this.node;

		if (typeof commandId === 'string' || typeof commandId === 'function') {
			return {
				clusterId,
				commandId,
				endpoint: cluster.endpoint,
				parser,
				opts,
				node,
			};
		}

		return new Error(`capability_${commandType}_is_not_a_function_or_string`);
	}

	/*
	 * Public methods
	 */

	/**
	 * Register a Homey Capability with a Cluster.
	 * @param {string} capabilityId - The Homey capability id (e.g. `onoff`)
	 * @param {string} clusterId - The Cluster id (e.g. `genBasic`)
	 * @param {Object} [userOpts] - The object with options for this capability/cluster combination. These will extend system options, if available (`/lib/zigbee/system/`)
	 * @param {string} [userOpts.get] - The command to get a value (e.g. `onOff`)
	 * @param {string} [userOpts.getParser] - The function that is called when a GET request is made. Should return an Object.
	 * @param {Object} [userOpts.getOpts
	 * @param {Boolean} [userOpts.getOpts.getOnStart] - Get the value on App start
	 * @param {Boolean} [userOpts.getOpts.getOnOnline] - Get the value when the device is marked as online
	 * @param {Number|string} [userOpts.getOpts.pollInterval] - Interval to poll with a GET request. When provided a string, the device's setting with the string as ID will be used (e.g. `poll_interval`)
	 * @param {string} [userOpts.set] - The command to set a value (e.g. `on`)
	 * @param {Function} [userOpts.setParser] - The function that is called when a SET request is made. Should return an Object.
	 * @param {*} [userOpts.setParser.value] - The value of the Homey capability
	 * @param {Object} [userOpts.setParser.opts] - Options for the capability command
	 * @param {string} [userOpts.report] - The command to report a value (e.g. `onOff`)
	 * @param {Function} [userOpts.reportParser] - The function that is called when a REPORT request is made. Should return an Object.
	 * @param {Object} [userOpts.reportParser.report] - The report object
	 * @param {number} [userOpts.endpoint=0] - An index to identify the endpoint to use for this capability
	 */
	registerCapability(capabilityId, clusterId, userOpts) {

		// Register the ZigBee capability listener
		this._capabilities[capabilityId] = this._capabilities[capabilityId] || {};
		this._capabilities[capabilityId][clusterId] = this._capabilities[capabilityId][clusterId] || {};

		// Merge systemOpts & userOpts
		let systemOpts = {};
		try {
			systemOpts = require(`./system/capabilities/${capabilityId}/${clusterId}.js`);
		} catch (err) {
			if (err.code !== 'MODULE_NOT_FOUND') {
				process.nextTick(() => {
					throw err;
				});
			}
		}

		// Insert default endpoint zero
		if (userOpts && !userOpts.hasOwnProperty('endpoint')) userOpts.endpoint = 0;
		else if (typeof userOpts === 'undefined') userOpts = { endpoint: 0 };

		this._capabilities[capabilityId][clusterId] = Object.assign(
			systemOpts || {},
			userOpts || {}
		);

		// Register get/set
		this._registerCapabilitySet(capabilityId, clusterId);
		this._registerCapabilityGet(capabilityId, clusterId);
	}

	/**
	 * Register a report listener, which is called when a report has been received.
	 * @param {string} clusterId - The ID of the Cluser (e.g. `genBasic`)
	 * @param {string} commandId - The ID of the Command (e.g. `onOff`)
	 * @param {Function} triggerFn
	 * @param {Object} triggerFn.rawReport - The raw report
	 * @param {Object} triggerFn.parsedReport - The parsed report (parsed by the first available `reportParser` method)
	 * @param {number} [endpointId=0] - The endpoint index (e.g. 0)
	 */
	registerReportListener(clusterId, commandId, triggerFn, endpointId = 0) {
		this._reportListeners[clusterId] = this._reportListeners[clusterId] || {};
		this._reportListeners[clusterId][commandId] = triggerFn;

		// Bind cluster listener
		this.node.endpoints[endpointId].clusters[clusterId].bind()
			.then(() => {
				this.log(`bind ${clusterId} on endpoint ${endpointId} successful`);
				this.node.on('command', command => {
					if (this._reportListeners[command.cluster]
						&& this._reportListeners[command.cluster][command.attr]) {
						this._reportListeners[command.cluster][command.attr](command.value);
					}
				});
			})
			.catch(err => this.error(`could not bind ${clusterId} cluster`, err));
	}

	/**
	 * Print the current Node information with Endpoints and Clusters
	 */
	printNode() {
		this.log('------------------------------------------');

		// log the entire Node
		this.log('Node:', this.getData().token);
		this.log('- Battery:', this.node.battery);

		Object.keys(this.node.endpoints).forEach(endpointsId => {
			this.log('- Endpoints:', endpointsId);
			this.log('-- Clusters:');
			Object.keys(this.node.endpoints[endpointsId].clusters).forEach(key => {
				this.log('---', key);
				if (typeof this.node.endpoints[endpointsId].clusters[key].attrs !== 'undefined') {
					Object.keys(this.node.endpoints[endpointsId].clusters[key].attrs).forEach(attrKey => {
						this.log('----', attrKey, ':', this.node.endpoints[endpointsId].clusters[key].attrs[attrKey]);
					});
				}
			});
		});

		this.log('------------------------------------------');
	}

}

module.exports = ZigBeeDevice;
