package br.com.hortasurbanas.app;

import android.os.Handler;
import android.os.Looper;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebView;
import com.getcapacitor.Bridge;
import com.getcapacitor.BridgeWebViewClient;

// Sem Internet, o WebView primeiro tenta a rede, avisa erro na página principal
// (ERR_NAME_NOT_RESOLVED) e, em seguida, carrega o app do cache do service worker
// (medido: 28 ms depois). O BridgeWebViewClient trocava na hora pela erro.html, e o
// app nunca abria offline. Aqui a troca só acontece se, passado um tempo, o app de
// fato não apareceu (primeiro uso sem Internet ou cache apagado).
class ClienteWebView extends BridgeWebViewClient {

    private static final long ESPERA_CACHE_MS = 2000;

    private final Bridge bridge;
    private final Handler principal = new Handler(Looper.getMainLooper());

    ClienteWebView(Bridge bridge) {
        super(bridge);
        this.bridge = bridge;
    }

    @Override
    public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
        String paginaDeErro = bridge.getErrorUrl();
        if (!request.isForMainFrame() || paginaDeErro == null) {
            super.onReceivedError(view, request, error);
            return;
        }
        principal.removeCallbacksAndMessages(null);
        principal.postDelayed(
            () ->
                // O index.html do app tem #root; a página de erro do Chromium, não.
                view.evaluateJavascript("document.getElementById('root') !== null", (apareceu) -> {
                    if (!"true".equals(apareceu)) view.loadUrl(paginaDeErro);
                }),
            ESPERA_CACHE_MS
        );
    }
}
