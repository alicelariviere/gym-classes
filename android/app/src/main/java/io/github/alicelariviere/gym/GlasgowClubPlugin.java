package io.github.alicelariviere.gym;

import android.annotation.SuppressLint;
import android.graphics.Color;
import android.net.Uri;
import android.os.Handler;
import android.os.Looper;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.webkit.CookieManager;
import android.webkit.JavascriptInterface;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.TextView;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import org.json.JSONObject;

/**
 * Books Glasgow Club gym slots through Glasgow Club's own website, inside a
 * second web view that keeps Alice's Glasgow Club sign-in on her phone.
 *
 * The web app passes a booking script (served with the web app, so it can be
 * fixed without a new install). The script runs on Glasgow Club's page and
 * taps through the same steps a person would, reporting back via GymBridge.
 * The app never sees or stores the Glasgow Club password.
 */
@CapacitorPlugin(name = "GlasgowClub")
public class GlasgowClubPlugin extends Plugin {

    private static final String HOST = "glasgowclub.gladstonego.cloud";
    private static final long TIMEOUT_MS = 60_000;

    private final Handler main = new Handler(Looper.getMainLooper());
    private FrameLayout layer;
    private WebView site;
    private TextView banner;
    private PluginCall bookCall;
    private PluginCall siteCall;
    private String script;
    private String params;
    private boolean watching;
    private Runnable timeout;

    // ---- Methods the web app calls ----

    /** Book a slot. Options: url (calendar page), script (JS source), params (JSON string), watch (show the page). */
    @PluginMethod
    public void book(PluginCall call) {
        String url = call.getString("url");
        String js = call.getString("script");
        if (url == null || js == null || !Uri.parse(url).getHost().equals(HOST)) {
            call.reject("Missing or wrong url/script");
            return;
        }
        if (bookCall != null) {
            call.reject("Already booking");
            return;
        }
        bookCall = call;
        script = js;
        params = call.getString("params", "{}");
        watching = Boolean.TRUE.equals(call.getBoolean("watch", false));
        String title = call.getString("title", "Working on it…");
        main.post(() -> {
            ensureSite();
            setBanner(title, false);
            if (watching) show(); else hide();
            site.loadUrl(url);
            timeout = () -> finish(error("timeout", "Glasgow Club took too long to respond."));
            main.postDelayed(timeout, TIMEOUT_MS);
        });
    }

    /** Show Glasgow Club's site (to sign in, cancel, or see where a job stopped). Resolves when she taps Done. */
    @PluginMethod
    public void showSite(PluginCall call) {
        siteCall = call;
        String url = call.getString("url");
        String title = call.getString("title", "Glasgow Club");
        main.post(() -> {
            boolean fresh = site == null;
            ensureSite();
            setBanner(title, true);
            show();
            if (url != null) site.loadUrl(url);
            else if (fresh) site.loadUrl("https://" + HOST + "/");
        });
    }

    // ---- The Glasgow Club web view ----

    @SuppressLint({"SetJavaScriptEnabled", "AddJavascriptInterface"})
    private void ensureSite() {
        if (site != null) return;
        ViewGroup root = getActivity().findViewById(android.R.id.content);

        layer = new FrameLayout(getContext());
        layer.setBackgroundColor(Color.WHITE);

        site = new WebView(getContext());
        WebSettings s = site.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        CookieManager.getInstance().setAcceptCookie(true);
        CookieManager.getInstance().setAcceptThirdPartyCookies(site, true);
        site.setWebChromeClient(new WebChromeClient());
        site.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                return false; // Sign-in may hop to other domains; keep it all in here.
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                CookieManager.getInstance().flush();
                if (bookCall != null && url != null && HOST.equals(Uri.parse(url).getHost())) {
                    view.evaluateJavascript("(" + script + ")(" + params + ");", null);
                }
            }
        });
        site.addJavascriptInterface(new Bridge(), "GymBridge");

        LinearLayout column = new LinearLayout(getContext());
        column.setOrientation(LinearLayout.VERTICAL);

        LinearLayout bar = new LinearLayout(getContext());
        bar.setOrientation(LinearLayout.HORIZONTAL);
        bar.setGravity(Gravity.CENTER_VERTICAL);
        bar.setBackgroundColor(Color.parseColor("#111111"));
        int pad = dp(14);
        bar.setPadding(pad, dp(36), dp(8), dp(10));

        banner = new TextView(getContext());
        banner.setTextColor(Color.WHITE);
        banner.setTextSize(15);
        bar.addView(banner, new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1));

        Button done = new Button(getContext());
        done.setText("Done");
        done.setAllCaps(false);
        done.setOnClickListener(v -> onDone());
        bar.addView(done);

        column.addView(bar, new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT));
        column.addView(site, new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, 0, 1));
        layer.addView(column, new FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));

        // Sits under the app until it's needed, so the page still runs normally.
        root.addView(layer, 0, new FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
    }

    private void show() {
        layer.bringToFront();
        layer.setVisibility(View.VISIBLE);
    }

    private void hide() {
        ViewGroup root = (ViewGroup) layer.getParent();
        if (root != null && root.indexOfChild(layer) != 0) {
            root.removeView(layer);
            root.addView(layer, 0);
        }
    }

    private void setBanner(String text, boolean showDone) {
        banner.setText(text);
        View done = ((ViewGroup) banner.getParent()).getChildAt(1);
        done.setVisibility(showDone ? View.VISIBLE : View.GONE);
    }

    private void onDone() {
        hide();
        if (siteCall != null) {
            siteCall.resolve(new JSObject());
            siteCall = null;
        }
        if (bookCall != null) finish(error("cancelled", "Stopped."));
    }

    // ---- Messages from the booking script ----

    private class Bridge {
        @JavascriptInterface
        public void post(String json) {
            main.post(() -> {
                if (site == null || site.getUrl() == null || !HOST.equals(Uri.parse(site.getUrl()).getHost())) return;
                try {
                    JSObject data = JSObject.fromJSONObject(new JSONObject(json));
                    notifyListeners("progress", data);
                    if (data.optBoolean("done", false)) finish(data);
                } catch (Exception e) {
                    finish(error("bad-message", e.getMessage()));
                }
            });
        }
    }

    private void finish(JSObject result) {
        if (timeout != null) main.removeCallbacks(timeout);
        timeout = null;
        if (bookCall == null) return;
        PluginCall call = bookCall;
        bookCall = null;
        if (!watching) hide();
        else setBanner("Finished. Tap Done to close.", true);
        call.resolve(result);
    }

    private JSObject error(String reason, String message) {
        JSObject o = new JSObject();
        o.put("done", true);
        o.put("ok", false);
        o.put("reason", reason);
        o.put("message", message);
        return o;
    }

    private int dp(int v) {
        return Math.round(v * getContext().getResources().getDisplayMetrics().density);
    }
}
