/**
 * Rohana Hettiarachchi & Company — Minimalist White 3D Business Card
 * - Turns 90° Landscape automatically on Portrait Mobile screens (e.g. iPhone SE 375x667)
 * - Displays Horizontally on PC / Landscape screens
 * - One-time Swipe Hand animation directly ON the card that disappears after playing
 * - 60/120fps Spring-Physics 3D Swipe & Tap-to-Flip Engine
 */

(function () {
  'use strict';

  const businessCard = document.getElementById('businessCard');
  const swipeHint = document.getElementById('swipeHint');
  if (!businessCard) return;

  const BASE_CARD_WIDTH = 560;
  const BASE_CARD_HEIGHT = 344;

  let isRotated90 = false;
  let currentVisualScale = 1;

  /* ========================================================================
     1. Auto-Landscape Orientation & Responsive Scaler
     ======================================================================== */
  function updateCardLayout() {
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    // On mobile portrait screens (width < height), rotate card 90deg into landscape!
    isRotated90 = vw < vh;

    if (isRotated90) {
      document.documentElement.style.setProperty('--card-rotate-z', '90deg');
      const availW = vw - 22;
      const availH = vh - 28;
      // When rotated 90deg, card's 344px height spans screen width, 560px width spans screen height
      const scaleW = availW / BASE_CARD_HEIGHT;
      const scaleH = availH / BASE_CARD_WIDTH;
      currentVisualScale = Math.max(0.45, Math.min(1.12, scaleW, scaleH));
    } else {
      document.documentElement.style.setProperty('--card-rotate-z', '0deg');
      const availW = vw - 36;
      const availH = vh - 36;
      const scaleW = availW / BASE_CARD_WIDTH;
      const scaleH = availH / BASE_CARD_HEIGHT;
      currentVisualScale = Math.max(0.45, Math.min(1.08, scaleW, scaleH));
    }

    document.documentElement.style.setProperty('--card-scale', currentVisualScale.toFixed(4));
  }

  updateCardLayout();
  window.addEventListener('resize', updateCardLayout);
  window.addEventListener('orientationchange', () => {
    setTimeout(updateCardLayout, 60);
  });

  /* ========================================================================
     2. One-Time On-Card Swipe Overlay Dismissal
     ======================================================================== */
  function dismissSwipeHint() {
    if (!swipeHint || swipeHint.classList.contains('is-dismissed')) return;
    swipeHint.classList.add('is-dismissed');
    setTimeout(() => {
      if (swipeHint && swipeHint.parentNode) {
        swipeHint.style.display = 'none';
      }
    }, 300);
  }

  if (swipeHint) {
    swipeHint.addEventListener('animationend', (e) => {
      if (e.target === swipeHint) {
        dismissSwipeHint();
      }
    });
    // Fallback timer to guarantee removal after one-time play
    setTimeout(dismissSwipeHint, 2600);
  }

  /* ========================================================================
     3. 60/120fps Spring-Physics 3D Swipe & Tap-to-Flip Engine
     ======================================================================== */
  let baseAngle = 0;       // Snapped side (multiples of 180: 0, 180, -180, 360...)
  let targetAngle = 0;     // Where the card wants to be
  let currentAngle = 0;    // Current rendered angle
  let velocity = 0;        // Angular velocity (deg per frame)
  let currentScale = 1;    // Subtle lift scale when touched
  let targetScale = 1;

  // Pointer tracking state
  let isDragging = false;
  let activePointerId = null;
  let startX = 0;
  let startY = 0;
  let lastPrimaryCoord = 0;
  let lastMoveTime = 0;
  let pointerVelocity = 0; // px per ms along active swipe axis
  let maxDragDistance = 0;
  let activeSwipeSpan = BASE_CARD_WIDTH;
  let rafId = null;

  const SPRING_TENSION = 0.085;
  const SPRING_FRICTION = 0.76;
  const DRAG_FOLLOW = 0.42;

  function startLoop() {
    if (rafId !== null) return;
    rafId = requestAnimationFrame(tick);
  }

  function tick() {
    if (isDragging) {
      const diff = targetAngle - currentAngle;
      velocity = diff * DRAG_FOLLOW;
      currentAngle += velocity;
    } else {
      const displacement = targetAngle - currentAngle;
      const springForce = displacement * SPRING_TENSION;
      velocity = (velocity + springForce) * SPRING_FRICTION;
      currentAngle += velocity;
    }

    currentScale += (targetScale - currentScale) * 0.22;
    const dynamicTiltX = Math.max(-4, Math.min(4, velocity * -0.18));

    businessCard.style.transform = `perspective(1800px) rotateY(${currentAngle.toFixed(3)}deg) rotateX(${dynamicTiltX.toFixed(3)}deg) scale3d(${currentScale.toFixed(4)}, ${currentScale.toFixed(4)}, 1)`;

    const angleSettled = Math.abs(targetAngle - currentAngle) < 0.05 && Math.abs(velocity) < 0.05;
    const scaleSettled = Math.abs(targetScale - currentScale) < 0.001;

    if (!isDragging && angleSettled && scaleSettled) {
      currentAngle = targetAngle;
      currentScale = targetScale;
      velocity = 0;
      businessCard.style.transform = `perspective(1800px) rotateY(${currentAngle}deg) rotateX(0deg) scale3d(1, 1, 1)`;
      rafId = null;
      return;
    }

    rafId = requestAnimationFrame(tick);
  }

  function flipBy(deltaDegrees) {
    baseAngle += deltaDegrees;
    targetAngle = baseAngle;
    targetScale = 1;

    if (navigator.vibrate) {
      try {
        navigator.vibrate(10);
      } catch (_) {}
    }

    startLoop();
  }

  // Gentle initial 3D peek impulse on page load synced with the one-time swipe icon
  setTimeout(() => {
    if (!isDragging && baseAngle === 0) {
      velocity = -5.5;
      startLoop();
    }
  }, 450);

  // Unified Pointer Events
  businessCard.addEventListener('pointerdown', (e) => {
    if (e.button !== undefined && e.button !== 0) return;

    dismissSwipeHint();

    isDragging = true;
    activePointerId = e.pointerId;
    activeSwipeSpan = (isRotated90 ? BASE_CARD_HEIGHT : BASE_CARD_WIDTH) * currentVisualScale;

    startX = e.clientX;
    startY = e.clientY;
    lastPrimaryCoord = isRotated90 ? e.clientY : e.clientX;
    lastMoveTime = performance.now();
    pointerVelocity = 0;
    maxDragDistance = 0;

    targetAngle = baseAngle;
    targetScale = 1.018;
    startLoop();
  });

  window.addEventListener(
    'pointermove',
    (e) => {
      if (!isDragging || e.pointerId !== activePointerId) return;

      const now = performance.now();
      const dt = Math.max(1, now - lastMoveTime);
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;

      maxDragDistance = Math.max(maxDragDistance, Math.hypot(dx, dy));

      // When rotated 90deg on mobile, allow swiping along either vertical or horizontal axis seamlessly
      let primaryDelta;
      let currentPrimaryCoord;
      if (isRotated90) {
        if (Math.abs(dy) >= Math.abs(dx)) {
          primaryDelta = dy;
          currentPrimaryCoord = e.clientY;
        } else {
          primaryDelta = dx;
          currentPrimaryCoord = e.clientX;
        }
      } else {
        primaryDelta = dx;
        currentPrimaryCoord = e.clientX;
      }

      const step = currentPrimaryCoord - lastPrimaryCoord;
      const instantV = step / dt;
      pointerVelocity = pointerVelocity * 0.6 + instantV * 0.4;

      lastPrimaryCoord = currentPrimaryCoord;
      lastMoveTime = now;

      const dragDegrees = (primaryDelta / Math.max(220, activeSwipeSpan)) * 185;
      targetAngle = baseAngle + dragDegrees;
      startLoop();
    },
    { passive: true }
  );

  function finishPointerGesture(e) {
    if (!isDragging || (e && e.pointerId !== activePointerId)) return;
    isDragging = false;
    activePointerId = null;
    targetScale = 1;

    const draggedDegrees = targetAngle - baseAngle;

    if (maxDragDistance < 8) {
      const clickedLink = e && e.target && e.target.closest ? e.target.closest('a') : null;
      if (clickedLink) {
        targetAngle = baseAngle;
        startLoop();
        return;
      }
      flipBy(180);
      return;
    }

    const isFastFlick = Math.abs(pointerVelocity) > 0.24 && maxDragDistance > 16;
    const isFarEnoughDrag = Math.abs(draggedDegrees) > 34;

    if (isFastFlick || isFarEnoughDrag) {
      const direction = (isFastFlick ? pointerVelocity : draggedDegrees) >= 0 ? 1 : -1;
      velocity += pointerVelocity * 8.5;
      flipBy(direction * 180);
    } else {
      targetAngle = baseAngle;
      startLoop();
    }
  }

  window.addEventListener('pointerup', finishPointerGesture);
  window.addEventListener('pointercancel', finishPointerGesture);

  businessCard.addEventListener(
    'click',
    (e) => {
      if (maxDragDistance >= 8) {
        e.preventDefault();
        e.stopPropagation();
      }
    },
    true
  );

  businessCard.addEventListener('keydown', (e) => {
    if (e.key === ' ' || e.key === 'Enter' || e.key === 'ArrowRight') {
      e.preventDefault();
      flipBy(180);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      flipBy(-180);
    }
  });
})();
