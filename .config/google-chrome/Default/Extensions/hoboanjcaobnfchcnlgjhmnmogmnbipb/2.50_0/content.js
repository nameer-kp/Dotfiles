// Copyright (c) 2012-2018 Flareget.com. All rights reserved.
// FlareGet Browser Integration helper extension
// http://flareget.com

window.onkeydown = function(event) 
{
    if (event.keyCode == 45 || event.keyCode == 70 || event.altKey || event.shiftKey) {
        chrome.runtime.sendMessage({enableEXT: "false"}, function() {
  			setTimeout(function(){
        		chrome.runtime.sendMessage({enableEXT: "true"});
        	},5000)
		});
	}
};



