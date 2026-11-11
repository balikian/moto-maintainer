import AuthenticationServices
import Capacitor
import UIKit

/// Sign in with Apple through the iPhone's own sheet (Face ID, no password),
/// for app/components/LoginCard.tsx. Gives back Apple's identity token, which
/// the site trades for a Supabase session (signInWithAppleToken in
/// lib/actions/auth.ts). The web and Android sign in through Apple's web page
/// instead.
@objc(AppleSignInPlugin)
public class AppleSignInPlugin: CAPPlugin, CAPBridgedPlugin, ASAuthorizationControllerDelegate, ASAuthorizationControllerPresentationContextProviding {
    public let identifier = "AppleSignInPlugin"
    public let jsName = "AppleSignIn"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "signIn", returnType: CAPPluginReturnPromise)
    ]

    private var pendingCall: CAPPluginCall?
    private var controller: ASAuthorizationController?

    /// `nonce` is the SHA-256 of the one the site keeps: Apple puts it in the
    /// token, and Supabase checks the two match.
    @objc func signIn(_ call: CAPPluginCall) {
        guard let nonce = call.getString("nonce"), !nonce.isEmpty else {
            call.reject("Sign-in needs a nonce.")
            return
        }
        DispatchQueue.main.async {
            if let pending = self.pendingCall {
                pending.reject("Another sign-in started.", "CANCELED")
            }
            let request = ASAuthorizationAppleIDProvider().createRequest()
            request.requestedScopes = [.email]
            request.nonce = nonce

            let controller = ASAuthorizationController(authorizationRequests: [request])
            controller.delegate = self
            controller.presentationContextProvider = self
            self.pendingCall = call
            self.controller = controller
            controller.performRequests()
        }
    }

    public func presentationAnchor(for controller: ASAuthorizationController) -> ASPresentationAnchor {
        return bridge?.webView?.window ?? ASPresentationAnchor()
    }

    public func authorizationController(controller: ASAuthorizationController, didCompleteWithAuthorization authorization: ASAuthorization) {
        guard let call = finish() else { return }
        guard let credential = authorization.credential as? ASAuthorizationAppleIDCredential,
              let data = credential.identityToken,
              let token = String(data: data, encoding: .utf8) else {
            call.reject("Apple didn't send a sign-in token. Please try again.")
            return
        }
        call.resolve(["identityToken": token])
    }

    public func authorizationController(controller: ASAuthorizationController, didCompleteWithError error: Error) {
        guard let call = finish() else { return }
        if let authError = error as? ASAuthorizationError, authError.code == .canceled {
            call.reject("Sign-in was canceled.", "CANCELED")
        } else {
            call.reject(error.localizedDescription)
        }
    }

    /// The waiting call, cleared so it's answered only once.
    private func finish() -> CAPPluginCall? {
        let call = pendingCall
        pendingCall = nil
        controller = nil
        return call
    }
}
