// Copyright (c) 2012-2015 FlareGet.com. All rights reserved.
// FlareGet Browser Integration extension
// http://flareget.com
var enableFlareget = true;
var isFlaregetInstalled = 'false';
var disp = '';
var hostName = 'com.flareget.flareget';
var port = chrome.runtime.connectNative(hostName);
var filter = [];
var requestList = [
    {
        cookies: '',
        postdata: '',
        id: ''
    },
    {
        cookies: '',
        postdata: '',
        id: ''
    },
    {
        cookies: '',
        postdata: '',
        id: ''
    }
];
var currRequest = 0;
sendNativeMessage('check');
var invokeFlareget = false;
var message = {
    url: '',
    cookies: '',
    useragent: '',
    filename: '',
    filesize: '',
    referrer: '',
    postdata: '',
    vid: '',
    status: 'OK'
};
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    if (request.enableEXT == 'false')
        enableFlareget = false;
    else
        enableFlareget = true;
});
function sendNativeMessage(message) {
    port = chrome.runtime.connectNative(hostName);
    port.onMessage.addListener(function (msg) {
        isFlaregetInstalled = msg.enable;
        filter = msg.ignorelist.split(" ");
    });
    try {
        port.postMessage(message);
    }
    catch (ex) {
        isFlaregetInstalled = 'false';
    }
}
function clearMessage() {
    message.url = '';
    message.cookies = '';
    message.filename = '';
    message.filesize = '';
    message.referrer = '';
    message.status = 'OK';
    message.vid = '';
    message.useragent = '';
}
function postParams(source) {
    var array = [
    ];
    for (var key in source) {
        array.push(encodeURIComponent(key) + '=' + encodeURIComponent(source[key]));
    }
    return array.join('&');
}
chrome.webRequest.onBeforeRequest.addListener(function (details) {
    if (details.method == 'POST') {
        message.postdata = postParams(details.requestBody.formData);
    }
    return {
        requestHeaders: details.requestHeaders
    };
}, {
        urls: [
            '<all_urls>'
        ],
        types: [
            'main_frame',
            'sub_frame'
        ]
    }, [
        'blocking',
        'requestBody'
    ]);
chrome.webRequest.onBeforeSendHeaders.addListener(function (details) {
    clearMessage();
    if (/(youtu\.be\/|[?&]v=)([^&]+)/.test(details.url)) {
        message.url = details.url;
        message.vid = details.url.match(/(youtu\.be\/|[?&]v=)([^&]+)/)[2];
        if (message.vid.length != 11 || message.url == '') {
            return {
                requestHeaders: details.requestHeaders
            };
        }
        message.status = 'Y';
        sendNativeMessage(message);
        return {
            requestHeaders: details.requestHeaders
        };
    }
    currRequest++;
    if (currRequest > 2)
        currRequest = 2;
    requestList[currRequest].id = details.requestId;
    for (var i = 0; i < details.requestHeaders.length; ++i) {
        if (details.requestHeaders[i].name.toLowerCase() === 'user-agent') {
            message.useragent = details.requestHeaders[i].value;
        }
        else if (details.requestHeaders[i].name.toLowerCase() === 'referer') {
            requestList[currRequest].referrer = details.requestHeaders[i].value;
        }
        else if (details.requestHeaders[i].name.toLowerCase() === 'cookie') {
            requestList[currRequest].cookies = details.requestHeaders[i].value;
        }
    }
    return {
        requestHeaders: details.requestHeaders
    };
}, {
        urls: [
            '<all_urls>'
        ],
        types: [
            'main_frame',
            'sub_frame',
            'xmlhttprequest'
        ]
    }, [
        'blocking',
        'requestHeaders'
    ]);
chrome.webRequest.onHeadersReceived.addListener(function (details) {
    if(details.statusCode != 200){
        return {
            responseHeaders: details.responseHeaders
        };
    } 
    invokeFlareget = false;
    message.url = details.url;
    var contentType = "";
    for (var i = 0; i < details.responseHeaders.length; ++i) {
        if (details.responseHeaders[i].name.toLowerCase() == 'content-length') {
            message.filesize = details.responseHeaders[i].value;
            var fileSize = parseInt(message.filesize);
            if (fileSize < 300000) {  // 300 kb
                return {
                    responseHeaders: details.responseHeaders
                };
            }

        }
        else if (details.responseHeaders[i].name.toLowerCase() == 'content-disposition') {
            disp = details.responseHeaders[i].value;
            if (disp.lastIndexOf('filename') != -1) {
                message.filename = disp.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/)[1];
                message.filename = message.filename.replace(/["']/g, "");
                invokeFlareget = true;
            }
        }
        else if (details.responseHeaders[i].name.toLowerCase() == 'content-type') {
            contentType = details.responseHeaders[i].value;
            if (/\b(?:xml|rss|javascript|json|html|text)\b/.test(contentType)) {
                invokeFlareget = false;
                return {
                    responseHeaders: details.responseHeaders
                };
            }
            else if (/\b(?:application\/|video\/|audio\/)\b/.test(contentType) == true) {
                invokeFlareget = true;
            }
            else {
                return {
                    responseHeaders: details.responseHeaders
                };
            }
        }
    }
    if (invokeFlareget == true && enableFlareget == true) {
        if (isFlaregetInstalled != 'true') {
            sendNativeMessage({
                'status': 'NO'
            });
            return {
                responseHeaders: details.responseHeaders
            };
        }
        for (var i = 0; i < filter.length; i++) {
            if (filter[i] != "" && contentType.lastIndexOf(filter[i]) != -1) {
                return {
                    responseHeaders: details.responseHeaders
                };
            }
        }
        for (var j = 0; j < 3; j++) {
            if (details.requestId == requestList[j].id && requestList[j].id != "") {
                message.referrer = requestList[j].referrer;
                message.cookies = requestList[j].cookies;
                break;
            }
        }
        if (details.method != "POST") {
            message.postdata = '';
        }
        sendNativeMessage(message);
        message.postdata = '';
        return { redirectUrl: "javascript:" };
    }
    enableFlareget == true;
    clearMessage();
    return {
        responseHeaders: details.responseHeaders
    };
}, {
        urls: [
            '<all_urls>'
        ],
        types: [
            'main_frame',
            'sub_frame'
        ]
    }, [
        'responseHeaders',
        'blocking'
    ]);
