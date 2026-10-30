package com.akh.sandhyasankalpa;

import android.Manifest;
import android.app.Activity;
import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.content.res.Configuration;
import android.graphics.Color;
import android.location.Location;
import android.location.LocationManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.provider.CalendarContract;
import android.view.View;
import android.view.Window;
import android.view.WindowInsets;
import android.view.WindowInsetsController;
import android.webkit.JavascriptInterface;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import android.widget.Toast;

/**
 * Hosts the Sandhya Sankalpa page (assets/index.html) in a WebView and exposes a small
 * native bridge ("Android") for clipboard, share sheet, calendar insert, location,
 * reminders and system-bar theming.
 */
public class MainActivity extends Activity {

    private static final int REQ_LOCATION = 101;
    private static final int REQ_NOTIFY = 102;
    private static final int LEGACY_LAYOUT_FLAGS = View.SYSTEM_UI_FLAG_LAYOUT_STABLE
            | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
            | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION;

    private FrameLayout root;
    private WebView web;
    private boolean pageReady = false;
    private String pendingSession = null;
    private String pendingReminders = null;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Draw edge to edge and pad the content by the system bar insets ourselves
        Window window = getWindow();
        if (Build.VERSION.SDK_INT >= 30) {
            window.setDecorFitsSystemWindows(false);
        } else {
            window.getDecorView().setSystemUiVisibility(LEGACY_LAYOUT_FLAGS);
        }
        window.setStatusBarColor(Color.TRANSPARENT);
        window.setNavigationBarColor(Color.TRANSPARENT);

        root = new FrameLayout(this);
        web = new WebView(this);
        root.addView(web, new FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.MATCH_PARENT));
        setContentView(root);

        root.setOnApplyWindowInsetsListener((v, insets) -> {
            int l, t, r, b;
            if (Build.VERSION.SDK_INT >= 30) {
                android.graphics.Insets i = insets.getInsets(
                        WindowInsets.Type.systemBars() | WindowInsets.Type.displayCutout());
                l = i.left; t = i.top; r = i.right; b = i.bottom;
            } else {
                l = insets.getSystemWindowInsetLeft();
                t = insets.getSystemWindowInsetTop();
                r = insets.getSystemWindowInsetRight();
                b = insets.getSystemWindowInsetBottom();
            }
            v.setPadding(l, t, r, b);
            return insets;
        });

        boolean nightMode = (getResources().getConfiguration().uiMode
                & Configuration.UI_MODE_NIGHT_MASK) == Configuration.UI_MODE_NIGHT_YES;
        applyBars(nightMode);

        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setAllowFileAccess(true);
        // Lets the devotional drone start as soon as the app opens
        s.setMediaPlaybackRequiresUserGesture(false);
        web.setBackgroundColor(Color.TRANSPARENT);
        web.addJavascriptInterface(new Bridge(), "Android");
        web.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri u = request.getUrl();
                if ("file".equals(u.getScheme())) return false;
                try {
                    startActivity(new Intent(Intent.ACTION_VIEW, u));
                } catch (Exception ignored) {
                }
                return true;
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                pageReady = true;
                if (pendingSession != null) {
                    openSession(pendingSession);
                    pendingSession = null;
                }
            }
        });
        web.loadUrl("file:///android_asset/index.html");
        handleIntent(getIntent());
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        handleIntent(intent);
    }

    /** A tapped reminder notification opens the matching Sandhya's sankalpa. */
    private void handleIntent(Intent intent) {
        if (intent == null) return;
        String session = intent.getStringExtra("session");
        if (session == null) return;
        if (pageReady) openSession(session);
        else pendingSession = session;
    }

    private void openSession(String session) {
        String safe = session.replaceAll("[^a-z]", "");
        web.evaluateJavascript("window.openSession && window.openSession('" + safe + "')", null);
    }

    @Override
    protected void onPause() {
        web.onPause();   // fires visibilitychange, which pauses the drone
        super.onPause();
    }

    @Override
    protected void onResume() {
        super.onResume();
        web.onResume();
    }

    @Override
    protected void onDestroy() {
        if (web != null) web.destroy();
        super.onDestroy();
    }

    @Override
    @SuppressWarnings("deprecation")
    public void onBackPressed() {
        if (web.canGoBack()) web.goBack();
        else super.onBackPressed();
    }

    /** Matches the window and status/navigation bar icons to the page theme. */
    @SuppressWarnings("deprecation")
    private void applyBars(boolean dark) {
        int bg = dark ? Color.parseColor("#020617") : Color.parseColor("#FAFAF9");
        root.setBackgroundColor(bg);
        getWindow().getDecorView().setBackgroundColor(bg);
        if (Build.VERSION.SDK_INT >= 30) {
            WindowInsetsController c = getWindow().getInsetsController();
            if (c != null) {
                int mask = WindowInsetsController.APPEARANCE_LIGHT_STATUS_BARS
                        | WindowInsetsController.APPEARANCE_LIGHT_NAVIGATION_BARS;
                c.setSystemBarsAppearance(dark ? 0 : mask, mask);
            }
        } else {
            int flags = LEGACY_LAYOUT_FLAGS;
            if (!dark) flags |= View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR | View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR;
            getWindow().getDecorView().setSystemUiVisibility(flags);
        }
    }

    /* ----------------------------- Location ----------------------------- */

    @SuppressWarnings("MissingPermission")
    private void fetchLocation() {
        final LocationManager lm = (LocationManager) getSystemService(LOCATION_SERVICE);
        final String provider;
        if (lm.isProviderEnabled(LocationManager.NETWORK_PROVIDER)) provider = LocationManager.NETWORK_PROVIDER;
        else if (lm.isProviderEnabled(LocationManager.GPS_PROVIDER)) provider = LocationManager.GPS_PROVIDER;
        else provider = null;
        if (provider == null) {
            sendLocation(lastKnown(lm));
            return;
        }
        try {
            if (Build.VERSION.SDK_INT >= 30) {
                lm.getCurrentLocation(provider, null, getMainExecutor(), loc ->
                        sendLocation(loc != null ? loc : lastKnown(lm)));
            } else {
                sendLocation(lastKnown(lm));
            }
        } catch (Exception e) {
            sendLocation(null);
        }
    }

    @SuppressWarnings("MissingPermission")
    private Location lastKnown(LocationManager lm) {
        try {
            Location n = lm.getLastKnownLocation(LocationManager.NETWORK_PROVIDER);
            if (n != null) return n;
            return lm.getLastKnownLocation(LocationManager.GPS_PROVIDER);
        } catch (Exception e) {
            return null;
        }
    }

    private void sendLocation(Location loc) {
        if (loc == null) {
            web.evaluateJavascript("window.onNativeLocationError && window.onNativeLocationError()", null);
            return;
        }
        web.evaluateJavascript("window.onNativeLocation && window.onNativeLocation("
                + loc.getLatitude() + "," + loc.getLongitude() + ")", null);
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] results) {
        super.onRequestPermissionsResult(requestCode, permissions, results);
        boolean granted = results.length > 0 && results[0] == PackageManager.PERMISSION_GRANTED;
        if (requestCode == REQ_LOCATION) {
            if (granted) fetchLocation();
            else sendLocation(null);
        } else if (requestCode == REQ_NOTIFY && pendingReminders != null) {
            Reminders.schedule(this, pendingReminders);
            pendingReminders = null;
        }
    }

    /* ------------------------------ Bridge ------------------------------ */

    private class Bridge {

        @JavascriptInterface
        public void copy(String text) {
            runOnUiThread(() -> {
                ClipboardManager cm = (ClipboardManager) getSystemService(CLIPBOARD_SERVICE);
                cm.setPrimaryClip(ClipData.newPlainText("Sankalpa", text));
            });
        }

        @JavascriptInterface
        public void share(String title, String text) {
            runOnUiThread(() -> {
                Intent i = new Intent(Intent.ACTION_SEND)
                        .setType("text/plain")
                        .putExtra(Intent.EXTRA_SUBJECT, title)
                        .putExtra(Intent.EXTRA_TEXT, text);
                startActivity(Intent.createChooser(i, title));
            });
        }

        /** Opens the phone's calendar app with the event pre-filled (Samsung, Google, etc.). */
        @JavascriptInterface
        public void addEvent(String title, String description, String startMs, String endMs, String location) {
            runOnUiThread(() -> {
                try {
                    Intent i = new Intent(Intent.ACTION_INSERT)
                            .setData(CalendarContract.Events.CONTENT_URI)
                            .putExtra(CalendarContract.EXTRA_EVENT_BEGIN_TIME, Long.parseLong(startMs))
                            .putExtra(CalendarContract.EXTRA_EVENT_END_TIME, Long.parseLong(endMs))
                            .putExtra(CalendarContract.Events.TITLE, title)
                            .putExtra(CalendarContract.Events.DESCRIPTION, description)
                            .putExtra(CalendarContract.Events.EVENT_LOCATION, location);
                    startActivity(i);
                } catch (Exception e) {
                    Toast.makeText(MainActivity.this, "No calendar app found", Toast.LENGTH_SHORT).show();
                }
            });
        }

        @JavascriptInterface
        public void requestLocation() {
            runOnUiThread(() -> {
                if (checkSelfPermission(Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED) {
                    fetchLocation();
                } else {
                    requestPermissions(new String[]{Manifest.permission.ACCESS_COARSE_LOCATION}, REQ_LOCATION);
                }
            });
        }

        @JavascriptInterface
        public void scheduleReminders(String json) {
            runOnUiThread(() -> {
                if (Build.VERSION.SDK_INT >= 33
                        && checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
                    pendingReminders = json;
                    requestPermissions(new String[]{Manifest.permission.POST_NOTIFICATIONS}, REQ_NOTIFY);
                } else {
                    Reminders.schedule(MainActivity.this, json);
                }
            });
        }

        @JavascriptInterface
        public void cancelReminders() {
            runOnUiThread(() -> Reminders.cancelAll(MainActivity.this, true));
        }

        @JavascriptInterface
        public void setSystemBars(boolean dark) {
            runOnUiThread(() -> applyBars(dark));
        }
    }
}
