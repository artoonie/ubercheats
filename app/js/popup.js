// Sets the status text and class
function _setStatus(className, status, showTutorialVideo) {
  document.getElementById('status').className = className;
  document.getElementById('status').innerHTML = status;
  if (showTutorialVideo) {
    document.getElementById('tutorialVideo').style.display = 'block';
  } else {
    document.getElementById('tutorialVideo').style.display = 'none';
  }
}

// When the popup opens, get the current tab ID, then check the local storage
// to find that key.
window.onload = function() {
  let activeTabQuery = { active: true, currentWindow: true };
  chrome.tabs.query(activeTabQuery, function(tabs) {
    let tabId = tabs[0].id;
    let key = 'tab' + tabId;
    chrome.storage.local.get(key, function(data) {
      let status = data[key];
      if (!status)
      {
        return;
      }
      _setStatus(status.className, status.text, status.showTutorialVideo);
    });
  });
};

// Standard Google Universal Analytics code
(function(i,s,o,g,r,a,m){i['GoogleAnalyticsObject']=r;i[r]=i[r]||function(){
(i[r].q=i[r].q||[]).push(arguments)},i[r].l=1*new Date();a=s.createElement(o),
m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m)
})(window,document,'script','https://www.google-analytics.com/analytics.js','ga'); // Note: https protocol here
window.ga=window.ga||function(){(ga.q=ga.q||[]).push(arguments)};ga.l=+new Date;
ga('create', 'UA-175307097-1', 'auto');
ga('set', 'checkProtocolTask', function(){}); // Removes failing protocol check. @see: http://stackoverflow.com/a/22152353/1958200
ga('require', 'displayfeatures');
ga('send', 'pageview', 'popup');
