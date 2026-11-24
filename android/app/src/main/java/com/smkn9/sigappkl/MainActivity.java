package com.smkn9.sigappkl;

import android.content.Context;
import android.content.IntentSender;
import android.net.http.SslError;
import android.os.Bundle;
import android.print.PrintAttributes;
import android.print.PrintDocumentAdapter;
import android.print.PrintManager;
import android.webkit.JavascriptInterface;
import android.webkit.SslErrorHandler;
import android.webkit.WebView;
import android.util.Log;

import com.getcapacitor.BridgeActivity;
import com.getcapacitor.Bridge;

// Google Play In-App Updates
import com.google.android.play.core.appupdate.AppUpdateInfo;
import com.google.android.play.core.appupdate.AppUpdateManager;
import com.google.android.play.core.appupdate.AppUpdateManagerFactory;
import com.google.android.play.core.install.model.AppUpdateType;
import com.google.android.play.core.install.model.UpdateAvailability;
import com.google.android.play.core.tasks.Task;

import java.io.IOException;
import java.security.SecureRandom;
import java.security.cert.CertificateException;
import java.security.cert.X509Certificate;

import javax.net.ssl.HostnameVerifier;
import javax.net.ssl.HttpsURLConnection;
import javax.net.ssl.SSLContext;
import javax.net.ssl.SSLSocketFactory;
import javax.net.ssl.TrustManager;
import javax.net.ssl.X509TrustManager;

import okhttp3.MediaType;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.RequestBody;
import okhttp3.Response;

public class MainActivity extends BridgeActivity {

    private static final String TAG = "SIGAP";
    private static final int IN_APP_UPDATE_REQUEST_CODE = 100;
    private AppUpdateManager appUpdateManager;

    private static SSLSocketFactory trustAllSocketFactory = null;
    private static X509TrustManager trustAllManager = null;
    private static OkHttpClient sigapHttpClient = null;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        initTrustAllSSL();
        // Cek update dari Google Play setiap kali app dibuka
        checkForAppUpdate();
    }

    // ══════════════════════════════════════════════════════════════
    // IN-APP UPDATE — Notifikasi update otomatis dari Google Play
    // FLEXIBLE: update berjalan di background, notifikasi muncul
    // IMMEDIATE: update wajib, fullscreen, tidak bisa skip
    // ══════════════════════════════════════════════════════════════
    private void checkForAppUpdate() {
        appUpdateManager = AppUpdateManagerFactory.create(this);
        Task<AppUpdateInfo> appUpdateInfoTask = appUpdateManager.getAppUpdateInfo();

        appUpdateInfoTask.addOnSuccessListener(appUpdateInfo -> {
            int availability = appUpdateInfo.updateAvailability();
            Log.i(TAG, "Update availability: " + availability);

            if (availability == UpdateAvailability.UPDATE_AVAILABLE) {
                // Prioritas update: IMMEDIATE untuk update kritis (high priority >= 4)
                // FLEXIBLE untuk update biasa
                int priority = appUpdateInfo.updatePriority();
                Log.i(TAG, "Update tersedia! Priority: " + priority);

                if (priority >= 4 && appUpdateInfo.isUpdateTypeAllowed(AppUpdateType.IMMEDIATE)) {
                    // Update WAJIB — pengguna tidak bisa pakai app sebelum update
                    try {
                        appUpdateManager.startUpdateFlowForResult(
                            appUpdateInfo,
                            AppUpdateType.IMMEDIATE,
                            this,
                            IN_APP_UPDATE_REQUEST_CODE
                        );
                    } catch (IntentSender.SendIntentException e) {
                        Log.e(TAG, "IMMEDIATE update error: " + e.getMessage());
                    }
                } else if (appUpdateInfo.isUpdateTypeAllowed(AppUpdateType.FLEXIBLE)) {
                    // Update OPSIONAL — popup muncul, pengguna bisa update sambil pakai app
                    try {
                        appUpdateManager.startUpdateFlowForResult(
                            appUpdateInfo,
                            AppUpdateType.FLEXIBLE,
                            this,
                            IN_APP_UPDATE_REQUEST_CODE
                        );
                    } catch (IntentSender.SendIntentException e) {
                        Log.e(TAG, "FLEXIBLE update error: " + e.getMessage());
                    }
                }
            } else if (availability == UpdateAvailability.DEVELOPER_TRIGGERED_UPDATE_IN_PROGRESS) {
                // Ada update IMMEDIATE yang sedang berjalan — lanjutkan
                try {
                    appUpdateManager.startUpdateFlowForResult(
                        appUpdateInfo,
                        AppUpdateType.IMMEDIATE,
                        this,
                        IN_APP_UPDATE_REQUEST_CODE
                    );
                } catch (IntentSender.SendIntentException e) {
                    Log.e(TAG, "Resume update error: " + e.getMessage());
                }
            }
        }).addOnFailureListener(e -> {
            // Tidak ada Google Play (misalnya emulator/debug) — abaikan
            Log.w(TAG, "In-app update check gagal (mungkin tidak ada Play Store): " + e.getMessage());
        });
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, android.content.Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == IN_APP_UPDATE_REQUEST_CODE) {
            if (resultCode != RESULT_OK) {
                Log.w(TAG, "Update dibatalkan atau gagal, resultCode: " + resultCode);
                // Jika IMMEDIATE update ditolak, coba lagi
                if (appUpdateManager != null) {
                    appUpdateManager.getAppUpdateInfo().addOnSuccessListener(info -> {
                        if (info.updateAvailability() == UpdateAvailability.DEVELOPER_TRIGGERED_UPDATE_IN_PROGRESS) {
                            try {
                                appUpdateManager.startUpdateFlowForResult(
                                    info, AppUpdateType.IMMEDIATE, this, IN_APP_UPDATE_REQUEST_CODE);
                            } catch (IntentSender.SendIntentException e) {
                                Log.e(TAG, "Resume IMMEDIATE error: " + e.getMessage());
                            }
                        }
                    });
                }
            }
        }
    }
    // ══════════════════════════════════════════════════════════════

    private static void initTrustAllSSL() {
        try {
            trustAllManager = new X509TrustManager() {
                @Override public void checkClientTrusted(X509Certificate[] c, String a) throws CertificateException {}
                @Override public void checkServerTrusted(X509Certificate[] c, String a) throws CertificateException {}
                @Override public X509Certificate[] getAcceptedIssuers() { return new X509Certificate[0]; }
            };

            SSLContext sc = SSLContext.getInstance("SSL");
            sc.init(null, new TrustManager[]{trustAllManager}, new SecureRandom());
            trustAllSocketFactory = sc.getSocketFactory();

            HttpsURLConnection.setDefaultSSLSocketFactory(trustAllSocketFactory);
            HttpsURLConnection.setDefaultHostnameVerifier((hostname, session) -> true);

            sigapHttpClient = new OkHttpClient.Builder()
                .sslSocketFactory(trustAllSocketFactory, trustAllManager)
                .hostnameVerifier((hostname, session) -> true)
                .build();

            Log.i("SIGAP", "SSL bypass initialized OK");
        } catch (Exception e) {
            Log.e("SIGAP", "SSL bypass init error: " + e.getMessage());
        }
    }

    @Override
    public void onStart() {
        super.onStart();

        Bridge bridge = getBridge();
        if (bridge == null) return;

        WebView webView = bridge.getWebView();

        webView.setWebViewClient(new com.getcapacitor.BridgeWebViewClient(bridge) {
            @Override
            public void onReceivedSslError(WebView view, SslErrorHandler handler, SslError error) {
                Log.w("SIGAP", "SSL error: " + error + " — proceeding");
                handler.proceed();
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
                // Inject fetch override setiap kali halaman selesai load
                view.evaluateJavascript(buildFetchOverrideScript(), null);
                Log.i("SIGAP", "fetch() override injected after page load: " + url);
            }
        });

        // Inject JavaScript bridge untuk fetch() bypass SSL
        // Dipanggil setiap kali halaman load (termasuk reload)
        SIGAPHttpBridge.webViewRef = webView;
        webView.addJavascriptInterface(new SIGAPHttpBridge(sigapHttpClient), "SIGAPHttp");

        webView.addJavascriptInterface(new SIGAPPrintInterface(this, webView), "SIGAPPrint");
    }

    private String buildFetchOverrideScript() {
        return "(function() {\n" +
            "  if (window._sigapFetchOverridden) return;\n" +
            "  window._sigapFetchOverridden = true;\n" +
            "  var origFetch = window.fetch;\n" +
            "  window.fetch = function(url, opts) {\n" +
            "    if (typeof url === 'string' && url.indexOf('103.153.190.69:8443') !== -1) {\n" +
            "      return new Promise(function(resolve, reject) {\n" +
            "        opts = opts || {};\n" +
            "        var method = (opts.method || 'GET').toUpperCase();\n" +
            "        var body = opts.body || '';\n" +
            "        var headers = opts.headers ? JSON.stringify(opts.headers) : '{}';\n" +
            "        var callbackId = 'cb_' + Date.now() + '_' + Math.random().toString(36).substr(2,6);\n" +
            "        window['_sigapCb_' + callbackId] = function(status, responseText) {\n" +
            "          delete window['_sigapCb_' + callbackId];\n" +
            "          if (status >= 200 && status < 300) {\n" +
            "            resolve({\n" +
            "              ok: true, status: status,\n" +
            "              json: function() { return Promise.resolve(JSON.parse(responseText)); },\n" +
            "              text: function() { return Promise.resolve(responseText); }\n" +
            "            });\n" +
            "          } else if (status === -1) {\n" +
            "            reject(new TypeError('Failed to fetch (native bridge error): ' + responseText));\n" +
            "          } else {\n" +
            "            resolve({\n" +
            "              ok: false, status: status,\n" +
            "              json: function() { return Promise.resolve(JSON.parse(responseText)); },\n" +
            "              text: function() { return Promise.resolve(responseText); }\n" +
            "            });\n" +
            "          }\n" +
            "        };\n" +
            "        SIGAPHttp.request(url, method, headers, body, callbackId);\n" +
            "      });\n" +
            "    }\n" +
            "    return origFetch.apply(this, arguments);\n" +
            "  };\n" +
            "  console.log('[SIGAP] fetch() override installed for 103.153.190.69:8443');\n" +
            "})();";
    }

    // Java Bridge — dipanggil dari JavaScript override fetch
    public static class SIGAPHttpBridge {
        private final OkHttpClient client;

        SIGAPHttpBridge(OkHttpClient client) {
            this.client = client;
        }

        @JavascriptInterface
        public void request(final String url, final String method, final String headersJson, final String body, final String callbackId) {
            new Thread(() -> {
                try {
                    Request.Builder reqBuilder = new Request.Builder().url(url);

                    // Parse dan set headers
                    try {
                        org.json.JSONObject headersObj = new org.json.JSONObject(headersJson);
                        java.util.Iterator<String> keys = headersObj.keys();
                        while (keys.hasNext()) {
                            String key = keys.next();
                            reqBuilder.header(key, headersObj.getString(key));
                        }
                    } catch (Exception e) {
                        Log.w("SIGAP", "Headers parse error: " + e.getMessage());
                    }

                    // Set method dan body
                    if ("POST".equals(method) || "PUT".equals(method) || "PATCH".equals(method)) {
                        MediaType json = MediaType.parse("application/json; charset=utf-8");
                        RequestBody requestBody = RequestBody.create(body != null ? body.getBytes() : new byte[0], json);
                        if ("POST".equals(method)) reqBuilder.post(requestBody);
                        else if ("PUT".equals(method)) reqBuilder.put(requestBody);
                        else reqBuilder.patch(requestBody);
                    } else {
                        reqBuilder.get();
                    }

                    Response response = client.newCall(reqBuilder.build()).execute();
                    String responseText = response.body() != null ? response.body().string() : "";
                    int statusCode = response.code();
                    response.close();

                    Log.i("SIGAP", "HTTP " + method + " " + url + " → " + statusCode);

                    // Callback ke JavaScript
                    final String finalText = responseText;
                    final int finalStatus = statusCode;
                    android.os.Handler mainHandler = new android.os.Handler(android.os.Looper.getMainLooper());
                    mainHandler.post(() -> {
                        // Akan di-inject ke WebView
                    });

                    // Panggil callback langsung via WebView evaluate (perlu akses ke WebView)
                    // Simpan di static agar bisa dipanggil dari thread lain
                    SIGAPHttpBridge.pendingCallback = new Runnable() {
                        public void run() {
                            // tidak dipakai
                        }
                    };
                    SIGAPHttpBridge.lastCallbackId = callbackId;
                    SIGAPHttpBridge.lastStatus = finalStatus;
                    SIGAPHttpBridge.lastResponse = finalText;

                    // Trigger callback via evaluateJavascript
                    if (SIGAPHttpBridge.webViewRef != null) {
                        String escaped = finalText.replace("\\", "\\\\").replace("'", "\\'").replace("\n", "\\n").replace("\r", "\\r");
                        String jsCall = "if(window['_sigapCb_" + callbackId + "']){window['_sigapCb_" + callbackId + "'](" + finalStatus + ",'" + escaped + "');}";
                        new android.os.Handler(android.os.Looper.getMainLooper()).post(() -> {
                            SIGAPHttpBridge.webViewRef.evaluateJavascript(jsCall, null);
                        });
                    }

                } catch (IOException e) {
                    Log.e("SIGAP", "HTTP request error: " + e.getMessage());
                    if (SIGAPHttpBridge.webViewRef != null) {
                        String errMsg = e.getMessage() != null ? e.getMessage().replace("'", "\\'") : "network error";
                        String jsCall = "if(window['_sigapCb_" + callbackId + "']){window['_sigapCb_" + callbackId + "'](-1,'" + errMsg + "');}";
                        new android.os.Handler(android.os.Looper.getMainLooper()).post(() -> {
                            SIGAPHttpBridge.webViewRef.evaluateJavascript(jsCall, null);
                        });
                    }
                }
            }).start();
        }

        static WebView webViewRef = null;
        static Runnable pendingCallback = null;
        static String lastCallbackId = null;
        static int lastStatus = 0;
        static String lastResponse = null;
    }

    public class SIGAPPrintInterface {
        private final Context context;
        private final WebView webView;

        SIGAPPrintInterface(Context context, WebView webView) {
            this.context = context;
            this.webView = webView;
        }

        @JavascriptInterface
        public void printHTML(final String htmlContent) {
            runOnUiThread(() -> {
                WebView printWebView = new WebView(context);
                printWebView.getSettings().setJavaScriptEnabled(true);
                printWebView.loadDataWithBaseURL("https://103.153.190.69:8443", htmlContent, "text/html", "UTF-8", null);
                printWebView.setWebViewClient(new android.webkit.WebViewClient() {
                    @Override
                    public void onReceivedSslError(WebView view, SslErrorHandler handler, SslError error) {
                        handler.proceed();
                    }
                    @Override
                    public void onPageFinished(WebView view, String url) {
                        PrintManager printManager = (PrintManager) context.getSystemService(Context.PRINT_SERVICE);
                        PrintDocumentAdapter printAdapter = view.createPrintDocumentAdapter("SIGAP_Laporan");
                        PrintAttributes.Builder builder = new PrintAttributes.Builder();
                        builder.setMediaSize(PrintAttributes.MediaSize.ISO_A4);
                        printManager.print("SIGAP PKL Laporan", printAdapter, builder.build());
                    }
                });
            });
        }
    }
}
