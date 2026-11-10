import Capacitor
import UIKit

/// Prints the page, or saves it as a PDF from the print sheet
/// (app/components/PrintButton.tsx). Web views ignore window.print(). The
/// Android app has the same plugin (PrintPlugin.java).
@objc(PrintPlugin)
public class PrintPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "PrintPlugin"
    public let jsName = "Print"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "print", returnType: CAPPluginReturnPromise)
    ]

    /// Opens the print sheet for the page. `name` is the job's name, which
    /// is also the PDF's suggested file name.
    @objc func print(_ call: CAPPluginCall) {
        let name = call.getString("name") ?? "SwingArm"
        DispatchQueue.main.async {
            guard let webView = self.bridge?.webView else {
                call.reject("There's no page to print.")
                return
            }
            let info = UIPrintInfo(dictionary: nil)
            info.jobName = name
            info.outputType = .general

            let printer = UIPrintInteractionController.shared
            printer.printInfo = info
            printer.printFormatter = webView.viewPrintFormatter()
            printer.present(animated: true) { _, _, error in
                if let error = error {
                    call.reject(error.localizedDescription)
                } else {
                    call.resolve()
                }
            }
        }
    }
}
