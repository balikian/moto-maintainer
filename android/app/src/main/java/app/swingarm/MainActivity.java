package app.swingarm;

import android.os.Bundle;
import androidx.core.content.ContextCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        // The app's own plugins, before the bridge starts.
        registerPlugin(DownloadsPlugin.class);
        registerPlugin(PrintPlugin.class);
        super.onCreate(savedInstanceState);
        // Until the site paints, the web view shows the page color for the
        // phone's light or dark mode (values/colors.xml, values-night).
        if (getBridge() != null) {
            getBridge().getWebView().setBackgroundColor(ContextCompat.getColor(this, R.color.page_background));
        }
    }
}
