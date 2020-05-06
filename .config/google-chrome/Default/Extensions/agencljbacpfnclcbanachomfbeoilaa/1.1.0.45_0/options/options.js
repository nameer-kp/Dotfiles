function main() {
    var proxy_toggle = document.getElementById('proxy_toggle');

    chrome.storage.sync.get({
        proxy_enabled: false
    }, function (data) {
        proxy_toggle.checked = data.proxy_enabled;
        proxy_toggle.addEventListener('change', function () {
            chrome.storage.sync.set({
                proxy_enabled: this.checked
            });
        });
    });
}

document.addEventListener("DOMContentLoaded", function (event) {
    document.querySelector('#proxy .title').textContent = chrome.i18n.getMessage("popupEnableMessage");
    document.querySelector('#proxy [data-on]').setAttribute('data-on', chrome.i18n.getMessage("proxyEnabled"));
    document.querySelector('#proxy [data-off]').setAttribute('data-off', chrome.i18n.getMessage("proxyDisabled"));
    main();
});