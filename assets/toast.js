// Enhanced luxury glassy toast system for Beacon application
(function() {
  // Initialize toast container
  function initToastContainer() {
    let container = document.getElementById('toastContainer');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toastContainer';
      container.setAttribute('aria-live', 'polite');
      container.setAttribute('aria-atomic', 'true');
      document.body.appendChild(container);
    }
    return container;
  }

  // Main toast function with glassy styling - handles both object and individual parameters
  function showToast(messageOrOptions, duration = 5000, title = 'Success', type = 'success') {
    const container = initToastContainer();

    // Handle both calling patterns:
    // showToast({ message: 'text', type: 'success' }) - object pattern
    // showToast('text', 5000, 'Success', 'success') - individual parameters pattern
    let message, finalDuration, finalTitle, finalType;
    
    if (typeof messageOrOptions === 'object' && messageOrOptions !== null) {
      // Object pattern: showToast({ message: 'text', type: 'success' })
      message = messageOrOptions.message || 'Notification';
      finalType = messageOrOptions.type || 'success';
      finalDuration = messageOrOptions.duration || 5000;
      finalTitle = messageOrOptions.title || (finalType.charAt(0).toUpperCase() + finalType.slice(1));
    } else {
      // Individual parameters pattern: showToast('text', 5000, 'Success', 'success')
      message = messageOrOptions || 'Notification';
      finalDuration = duration;
      finalTitle = title;
      finalType = type;
    }

    // Icon definitions for different toast types
    const icons = {
      success: '<path d="M20 6L9 17l-5-5"/>',
      error: '<path d="M6 18L18 6M6 6l12 12"/>',
      warning: '<path d="M12 9v4m0 4h.01M12 2L2 22h20L12 2z"/>',
      info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>'
    };

    // Create toast elements
    const toast = document.createElement('div');
    toast.className = `toast toast-${finalType}`;
    toast.style.setProperty('--duration', `${finalDuration}ms`);

    // Create icon container
    const iconContainer = document.createElement('div');
    iconContainer.className = 'toast-icon';
    iconContainer.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true">${icons[finalType] || icons.success}</svg>`;

    // Create content container
    const content = document.createElement('div');
    content.className = 'toast-content';
    
    const titleElement = document.createElement('h4');
    titleElement.className = 'toast-title';
    titleElement.textContent = finalTitle;
    
    const messageElement = document.createElement('p');
    messageElement.className = 'toast-message';
    messageElement.textContent = message;

    content.appendChild(titleElement);
    content.appendChild(messageElement);

    // Create close button
    const closeBtn = document.createElement('button');
    closeBtn.className = 'toast-close';
    closeBtn.setAttribute('aria-label', 'Close notification');
    closeBtn.innerHTML = '×';

    // Create progress bar
    const progressBar = document.createElement('div');
    progressBar.className = 'toast-progress';
    progressBar.style.animationDuration = `${finalDuration}ms`;

    // Compose toast
    toast.appendChild(iconContainer);
    toast.appendChild(content);
    toast.appendChild(closeBtn);
    toast.appendChild(progressBar);
    container.appendChild(toast);

    // Show toast with entrance animation
    requestAnimationFrame(() => {
      toast.classList.add('show');
    });

    // Auto-hide functionality
    let removed = false;
    let autoRemoveTimer;
    
    function removeToast() {
      if (removed) return;
      removed = true;
      if (autoRemoveTimer) {
        clearTimeout(autoRemoveTimer);
        autoRemoveTimer = null;
      }
      toast.classList.remove('show');
      toast.classList.add('hide');
      setTimeout(() => {
        if (toast.parentNode) {
          toast.parentNode.removeChild(toast);
        }
      }, 400);
    }

    // Set auto-hide timer
    if (finalDuration > 0) {
      autoRemoveTimer = setTimeout(removeToast, finalDuration);
      
      // Pause auto-remove on hover
      toast.addEventListener('mouseenter', () => {
        if (autoRemoveTimer) {
          clearTimeout(autoRemoveTimer);
          autoRemoveTimer = null;
        }
      });
      
      // Resume auto-remove on leave
      toast.addEventListener('mouseleave', () => {
        if (!autoRemoveTimer && !removed) {
          autoRemoveTimer = setTimeout(removeToast, 2000); // Shorter timeout on resume
        }
      });
    }

    // Manual close handlers
    closeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      removeToast();
    });

    // Click anywhere on toast to dismiss
    toast.addEventListener('click', () => {
      removeToast();
    });

    return { toast, remove: removeToast };
  }

  // Convenience functions for different toast types
  function showSuccessToast(message, title = 'Success', duration = 5000) {
    return showToast(message, duration, title, 'success');
  }

  function showErrorToast(message, title = 'Error', duration = 6000) {
    return showToast(message, duration, title, 'error');
  }

  function showWarningToast(message, title = 'Warning', duration = 5000) {
    return showToast(message, duration, title, 'warning');
  }

  function showInfoToast(message, title = 'Information', duration = 4000) {
    return showToast(message, duration, title, 'info');
  }

  // Clear all toasts
  function clearAllToasts() {
    const container = document.getElementById('toastContainer');
    if (container) {
      const toasts = container.querySelectorAll('.toast');
      toasts.forEach(toast => {
        toast.classList.remove('show');
        toast.classList.add('hide');
        setTimeout(() => {
          if (toast.parentNode) {
            container.removeChild(toast);
          }
        }, 400);
      });
    }
  }

  // Alternative API for compatibility with existing code
  function showToastCompat(options = {}) {
    const {
      message = 'Notification',
      type = 'success',
      duration = 4000,
      title = type.charAt(0).toUpperCase() + type.slice(1)
    } = options;
    
    return showToast(message, duration, title, type);
  }

  // Backward-compatible window.toast API used by legacy pages.
  function resolveTitleAndDuration(defaultTitle, defaultDuration, titleOrDuration, duration) {
    if (typeof titleOrDuration === 'number') {
      return { title: defaultTitle, duration: titleOrDuration };
    }
    return {
      title: (typeof titleOrDuration === 'string' && titleOrDuration) ? titleOrDuration : defaultTitle,
      duration: typeof duration === 'number' ? duration : defaultDuration
    };
  }

  // Expose functions globally
  window.showToast = showToast;
  window.showSuccessToast = showSuccessToast;
  window.showErrorToast = showErrorToast;
  window.showWarningToast = showWarningToast;
  window.showInfoToast = showInfoToast;
  window.clearAllToasts = clearAllToasts;
  window.toast = {
    show(message, type = 'info', duration = 4000, title) {
      const finalType = typeof type === 'string' ? type : 'info';
      const finalDuration = typeof type === 'number'
        ? type
        : (typeof duration === 'number' ? duration : 4000);
      const finalTitle = typeof title === 'string' && title
        ? title
        : finalType.charAt(0).toUpperCase() + finalType.slice(1);
      return showToast(message, finalDuration, finalTitle, finalType);
    },
    success(message, titleOrDuration = 'Success', duration = 5000) {
      const out = resolveTitleAndDuration('Success', 5000, titleOrDuration, duration);
      return showToast(message, out.duration, out.title, 'success');
    },
    error(message, titleOrDuration = 'Error', duration = 6000) {
      const out = resolveTitleAndDuration('Error', 6000, titleOrDuration, duration);
      return showToast(message, out.duration, out.title, 'error');
    },
    warning(message, titleOrDuration = 'Warning', duration = 5000) {
      const out = resolveTitleAndDuration('Warning', 5000, titleOrDuration, duration);
      return showToast(message, out.duration, out.title, 'warning');
    },
    info(message, titleOrDuration = 'Information', duration = 4000) {
      const out = resolveTitleAndDuration('Information', 4000, titleOrDuration, duration);
      return showToast(message, out.duration, out.title, 'info');
    }
  };
  
  // Alternative API for different calling patterns
  window.showToastCompat = showToastCompat;

  // Initialize container when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initToastContainer);
  } else {
    initToastContainer();
  }
})();
