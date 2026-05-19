/* ============================================================
   ORACLE APEX — Premium Modal Dialog JS  (FIXED - no freeze)
   File    : apex_modal_dialog.js

   ROOT CAUSE OF THE FREEZE:
   Using event.preventDefault() on "dialogbeforeclose" and then
   re-calling dialog("close") inside a setTimeout corrupts
   APEX's internal dialog state — the overlay stays active and
   the page is permanently locked.

   SAFE APPROACH:
   - NEVER block "dialogbeforeclose" with preventDefault().
   - Visually animate OUT at the very start of close (200ms is
     enough to feel like animation while APEX cleans up safely).
   - "dialogclose" cleans up any orphaned overlay.
   ============================================================ */

(function ($) {
  "use strict";

  $(function () {

    /* ─────────────────────────────────────────────────────
       1. OPEN — restart entry animation cleanly
    ───────────────────────────────────────────────────── */
    $(document).on("dialogopen", ".ui-dialog", function () {
      var $dialog = $(this);

      $dialog.removeClass("apx-closing");

      /* Force reflow to restart the CSS keyframe */
      $dialog[0].offsetHeight; // eslint-disable-line no-unused-expressions

      /* Stagger inner form elements after dialog appears */
      setTimeout(function () {
        $dialog
          .find(".t-Form-fieldContainer, .t-Region, .t-ButtonRegion")
          .each(function (i) {
            var $el = $(this);
            $el.css({ opacity: 0, transform: "translateY(10px)", transition: "none" });
            setTimeout(function () {
              $el.css({
                transition:
                  "opacity 0.26s ease " + i * 38 + "ms, " +
                  "transform 0.26s cubic-bezier(0.22,1,0.36,1) " + i * 38 + "ms",
                opacity: 1,
                transform: "translateY(0)"
              });
            }, 10);
          });
      }, 80);
    });


    /* ─────────────────────────────────────────────────────
       2. BEFORE CLOSE — play exit animation, NO preventDefault
          APEX closes the dialog normally; the animation runs
          concurrently for ~200ms which is visually convincing.
    ───────────────────────────────────────────────────── */
    $(document).on("dialogbeforeclose", ".ui-dialog", function () {
      $(this).addClass("apx-closing");
      $(".ui-widget-overlay").addClass("apx-closing");
      /* ⚠️ Do NOT return false or call preventDefault() here */
    });


    /* ─────────────────────────────────────────────────────
       3. AFTER CLOSE — guaranteed overlay cleanup
          Fires after jQuery UI has already hidden/destroyed
          the dialog. Belt-and-suspenders in case APEX leaves
          an orphaned overlay behind.
    ───────────────────────────────────────────────────── */
    $(document).on("dialogclose", ".ui-dialog", function () {
      setTimeout(function () {
        /* Only remove overlay if no other dialog is open */
        if ($(".ui-dialog:visible").length === 0) {
          $(".ui-widget-overlay").remove();
        }
      }, 260);
    });


    /* ─────────────────────────────────────────────────────
       4. SAFETY NET — Escape key removes orphaned overlay
          Handles edge case where iframe navigates and the
          overlay gets stuck with no dialog behind it.
    ───────────────────────────────────────────────────── */
    $(document).on("keydown.apxModalSafety", function (e) {
      if (e.key === "Escape") {
        setTimeout(function () {
          if ($(".ui-dialog:visible").length === 0) {
            $(".ui-widget-overlay").remove();
          }
        }, 350);
      }
    });


    /* ─────────────────────────────────────────────────────
       5. FOCUS — clean up browser default outline
    ───────────────────────────────────────────────────── */
    $(document).on("dialogfocus", ".ui-dialog", function () {
      $(this).css("outline", "none");
    });

  });

}(apex.jQuery));
