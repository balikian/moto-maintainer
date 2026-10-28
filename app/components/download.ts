import { Capacitor, registerPlugin } from '@capacitor/core';
import { Directory, Encoding, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { isNativeApp } from '@/lib/nativeApp';

/** The Android app's own plugin (android/app/.../DownloadsPlugin.java). */
const Downloads = registerPlugin<{
  save(options: { fileName: string; mimeType: string; text: string }): Promise<void>;
}>('Downloads');

/** How the file left: the browser's download, the app's Downloads folder, or the phone's share sheet. */
export type SaveResult = 'downloaded' | 'saved' | 'shared';

/**
 * Saves text as a file: the browser's download, or in the phone app (whose web
 * view can't download) the phone's Downloads folder on Android, else the share
 * sheet (iPhone's Save to Files, older Android phones).
 */
export async function downloadFile(fileName: string, content: string, type: string): Promise<SaveResult> {
  const inApp = isNativeApp();
  // The byte-order mark makes desktop Excel read CSV files as UTF-8 (accents,
  // symbols). Not from the app: its files get opened on the phone, where Google
  // Sheets shows the mark as "ï»¿" before the first heading.
  const text = type.startsWith('text/csv') && !inApp ? String.fromCharCode(0xfeff) + content : content;

  if (inApp) {
    if (Capacitor.isPluginAvailable('Downloads')) {
      try {
        await Downloads.save({ fileName, mimeType: type.split(';')[0], text });
        return 'saved';
      } catch {
        // Android 9 or older, or the save failed: the share sheet instead.
      }
    }
    const { uri } = await Filesystem.writeFile({
      path: fileName,
      data: text,
      directory: Directory.Cache,
      encoding: Encoding.UTF8,
    });
    try {
      await Share.share({ title: fileName, files: [uri] });
    } catch {
      // The rider closed the share sheet; nothing to do.
    }
    return 'shared';
  }

  const url = URL.createObjectURL(new Blob([text], { type }));
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
  return 'downloaded';
}
