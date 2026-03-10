// Stage Music - RudderStack Initialization
// Adapted from stage-webapp implementation

(function() {
  'use strict';

  // Create RudderStack buffer to queue events before SDK loads
  window.rudderanalytics = [];
  var methods = [
    "load", "page", "track", "identify", "alias", "group",
    "ready", "reset", "setAnonymousId", "startSession",
    "endSession", "getAnonymousId", "getSessionId", "consent"
  ];

  // Create stub methods that queue calls
  for (var i = 0; i < methods.length; i++) {
    var method = methods[i];
    window.rudderanalytics[method] = (function(methodName) {
      return function() {
        window.rudderanalytics.push(
          [methodName].concat(Array.prototype.slice.call(arguments))
        );
      };
    })(method);
  }

  // Save initial landing URL for attribution
  try {
    if (!sessionStorage.getItem('initialLandingUrl')) {
      sessionStorage.setItem('initialLandingUrl', window.location.href);
    }
  } catch (e) {
    console.warn('Failed to save initial landing URL:', e);
  }

  // Get or create deviceId cookie for consistent anonymousId
  function getCookie(name) {
    var value = '; ' + document.cookie;
    var parts = value.split('; ' + name + '=');
    if (parts.length === 2) {
      return decodeURIComponent(parts.pop().split(';').shift());
    }
    return null;
  }

  function setCookie(name, value, days) {
    var expires = '';
    if (days) {
      var date = new Date();
      date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
      expires = '; expires=' + date.toUTCString();
    }
    document.cookie = name + '=' + encodeURIComponent(value) + expires + '; path=/; SameSite=Lax';
  }

  function getOrCreateDeviceId() {
    var deviceIdCookie = 'stage_device_id';
    var existing = getCookie(deviceIdCookie);
    if (existing) return existing;

    // Generate new deviceId using crypto
    var deviceId;
    try {
      if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        deviceId = crypto.randomUUID();
      } else if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
        var arr = new Uint8Array(16);
        crypto.getRandomValues(arr);
        arr[6] = (arr[6] & 0x0f) | 0x40;
        arr[8] = (arr[8] & 0x3f) | 0x80;
        deviceId = Array.from(arr).map(function(b) {
          return ('0' + b.toString(16)).slice(-2);
        }).join('');
        deviceId = deviceId.replace(/(.{8})(.{4})(.{4})(.{4})(.{12})/, '$1-$2-$3-$4-$5');
      } else {
        // Fallback to timestamp + random
        deviceId = 'device_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      }

      // Save to cookie (365 days)
      setCookie(deviceIdCookie, deviceId, 365);
      return deviceId;
    } catch (e) {
      console.warn('Failed to create deviceId:', e);
      return null;
    }
  }

  // Store deviceId globally
  window.stageDeviceId = getOrCreateDeviceId();

  // Mark initialization state
  window.isRudderStackBuffered = true;

  console.log('✅ RudderStack buffer initialized');
})();
