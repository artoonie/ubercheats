function loadGoogleAnalytics(pageviewName) {
  // Standard Google Universal Analytics code
  (function(i,s,o,g,r,a,m){i['GoogleAnalyticsObject']=r;i[r]=i[r]||function(){
  (i[r].q=i[r].q||[]).push(arguments)},i[r].l=1*new Date();a=s.createElement(o),
  m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m)
  })(window,document,'script','https://www.google-analytics.com/analytics.js','ga'); // Note: https protocol here
  window.ga=window.ga||function(){(ga.q=ga.q||[]).push(arguments)};ga.l=+new Date;
  ga('create', 'UA-175307097-1', 'auto');
  ga('set', 'checkProtocolTask', function(){}); // Removes failing protocol check. @see: http://stackoverflow.com/a/22152353/1958200
  ga('set', 'appVersion', chrome.runtime.getManifest());
  ga('require', 'displayfeatures');
  ga('send', 'pageview', pageviewName);
}

module.exports = {loadGoogleAnalytics}