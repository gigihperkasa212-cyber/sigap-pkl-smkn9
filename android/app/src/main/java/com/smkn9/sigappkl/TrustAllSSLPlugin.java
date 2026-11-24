package com.smkn9.sigappkl;

import android.util.Log;
import com.getcapacitor.Plugin;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.InputStream;
import java.security.KeyStore;
import java.security.cert.Certificate;
import java.security.cert.CertificateFactory;
import java.security.cert.X509Certificate;
import javax.net.ssl.SSLContext;
import javax.net.ssl.TrustManager;
import javax.net.ssl.TrustManagerFactory;
import javax.net.ssl.X509TrustManager;
import javax.net.ssl.HttpsURLConnection;

/**
 * Plugin untuk mengkonfigurasi SSL trust sebelum Capacitor
 * menginisialisasi koneksi jaringan.
 */
@CapacitorPlugin(name = "TrustAllSSL")
public class TrustAllSSLPlugin extends Plugin {

    private static final String TAG = "TrustAllSSL";

    @Override
    public void load() {
        super.load();
        trustSigapServerCert();
    }

    private void trustSigapServerCert() {
        try {
            // Baca certificate yang di-embed di APK
            InputStream certStream = getContext().getResources().openRawResource(R.raw.sigap_server);

            CertificateFactory cf = CertificateFactory.getInstance("X.509");
            Certificate cert = cf.generateCertificate(certStream);
            certStream.close();

            // Buat KeyStore dengan certificate tersebut
            KeyStore keyStore = KeyStore.getInstance(KeyStore.getDefaultType());
            keyStore.load(null, null);
            keyStore.setCertificateEntry("sigap_server", cert);

            // Buat TrustManager yang trust certificate server
            TrustManagerFactory tmf = TrustManagerFactory.getInstance(TrustManagerFactory.getDefaultAlgorithm());
            tmf.init(keyStore);

            // Set sebagai default SSL context
            SSLContext sslContext = SSLContext.getInstance("TLS");
            sslContext.init(null, tmf.getTrustManagers(), null);
            HttpsURLConnection.setDefaultSSLSocketFactory(sslContext.getSocketFactory());

            Log.i(TAG, "SIGAP server certificate trusted successfully");

        } catch (Exception e) {
            Log.e(TAG, "Failed to trust SIGAP cert: " + e.getMessage());
            // Fallback: trust all
            trustAll();
        }
    }

    private void trustAll() {
        try {
            TrustManager[] trustAll = new TrustManager[]{
                new X509TrustManager() {
                    public X509Certificate[] getAcceptedIssuers() { return new X509Certificate[0]; }
                    public void checkClientTrusted(X509Certificate[] c, String a) {}
                    public void checkServerTrusted(X509Certificate[] c, String a) {}
                }
            };
            SSLContext sc = SSLContext.getInstance("SSL");
            sc.init(null, trustAll, new java.security.SecureRandom());
            HttpsURLConnection.setDefaultSSLSocketFactory(sc.getSocketFactory());
            HttpsURLConnection.setDefaultHostnameVerifier((h, s) -> true);
            Log.i(TAG, "TrustAll SSL fallback applied");
        } catch (Exception e) {
            Log.e(TAG, "TrustAll failed: " + e.getMessage());
        }
    }
}
