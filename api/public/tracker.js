/*!
 * CausalFunnel-style analytics tracker.
 * Usage: <script src="https://YOUR-API/tracker.js" data-endpoint="https://YOUR-API/api/events" defer></script>
 * Tracks page_view and click events, batches them, and sends them with navigator.sendBeacon.
 */
(function () {
  "use strict";
  if (window.cfTracker) return; // already installed on this page

  var SESSION_KEY = "cf_session";
  var SESSION_IDLE_MS = 30 * 60 * 1000; // a session ends after 30 minutes without activity
  var FLUSH_INTERVAL_MS = 2000;
  var MAX_BATCH = 100; // matches the API's batch limit
  var FLUSH_AT = 20; // send early if this many events are waiting

  var script =
    document.currentScript ||
    document.querySelector("script[data-endpoint]") ||
    document.querySelector('script[src*="tracker.js"]');
  var endpoint = (script && script.getAttribute("data-endpoint")) || defaultEndpoint(script);
  if (!endpoint) return;

  var queue = [];
  var memorySession = null; // used when localStorage is unavailable (private mode, blocked storage)

  function defaultEndpoint(el) {
    try {
      return new URL("/api/events", el.src).href;
    } catch (e) {
      return null;
    }
  }

  function uuid() {
    if (window.crypto && typeof window.crypto.randomUUID === "function") return window.crypto.randomUUID();
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
      var r = (Math.random() * 16) | 0;
      return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
    });
  }

  function readSession() {
    try {
      var raw = window.localStorage.getItem(SESSION_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return memorySession;
    }
  }

  function writeSession(s) {
    memorySession = s;
    try {
      window.localStorage.setItem(SESSION_KEY, JSON.stringify(s));
    } catch (e) {
      /* storage blocked: keep the in-memory session */
    }
  }

  /** Returns the current session id, starting a new session after 30 idle minutes. */
  function touchSession() {
    var now = Date.now();
    var s = readSession();
    if (!s || typeof s.id !== "string" || now - s.last > SESSION_IDLE_MS) s = { id: uuid(), last: now };
    s.last = now;
    writeSession(s);
    return s.id;
  }

  function track(type, extra) {
    var event = {
      session_id: touchSession(),
      type: type,
      page_url: window.location.href,
      timestamp: new Date().toISOString(),
    };
    for (var k in extra) if (Object.prototype.hasOwnProperty.call(extra, k)) event[k] = extra[k];
    queue.push(event);
    if (queue.length >= FLUSH_AT) flush();
  }

  function send(events) {
    var body = JSON.stringify({ events: events });
    // text/plain is a CORS-safelisted type, so the browser sends it without a preflight request.
    if (navigator.sendBeacon) {
      try {
        if (navigator.sendBeacon(endpoint, new Blob([body], { type: "text/plain;charset=utf-8" }))) return;
      } catch (e) {
        /* fall through to fetch */
      }
    }
    if (typeof fetch === "function") {
      fetch(endpoint, {
        method: "POST",
        body: body,
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        keepalive: true,
        mode: "cors",
        credentials: "omit",
      }).catch(function () {
        /* analytics must never break the host page */
      });
    }
  }

  function flush() {
    while (queue.length) send(queue.splice(0, MAX_BATCH));
  }

  function onClick(e) {
    var doc = document.documentElement;
    var x = typeof e.pageX === "number" ? e.pageX : (e.clientX || 0) + (window.scrollX || 0);
    var y = typeof e.pageY === "number" ? e.pageY : (e.clientY || 0) + (window.scrollY || 0);
    track("click", {
      x: Math.max(0, Math.round(x)),
      y: Math.max(0, Math.round(y)),
      viewport_w: window.innerWidth,
      viewport_h: window.innerHeight,
      page_w: Math.max(doc.scrollWidth, window.innerWidth),
      page_h: Math.max(doc.scrollHeight, window.innerHeight),
    });
  }

  function onVisibility() {
    if (document.visibilityState === "hidden") flush();
  }

  document.addEventListener("click", onClick, true);
  window.addEventListener("pagehide", flush);
  document.addEventListener("visibilitychange", onVisibility);
  var timer = setInterval(flush, FLUSH_INTERVAL_MS);

  /** Sends anything still queued, then stops tracking (useful for single-page apps and tests). */
  function destroy() {
    flush();
    document.removeEventListener("click", onClick, true);
    window.removeEventListener("pagehide", flush);
    document.removeEventListener("visibilitychange", onVisibility);
    clearInterval(timer);
    if (window.cfTracker === api) delete window.cfTracker;
  }

  var api = {
    flush: flush,
    track: track,
    destroy: destroy,
    sessionId: function () {
      var s = readSession();
      return s ? s.id : null;
    },
  };
  window.cfTracker = api;

  track("page_view", {});
})();
