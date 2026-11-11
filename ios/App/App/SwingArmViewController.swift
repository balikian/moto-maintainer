import Capacitor
import UIKit

/// The app's screen: Capacitor's web view, plus the app's own plugins.
class SwingArmViewController: CAPBridgeViewController {
    override open func capacitorDidLoad() {
        bridge?.registerPluginInstance(PrintPlugin())
        bridge?.registerPluginInstance(AppleSignInPlugin())

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
