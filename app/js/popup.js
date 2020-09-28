const {loadGoogleAnalytics} = require('./google-analytics.js');
const popup = require('./popup-functions.js');

chrome.storage.local.get('hidereleasenotes_v0.55', function(data) {
  if ('hidereleasenotes_v0.55' in data) {
    // Eventually: have button to show release notes here
    document.getElementById('releaseNotes').style.display = 'none';
  }
});

// When the popup opens, get the current tab ID, then check the local storage
// to find that key.
window.onload = function() {
  let activeTabQuery = { active: true, currentWindow: true };
  chrome.tabs.query(activeTabQuery, function(tabs) {
    let tabId = tabs[0].id;
    let messageDestinationString = tabId + '_0' // Frame id zero: not in iframe
    let key = 'tab' + messageDestinationString;
    chrome.storage.local.get(key, function(data) {
      let status = data[key];
      if (!status) {
        return;
      }
      popup._setStatus(status.className, status.text, status.showTutorialVideo);
    });
  });
};

loadGoogleAnalytics('popup');
document.getElementById('summaryButton').addEventListener('click', popup.showSummary);
document.getElementById('hideReleaseNotesButton').addEventListener('click', popup.hideReleaseNotes);
