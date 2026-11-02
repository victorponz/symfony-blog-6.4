/* Modern theme behaviour: feedback, skeletons, reveal, toasts. Requires jQuery + Bootstrap 3. */
(function ($) {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---------------------------------------------------------------- Toasts
  var icons = { success: 'fa-check', danger: 'fa-exclamation', error: 'fa-exclamation', info: 'fa-info', warning: 'fa-exclamation' };

  function dismissToast($toast) {
    if ($toast.hasClass('is-leaving')) return;
    $toast.addClass('is-leaving');
    setTimeout(function () { $toast.remove(); }, 240);
  }

  function armToast($toast) {
    var duration = parseInt($toast.data('duration'), 10) || 4000;
    $toast.css('--toast-duration', duration + 'ms');
    $toast.find('.toast-timer').on('animationend', function () { dismissToast($toast); });
    $toast.find('.toast-close').on('click', function () { dismissToast($toast); });
  }

  window.toast = function (message, type) {
    type = type || 'info';
    var $toast = $(
      '<div class="toast glass toast-' + type + '" role="status">' +
        '<span class="toast-icon"><i class="fa ' + (icons[type] || icons.info) + '"></i></span>' +
        '<div class="toast-body"></div>' +
        '<button type="button" class="toast-close btn-ghost" aria-label="Close"><i class="fa fa-times"></i></button>' +
        '<span class="toast-timer"></span>' +
      '</div>'
    );
    $toast.find('.toast-body').text(message);
    $('#toast-stack').append($toast);
    armToast($toast);
  };

  // Flash messages rendered server-side
  $('#toast-stack .toast').each(function () { armToast($(this)); });

  // ---------------------------------------------------------------- Images: skeleton until loaded
  function settle(img) {
    $(img).closest('.media').removeClass('is-loading');
  }
  $('.media.is-loading img').each(function () {
    if (this.complete && this.naturalWidth) {
      settle(this);
    } else {
      $(this).one('load error', function () { settle(this); });
    }
  });

  // ---------------------------------------------------------------- Navbar glass intensifies on scroll
  var $nav = $('.site-nav');
  function onScroll() { $nav.toggleClass('is-scrolled', window.scrollY > 8); }
  $(window).on('scroll', onScroll);
  onScroll();

  // Close mobile menu after choosing an item
  $('.navbar-collapse .nav a').on('click', function () {
    $('.navbar-toggle:visible:not(.collapsed)').click();
  });

  // ---------------------------------------------------------------- Ripple
  $(document).on('pointerdown', '.btn, .sr-button, .chips a, .pagination a', function (e) {
    if (reduceMotion) return;
    var rect = this.getBoundingClientRect();
    var size = Math.max(rect.width, rect.height);
    var $r = $('<span class="ripple"></span>').css({
      width: size,
      height: size,
      left: e.clientX - rect.left - size / 2,
      top: e.clientY - rect.top - size / 2
    });
    $(this).append($r);
    setTimeout(function () { $r.remove(); }, 600);
  });

  // ---------------------------------------------------------------- Navigation progress line
  var $progress = $('#nav-progress');
  function startProgress() {
    $progress.removeClass('is-active');
    void $progress[0].offsetWidth;
    $progress.addClass('is-active');
  }

  $(document).on('click', 'a[href]', function (e) {
    var href = this.getAttribute('href');
    if (e.isDefaultPrevented() || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    if (!href || href.charAt(0) === '#' || this.target === '_blank' || this.hasAttribute('download')) return;
    if ($(this).is('[data-toggle], .gallery')) return;
    if (this.host !== window.location.host) return;
    startProgress();
  });

  // ---------------------------------------------------------------- Forms: busy submit button, no double submit
  $(document).on('submit', 'form', function (e) {
    var $form = $(this);
    if ($form.data('submitting')) { e.preventDefault(); return; }
    $form.data('submitting', true);
    var $btn = $form.find('button[type="submit"], input[type="submit"]').first();
    $btn.addClass('is-busy').attr('aria-busy', 'true');
    startProgress();
  });

  // Coming back via the back button: reset transient states
  $(window).on('pageshow', function () {
    $progress.removeClass('is-active');
    $('form').data('submitting', false);
    $('.is-busy').removeClass('is-busy').removeAttr('aria-busy');
  });

  // ---------------------------------------------------------------- Blog: skeleton while results load
  var skeletonCard =
    '<div class="card post-card" aria-hidden="true">' +
      '<div class="skeleton skeleton-media" style="border-radius:0;margin:0"></div>' +
      '<div class="post-body" style="padding-bottom:24px">' +
        '<div class="skeleton skeleton-title"></div>' +
        '<div class="skeleton skeleton-line w-80"></div>' +
        '<div class="skeleton skeleton-line"></div>' +
        '<div class="skeleton skeleton-line w-60"></div>' +
      '</div>' +
    '</div>';

  function showPostSkeletons() {
    var $list = $('#post-list');
    if (!$list.length) return;
    $list.attr('aria-busy', 'true').html(skeletonCard + skeletonCard);
  }
  $('#search-form').on('submit', showPostSkeletons);
  $('#post-list').on('click', '.pagination a', showPostSkeletons);

  // ---------------------------------------------------------------- Likes (optimistic)
  $('.like-btn').on('click', function (e) {
    var $btn = $(this);
    if ($btn.hasClass('is-liked')) { e.preventDefault(); return; }
    e.preventDefault();
    var $count = $btn.find('.like-count');
    $count.text((parseInt($count.text(), 10) || 0) + 1).addClass('bump');
    $btn.addClass('is-liked');
    var href = this.href;
    setTimeout(function () { window.location.href = href; }, reduceMotion ? 0 : 380);
  });

  $(document).on('click', '.tile-actions .js-like', function (e) {
    e.preventDefault();
    var $a = $(this).toggleClass('is-liked');
    var $stat = $a.closest('.tile').find('.js-like-count');
    var n = parseInt($stat.text(), 10) || 0;
    $stat.text($a.hasClass('is-liked') ? n + 1 : Math.max(0, n - 1));
    window.toast($a.hasClass('is-liked') ? 'Added to your favourites' : 'Removed from favourites',
      $a.hasClass('is-liked') ? 'success' : 'info');
  });

  $(document).on('click', '.tile-actions [download]', function () {
    window.toast('Download started', 'success');
  });

  // ---------------------------------------------------------------- Newsletter (no backend yet)
  $('#newsletter-form').on('submit', function (e) {
    e.preventDefault();
    var $form = $(this);
    var $btn = $form.find('button[type="submit"]');
    setTimeout(function () {
      $btn.removeClass('is-busy').removeAttr('aria-busy');
      $form.data('submitting', false);
      $progress.removeClass('is-active');
      $form[0].reset();
      window.toast('Thanks! You are subscribed.', 'success');
    }, 700);
  });

  // ---------------------------------------------------------------- Smooth anchor scroll
  $(document).on('click', 'a.page-scroll', function (e) {
    var target = $(this.getAttribute('href'));
    if (!target.length) return;
    e.preventDefault();
    target[0].scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
    var $focusable = target.find('input, textarea').first();
    if ($focusable.length) setTimeout(function () { $focusable.trigger('focus'); }, 450);
  });

  // ---------------------------------------------------------------- Reveal on scroll
  var $reveal = $('[data-reveal]');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          var el = entry.target;
          el.classList.add('is-visible');
          io.unobserve(el);
          // Once revealed, drop the reveal transition so hover effects respond instantly
          setTimeout(function () {
            el.removeAttribute('data-reveal');
            el.classList.remove('is-visible');
          }, 900);
        }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    $reveal.each(function () { io.observe(this); });
  } else {
    $reveal.addClass('is-visible');
  }

  // ---------------------------------------------------------------- Plugins
  $('[data-toggle="tooltip"]').tooltip({ container: 'body' });

  if ($.fn.magnificPopup) {
    $('.popup-gallery').magnificPopup({
      delegate: '.gallery',
      type: 'image',
      tLoading: '',
      mainClass: 'mfp-img-mobile mfp-fade',
      removalDelay: 200,
      gallery: { enabled: true, navigateByImgClick: true, preload: [0, 1] }
    });
  }
})(jQuery);
