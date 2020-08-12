function setIcon(iconName, tabId) {
  chrome.pageAction.setIcon({
      path: "icons/" + iconName,
      tabId: tabId
  });
}

function _setStatus(className, status) {
  document.getElementById('status').className = className;
  document.getElementById('status').innerHTML = status;
}

chrome.storage.sync.get('popupStatus', function(data) {
  _setStatus(data.popupStatus.className, data.popupStatus.text)
});
