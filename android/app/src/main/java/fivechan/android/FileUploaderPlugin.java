package fivechan.android;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.util.Base64;
import android.util.Log;

import androidx.activity.result.ActivityResult;
import androidx.appcompat.app.AppCompatActivity;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.File;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;

import org.json.JSONArray;

@CapacitorPlugin(name = "FileUploader")
public class FileUploaderPlugin extends Plugin {
    private static final String TAG = "FileUploaderPlugin";

    private static final String PROVIDER_CATBOX = "catbox";
    private static final long CATBOX_TIMEOUT_SEC = 30;
    private static final int MAX_GENERATED_UPLOAD_BYTES = 20 * 1024 * 1024;

    @PluginMethod
    public void pickAndUploadMedia(PluginCall call) {
        Log.d(TAG, "pickAndUploadMedia called");
        List<String> providerOrder = getProviderOrder(call);
        if (providerOrder.isEmpty()) {
            call.reject("No supported upload providers selected");
            return;
        }
        Intent intent = new Intent(Intent.ACTION_GET_CONTENT);
        intent.setType("*/*");
        String[] mimeTypes = {
            "image/jpeg",
            "image/png",
            "video/mp4",
            "video/webm",
            "application/x-shockwave-flash",
            "application/vnd.adobe.flash.movie"
        };
        intent.putExtra(Intent.EXTRA_MIME_TYPES, mimeTypes);
        startActivityForResult(call, intent, "pickFileResult");
    }

    @PluginMethod
    public void uploadGeneratedMedia(PluginCall call) {
        Log.d(TAG, "uploadGeneratedMedia called");
        List<String> providerOrder = getProviderOrder(call);
        if (providerOrder.isEmpty()) {
            call.reject("No supported upload providers selected");
            return;
        }

        String base64 = call.getString("base64");
        if (base64 == null || base64.trim().isEmpty()) {
            call.reject("Generated upload data is required");
            return;
        }
        int commaIndex = base64.indexOf(',');
        String base64Payload = commaIndex >= 0 ? base64.substring(commaIndex + 1) : base64;
        byte[] bytes;
        try {
            bytes = Base64.decode(base64Payload, Base64.DEFAULT);
        } catch (IllegalArgumentException e) {
            call.reject("Generated upload data is invalid");
            return;
        }
        if (bytes.length == 0) {
            call.reject("Generated upload data is empty");
            return;
        }
        if (bytes.length > MAX_GENERATED_UPLOAD_BYTES) {
            call.reject("Generated upload is too large");
            return;
        }

        String fileName = call.getString("fileName", "tegaki.png");
        String mimeType = call.getString("mimeType", "application/octet-stream");
        new Thread(
                        () -> {
                            File cachedFile = null;
                            try {
                                cachedFile = FileUtils.writeBytesToCacheFile(getContext(), fileName, bytes);
                                tryProvidersSequentially(Uri.fromFile(cachedFile), providerOrder, call, fileName, bytes, mimeType);
                            } catch (Exception e) {
                                Log.e(TAG, "Generated upload failed", e);
                                try {
                                    call.reject("Upload failed: " + e.getMessage());
                                } catch (Exception rejectEx) {
                                    Log.e(TAG, "Failed to reject generated upload call", rejectEx);
                                }
                            } finally {
                                if (cachedFile != null && cachedFile.exists() && !cachedFile.delete()) {
                                    Log.w(TAG, "Could not delete generated upload cache file: " + cachedFile.getAbsolutePath());
                                }
                            }
                        })
                .start();
    }

    private List<String> parseProviderOrder(PluginCall call) {
        List<String> order = new ArrayList<>();
        JSArray arr = call.getArray("providerOrder");
        if (arr != null) {
            for (int i = 0; i < arr.length(); i++) {
                try {
                    Object o = arr.get(i);
                    if (o instanceof String) {
                        String p = (String) o;
                        if (PROVIDER_CATBOX.equals(p)) {
                            order.add(p);
                        } else if (MediaUploadRecipes.isAndroidUploadProvider(p)) {
                            order.add(p);
                        } else if (MediaUploadRecipes.PROVIDER_IMGUR.equals(p)) {
                            Log.d(TAG, "Skipping unsupported Android upload provider: " + p);
                        }
                    }
                } catch (Exception e) {
                    Log.w(TAG, "Skip invalid provider at " + i, e);
                }
            }
        }
        return order;
    }

    private List<String> getProviderOrder(PluginCall call) {
        List<String> providerOrder = parseProviderOrder(call);
        if (providerOrder.isEmpty() && call.getArray("providerOrder") == null) {
            providerOrder.add(PROVIDER_CATBOX);
        }
        return providerOrder;
    }

    @ActivityCallback
    private void pickFileResult(PluginCall call, ActivityResult result) {
        Log.d(TAG, "pickFileResult callback received");
        if (call == null) {
            return;
        }

        if (result.getResultCode() != Activity.RESULT_OK) {
            call.reject("File selection cancelled");
            return;
        }

        Intent data = result.getData();
        if (data == null) {
            call.reject("No data received");
            return;
        }

        Uri uri = data.getData();
        if (uri == null) {
            call.reject("No URI received");
            return;
        }

        List<String> providerOrder = getProviderOrder(call);
        if (providerOrder.isEmpty()) {
            call.reject("No supported upload providers selected");
            return;
        }

        new Thread(
                        () -> {
                            try {
                                tryProvidersSequentially(uri, providerOrder, call);
                            } catch (Exception e) {
                                Log.e(TAG, "Upload failed", e);
                                try {
                                    call.reject("Upload failed: " + e.getMessage());
                                } catch (Exception rejectEx) {
                                    Log.e(TAG, "Failed to reject call", rejectEx);
                                }
                            }
                        })
                .start();
    }

    private void tryProvidersSequentially(Uri fileUri, List<String> providerOrder, PluginCall call) {
        tryProvidersSequentially(fileUri, providerOrder, call, null, null, null);
    }

    private void tryProvidersSequentially(
            Uri fileUri,
            List<String> providerOrder,
            PluginCall call,
            String generatedFileName,
            byte[] generatedFileBytes,
            String generatedMimeType) {
        List<JSObject> attempts = new ArrayList<>();
        StringBuilder errorSummary = new StringBuilder();
        String fileName = generatedFileName != null ? generatedFileName : getFileName(fileUri);

        for (String provider : providerOrder) {
            JSObject attempt = new JSObject();
            attempt.put("provider", provider);

            if (PROVIDER_CATBOX.equals(provider)) {
                MediaUploadResult res = uploadToCatboxSync(fileUri);
                attempt.put("success", res.success);
                if (res.success) {
                    attempt.put("url", res.url);
                    attempts.add(attempt);
                    resolveWithSuccess(call, res.url, fileName, provider, attempts);
                    return;
                }
                attempt.put("error", res.error);
                errorSummary.append(provider).append(": ").append(res.error).append("; ");
            } else if (MediaUploadRecipes.isWebViewProvider(provider)) {
                MediaUploadResult res =
                        generatedFileBytes != null
                                ? uploadGeneratedViaWebViewSync(generatedFileBytes, fileName, generatedMimeType, provider)
                                : uploadViaWebViewSync(fileUri, provider);
                attempt.put("success", res.success);
                if (res.success) {
                    attempt.put("url", res.url);
                    attempts.add(attempt);
                    resolveWithSuccess(call, res.url, fileName, provider, attempts);
                    return;
                }
                attempt.put("error", res.error);
                attempt.put("stage", res.stage != null ? res.stage : "");
                attempt.put("elapsedMs", res.elapsedMs);
                attempt.put("matchedSelectors", res.matchedSelectors != null ? res.matchedSelectors : "");
                if (res.triggerRetryCount != null) attempt.put("triggerRetryCount", res.triggerRetryCount);
                errorSummary.append(provider).append(": ").append(res.error).append("; ");
            }
            attempts.add(attempt);
        }

        JSObject data = new JSObject();
        JSONArray arr = new JSONArray();
        for (JSObject a : attempts) {
            arr.put(a);
        }
        data.put("attempts", arr);
        call.reject("All providers failed: " + errorSummary.toString(), null, null, data);
    }

    private void resolveWithSuccess(
            PluginCall call, String url, String fileName, String provider, List<JSObject> attempts) {
        JSObject ret = new JSObject();
        ret.put("url", url);
        ret.put("fileName", fileName);
        ret.put("provider", provider);
        JSONArray arr = new JSONArray();
        for (JSObject a : attempts) {
            arr.put(a);
        }
        ret.put("attempts", arr);
        call.resolve(ret);
    }

    private String getFileName(Uri uri) {
        try {
            File f = FileUtils.getFileFromUri(getContext(), uri);
            return f != null ? f.getName() : "unknown";
        } catch (Exception e) {
            return "unknown";
        }
    }

    private MediaUploadResult uploadToCatboxSync(Uri fileUri) {
        JSObject statusUpdate = new JSObject();
        statusUpdate.put("status", "Uploading to catbox.moe...");
        notifyListeners("uploadStatus", statusUpdate);

        return CatboxUploader.upload(getContext(), fileUri, CATBOX_TIMEOUT_SEC);
    }

    private MediaUploadResult uploadViaWebViewSync(Uri fileUri, String provider) {
        JSObject statusUpdate = new JSObject();
        statusUpdate.put("status", "Uploading to " + provider + "...");
        notifyListeners("uploadStatus", statusUpdate);

        CountDownLatch latch = new CountDownLatch(1);
        AtomicReference<MediaUploadResult> resultRef = new AtomicReference<>();

        AppCompatActivity activity = getActivity();
        if (activity == null) {
            return new MediaUploadResult(false, null, "Activity unavailable");
        }

        String fileName = getFileName(fileUri);
        MediaUploadCallback callback =
                res -> {
                    resultRef.set(res);
                    latch.countDown();
                };

        activity.runOnUiThread(
                () -> {
                    MediaUploadAutomationRunner runner =
                            new MediaUploadAutomationRunner(
                                    getContext(),
                                    fileUri,
                                    fileName,
                                    provider,
                                    callback);
                    runner.run();
                });

        try {
            boolean ok =
                    latch.await(
                            MediaUploadRecipes.getUploadTimeoutMs(provider) + 5000,
                            TimeUnit.MILLISECONDS);
            if (!ok) {
                return new MediaUploadResult(false, null, "WebView upload timeout");
            }
            MediaUploadResult r = resultRef.get();
            return r != null ? r : new MediaUploadResult(false, null, "No result");
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            return new MediaUploadResult(false, null, "Interrupted");
        }
    }

    private MediaUploadResult uploadGeneratedViaWebViewSync(
            byte[] fileBytes, String fileName, String mimeType, String provider) {
        JSObject statusUpdate = new JSObject();
        statusUpdate.put("status", "Uploading to " + provider + "...");
        notifyListeners("uploadStatus", statusUpdate);

        CountDownLatch latch = new CountDownLatch(1);
        AtomicReference<MediaUploadResult> resultRef = new AtomicReference<>();

        AppCompatActivity activity = getActivity();
        if (activity == null) {
            return new MediaUploadResult(false, null, "Activity unavailable");
        }

        MediaUploadCallback callback =
                res -> {
                    resultRef.set(res);
                    latch.countDown();
                };

        activity.runOnUiThread(
                () -> {
                    MediaUploadAutomationRunner runner =
                            new MediaUploadAutomationRunner(
                                    getContext(),
                                    fileBytes,
                                    fileName,
                                    mimeType,
                                    provider,
                                    callback,
                                    null);
                    runner.run();
                });

        try {
            boolean ok =
                    latch.await(
                            MediaUploadRecipes.getUploadTimeoutMs(provider) + 5000,
                            TimeUnit.MILLISECONDS);
            if (!ok) {
                return new MediaUploadResult(false, null, "WebView upload timeout");
            }
            MediaUploadResult r = resultRef.get();
            return r != null ? r : new MediaUploadResult(false, null, "No result");
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            return new MediaUploadResult(false, null, "Interrupted");
        }
    }
}
