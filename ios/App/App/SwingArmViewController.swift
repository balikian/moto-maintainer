import Capacitor
import UIKit
import WebKit

/// The app's screen: Capacitor's web view, plus the app's own plugins.
class SwingArmViewController: CAPBridgeViewController {
    /// The web view holds its navigation delegate weakly, so the filter lives here.
    private var cancelledLoadFilter: CancelledLoadFilter?

    override open func capacitorDidLoad() {
        bridge?.registerPluginInstance(PrintPlugin())
        bridge?.registerPluginInstance(AppleSignInPlugin())

        if let handler = webView?.navigationDelegate as? WebViewDelegationHandler {
            let filter = CancelledLoadFilter(handler: handler)
            cancelledLoadFilter = filter
            webView?.navigationDelegate = filter
        }

        // Until the site paints, the web view shows the page color for the
        // phone's light or dark mode (the rider's own theme is only known once
        // the site loads). Android does the same (values/colors.xml).
        let page = UIColor { traits in
            traits.userInterfaceStyle == .dark
                ? UIColor(red: 0x14 / 255, green: 0x16 / 255, blue: 0x19 / 255, alpha: 1)
                : UIColor(red: 0xEC / 255, green: 0xE6 / 255, blue: 0xDC / 255, alpha: 1)
        }
        view.backgroundColor = page
        webView?.isOpaque = false
        webView?.backgroundColor = page
        webView?.scrollView.backgroundColor = page
    }
}

/// Passes the web view's navigation events on to Capacitor, except failures
/// that only mean a load was cancelled. Capacitor shows the offline page
/// (mobile/offline.html) for any failed load, but a load is also cancelled
/// when another one replaces it: signing in with a password or emailed code
/// starts a full load of the dashboard while Next.js redirects there too, and
/// riders landed on "Can't reach SwingArm" though nothing was wrong.
final class CancelledLoadFilter: NSObject, WKNavigationDelegate {
    private weak var handler: WebViewDelegationHandler?

    init(handler: WebViewDelegationHandler) {
        self.handler = handler
    }

    // Everything this class doesn't handle goes straight to Capacitor's handler.
    override func responds(to aSelector: Selector!) -> Bool {
        super.responds(to: aSelector) || (handler?.responds(to: aSelector) ?? false)
    }

    override func forwardingTarget(for aSelector: Selector!) -> Any? {
        handler?.responds(to: aSelector) == true ? handler : nil
    }

    // The force unwraps are part of the protocol declaration.
    // swiftlint:disable implicitly_unwrapped_optional
    func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
        if Self.wasCancelled(error) { return }
        handler?.webView(webView, didFailProvisionalNavigation: navigation, withError: error)
    }

    func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
        if Self.wasCancelled(error) { return }
        handler?.webView(webView, didFail: navigation, withError: error)
    }
    // swiftlint:enable implicitly_unwrapped_optional

    /// A load stopped because another replaced it, or because the page was
    /// handed elsewhere (a link opened in Safari, a file download).
    static func wasCancelled(_ error: Error) -> Bool {
        let error = error as NSError
        let replaced = error.domain == NSURLErrorDomain && error.code == NSURLErrorCancelled
        let handedOff = error.domain == "WebKitErrorDomain" && error.code == 102
        if replaced || handedOff {
            CAPLog.print("⚡️  Ignored a cancelled load: \(error.localizedDescription)")
        }
        return replaced || handedOff
    }
}
