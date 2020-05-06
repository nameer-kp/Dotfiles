var alert_string = "The request must be longer than 2 characters";
var placehold = "Torrents search";
var show_alert = false;
var popup_default_width = 326;
var popup_default_height = 40;
var autocomplete_id = 0;
//localize, if ready

alert_string = chrome.i18n.getMessage("appAlertPopup");
placehold = chrome.i18n.getMessage("appPlaceholderPopup");

//addListener's (IE support :())
function addCustomListener(object, type, handler) {
	if (object.addEventListener) {
		object.addEventListener(type, handler);
	} else // if(object.attachEvent)
	{
		object['on'+type] = handler;
	}
}

//removeListener's
function removeCustomListener(object, type, handler)
{
	if(object.removeEventListener)
	{
		object.removeEventListener(type,handler);
	}
}

//function to add alert div and resize popup
function addAlertDiv(content, onclick) {
	if (!show_alert)
	{
		show_alert = true;
		var size = bgWindow.Popup.getCurrentSize();
		bgWindow.Popup.resize(size.width, size.height + 40);
		var div_alert = document.createElement("div");
		div_alert.className = "alert_div";
		var span_alert = document.createElement("span");
		span_alert.textContent = content;
		if (onclick) {
			span_alert.classList.add('link');
			span_alert.onclick = onclick;
		}
		div_alert.appendChild(span_alert);
		document.body.appendChild(div_alert);
	}
}

//function to remove alert div and resize popup, if alert exist
function removeAlertDiv()
{
	if(show_alert)
	{
		document.body.removeChild(document.querySelector('.alert_div'));
		var size = bgWindow.Popup.getCurrentSize();
		bgWindow.Popup.resize(size.width, size.height - 40);
		show_alert = false;
	}
}

function implement_search_data(inp_value)
{
	//if input text exist and length > 2
	if(inp_value.length > 0) 
	{
		if(inp_value.length > 2) {
			//encode input value
			var encoded_val = inp_value.trim();
			encoded_val = encoded_val.replace(/%/gi, '%25');
			encoded_val = encoded_val.replace(/\+/gi, '%2b');
			encoded_val = encoded_val.replace(/ /gi, '%20');
			encoded_val = encoded_val.replace(/\\/gi, '%5C');
			encoded_val = encoded_val.replace(/@/gi, '%40');
			encoded_val = encoded_val.replace(/#/gi, '%23');
			encoded_val = encoded_val.replace(/\$/gi, '%24');
			encoded_val = encoded_val.replace(/;/gi, '%3b');
			encoded_val = encoded_val.replace(/,/gi, '%2c');
			encoded_val = encoded_val.replace(/\?/gi, '%3f');
			encoded_val = encoded_val.replace(/\&/gi, '%26');

			//create url to redirect
			/*
				http://rutor.is/
				http://open-tor.org/
				http://rutor1.org/
			*/
			var href_to_redirect = 'http://rutor.info/search/' + encoded_val;

			//open new tab with url from background
			chrome.tabs.create({url:href_to_redirect},function(){});

			//close popup
			bgWindow.Popup.hide();
		} 
		else 
		{
			addAlertDiv(alert_string);	
		}
	}
}

function checkProxy()
{
	if (!bgWindow.isProxyEnabled)
	{
		addAlertDiv(chrome.i18n.getMessage("popupEnableMessage"), function() {
			if (bgWindow.isFF)
			{
				chrome.tabs.create({url: "/options/options.html"})
			}
			else
			{
				chrome.tabs.create({url: "chrome://extensions/?options=" + chrome.runtime.id});
			}
		});
	}
	else if (!bgWindow.isProxyControllable)
	{
		addAlertDiv(chrome.i18n.getMessage("popupBlockMessage"));
	}
}

function init() {
	autocomplete_id = 0;
	//resize popup to default value
	bgWindow.Popup.resize(popup_default_width, popup_default_height);
	document.getElementById("search-input").setAttribute("placeholder", placehold);
	String.prototype.trim = function() 
	{
    return this.replace(/^\s+|\s+$/g,"");
	}

	// Search
	var search_input = document.querySelector("#search-input");
	search_input.focus();
	var reset = document.querySelector("#reset_container");
	var autocomplete = document.querySelector("#autocomplete");
	var search_button = document.querySelector("#search-button");
	addCustomListener(search_input, "keyup", function(e)
	{
		var keyCode = e.keyCode ? e.keyCode : e.which;
		switch (keyCode) 
		{
			case 37: 
			break;

			case 38: 
			break;

			case 39: 
			break;

			case 40: 
			break;

			case 13: 
			break;

			default:
				//else - try to remove alert div if exist
				removeAlertDiv();
				autocomplete.className = "";
				autocomplete.textContent = "";
				autocomplete_id = 0;
				if(this.value !== '') {
					//if textinput not empty - show reset button
					reset.className='';
					//send request for autocomplete values

					var onSuccess = function(resp)
					{
						// ["<search_value>",[<ac1>,<ac2>, ..., <acN>]]
						resp = JSON.parse(resp);
						if(resp.length > 1)
						{
							for(var i = 0, l = resp[1].length; i < l; i++)
							{
								var auto = document.createElement('div');
								auto.className = "autocomplete_element";
								auto.textContent = resp[1][i];
								autocomplete.appendChild(auto);
								addCustomListener(auto,"click", function()
								{
									var inp_value = this.textContent;
									implement_search_data(inp_value);
								});
								addCustomListener(auto,"keyup", function(e)
								{
									e = e || window.event;
									var keyCode = e.keyCode ? e.keyCode : e.which;
									if(keyCode == 13)
									{
										if(this.className.indexOf('selected') != -1)
										{
											var inp_value = this.textContent;
											implement_search_data(inp_value);
										}
									}
								});

							}
							bgWindow.Popup.resize(popup_default_width, popup_default_height + (l * 21));
						}
						else
						{
							autocomplete.className = "hidden";
							bgWindow.Popup.resize(popup_default_width, popup_default_height);
						}
					}

					var onError = function(){};
					// response = [value, [ac0,ac1,ac2,ac3,ac4,ac5,ac6,ac7,ac8,ac9]] , ac0-ac9 - autocomplete results
					bgWindow.Request("http://suggestqueries.google.com/complete/search?client=firefox&q=" + this.value, onSuccess, onError);
				} 
				else 
				{
					autocomplete.className = "hidden";
					bgWindow.Popup.resize(popup_default_width, popup_default_height);
					reset.className='hidden';
				}
			break;
		}
	});
	addCustomListener(search_input, "keydown", function(e) {
		var keyCode = e.keyCode ? e.keyCode : e.which;
		switch (keyCode) {
			case 40:
				e.preventDefault();
				var childs = autocomplete.querySelectorAll('div');
				if(autocomplete_id !== childs.length)
				{
					autocomplete_id++;
					var selected = autocomplete.querySelector(".selected");
					if(selected)
					{
						selected.className = "autocomplete_element";
					}
					childs[autocomplete_id - 1].className = childs[autocomplete_id - 1].className + " selected";
				}
			break;

			case 38:
				e.preventDefault();
				var childs = autocomplete.querySelectorAll('div');
				if(autocomplete_id !== 1)
				{
					autocomplete_id--;
					var selected = autocomplete.querySelector(".selected");
					if(selected)
					{
						selected.className = "autocomplete_element";
					}
					childs[autocomplete_id - 1].className = childs[autocomplete_id - 1].className + " selected";
				}
			break;

			case 37: //if keycode is 'left or right arrow', nothing to do
			break;

			case 39: 
			break;

			case 13: //if keycode is 'enter', nothing to do
			break;

			default:
			break;
		}
	});

	//add searchclick listener
	addCustomListener(search_button,"click",function() {
		var inp_value = search_input.value;
		implement_search_data(inp_value);
	});
	
	addCustomListener(reset,'click', function() {
		autocomplete.textContent = "";
		autocomplete.className = "hidden";
		bgWindow.Popup.resize(popup_default_width, popup_default_height);
		search_input.value = "";
		search_input.focus();
		this.className = "hidden";
	});
	addCustomListener(search_input,'keypress', function(e) {
		e = e || window.event;
		var keyCode = e.keyCode ? e.keyCode : e.which;
		if(keyCode == 13) {
			var if_selected = document.querySelector('.selected');
			if(if_selected)
			{
				var inp_value = if_selected.textContent;
				implement_search_data(inp_value);
			}
			else
			{
				var inp_value = search_input.value;
				implement_search_data(inp_value);
			}
		}
	});	
}
(function main() {
	setTimeout(function() {
		init();
		checkProxy();
	}, 100);
})();