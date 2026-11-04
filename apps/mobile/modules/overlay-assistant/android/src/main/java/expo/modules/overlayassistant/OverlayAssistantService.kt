package expo.modules.overlayassistant

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.graphics.PixelFormat
import android.os.Build
import android.os.IBinder
import android.provider.Settings
import android.view.Gravity
import android.view.MotionEvent
import android.view.View
import android.view.WindowManager
import android.widget.FrameLayout
import android.widget.TextView
import androidx.core.app.NotificationCompat

/**
 * Foreground service + draggable system overlay bubble (native shell).
 * 3D avatar renders in the in-app bubble; native bubble is the Play-safe v1 anchor.
 */
class OverlayAssistantService : Service() {
  companion object {
    const val ACTION_START = "expo.overlay.START"
    const val ACTION_STOP = "expo.overlay.STOP"
    const val EXTRA_ASSISTANT_NAME = "assistantName"
    private const val CHANNEL_ID = "overlay_assistant"
    private const val NOTIFICATION_ID = 4108
  }

  private var windowManager: WindowManager? = null
  private var overlayView: View? = null
  private var assistantName: String = "Assistant"

  override fun onBind(intent: Intent?): IBinder? = null

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    when (intent?.action) {
      ACTION_STOP -> {
        removeOverlay()
        stopForeground(STOP_FOREGROUND_REMOVE)
        stopSelf()
        return START_NOT_STICKY
      }
      ACTION_START -> {
        assistantName = intent.getStringExtra(EXTRA_ASSISTANT_NAME) ?: "Assistant"
        startForeground(NOTIFICATION_ID, buildNotification())
        showOverlay()
        return START_STICKY
      }
    }
    return START_NOT_STICKY
  }

  private fun buildNotification(): Notification {
    val nm = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      val channel = NotificationChannel(
        CHANNEL_ID,
        "Assistant on screen",
        NotificationManager.IMPORTANCE_LOW,
      )
      channel.description = "Shows the Personal AI overlay bubble while enabled."
      nm.createNotificationChannel(channel)
    }
    val launch = packageManager.getLaunchIntentForPackage(packageName)
    val pending = PendingIntent.getActivity(
      this,
      0,
      launch,
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
    )
    return NotificationCompat.Builder(this, CHANNEL_ID)
      .setContentTitle("Personal AI on screen")
      .setContentText("Tap the bubble to listen · $assistantName")
      .setSmallIcon(android.R.drawable.ic_btn_speak_now)
      .setContentIntent(pending)
      .setOngoing(true)
      .build()
  }

  private fun showOverlay() {
    if (overlayView != null) return
    if (!Settings.canDrawOverlays(this)) return

    windowManager = getSystemService(WINDOW_SERVICE) as WindowManager
    val params = WindowManager.LayoutParams(
      WindowManager.LayoutParams.WRAP_CONTENT,
      WindowManager.LayoutParams.WRAP_CONTENT,
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
      } else {
        @Suppress("DEPRECATION")
        WindowManager.LayoutParams.TYPE_PHONE
      },
      WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN,
      PixelFormat.TRANSLUCENT,
    )
    params.gravity = Gravity.TOP or Gravity.START
    params.x = 48
    params.y = 200

    val bubble = FrameLayout(this).apply {
      setBackgroundColor(0xCC2563EB.toInt())
      alpha = 0.95f
      val label = TextView(context).apply {
        text = assistantName.take(1).uppercase()
        setTextColor(0xFFFFFFFF.toInt())
        textSize = 18f
        setPadding(28, 28, 28, 28)
      }
      addView(label)
      setOnClickListener {
        OverlayAssistantModuleHolder.emitListen()
      }
    }

    var initialX = 0
    var initialY = 0
    var touchX = 0f
    var touchY = 0f
    bubble.setOnTouchListener { _, event ->
      when (event.action) {
        MotionEvent.ACTION_DOWN -> {
          initialX = params.x
          initialY = params.y
          touchX = event.rawX
          touchY = event.rawY
          false
        }
        MotionEvent.ACTION_MOVE -> {
          params.x = initialX + (event.rawX - touchX).toInt()
          params.y = initialY + (event.rawY - touchY).toInt()
          windowManager?.updateViewLayout(bubble, params)
          true
        }
        else -> false
      }
    }

    overlayView = bubble
    windowManager?.addView(bubble, params)
  }

  private fun removeOverlay() {
    overlayView?.let { view ->
      windowManager?.removeView(view)
    }
    overlayView = null
  }

  override fun onDestroy() {
    removeOverlay()
    super.onDestroy()
  }
}

/** Bridge for service → Expo module events without tight coupling. */
object OverlayAssistantModuleHolder {
  var module: OverlayAssistantModule? = null
  fun emitListen() {
    module?.emitListenRequested()
  }
}
