const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const PACKAGE_NAME = 'com.lunchdrop.mobile';

const moduleSource = `package ${PACKAGE_NAME}

import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class LunchDropSplashModule(
  reactContext: ReactApplicationContext
) : ReactContextBaseJavaModule(reactContext) {
  override fun getName(): String = "LunchDropSplash"

  @ReactMethod
  fun hide() {
    MainActivity.hideNativeAnimatedSplash()
  }
}
`;

const packageSource = `package ${PACKAGE_NAME}

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager

class LunchDropSplashPackage : ReactPackage {
  override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> =
    listOf(LunchDropSplashModule(reactContext))

  override fun createViewManagers(
    reactContext: ReactApplicationContext
  ): List<ViewManager<*, *>> = emptyList()
}
`;

function writeNativeModule(androidRoot) {
  const packageDir = path.join(
    androidRoot,
    'app/src/main/java',
    ...PACKAGE_NAME.split('.')
  );
  fs.mkdirSync(packageDir, { recursive: true });
  fs.writeFileSync(path.join(packageDir, 'LunchDropSplashModule.kt'), moduleSource);
  fs.writeFileSync(path.join(packageDir, 'LunchDropSplashPackage.kt'), packageSource);
}

function patchMainApplication(androidRoot) {
  const file = path.join(
    androidRoot,
    'app/src/main/java',
    ...PACKAGE_NAME.split('.'),
    'MainApplication.kt'
  );
  let source = fs.readFileSync(file, 'utf8');
  if (source.includes('add(LunchDropSplashPackage())')) return;

  source = source.replace(
    '// add(MyReactNativePackage())',
    'add(LunchDropSplashPackage())'
  );
  fs.writeFileSync(file, source);
}

function patchMainActivity(androidRoot) {
  const file = path.join(
    androidRoot,
    'app/src/main/java',
    ...PACKAGE_NAME.split('.'),
    'MainActivity.kt'
  );
  let source = fs.readFileSync(file, 'utf8');
  if (source.includes('hideNativeAnimatedSplash')) return;

  source = source.replace(
    'import android.os.Build\nimport android.os.Bundle',
    `import android.animation.Animator
import android.animation.AnimatorListenerAdapter
import android.animation.ObjectAnimator
import android.os.Build
import android.os.Bundle
import android.view.Gravity
import android.view.View
import android.view.ViewGroup
import android.view.animation.AccelerateDecelerateInterpolator
import android.widget.FrameLayout
import android.widget.ImageView`
  );

  source = source.replace(
    'class MainActivity : ReactActivity() {',
    `class MainActivity : ReactActivity() {
  companion object {
    private var currentActivity: MainActivity? = null

    fun hideNativeAnimatedSplash() {
      currentActivity?.runOnUiThread {
        currentActivity?.hideAnimatedSplash()
      }
    }
  }

  private var animatedSplashView: View? = null
  private var splashPulseAnimatorX: ObjectAnimator? = null
  private var splashPulseAnimatorY: ObjectAnimator? = null`
  );

  source = source.replace(
    'super.onCreate(null)',
    `super.onCreate(null)
    currentActivity = this
    showAnimatedSplash()`
  );

  source = source.replace(
    '\n  /**\n   * Returns the name of the main component',
    `
  override fun onDestroy() {
    if (currentActivity === this) {
      currentActivity = null
    }
    splashPulseAnimatorX?.cancel()
    splashPulseAnimatorY?.cancel()
    super.onDestroy()
  }

  private fun showAnimatedSplash() {
    if (animatedSplashView != null) return

    val root = window.decorView as? ViewGroup ?: return
    val overlay = FrameLayout(this).apply {
      setBackgroundColor(android.graphics.Color.WHITE)
      alpha = 1f
      isClickable = true
      isFocusable = true
      layoutParams = FrameLayout.LayoutParams(
        FrameLayout.LayoutParams.MATCH_PARENT,
        FrameLayout.LayoutParams.MATCH_PARENT
      )
    }
    val logo = ImageView(this).apply {
      setImageResource(R.drawable.splashscreen_logo)
      scaleType = ImageView.ScaleType.FIT_CENTER
      alpha = 1f
      scaleX = 1f
      scaleY = 1f
      translationY = 0f
      layoutParams = FrameLayout.LayoutParams(dp(288), dp(288), Gravity.CENTER)
    }

    overlay.addView(logo)
    root.addView(overlay)
    animatedSplashView = overlay

    overlay.postDelayed({
      logo.animate()
        .scaleX(1.04f)
        .scaleY(1.04f)
        .translationY(-dp(4).toFloat())
        .setDuration(460)
        .setInterpolator(AccelerateDecelerateInterpolator())
        .withEndAction {
          logo.animate()
            .scaleX(1f)
            .scaleY(1f)
            .translationY(0f)
            .setDuration(260)
            .setInterpolator(AccelerateDecelerateInterpolator())
            .withEndAction {
              startSplashPulse(logo)
            }
            .start()
        }
        .start()
    }, 80)
  }

  private fun startSplashPulse(logo: View) {
    splashPulseAnimatorX = ObjectAnimator.ofFloat(logo, View.SCALE_X, 1f, 1.035f, 1f).apply {
      duration = 1400
      repeatCount = ObjectAnimator.INFINITE
      interpolator = AccelerateDecelerateInterpolator()
      start()
    }
    splashPulseAnimatorY = ObjectAnimator.ofFloat(logo, View.SCALE_Y, 1f, 1.035f, 1f).apply {
      duration = 1400
      repeatCount = ObjectAnimator.INFINITE
      interpolator = AccelerateDecelerateInterpolator()
      start()
    }
  }

  private fun hideAnimatedSplash() {
    val overlay = animatedSplashView ?: return
    animatedSplashView = null
    splashPulseAnimatorX?.cancel()
    splashPulseAnimatorY?.cancel()

    overlay.animate()
      .alpha(0f)
      .setDuration(240)
      .setListener(object : AnimatorListenerAdapter() {
        override fun onAnimationEnd(animation: Animator) {
          (overlay.parent as? ViewGroup)?.removeView(overlay)
        }
      })
      .start()
  }

  private fun dp(value: Int): Int =
    (value * resources.displayMetrics.density).toInt()

  /**
   * Returns the name of the main component`
  );

  fs.writeFileSync(file, source);
}

const withNativeAnimatedSplash = (config) =>
  withDangerousMod(config, [
    'android',
    (mod) => {
      writeNativeModule(mod.modRequest.platformProjectRoot);
      patchMainApplication(mod.modRequest.platformProjectRoot);
      patchMainActivity(mod.modRequest.platformProjectRoot);
      return mod;
    },
  ]);

module.exports = withNativeAnimatedSplash;
