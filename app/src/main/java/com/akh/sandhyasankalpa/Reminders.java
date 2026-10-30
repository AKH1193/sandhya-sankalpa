package com.akh.sandhyasankalpa;

import android.app.AlarmManager;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;

import org.json.JSONArray;
import org.json.JSONObject;

/**
 * Schedules one alarm per Sandhya window start. The page computes the times
 * (next 30 days, current location) and hands them over as JSON:
 * [{"id":2000,"at":1761777000000,"session":"pratah","title":"...","body":"..."}]
 * The list is kept so alarms can be restored after a reboot or app update.
 */
final class Reminders {

    static final String CHANNEL = "sandhya_reminders";
    private static final String PREF = "reminders";
    private static final String KEY = "items";

    private Reminders() {
    }

    static void schedule(Context c, String json) {
        cancelAll(c, false);
        prefs(c).edit().putString(KEY, json).apply();
        arm(c, json);
    }

    static void restore(Context c) {
        String json = prefs(c).getString(KEY, null);
        if (json != null) arm(c, json);
    }

    static void cancelAll(Context c, boolean clearSaved) {
        String json = prefs(c).getString(KEY, null);
        if (json != null) {
            AlarmManager am = (AlarmManager) c.getSystemService(Context.ALARM_SERVICE);
            try {
                JSONArray a = new JSONArray(json);
                for (int i = 0; i < a.length(); i++) {
                    int id = a.getJSONObject(i).getInt("id");
                    PendingIntent pi = PendingIntent.getBroadcast(c, id, new Intent(c, ReminderReceiver.class),
                            PendingIntent.FLAG_NO_CREATE | PendingIntent.FLAG_IMMUTABLE);
                    if (pi != null) {
                        am.cancel(pi);
                        pi.cancel();
                    }
                }
            } catch (Exception ignored) {
            }
        }
        if (clearSaved) prefs(c).edit().remove(KEY).apply();
    }

    private static void arm(Context c, String json) {
        AlarmManager am = (AlarmManager) c.getSystemService(Context.ALARM_SERVICE);
        long now = System.currentTimeMillis();
        boolean exact = Build.VERSION.SDK_INT < 31 || am.canScheduleExactAlarms();
        try {
            JSONArray a = new JSONArray(json);
            for (int i = 0; i < a.length(); i++) {
                JSONObject o = a.getJSONObject(i);
                long at = o.getLong("at");
                if (at <= now) continue;
                int id = o.getInt("id");
                Intent it = new Intent(c, ReminderReceiver.class)
                        .putExtra("id", id)
                        .putExtra("title", o.optString("title"))
                        .putExtra("body", o.optString("body"))
                        .putExtra("session", o.optString("session"));
                PendingIntent pi = PendingIntent.getBroadcast(c, id, it,
                        PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
                if (exact) am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, pi);
                else am.setWindow(AlarmManager.RTC_WAKEUP, at, 5 * 60 * 1000L, pi);
            }
        } catch (Exception ignored) {
        }
    }

    static void ensureChannel(Context c) {
        NotificationManager nm = c.getSystemService(NotificationManager.class);
        if (nm.getNotificationChannel(CHANNEL) == null) {
            NotificationChannel ch = new NotificationChannel(CHANNEL,
                    c.getString(R.string.channel_name), NotificationManager.IMPORTANCE_HIGH);
            ch.setDescription(c.getString(R.string.channel_desc));
            nm.createNotificationChannel(ch);
        }
    }

    private static SharedPreferences prefs(Context c) {
        return c.getSharedPreferences(PREF, Context.MODE_PRIVATE);
    }
}
