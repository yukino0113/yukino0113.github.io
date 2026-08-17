const EMBEDDED_BROWSER_DISMISSAL_KEY = "open-invitation-embedded-browser-notice-dismissed";

function isEmbeddedBrowser(userAgent = navigator.userAgent) {
  const normalizedUserAgent = userAgent || "";
  const isKnownInAppBrowser =
    /\bLine\//i.test(normalizedUserAgent) ||
    /\bInstagram\b/i.test(normalizedUserAgent) ||
    /\[FBAN|\bFBAV\b|\bFB_IAB\b|\bFB4A\b/i.test(normalizedUserAgent) ||
    /\bMessenger(?:ForiOS|\/)/i.test(normalizedUserAgent) ||
    /\bTikTok\b|\bBytedanceWebview\b/i.test(normalizedUserAgent) ||
    /\bMicroMessenger\b/i.test(normalizedUserAgent) ||
    /\bLinkedInApp\b/i.test(normalizedUserAgent);
  const isAndroidWebView = /;\s*wv\)/i.test(normalizedUserAgent);
  const isIosWebView =
    /\b(iPhone|iPad|iPod)\b/i.test(normalizedUserAgent) &&
    /\bAppleWebKit\b/i.test(normalizedUserAgent) &&
    !/\b(Safari|CriOS|FxiOS|EdgiOS|OPiOS)\b/i.test(normalizedUserAgent);

  return isKnownInAppBrowser || isAndroidWebView || isIosWebView;
}

function wasNoticeDismissed() {
  try {
    return sessionStorage.getItem(EMBEDDED_BROWSER_DISMISSAL_KEY) === "true";
  } catch {
    return false;
  }
}

function rememberNoticeDismissal() {
  try {
    sessionStorage.setItem(EMBEDDED_BROWSER_DISMISSAL_KEY, "true");
  } catch {
    // Private browsing or storage restrictions should not prevent the invitation from working.
  }
}

const embeddedBrowserNotice = document.getElementById("embedded-browser-notice");
const embeddedBrowserDismissButton = document.getElementById("dismiss-embedded-browser-notice");

if (embeddedBrowserNotice && embeddedBrowserDismissButton && isEmbeddedBrowser() && !wasNoticeDismissed()) {
  embeddedBrowserNotice.hidden = false;
  embeddedBrowserDismissButton.focus({ preventScroll: true });

  embeddedBrowserDismissButton.addEventListener("click", () => {
    rememberNoticeDismissal();
    embeddedBrowserNotice.hidden = true;
    document.getElementById("toggle-open")?.focus({ preventScroll: true });
  });
}
