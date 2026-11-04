package expo.modules.overlayassistant

import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class OverlayAssistantModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("OverlayAssistant")

    Events("onOverlayListenRequested")

    OnCreate {
      OverlayAssistantModuleHolder.module = this@OverlayAssistantModule
    }

    OnDestroy {
      if (OverlayAssistantModuleHolder.module === this@OverlayAssistantModule) {
        OverlayAssistantModuleHolder.module = null
      }
    }

    AsyncFunction("canDrawOverlays") {
      val ctx = appContext.reactContext ?: return@AsyncFunction false
      Settings.canDrawOverlays(ctx)
    }

    AsyncFunction("openOverlaySettings") {
      val ctx = appContext.reactContext ?: return@AsyncFunction
      val intent = Intent(
        Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
        Uri.parse("package:${ctx.packageName}"),
      ).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      ctx.startActivity(intent)
    }

    AsyncFunction("startOverlay") { assistantName: String ->
      val ctx = appContext.reactContext ?: return@AsyncFunction
      val intent = Intent(ctx, OverlayAssistantService::class.java).apply {
        action = OverlayAssistantService.ACTION_START
        putExtra(OverlayAssistantService.EXTRA_ASSISTANT_NAME, assistantName)
      }
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        ctx.startForegroundService(intent)
      } else {
        ctx.startService(intent)
      }
    }

    AsyncFunction("stopOverlay") {
      val ctx = appContext.reactContext ?: return@AsyncFunction
      val intent = Intent(ctx, OverlayAssistantService::class.java).apply {
        action = OverlayAssistantService.ACTION_STOP
      }
      ctx.startService(intent)
    }
  }

  fun emitListenRequested() {
    sendEvent("onOverlayListenRequested", mapOf("ts" to System.currentTimeMillis()))
  }
}
