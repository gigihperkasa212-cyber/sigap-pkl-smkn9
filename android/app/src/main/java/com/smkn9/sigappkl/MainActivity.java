package com.smkn9.sigappkl;

import android.content.Context;
import android.os.Bundle;
import android.print.PrintAttributes;
import android.print.PrintDocumentAdapter;
import android.print.PrintManager;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;
import android.util.Log;

import com.getcapacitor.BridgeActivity;
import com.getcapacitor.Bridge;

// Google Play In-App Updates — akan diaktifkan setelah app masuk Play Store
// import com.google.android.play.core.appupdate.AppUpdateInfo;
// import com.google.android.play.core.appupdate.AppUpdateManager;
// import com.google.android.play.core.appupdate.AppUpdateManagerFactory;
// import com.google.android.play.core.install.model.AppUpdateType;
// import com.google.android.play.core.install.model.UpdateAvailability;
// import com.google.android.play.core.tasks.Task;

public class MainActivity extends BridgeActivity {

    private static final String TAG = "SIGAP";
    // private static final int IN_APP_UPDATE_REQUEST_CODE = 100;
    // private AppUpdateManager appUpdateManager;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // In-App Update akan diaktifkan setelah app terdaftar di Play Store
        // checkForAppUpdate();
    }

    // ══════════════════════════════════════════════════════════════
    // IN-APP UPDATE — akan diaktifkan setelah app terdaftar di Play Store
    // private void checkForAppUpdate() { ... }
    // ══════════════════════════════════════════════════════════════

    @Override
    public void onStart() {
        super.onStart();

        Bridge bridge = getBridge();
        if (bridge == null) return;

        WebView webView = bridge.getWebView();

        // Inject JavaScript bridge untuk print
        webView.addJavascriptInterface(new SIGAPPrintInterface(this, webView), "SIGAPPrint");
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
                printWebView.loadDataWithBaseURL("https://sigap.smkn9malang.sch.id", htmlContent, "text/html", "UTF-8", null);
                printWebView.setWebViewClient(new android.webkit.WebViewClient() {
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
