var Proxy = function() {
	var self = this;
	self.controllable = false;
	self.onControlChangeListener = null;
	var defaultServer = {
		pac_string: 'HTTPS proxy.antizapret.prostovpn.org:3143;',
		host: 'proxy.antizapret.prostovpn.org',
		port: 3143,
		type: 'https'
	};
	var servers = [];
	var currentDomains = [];
	var currentServers = [];
		
	self.proxyListener = null;
	var proxySources = [
		{
			url: 'https://drah7iczdw1tu.cloudfront.net/v1/servers',
			handler: function(list) {
				if (!list.countries)
				{
					return {};
				}
				list = list.countries;

				var servers = [];

				for (var country in list)
				{
					if (list[country]['servers'])
					{
						for (var i = 0; i < list[country]['servers'].length; i++)
						{
							var server = list[country]['servers'][i];
							servers.push({
								pac_string: 'HTTPS ' + server.host + ':' + server.port + ';',
								host: server.host,
								port: server.port,
								type: 'https'
							});
						}
					}
				}
				
				return servers;
			}
		},
		{
			url: 'https://s3-us-west-2.amazonaws.com/hssext/chrome-hss.json',
			handler: function(list) {
				if (!list.servers)
				{
					return {};
				}
				list = list.servers;

				function createUserHash(hash) {
					hash = hash ? hash : '';

					if (hash == '')
					{
						for (var i = 0; i < 8; i++)
						{
							hash += ((1 + Math.random()) * 0x10000 | 0).toString(16).substring(1);
						}
						hash = 'C' + hash;
					}

					return hash;
				}
				var servers = [];
				var hash = createUserHash();
				
				for (var i = list.length - 1; i >= 0; i--)
				{
					var server = list[i];
					if (!server)
					{
						continue;
					}

					if (server.free != 'false' && server.free != false && server.scheme == 'https')
					{
						var server_data = {
							pac_string: 'HTTPS ' + server.address + ':' + server.port + ';',
							host: server.address,
							port: server.port,
							type: 'https'
						};
						if (server.username && server.password)
						{
							server_data.username = server.username.replace("{id}", hash);
							server_data.password = server.password.replace("{id}", hash);
						}
						servers.push(server_data);
					}
				}
				
				return servers;
			}
		}
	];


	function jsonRequest(url, callback) {
		var xhr = new XMLHttpRequest();
		xhr.open('GET', url, true);
		xhr.onload = function() {
			var list = {};
			try
			{
				list = JSON.parse(xhr.responseText);
			}
			catch(e) {}
			callback && callback(list);
		};
		xhr.onerror = function() {
			callback && callback({});
		};
		xhr.send();
	}
	
	function actualizeServers(callback) {
		var now = new Date().getTime();
		var updatePeriod = 86400000; // one day
		var lastUpdated = (Number(localStorage.lastServersListUpdated) || 0);
		var needUpdate = Math.abs(now - lastUpdated) > updatePeriod;
		if (servers.length && !needUpdate)
		{
			callback && callback();
		}
		else
		{
			(function getProxyServers(sourceIndex) {
				jsonRequest(proxySources[sourceIndex].url, function(list) {
					var srvrs = proxySources[sourceIndex].handler(list);
					if (srvrs && srvrs.length)
					{
						localStorage.lastServersListUpdated = now;
						servers = srvrs;
						callback && callback();
					}
					else if (++sourceIndex < proxySources.length)
					{
						getProxyServers(sourceIndex);
					}
					else
					{
						callback && callback();
					}
				});
			})(0);
		}
	}

	function provideProxyCredentials(details) {
		if (!details.isProxy)
		{
			return {};
		}

		if (currentServers && currentServers.length)
		{
			for (var i = 0; i < currentServers.length; i++)
			{
				if (currentServers[i].username && currentServers[i].host == details.challenger.host && currentServers[i].port == details.challenger.port)
				{
					return {
						authCredentials: {
							username: currentServers[i].username,
							password: currentServers[i].password || ''
						}
					};
				}
			}
		}

		return {};
	}

	function getServersForCurrentUsage(callback) {
		actualizeServers(function() {
			var strings_count = 4;
			var random_servers = [];
			if (servers.length && strings_count >= servers.length)
			{
				random_servers = servers;
			}
			else if (servers.length)
			{
				var ind = 0;
				var ind_arr = {};
				while (ind < strings_count)
				{
					var rand = Math.floor(Math.random() * servers.length);
					if (!ind_arr[rand])
					{
						ind_arr[rand] = true;
						random_servers.push(servers[rand]);
						ind++;
					}
				}
			}
			else
			{
				random_servers.push(defaultServer);
			}
			
			callback && callback(random_servers);
		});
	}

	self.generatePacConfig = function(proxyString, conditionString) {
		return {
			mode: 'pac_script',
			pacScript: {
				data: `function FindProxyForURL(url, host) {
							if (` + conditionString + `)
									return "` + proxyString + `";
							return "DIRECT";
						}`
			}
		};
	}

	self.generateUrlsFilter = function() {
		var res = [];
		for (var i = 0; i < currentDomains.length; i++)
		{
			res.push("*://*." + currentDomains[i] + "/*");
		}
		return res;
	}

	self.generateRegExpConditions = function() {
		var result = '(';
		for (var i = 0; i < currentDomains.length; i++)
		{
			if (i > 0)
			{
				result += '|';
			}
			result += '^(.*\\.)?' + currentDomains[i].replace(/\./, '\\.');
		}
		result += ')';
		if (result.length <= 2)
		{
			result = false;
		}
		return result;
	}

	self.generateShellExpConditions = function() {
		var result = '';
		for (var i = 0; i < currentDomains.length; i++)
		{
			if (i > 0)
			{
				result += ' || ';
			}
			result += 'shExpMatch(host, "*.' + currentDomains[i] + '") || shExpMatch(host, "' + currentDomains[i] + '")';
		}
		if (result.length == 0)
		{
			result = 'false';
		}
		return result;
	}

	self.update = function(success, error) {
		getServersForCurrentUsage(function(current_servers) {
			var result_pac_string = '';
			var result_proxy_list = [];
			for (var i = 0; i < current_servers.length; i++)
			{
				result_pac_string += ' ' + current_servers[i].pac_string;
				result_proxy_list.push({'type': current_servers[i].type, 'host': current_servers[i].host, 'port': current_servers[i].port, 'failoverTimeout': 10});
			}
			currentServers = current_servers;
			
			var has_auth_listener = chrome.webRequest.onAuthRequired.hasListener(provideProxyCredentials);
			var need_auth_listener = false;
			for (var i = 0; i < currentServers.length; i++)
			{
				if (currentServers[i].username)
				{
					need_auth_listener = true;
					break;
				}
			}
			if (need_auth_listener && !has_auth_listener)
			{
				chrome.webRequest.onAuthRequired.addListener(provideProxyCredentials, {urls: ['http://*/*', 'https://*/*']}, ['blocking']);
			}
			else if (!need_auth_listener && has_auth_listener)
			{
				if (chrome.webRequest.onAuthRequired.hasListener(provideProxyCredentials))
				{
					chrome.webRequest.onAuthRequired.removeListener(provideProxyCredentials);
				}
			}
			if (self.proxySet) //chrome
			{
				self.proxySet(result_pac_string, success, error);
			}
			else if (self.proxySetListener) //ff
			{
				var oldProxyListener = self.proxyListener;
				self.proxyListener = function(requestInfo){
					return result_proxy_list;
				}
				self.proxySetListener(oldProxyListener, success, error);
			}
		});
	}

	self.disable = function(callback) {
		self.proxyClear && self.proxyClear(callback);
		
		currentServers = [];
		
		if (chrome.webRequest.onAuthRequired.hasListener(provideProxyCredentials))
		{
			chrome.webRequest.onAuthRequired.removeListener(provideProxyCredentials);
		}
	}

	self.getBaseDomainFromUrl = function(url) {
		var matches = url.toLowerCase().match(/^https?:\/\/([^\/:?#]+)(?:[\/:?#]|$)/i);
		var domain = matches && matches[1]; 
		if (domain) 
		{
			var base_domain;
			// check for ip
			if (/^((?:25[0-5]|2[0-4]\d|[01]?\d\d?)(\.(?=\d)|$)){4}$/.test(domain))
			{
				base_domain = domain;
			}
			else
			{
				if (punycode)
				{
					domain = punycode.toUnicode(domain);
				}
				// uses regex generated by generateDomainRegexp() from url_helper_functions.js (mmp_server_stuff repository) for detecting base domain considering "public suffixes" 
				var matches = domain.match(/((?:[^.]+)\.(?:(?:(?:com|net|org|edu|gov|asn|id|info|conf|oz|act|nsw|nt|qld|sa|tas|vic|wa|act\.edu|nsw\.edu|nt\.edu|qld\.edu|sa\.edu|tas\.edu|vic\.edu|wa\.edu|qld\.gov|sa\.gov|tas\.gov|vic\.gov|wa\.gov|blogspot\.com)\.au)|(?:(?:adm|adv|agr|am|arq|art|ato|b|bio|blog|bmd|cim|cng|cnt|com|coop|ecn|eco|edu|emp|eng|esp|etc|eti|far|flog|fm|fnd|fot|fst|g12|ggf|gov|imb|ind|inf|jor|jus|leg|lel|mat|med|mil|mp|mus|net|[\w\u0430-\u044f]\+\*nom|not|ntr|odo|org|ppg|pro|psc|psi|qsl|radio|rec|slg|srv|taxi|teo|tmp|trd|tur|tv|vet|vlog|wiki|zlg|blogspot\.com)\.br)|(?:(?:ac|com|edu|gov|net|org|mil|ah|bj|cq|fj|gd|gs|gz|gx|ha|hb|he|hi|hl|hn|jl|js|jx|ln|nm|nx|qh|sc|sd|sh|sn|sx|tj|xj|xz|yn|zj|hk|mo|tw|)\.cn)|(?:(?:betainabox|ar|br|cn|de|eu|gb|hu|jpn|kr|mex|no|qc|ru|sa|se|uk|us|uy|za|africa|gr|co|cloudcontrolled|cloudcontrolapp|dreamhosters|dyndns-at-home|dyndns-at-work|dyndns-blog|dyndns-free|dyndns-home|dyndns-ip|dyndns-mail|dyndns-office|dyndns-pics|dyndns-remote|dyndns-server|dyndns-web|dyndns-wiki|dyndns-work|blogdns|cechire|dnsalias|dnsdojo|doesntexist|dontexist|doomdns|dyn-o-saur|dynalias|est-a-la-maison|est-a-la-masion|est-le-patron|est-mon-blogueur|from-ak|from-al|from-ar|from-ca|from-ct|from-dc|from-de|from-fl|from-ga|from-hi|from-ia|from-id|from-il|from-in|from-ks|from-ky|from-ma|from-md|from-mi|from-mn|from-mo|from-ms|from-mt|from-nc|from-nd|from-ne|from-nh|from-nj|from-nm|from-nv|from-oh|from-ok|from-or|from-pa|from-pr|from-ri|from-sc|from-sd|from-tn|from-tx|from-ut|from-va|from-vt|from-wa|from-wi|from-wv|from-wy|getmyip|gotdns|hobby-site|homelinux|homeunix|iamallama|is-a-anarchist|is-a-blogger|is-a-bookkeeper|is-a-bulls-fan|is-a-caterer|is-a-chef|is-a-conservative|is-a-cpa|is-a-cubicle-slave|is-a-democrat|is-a-designer|is-a-doctor|is-a-financialadvisor|is-a-geek|is-a-green|is-a-guru|is-a-hard-worker|is-a-hunter|is-a-landscaper|is-a-lawyer|is-a-liberal|is-a-libertarian|is-a-llama|is-a-musician|is-a-nascarfan|is-a-nurse|is-a-painter|is-a-personaltrainer|is-a-photographer|is-a-player|is-a-republican|is-a-rockstar|is-a-socialist|is-a-student|is-a-teacher|is-a-techie|is-a-therapist|is-an-accountant|is-an-actor|is-an-actress|is-an-anarchist|is-an-artist|is-an-engineer|is-an-entertainer|is-certified|is-gone|is-into-anime|is-into-cars|is-into-cartoons|is-into-games|is-leet|is-not-certified|is-slick|is-uberleet|is-with-theband|isa-geek|isa-hockeynut|issmarterthanyou|likes-pie|likescandy|neat-url|saves-the-whales|selfip|sells-for-less|sells-for-u|servebbs|simple-url|space-to-rent|teaches-yoga|writesthisblog|firebaseapp|flynnhub|githubusercontent|ro|appspot|blogspot|codespot|googleapis|googlecode|pagespeedmobilizer|withgoogle|herokuapp|herokussl|4u|nfshost|operaunite|outsystemscloud|rhcloud|sinaapp|vipsinaapp|1kapp|hk|yolasite)\.com)|(?:(?:com|fuettertdasnetz|isteingeek|istmein|lebtimnetz|leitungsen|traeumtgerade|blogspot)\.de)|(?:(?:com|asso|nom|prd|presse|tm|aeroport|assedic|avocat|avoues|cci|chambagri|chirurgiens-dentistes|experts-comptables|geometre-expert|gouv|greta|huissier-justice|medecin|notaires|pharmacien|port|veterinaire|blogspot)\.fr)|(?:(?:org|edu|net|gov|mil|com)\.kz)|(?:(?:ae|us|dyndns|blogdns|blogsite|boldlygoingnowhere|dnsalias|dnsdojo|doesntexist|dontexist|doomdns|dvrdns|dynalias|endofinternet|endoftheinternet|from-me|game-host|go\.dyndns|gotdns|kicks-ass|misconfused|podzone|readmyblog|selfip|sellsyourhome|servebbs|serveftp|servegame|stuff-4-sale|webhop|eu|al\.eu|asso\.eu|at\.eu|au\.eu|be\.eu|bg\.eu|ca\.eu|cd\.eu|ch\.eu|cn\.eu|cy\.eu|cz\.eu|de\.eu|dk\.eu|edu\.eu|ee\.eu|es\.eu|fi\.eu|fr\.eu|gr\.eu|hr\.eu|hu\.eu|ie\.eu|il\.eu|in\.eu|int\.eu|is\.eu|it\.eu|jp\.eu|kr\.eu|lt\.eu|lu\.eu|lv\.eu|mc\.eu|me\.eu|mk\.eu|mt\.eu|my\.eu|net\.eu|ng\.eu|nl\.eu|no\.eu|nz\.eu|paris\.eu|pl\.eu|pt\.eu|q-a\.eu|ro\.eu|ru\.eu|se\.eu|si\.eu|sk\.eu|tr\.eu|uk\.eu|us\.eu|hk|za)\.org)|(?:(?:ac|com|edu|int|net|org|pp|adygeya|altai|amur|arkhangelsk|astrakhan|bashkiria|belgorod|bir|bryansk|buryatia|cbg|chel|chelyabinsk|chita|chukotka|chuvashia|dagestan|dudinka|e-burg|grozny|irkutsk|ivanovo|izhevsk|jar|joshkar-ola|kalmykia|kaluga|kamchatka|karelia|kazan|kchr|kemerovo|khabarovsk|khakassia|khv|kirov|koenig|komi|kostroma|krasnoyarsk|kuban|kurgan|kursk|lipetsk|magadan|mari|mari-el|marine|mordovia|msk|murmansk|nalchik|nnov|nov|novosibirsk|nsk|omsk|orenburg|oryol|palana|penza|perm|ptz|rnd|ryazan|sakhalin|samara|saratov|simbirsk|smolensk|spb|stavropol|stv|surgut|tambov|tatarstan|tom|tomsk|tsaritsyn|tsk|tula|tuva|tver|tyumen|udm|udmurtia|ulan-ude|vladikavkaz|vladimir|vladivostok|volgograd|vologda|voronezh|vrn|vyatka|yakutia|yamal|yaroslavl|yekaterinburg|yuzhno-sakhalinsk|amursk|baikal|cmw|fareast|jamal|kms|k-uralsk|kustanai|kuzbass|magnitka|mytis|nakhodka|nkz|norilsk|oskol|pyatigorsk|rubtsovsk|snz|syzran|vdonsk|zgrad|gov|mil|test|blogspot)\.ru)|(?:(?:com|edu|gov|in|net|org|cherkassy|cherkasy|chernigov|chernihiv|chernivtsi|chernovtsy|ck|cn|cr|crimea|cv|dn|dnepropetrovsk|dnipropetrovsk|dominic|donetsk|dp|if|ivano-frankivsk|kh|kharkiv|kharkov|kherson|khmelnitskiy|khmelnytskyi|kiev|kirovograd|km|kr|krym|ks|kv|kyiv|lg|lt|lugansk|lutsk|lv|lviv|mk|mykolaiv|nikolaev|od|odesa|odessa|pl|poltava|rivne|rovno|rv|sb|sebastopol|sevastopol|sm|sumy|te|ternopil|uz|uzhgorod|vinnica|vinnytsia|vn|volyn|yalta|zaporizhzhe|zaporizhzhia|zhitomir|zhytomyr|zp|zt|co|pp)\.ua)|(?:(?:ac|co|gov|ltd|me|net|nhs|org|plc|police|[\w\u0430-\u044f]\+\*sch|service\.gov|blogspot\.co)\.uk)|(?:(?:com|edu|gov|idv|net|org|blogspot|ltd|inc)\.hk)|(?:(?:ac|co|es|go|hs|kg|mil|ms|ne|or|pe|re|sc|busan|chungbuk|chungnam|daegu|daejeon|gangwon|gwangju|gyeongbuk|gyeonggi|gyeongnam|incheon|jeju|jeonbuk|jeonnam|seoul|ulsan|blogspot)\.kr)|(?:(?:ac|biz|co|desa|go|mil|my|net|or|sch|web)\.id)|(?:(?:com|net|org|gov|edu|ngo|mil|i)\.ph)|(?:(?:edu|gov|mil|com|net|org|idv|game|ebiz|club|blogspot)\.tw)|(?:(?:ac|ad|co|ed|go|gr|lg|ne|or|blogspot)\.jp)|(?:(?:com|net|org|edu|gov|int|ac|biz|info|name|pro|health)\.vn)|(?:(?:co|firm|net|org|gen|ind|nic|ac|edu|res|gov|mil|blogspot)\.in)|(?:(?:com|net|org|gov|edu|mil|name)\.my)|(?:(?:com|net|org|gov|edu|per|blogspot)\.sg)|(?:(?:edu|gov|riik|lib|med|com|pri|aip|org|fie)\.ee)|(?:(?:ac|co|go|in|mi|net|or)\.th)|[\w\u0430-\u044f]+))$/i);
				if (matches)
				{
					base_domain = matches[1];
				}
			}
			if (punycode && base_domain)
			{
				base_domain = punycode.toASCII(base_domain);
			}
			return base_domain;
		}
		return null;
	}

	self.addSite = function(link) {
		var domain = link.domain || self.getBaseDomainFromUrl(link.url);
		if (domain && currentDomains.indexOf(domain) < 0)
		{
			currentDomains.push(domain);
		}
		return domain;
	}

	self.removeSite = function(link) {
		var domain = link.domain || self.getBaseDomainFromUrl(link.url);
		var index = currentDomains.indexOf(domain);
		if (index >= 0)
		{
			currentDomains.splice(index, 1);
		}
	}

	self.existsSite = function(link) {
		var domain = link.domain || self.getBaseDomainFromUrl(link.url);
		return currentDomains.indexOf(domain) >= 0;
	}
	
	self.onProxySettingsChange = function() {
		self.checkControllable(function(new_value) {
			if (new_value != self.controllable)
			{
				self.controllable = new_value;
				if (self.onControlChangeListener)
				{
					self.onControlChangeListener({controllable: self.controllable});
				}
			}
		});
	}

	self.onControlChange = function(listener) {
		self.onControlChangeListener = listener;
	};
	self.isControllable = function() {
		return self.controllable;
	}
	
	self.init && self.init();
}
