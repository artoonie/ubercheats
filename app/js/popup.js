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

// int to hex (c/o https://stackoverflow.com/a/32257791/1057105)
function hex(c) {
  var s = "0123456789abcdef";
  var i = parseInt (c);
  if (i == 0 || isNaN (c))
        return "00";
  i = Math.round (Math.min (Math.max (0, i), 255));
  return s.charAt ((i - i % 16) / 16) + s.charAt (i % 16);
}

// float triple to hex
function rgbToHex(rgb) {
    return '#' + hex(rgb[0]) + hex(rgb[1]) + hex(rgb[2]);
}

function interpColors(rgb0, rgb1, alpha) {
  return [
    rgb0[0] + alpha*(rgb1[0]-rgb0[0]),
    rgb0[1] + alpha*(rgb1[1]-rgb0[1]),
    rgb0[2] + alpha*(rgb1[2]-rgb0[2])]
}

function getHexColorForPercentDiff(percentDiff) {
    let interp0Green = [180, 237, 173];
    let interp0Red = [255, 140, 140];
    let interpAlpha = Math.min(1, Math.max(0, percentDiff/2.0)); // >=200% difference = fully red
    let interpValue = interpColors(interp0Green, interp0Red, interpAlpha);
    let hex = rgbToHex(interpValue);
    return hex;
}

function generateGoogleMapsUrlFrom(routeLatLon) {
    return `https://www.google.com/maps/dir/?api=1&origin=${routeLatLon.pickupLatLon}&destination=${routeLatLon.dropoffLatLon}&travelmode=driving`
}

function getHtmlForSummaryRow(entry) {
    let googleMapsUrl = generateGoogleMapsUrlFrom(entry.routeLatLon);

    let percentDiffText = Math.round(entry.percentDifference*100, 2);
    if (percentDiffText <= 0) {
        percentDiffText = "correctly paid";
    } else {
        percentDiffText += "%";
    }

    let bgColor = getHexColorForPercentDiff(entry.percentDifference)

    let html = `<tr style="background-color: ${bgColor}">`

    html += `<td><a href="${entry.url}" target="_blank">${entry.uberPaidForDistance}</a></td>`
    html += `<td><a href="${googleMapsUrl}" target="_blank">${entry.actualDistance}</a></td>`
    html += `<td>${percentDiffText}<span style="font-size:0.7em"><br/>(${entry.actualFloat} mi-${entry.uberPaidForFloat} mi)/${entry.uberPaidForFloat} mi</span></td>`

    html += "</tr>"
    return html;
}

// Given an array of saved entries, returns the HTML for the entire table
function generateTableForEntries(entries) {
    let helpUrlReddit = 'https://www.reddit.com/r/UberEATS/comments/icdu0y/ubercheats_is_now_live_check_if_ubereats_has/' // also in background.js
    let helpUrlTwitter = 'https://twitter.com/ArminSamii/status/1295857106080456706' // also in background.js

    let html = 'This table only shows statements you\'ve already clicked on. Populate this table by clicking on each statement, as per the <a href="https://www.youtube.com/watch?v=1k2YYlb21N8">tutorial</a>.<br/><br/>'
    html += `Have a lot of red values in this summary? Let us know! Share your story on <a href="${helpUrlReddit}" target=\"_blank\">Reddit</a> or <a href="${helpUrlTwitter}" target=\"_blank\">Twitter</a><br/><br/>`
    html += '<table class="tableSummary"><th>Uber paid you for</th>    <th>Actual shortest distance</th>   <th>Percent difference</th></tr>'

    entries.forEach(function(entry, entryIndex, array) {
        html += getHtmlForSummaryRow(entry);
    });

    html += "</table>";
    return html;
}

// On button click to show summary
function showSummary() {
  summary = document.getElementById('summary');
  summary.style.display = 'block';
  chrome.storage.sync.get(null, function(data) {
    let keys = Object.keys(data);
    let unsortedKeys = keys.filter(key => key.startsWith("comparisons"));
    let unsortedEntries = keys.map(key => data[key]);
    let sortedEntries = unsortedEntries.sort(function(entry0, entry1) {
        return entry1.percentDifference - entry0.percentDifference;
    });
    summary.innerHTML = generateTableForEntries(sortedEntries);
  });
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

function loadGoogleAnalytics() {
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
}

loadGoogleAnalytics();
document.getElementById("summaryButton").addEventListener("click", showSummary);
