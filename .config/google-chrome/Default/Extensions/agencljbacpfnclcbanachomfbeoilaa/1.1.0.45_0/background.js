this.isFF = window.navigator.userAgent.indexOf("Firefox/") > 0;
this.isProxyControllable = false;
this.isProxyEnabled = !this.isFF;

function PopupAPI()
{
		chrome.browserAction.setPopup({
			popup:"popup.html"
		});

		function hidePopupWindow()
		{
				var windowsArray = chrome.extension.getViews({
					type:"popup"
				});
				for (var i = 0, l = windowsArray.length; i < l; i++)
				{
					try
					{
						windowsArray[i].close();
					}
					catch(e)
					{
					}
				}
		}

		var popupHeight = 40;
		var popupWidth = 326;

		function resizePopupWindow(width, height)
		{
			popupHeight = height | 0;
			popupWidth = width | 0;
					var windowsArray = chrome.extension.getViews({
						type:"popup"
					});
					for (var i = 0, l = windowsArray.length; i < l; i++)
					{
						try
						{
							windowsArray[i].____updatePopup();
						}
						catch(e)
						{
							console.log(e);
							console.log(windowsArray[i]);
						}
					}
		}

		function getCurrentSize()
		{
			return {
				width : popupWidth,
				height : popupHeight
			};
		}

		return {
			hide : hidePopupWindow,
			resize : resizePopupWindow,
			getCurrentSize : getCurrentSize
		};
}

function getXmlHttp()
{
	var xmlhttp;
	try 
	{
		xmlhttp = new ActiveXObject("Msxml2.XMLHTTP");
	} 
	catch (e) 
	{
		try 
		{
			xmlhttp = new ActiveXObject("Microsoft.XMLHTTP");
		} 
		catch (E) 
		{
			xmlhttp = false;
		}
	}

	if (!xmlhttp && typeof XMLHttpRequest!='undefined') 
	{
		xmlhttp = new XMLHttpRequest();
	}
	return xmlhttp;
}

function Request(url, onSuccess, onError)
{
	var xmlhttp = getXmlHttp()
	xmlhttp.open('GET', url, true);
	xmlhttp.onreadystatechange = function() {
		if (xmlhttp.readyState == 4) 
		{
			if(xmlhttp.status == 200) 
			{
				onSuccess(xmlhttp.responseText);
			}
			else
			{
				onError();
			}
		}
	};

	xmlhttp.send(null);
}

function SetProxy()
{
    function badgeSwitch(isVisible) 
    {
        var badgeText = isVisible ? '!' : '';
        chrome.browserAction.setBadgeText({text: badgeText});
        chrome.browserAction.setBadgeBackgroundColor({color: '#F00'});
    }

    function controlCheck(details) {
        isProxyControllable = details.controllable;
        badgeSwitch(!isProxyControllable && isProxyEnabled);
    }

    function enableProxy () {
        window._proxy.update(function success() {
            controlCheck({controllable: true});
        }, function error() {
            controlCheck({controllable: false});
        });
    }

    function disableProxy () {
        window._proxy.disable(function() {
            badgeSwitch(false);
        });
    }
    
    window._proxy.onControlChange(controlCheck);
    chrome.storage.onChanged.addListener(function(change) {
        if (change['proxy_enabled'] !== undefined)
        {
            isProxyEnabled = change['proxy_enabled'].newValue;
            isProxyEnabled ? enableProxy() : disableProxy();
        }
    });
    window._proxy.addSite({domain: "rutor.info"});

    chrome.storage.sync.get(function(change) {
        if (change['proxy_enabled'] !== undefined)
        {
            isProxyEnabled = change['proxy_enabled'];
            isProxyEnabled ? enableProxy() : disableProxy();
        }
        else
        {
            chrome.storage.sync.set({
                'proxy_enabled': isProxyEnabled
            });
        }
        
    });
}

this.Popup = PopupAPI();
this.Request = Request;

document.addEventListener("DOMContentLoaded", function(event) {
    if (window._proxy) {
        SetProxy();
    }
});