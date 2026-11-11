import UIKit
import Capacitor
import FirebaseCore
import FirebaseMessaging

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        // Notifications go through Firebase, as on Android (lib/fcm.ts), so the
        // reminder job sends to every phone the same way. Firebase lists each
        // app id separately, so development builds (app.swingarm.dev) have
        // their own settings file. Both are in App/Firebase (see its README),
        // gitignored like Android's google-services.json.
        let settings = Bundle.main.bundleIdentifier == "app.swingarm.dev" ? "GoogleService-Info-Dev" : "GoogleService-Info"
        if let path = Bundle.main.path(forResource: settings, ofType: "plist", inDirectory: "Firebase"),
           let options = FirebaseOptions(contentsOfFile: path) {
            FirebaseApp.configure(options: options)
        }
        return true
    }

    // Apple hands the app its push address; Firebase trades it for a Firebase
    // token, which is what the site saves (app/hooks/usePush.ts). Capacitor's
    // push plugin passes the token to the site as its "registration" event.
    func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
        guard FirebaseApp.app() != nil else {
            NotificationCenter.default.post(name: .capacitorDidFailToRegisterForRemoteNotifications,
                                            object: NSError(domain: "SwingArm", code: 1, userInfo: [NSLocalizedDescriptionKey: "Firebase isn't set up in this build."]))
            return
        }
        Messaging.messaging().apnsToken = deviceToken
        // token(completion:) is deprecated for register(completion:), but that
        // one gives no token: it moves to Firebase installation ids, which
        // lib/fcm.ts doesn't send to (Android's app saves tokens too). Keep
        // this until both phones and the reminder job move together.
        Messaging.messaging().token { token, error in
            if let error = error {
                NotificationCenter.default.post(name: .capacitorDidFailToRegisterForRemoteNotifications, object: error)
            } else if let token = token {
                NotificationCenter.default.post(name: .capacitorDidRegisterForRemoteNotifications, object: token)
            }
        }
    }

    func application(_ application: UIApplication, didFailToRegisterForRemoteNotificationsWithError error: Error) {
        NotificationCenter.default.post(name: .capacitorDidFailToRegisterForRemoteNotifications, object: error)
    }

    func application(_ application: UIApplication,
                     configurationForConnecting connectingSceneSession: UISceneSession,
                     options: UIScene.ConnectionOptions) -> UISceneConfiguration {
        let config = UISceneConfiguration(name: "Default Configuration",
                                          sessionRole: connectingSceneSession.role)
        config.delegateClass = SceneDelegate.self
        return config
    }
}
