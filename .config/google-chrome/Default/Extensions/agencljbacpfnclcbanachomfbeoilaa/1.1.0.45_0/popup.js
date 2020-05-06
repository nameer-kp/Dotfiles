(function ()
{
	var _window = window;

	function initPopup(arg)
	{
		function updatePopupSettings()
		{
			var body = document.body;
			if (body)
			{
				var size = bgWindow.Popup.getCurrentSize(),
					style = body.style;

				style.height = size.height + "px";
				style.width = size.width + "px";
			}
			else
			{
				setTimeout(updatePopupSettings, 0);
			}
		}
		
			_window.bgWindow = chrome.extension.getBackgroundPage();
			if (bgWindow.popupShown)
			{
				bgWindow.popupShown();
			}
			_window.addEventListener("unload", function (){
				if (bgWindow.popupHidden)
				{
					bgWindow.popupHidden();
				}
			}, true);
			updatePopupSettings();
			_window.____updatePopup = updatePopupSettings;
	}

	initPopup();
})();