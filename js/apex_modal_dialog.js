/* ============================================================
   ORACLE APEX — Premium Modal Dialog JS  (v2 — optimised)
   File    : apex_modal_dialog.js
   Upload  : Shared Components → Static Application Files
   Include : App → User Interface → JavaScript → File URLs
             #APP_FILES#apex_modal_dialog.js

   KEY DECISIONS:
   ─────────────────────────────────────────────────────────
   1. NEVER call preventDefault() on "dialogbeforeclose".
      Doing so corrupts APEX's internal dialog state and
      causes the overlay to freeze permanently.

   2. will-change is managed dynamically:
      • Added just before the dialog opens (so the browser
        promotes the layer before the first animation frame).
      • Removed via .apx-settled after the enter animation
        ends (frees the GPU compositing layer).

   3. The inner-element stagger uses a single requestAnimationFrame
      pass that writes CSS custom-property delays — one reflow,
      zero per-element timers.

   4. The Escape-key safety net is throttled with a single
      setTimeout per keydown, not re-bound on every keydown.

   5. Overlay cleanup timeout is 320 ms — always outlasts APEX's
      own 200 ms cleanup window to avoid race conditions.
   ============================================================ */

(function ($) {
  "use strict";

  /* ── Constants ──────────────────────────────────────────── */
  var DUR_IN_MS   = 340;   /* must match --apx-dur-in  (0.34s) */
  var DUR_OUT_MS  = 180;   /* must match --apx-dur-out (0.18s) */
  var STAGGER_MS  = 38;    /* per-element stagger step          */

  /* ── Escape-key throttle flag ───────────────────────────── */
  var escThrottle = false;

  $(function () {

    /* ───────────────────────────────────────────────────────
       1. BEFORE OPEN — promote the compositing layer early.
          jQuery UI fires "dialogcreate" before "dialogopen";
          we hook both so we never miss the window.
    ─────────────────────────────────────────────────────────*/
    $(document).on("dialogcreate dialogopen", ".ui-dialog", function () {
      /* Promote to GPU layer before the first animation frame */
      $(this).css("will-change", "transform, opacity");
    });


    /* ───────────────────────────────────────────────────────
       2. OPEN — play enter animation + stagger inner elements
    ─────────────────────────────────────────────────────────*/
    $(document).on("dialogopen", ".ui-dialog", function () {
      var $dialog = $(this);

      /* Remove any leftover closing class from a rapid re-open */
      $dialog.removeClass("apx-closing apx-settled");

      /*
        Force a reflow so the browser re-starts the @keyframes
        from frame 0.  offsetHeight read is intentional here —
        do not remove it.
      */
      void $dialog[0].offsetHeight;

      /*
        After the enter animation finishes, drop the compositing
        hint so the GPU layer is released.  The .apx-settled
        class also stops the ::after shimmer pseudo-element from
        consuming a compositor layer indefinitely.
      */
      setTimeout(function () {
        $dialog.addClass("apx-settled");
        $dialog.css("will-change", "auto");
      }, DUR_IN_MS + 50);

      /*
        Stagger inner form elements using CSS custom property
        delays — a single RAF pass writes all delay values and
        the browser applies them without JS involvement per frame.
      */
      requestAnimationFrame(function () {
        $dialog
          .find(".t-Form-fieldContainer, .t-Region, .t-ButtonRegion")
          .each(function (i) {
            var $el = $(this);
            var delay = (80 + i * STAGGER_MS) + "ms";

            $el.css({
              opacity   : 0,
              transform : "translateY(10px)",
              transition: "none"
            });

            /* Tiny delay so "transition: none" is committed first */
            requestAnimationFrame(function () {
              $el.css({
                transition: [
                  "opacity 0.26s ease " + delay,
                  "transform 0.26s cubic-bezier(0.22,1,0.36,1) " + delay
                ].join(", "),
                opacity   : 1,
                transform : "translateY(0)"
              });
            });
          });
      });
    });


    /* ───────────────────────────────────────────────────────
       3. BEFORE CLOSE — play exit animation concurrently.
          APEX closes the dialog normally; the 180 ms CSS
          animation runs in parallel and feels intentional.

          ⚠️  Do NOT call preventDefault() or return false.
              That corrupts APEX's dialog state and freezes
              the overlay permanently.
    ─────────────────────────────────────────────────────────*/
    $(document).on("dialogbeforeclose", ".ui-dialog", function () {
      var $dialog = $(this);

      /* Re-enable compositing for the exit keyframe */
      $dialog.css("will-change", "transform, opacity");
      $dialog.addClass("apx-closing").removeClass("apx-settled");
      $(".ui-widget-overlay").addClass("apx-closing");
    });


    /* ───────────────────────────────────────────────────────
       4. AFTER CLOSE — guaranteed overlay cleanup.
          Runs after jQuery UI has hidden/destroyed the dialog.
          The 320 ms delay ensures we always run after APEX's
          own internal 200 ms cleanup timer.
    ─────────────────────────────────────────────────────────*/
    $(document).on("dialogclose", ".ui-dialog", function () {
      setTimeout(function () {
        if ($(".ui-dialog:visible").length === 0) {
          $(".ui-widget-overlay").remove();
        }
      }, 320);
    });


    /* ───────────────────────────────────────────────────────
       5. SAFETY NET — Escape key removes orphaned overlay.
          Handles the edge case where an iframe navigates and
          the overlay gets stuck with no dialog behind it.
          Throttled: only one check per key-press, not one per
          repeat event while the key is held down.
    ─────────────────────────────────────────────────────────*/
    $(document).on("keydown.apxModalSafety", function (e) {
      if (e.key !== "Escape" || escThrottle) { return; }

      escThrottle = true;
      setTimeout(function () {
        escThrottle = false;
        if ($(".ui-dialog:visible").length === 0) {
          $(".ui-widget-overlay").remove();
        }
      }, 350);
    });


    /* ───────────────────────────────────────────────────────
       6. FOCUS — suppress browser default outline
    ─────────────────────────────────────────────────────────*/
    $(document).on("dialogfocus", ".ui-dialog", function () {
      $(this).css("outline", "none");
    });

  });

}(apex.jQuery));
