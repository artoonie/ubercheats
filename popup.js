// Sets the status text and class
function _setStatus(className, status) {
  document.getElementById('status').className = className;
  document.getElementById('status').innerHTML = status;
}

// When the popup opens, get the current tab ID, then check the local storage
// to find that key.
window.onload = function() {
  let activeTabQuery = { active: true, currentWindow: true };
  chrome.tabs.query(activeTabQuery, function(tabs) {
    let tabId = tabs[0].id;
    let key = "tab" + tabId;
    chrome.storage.local.get(key, function(data) {
      _setStatus(data[key].className, data[key].text);
    });
  });
};
