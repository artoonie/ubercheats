class DataFromStatement {
  constructor() {
    this.statementHrefs = [];
    this.tripId = tripId;
  }
}

function getTripHrefs() {
  //href="/p3/payments/trips/6a407c07-1970-4dcf-a6c9-f40fe1ded5bd"
  let links = document.getElementsByTagName('a');
  let urls = [];
  let pattern = /https?:\/\/drivers.uber.com\/p3\/payments\/trips/
  for (const item of links) {
    let href = item.href;
    let matches = pattern.test(href);
    if (matches) {
      urls.push(href);
    }
  }
  return urls;
}

function loadUrlInFrame(href) {
  let iframe = document.createElement('iframe');
  iframe.src = href;
  iframe.width = '300';
  iframe.height = '300';
  iframe.style = 'display: none';
  
  document.body.appendChild(iframe);
}

function loadAllUrls() {
  let tripHrefs = getTripHrefs();
  tripHrefs.forEach(function(href) {
    loadUrlInFrame(href);
  });
  return tripHrefs;
}

// This gets passed to the executor
loadAllUrls();
