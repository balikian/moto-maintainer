package app.swingarm;

import android.content.Context;
import android.graphics.Color;
import android.os.Bundle;
import android.os.CancellationSignal;
import android.os.ParcelFileDescriptor;
import android.print.PageRange;
import android.print.PrintAttributes;
import android.print.PrintDocumentAdapter;
import android.print.PrintManager;
import android.webkit.WebView;
import androidx.core.content.ContextCompat;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Prints the page in the web view with Android's print screen, which also
 * offers Save as PDF (web views ignore window.print()). The page's print
 * styles apply, as in a browser (app/globals.css sets the margins and white
 * paper). Called from app/components/PrintButton.tsx.
 */
@CapacitorPlugin(name = "Print")
public class PrintPlugin extends Plugin {

    @PluginMethod
    public void print(PluginCall call) {
        // The print screen's job name, and the PDF's suggested file name.
        String name = call.getString("name", "SwingArm");
        getActivity().runOnUiThread(() -> {
            WebView webView = getBridge().getWebView();
            // The page margins also print in the web view's own background
            // color (MainActivity: dark in dark mode), so white until the
            // print screen closes.
            webView.setBackgroundColor(Color.WHITE);
            PrintDocumentAdapter page = webView.createPrintDocumentAdapter(name);
            PrintDocumentAdapter adapter = new PrintDocumentAdapter() {
                @Override
                public void onStart() {
                    page.onStart();
                }

                @Override
                public void onLayout(
                    PrintAttributes oldAttributes,
                    PrintAttributes newAttributes,
                    CancellationSignal cancellationSignal,
                    LayoutResultCallback callback,
                    Bundle extras
                ) {
                    page.onLayout(oldAttributes, newAttributes, cancellationSignal, callback, extras);
                }

                @Override
                public void onWrite(
                    PageRange[] pages,
                    ParcelFileDescriptor destination,
                    CancellationSignal cancellationSignal,
                    WriteResultCallback callback
                ) {
                    page.onWrite(pages, destination, cancellationSignal, callback);
                }

                @Override
                public void onFinish() {
                    page.onFinish();
                    webView.setBackgroundColor(ContextCompat.getColor(getContext(), R.color.page_background));
                }
            };
            PrintManager printManager = (PrintManager) getActivity().getSystemService(Context.PRINT_SERVICE);
            printManager.print(name, adapter, new PrintAttributes.Builder().build());
            call.resolve();
        });
    }
}
