package br.com.hortasurbanas.app;

import android.content.Context;
import android.content.Intent;
import android.net.ConnectivityManager;
import android.net.Network;
import android.net.NetworkCapabilities;
import android.net.NetworkRequest;
import android.os.Build;
import android.os.SystemClock;
import android.provider.Settings;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

// Cada requisição sai por Network.openConnection, e não por bindProcessToNetwork:
// o WebView carrega o site pela Internet e não pode ficar preso à rede da horta,
// que não tem Internet. A doc do ConnectivityManager também prefere o socket por rede.
@CapacitorPlugin(name = "Coordenador")
public class CoordenadorPlugin extends Plugin {

    private static final int ESPERA_REDE_MS = 10_000;
    private static final int ESPERA_CONEXAO_MS = 5_000;
    private static final int ESPERA_LEITURA_MS = 15_000;

    // O coordenador atende uma requisição por vez. A fila própria também evita
    // ocupar a thread que o Capacitor divide entre todos os plugins.
    private final ExecutorService fila = Executors.newSingleThreadExecutor();

    private ConnectivityManager conectividade;
    private ConnectivityManager.NetworkCallback pedidoAtual;
    private volatile Network rede;

    @Override
    public void load() {
        conectividade = (ConnectivityManager) getContext().getSystemService(Context.CONNECTIVITY_SERVICE);
    }

    @PluginMethod
    public void conectar(PluginCall call) {
        if (rede != null) {
            call.resolve();
            return;
        }
        liberarRede();

        // Sem exigir Internet: o Wi-Fi da horta não tem.
        NetworkRequest pedido = new NetworkRequest.Builder()
            .addTransportType(NetworkCapabilities.TRANSPORT_WIFI)
            .removeCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
            .build();

        ConnectivityManager.NetworkCallback callback = new ConnectivityManager.NetworkCallback() {
            private boolean respondido;

            @Override
            public void onAvailable(Network network) {
                rede = network;
                if (!respondido) {
                    respondido = true;
                    call.resolve();
                } else {
                    // O pedido continua ativo: trocar de Wi-Fi (de casa para o da horta) chega aqui.
                    notifyListeners("redeDisponivel", new JSObject());
                }
            }

            @Override
            public void onUnavailable() {
                if (!respondido) {
                    respondido = true;
                    call.reject("Sem Wi-Fi", "SEM_WIFI");
                }
            }

            @Override
            public void onLost(Network network) {
                if (network.equals(rede)) {
                    rede = null;
                    notifyListeners("redePerdida", new JSObject());
                }
            }
        };
        pedidoAtual = callback;
        conectividade.requestNetwork(pedido, callback, ESPERA_REDE_MS);
    }

    @PluginMethod
    public void desconectar(PluginCall call) {
        liberarRede();
        call.resolve();
    }

    @PluginMethod
    public void requisitar(PluginCall call) {
        String url = call.getString("url");
        String metodo = call.getString("metodo", "GET");
        String corpo = call.getString("corpo");
        Network alvo = rede;
        if (url == null) {
            call.reject("url ausente");
            return;
        }
        if (alvo == null) {
            call.reject("Sem a rede da horta", "SEM_REDE");
            return;
        }

        fila.execute(() -> {
            long inicio = SystemClock.elapsedRealtime();
            HttpURLConnection conexao = null;
            try {
                conexao = (HttpURLConnection) alvo.openConnection(new URL(url));
                conexao.setConnectTimeout(ESPERA_CONEXAO_MS);
                conexao.setReadTimeout(ESPERA_LEITURA_MS);
                conexao.setRequestMethod(metodo);
                conexao.setRequestProperty("Accept", "application/json");
                if (corpo != null) {
                    byte[] bytes = corpo.getBytes(StandardCharsets.UTF_8);
                    conexao.setDoOutput(true);
                    conexao.setRequestProperty("Content-Type", "application/json; charset=utf-8");
                    conexao.setFixedLengthStreamingMode(bytes.length);
                    try (OutputStream saida = conexao.getOutputStream()) {
                        saida.write(bytes);
                    }
                }
                int status = conexao.getResponseCode();
                String texto = ler(status >= 400 ? conexao.getErrorStream() : conexao.getInputStream());

                JSObject resposta = new JSObject();
                resposta.put("status", status);
                resposta.put("corpo", texto);
                resposta.put("duracaoMs", SystemClock.elapsedRealtime() - inicio);
                call.resolve(resposta);
            } catch (IOException | RuntimeException e) {
                JSObject dados = new JSObject();
                dados.put("duracaoMs", SystemClock.elapsedRealtime() - inicio);
                call.reject("Sem resposta do coordenador", "SEM_RESPOSTA", e, dados);
            } finally {
                if (conexao != null) conexao.disconnect();
            }
        });
    }

    @PluginMethod
    public void abrirConfiguracoesWifi(PluginCall call) {
        String acao = Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q ? Settings.Panel.ACTION_WIFI : Settings.ACTION_WIFI_SETTINGS;
        getActivity().startActivity(new Intent(acao));
        call.resolve();
    }

    @Override
    protected void handleOnDestroy() {
        liberarRede();
        fila.shutdownNow();
    }

    private void liberarRede() {
        rede = null;
        if (pedidoAtual == null) return;
        try {
            conectividade.unregisterNetworkCallback(pedidoAtual);
        } catch (IllegalArgumentException ignorado) {
            // O pedido já tinha expirado e foi liberado pelo próprio sistema.
        }
        pedidoAtual = null;
    }

    private static String ler(InputStream entrada) throws IOException {
        if (entrada == null) return "";
        try (InputStream in = entrada; ByteArrayOutputStream bytes = new ByteArrayOutputStream()) {
            byte[] bloco = new byte[8192];
            int lidos;
            while ((lidos = in.read(bloco)) != -1) bytes.write(bloco, 0, lidos);
            return bytes.toString("UTF-8");
        }
    }
}
