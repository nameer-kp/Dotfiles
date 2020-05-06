Proxy.prototype.proxySet = function(pac_string, success, error) {
	var self = this;
	chrome.proxy.settings.set({
		value: self.generatePacConfig(pac_string, self.generateShellExpConditions()),
		scope: 'regular'
	}, function () {
		self.checkControllable(function(value) {
			if (value)
			{
				success && success();
			}
			else
			{
				error && error();
			}
		});
	});
}
Proxy.prototype.proxyClear = function(callback) {
	chrome.proxy.settings.clear({}, callback);
}
Proxy.prototype.checkControllable = function(callback) {
	chrome.proxy.settings.get({}, function(details) {
		if (details.levelOfControl.startsWith('controlled_by_other_extensions') || details.levelOfControl.startsWith('not_controllable'))
		{
			callback && callback(false);
		}
		else
		{
			callback && callback(true);
		}
	});
}
Proxy.prototype.init = function() {
	chrome.proxy.settings.onChange.addListener(this.onProxySettingsChange);
	this.onProxySettingsChange();
}

window._proxy = new Proxy();