package app.swingarm;

import android.content.ContentResolver;
import android.content.ContentValues;
import android.net.Uri;
import android.os.Build;
import android.provider.MediaStore;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.IOException;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;

/**
 * Saves a text file to the phone's Downloads folder, where a browser's downloads
 * go (the web view can't download). Called from app/components/download.ts.
 * Android 10 and newer; older phones get the share sheet instead.
 */
@CapacitorPlugin(name = "Downloads")
public class DownloadsPlugin extends Plugin {

    @PluginMethod
    public void save(PluginCall call) {
        String fileName = call.getString("fileName");
        String mimeType = call.getString("mimeType", "application/octet-stream");
        String text = call.getString("text");
        if (fileName == null || text == null) {
            call.reject("fileName and text are required");
            return;
        }
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) {
            call.unavailable("Saving to Downloads needs Android 10 or newer");
            return;
        }

        ContentResolver resolver = getContext().getContentResolver();
        ContentValues values = new ContentValues();
        values.put(MediaStore.Downloads.DISPLAY_NAME, fileName);
        values.put(MediaStore.Downloads.MIME_TYPE, mimeType);
        // Hidden from other apps until it's fully written.
        values.put(MediaStore.Downloads.IS_PENDING, 1);
        Uri uri = resolver.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values);
        if (uri == null) {
            call.reject("Couldn't create the file");
            return;
        }
        try (OutputStream out = resolver.openOutputStream(uri)) {
            if (out == null) throw new IOException("Couldn't open the file");
            out.write(text.getBytes(StandardCharsets.UTF_8));
        } catch (IOException e) {
            resolver.delete(uri, null, null);
            call.reject("Couldn't save the file", e);
            return;
        }
        values.clear();
        values.put(MediaStore.Downloads.IS_PENDING, 0);
        // A name that's taken gets " (1)" added by Android, as a browser download would.
        resolver.update(uri, values, null, null);
        call.resolve();
    }
}
