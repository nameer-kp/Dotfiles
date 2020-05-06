function ya_sovetnik_custom_options_main() {
	var ya_sovetnik_toggle = document.getElementById('ya_sovetnik_toggle');
	
	chrome.storage.sync.get({
		ya_sovetnik_enabled: false
	}, function(data) {
		ya_sovetnik_toggle.checked = data.ya_sovetnik_enabled;
		ya_sovetnik_toggle.addEventListener('change', function() {
			chrome.storage.sync.set({
				ya_sovetnik_enabled: this.checked
			});
		});
	});
}

document.addEventListener("DOMContentLoaded", function(event) {
	ya_sovetnik_custom_options_main();
});