// ============================================================
// PENINGKATAN TAMPILAN PONSEL (Mobile Enhancements) - REVISI ANTI-GLITCH
// ============================================================

(function() {

  var MOBILE_QUERY   = '(max-width: 800px)';
  var HANDLE_HEIGHT  = 56;   
  var DRAG_THRESHOLD = 5;    

  var panel, handle, handleLabel;
  var currentY       = 0;       
  var dragging       = false;
  var moved          = false;
  var startClientY   = 0;
  var startTranslate = 0;
  var isHandleTap    = false; 
  var activeScrollNode = null; 
  var preventNextClick = false; 

  function isMobile() {
    return window.matchMedia(MOBILE_QUERY).matches;
  }

  function collapsedTranslate() {
    return Math.max(panel.offsetHeight - HANDLE_HEIGHT, 0);
  }

  function clampY(y) {
    return Math.min(Math.max(y, 0), collapsedTranslate());
  }

  function applyTransform(y) {
    currentY = y;
    panel.style.transform = 'translateY(' + y + 'px)';
  }

  function updateLabel(expanded) {
    if (!handleLabel) return;
    handleLabel.textContent = expanded
      ? 'Tarik turun untuk lihat peta'
      : 'Tarik naik untuk lihat daftar';
  }

  window.setMobilePanelExpanded = function(expand, animate) {
    if (!panel || !isMobile()) return;
    if (animate !== false) panel.classList.remove('eph-dragging');
    applyTransform(expand ? 0 : collapsedTranslate());
    updateLabel(expand);
  };

  function getScrollableParent(node, root) {
    while (node && node !== root && node !== document.body) {
      if (node.scrollHeight > node.clientHeight) {
        var overflowY = window.getComputedStyle(node).overflowY;
        if (overflowY === 'auto' || overflowY === 'scroll') {
          return node;
        }
      }
      node = node.parentNode;
    }
    return null;
  }

  function onTouchStart(e) {
    if (!isMobile()) return;
    
    var touch = e.touches ? e.touches[0] : e;
    var target = e.target.nodeType === 3 ? e.target.parentNode : e.target;

    if (target.closest('select, input, textarea')) {
      e.stopPropagation(); 
      return; 
    }

    dragging = true;
    moved = false;
    startClientY = touch.clientY;
    startTranslate = currentY;
    
    isHandleTap = !!target.closest('#panel-handle');
    activeScrollNode = getScrollableParent(target, panel);

    panel.classList.add('eph-dragging');
  }

  function onTouchMove(e) {
    if (!dragging) return;
    
    var touch = e.touches ? e.touches[0] : e;
    var delta = touch.clientY - startClientY;

    if (activeScrollNode && startTranslate === 0) {
      if (delta < 0 || (delta > 0 && activeScrollNode.scrollTop > 1)) {
        dragging = false;
        panel.classList.remove('eph-dragging');
        return; 
      }
    }

    if (Math.abs(delta) > DRAG_THRESHOLD) {
      moved = true;
      if (e.cancelable) e.preventDefault(); 
    }

    applyTransform(clampY(startTranslate + delta));
  }

  function onTouchEnd() {
    if (!dragging) return;
    dragging = false;

    var panelMovedOrToggled = false; 

    if (!moved) {
      if (isHandleTap) {
        // === LOGIKA KLIK SUPER STABIL ===
        // Deteksi pasti: Jika angka currentY kecil (<50), berarti panel sedang di ATAS.
        var isCurrentlyExpanded = currentY < 50;
        
        // Perintahkan panel melakukan kebalikannya (Tutup jika sedang Buka, Buka jika sedang Tutup)
        window.setMobilePanelExpanded(!isCurrentlyExpanded);
        panelMovedOrToggled = true; 
      }
    } else {
      var dragDistance = currentY - startTranslate; 
      var SWIPE_THRESHOLD = 50; 

      if (dragDistance > SWIPE_THRESHOLD) {
        window.setMobilePanelExpanded(false); // Ditarik turun -> Tutup
      } 
      else if (dragDistance < -SWIPE_THRESHOLD) {
        window.setMobilePanelExpanded(true); // Ditarik naik -> Buka
      } 
      else {
        // Batal ditarik (kembalikan ke posisi semula)
        var wasExpanded = startTranslate < 50;
        window.setMobilePanelExpanded(wasExpanded);
      }
      panelMovedOrToggled = true; 
    }

    if (panelMovedOrToggled) {
      preventNextClick = true;
      setTimeout(function() { preventNextClick = false; }, 400); 
    }

    panel.classList.remove('eph-dragging');
  }
  
  function buildHandle() {
    handle = document.createElement('div');
    handle.id = 'panel-handle';

    var grip = document.createElement('div');
    grip.className = 'eph-grip';

    handleLabel = document.createElement('div');
    handleLabel.className = 'eph-handle-label';

    handle.appendChild(grip);
    handle.appendChild(handleLabel);
    panel.insertBefore(handle, panel.firstChild);
  }

  function handleViewportChange() {
    if (!panel) return;

    if (isMobile()) {
      if (!document.getElementById('panel-handle')) {
        buildHandle();
        // Paksa panel buka PENUH saat pertama kali dimuat
        window.setMobilePanelExpanded(true, false);
      } else {
        // === SENSOR ANTI-GLITCH ===
        // Jangan pernah lipat panel secara diam-diam! 
        // Biarkan panel tetap pada statusnya (Buka tetap Buka, Tutup tetap Tutup)
        var isCurrentlyExpanded = currentY < 50;
        window.setMobilePanelExpanded(isCurrentlyExpanded, false);
      }
    } else {
      panel.style.transform = '';
      panel.classList.remove('eph-dragging');
      currentY = 0;
    }
  }

  window.addEventListener('load', function() {
    panel = document.getElementById('panel');
    if (!panel) return;

    handleViewportChange();

    panel.addEventListener('touchstart', onTouchStart, { passive: false });
    panel.addEventListener('touchmove', onTouchMove, { passive: false });
    panel.addEventListener('touchend', onTouchEnd);
    panel.addEventListener('touchcancel', onTouchEnd);

    window.addEventListener('click', function(e) {
      if (preventNextClick) {
        e.preventDefault();
        e.stopPropagation();
      }
    }, true); 

    panel.addEventListener('dragstart', function(e) {
      if (e.target.tagName === 'IMG') {
        e.preventDefault();
      }
    });

    if (window.Map) {
      Map.on('popupopen', function() {
        if (isMobile()) window.setMobilePanelExpanded(true);
      });
    }
  });

  window.addEventListener('resize', handleViewportChange);

})();
