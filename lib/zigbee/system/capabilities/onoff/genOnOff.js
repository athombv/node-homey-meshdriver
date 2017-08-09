'use strict';

module.exports = {
	set: value => value ? 'on' : 'off',
	setParser: () => ({}),
	get: 'onOff',
	reportParser: value => value === 1,
	report: 'onOff',
};
