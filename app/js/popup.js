const {loadGoogleAnalytics} = require('./google-analytics.js');
const {migrateToLatest} = require('./models.js');

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
  var s = '0123456789abcdef';
  var i = parseInt (c);
  if (i == 0 || isNaN (c))
        return '00';
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

function generateGoogleMapsUrlFrom(route) {
    let numDropoffs = route.dropoffLatLons.length;
    let waypoints = [];
    for (let i = 0; i < numDropoffs-1; ++i) {
        waypoints.push(route.dropoffLatLons[i]);
    }
    let waypointString = waypoints.join('|');
    let sourceString = route.pickupLatLon;
    let destinationString = route.dropoffLatLons[numDropoffs-1];

    return `https://www.google.com/maps/dir/?api=1&origin=${sourceString}&destination=${destinationString}&waypoints=${waypointString}&travelmode=driving`
}

function floatStr(float) {
  return Math.round(float*100)/100.0;
}

function getHtmlForSummaryRow(entry) {
    let googleMapsUrl = generateGoogleMapsUrlFrom(entry.route);

    let percentDiffText = Math.round(entry.percentDifference*100, 2);
    if (percentDiffText <= 0) {
        percentDiffText = 'correctly paid';
    } else {
        percentDiffText += '%';
    }

    let bgColor = getHexColorForPercentDiff(entry.percentDifference)

    let html = `<tr style="background-color: ${bgColor}">`

    // If google and uber have mismatched distances, convert to miles
    let uberPaidForString = entry.uberPaidForString;
    let actualDistanceString = entry.actualDistanceString;
    if (uberPaidForString.endsWith('mi') && actualDistanceString.endsWith('km')) {
      actualDistanceString = floatStr(entry.actualDistanceFloatMi) + ' mi';
    } else if (uberPaidForString.endsWith('km') && actualDistanceString.endsWith('mi')) {
      uberPaidForString = floatStr(entry.uberPaidForFloatMi) + ' mi';
    }

    html += `<td><a href="${entry.url}" target="_blank">${uberPaidForString}</a></td>`
    html += `<td><a href="${googleMapsUrl}" target="_blank">${actualDistanceString}</a></i></td>`
    html += `<td>${percentDiffText}<span style="font-size:0.7em"><br/>(${entry.actualDistanceFloatMi} mi-${entry.uberPaidForFloatMi} mi)/${entry.uberPaidForFloatMi} mi</span></td>`

    html += '</tr>'
    return html;
}

// Given an array of saved entries, returns the HTML for the entire table
function generateTableForEntries(entries) {
    let helpUrlReddit = 'https://www.reddit.com/r/UberEATS/comments/icdu0y/ubercheats_is_now_live_check_if_ubereats_has/' // also in background.js
    let helpUrlTwitter = 'https://twitter.com/ArminSamii/status/1295857106080456706' // also in background.js

    let sumUnderpayments = entries.reduce(function(total, entry) {
        return total + Math.max(0, entry.actualDistanceFloatMi-entry.uberPaidForFloatMi)
    }, 0);
    let pctUnderpaid = entries.reduce(function(total, entry) {
      if (entry.actualDistanceFloatMi - entry.uberPaidForFloatMi > 0.5) {
        return total + 1;
      } else {
        return total;
      }
    }, 0) / entries.length;
    let roundedSumUnderpayments = Math.round(sumUnderpayments*100.0)/100.0;

    // Send to GA
    ga('set', 'dimension1', Math.round(pctUnderpaid*100));
    ga('set', 'dimension2', Math.round(roundedSumUnderpayments));

    // Table header
    let html = 'This table only shows statements you\'ve already clicked on. Populate this table by clicking on each statement, as per the <a href="https://www.youtube.com/watch?v=1k2YYlb21N8">tutorial</a>.<br/><br/>'
    html += `Have a lot of red values in this summary? Let us know! Share your story on <a href="${helpUrlReddit}" target=\"_blank\">Reddit</a> or <a href="${helpUrlTwitter}" target=\"_blank\">Twitter</a><br/><br/>`
    html += `<i>You have been underpaid for a total of ${roundedSumUnderpayments} miles:</i><br/><br/>`
    html += '<table class="tableSummary"><th>Uber paid you for</th>    <th>Actual shortest distance</th>   <th>Underpaid by</th></tr>'

    entries.forEach(function(entry, entryIndex, array) {
        html += getHtmlForSummaryRow(entry);
    });

    html += '</table>';
    return html;
}

// On button click to show summary
function showSummary() {
  document.getElementById('summaryButton').style.display = 'none';
  summary = document.getElementById('summary');
  summary.style.display = 'block';
  chrome.storage.sync.get(null, function(data) {
    let keys = Object.keys(data);
    let unsortedKeys = keys.filter(key => key.startsWith('comparisons'));
    let unsortedEntries = keys.map(key => data[key]);
    let migratedEntries = unsortedEntries.map(data => migrateToLatest(data));
    let sortedEntries = migratedEntries.sort(function(entry0, entry1) {
        return entry1.percentDifference - entry0.percentDifference;
    });
    summary.innerHTML = generateTableForEntries(sortedEntries);
  });
}

// On button click to hide release notes. Gets reset each chrome restart or extension install.
function hideReleaseNotes() {
  document.getElementById('releaseNotes').style.display = 'none';
  chrome.storage.local.set({'hidereleasenotes': true});
}
chrome.storage.local.get('hidereleasenotes', function(data) {
  if ('hidereleasenotes' in data) {
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
      _setStatus(status.className, status.text, status.showTutorialVideo);
    });
  });
};

loadGoogleAnalytics('popup');
document.getElementById('summaryButton').addEventListener('click', showSummary);
document.getElementById('hideReleaseNotesButton').addEventListener('click', hideReleaseNotes);
