var uiLang = chrome.i18n.getUILanguage();

chrome.runtime.onInstalled.addListener(function(details) {
	if (details.reason == "install" && !localStorage.landing && !localStorage['first_date_installation_bbpromo'])
	{
		localStorage['first_date_installation_bbpromo'] = new Date().getTime();
		chrome.management.getSelf(function(info) {
			var ext_name = encodeURIComponent(info.name);
			chrome.tabs.create({
				url: 'http://bebackpromo.ru/?lang=' + uiLang + '&cid=bbpromo_tsrt_1&ext=' + ext_name
			});
		});
	}
});
chrome.management.getSelf(function(info) {
	var ext_name = encodeURIComponent(info.name);
	chrome.runtime.setUninstallURL('http://bebackpromo.ru/?lang=' + uiLang + '&source_type=uninstall&cid=bbpromo_tsrt_1&ext=' + ext_name);
});

