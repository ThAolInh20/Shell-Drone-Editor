export function showToast(
  message,
  type = 'success',
  duration = 2500
) {
  if (typeof document === 'undefined') {
    return;
  }

  let container = document.getElementById('app-toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'app-toast-container';
    container.style.position = 'fixed';
    container.style.bottom = '24px';
    container.style.right = '24px';
    container.style.display = 'flex';
    container.style.flexDirection = 'column';
    container.style.gap = '8px';
    container.style.zIndex = '999999';
    container.style.pointerEvents = 'none';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `app-toast app-toast-${type}`;
  toast.textContent = message;
  toast.style.background = type === 'error'
    ? 'rgba(180, 40, 40, 0.94)'
    : 'rgba(15, 23, 42, 0.94)';
  toast.style.color = '#ffffff';
  toast.style.border = type === 'error'
    ? '1px solid rgba(255, 80, 80, 0.5)'
    : '1px solid rgba(0, 243, 255, 0.4)';
  toast.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.45)';
  toast.style.backdropFilter = 'blur(10px)';
  toast.style.padding = '10px 18px';
  toast.style.borderRadius = '8px';
  toast.style.fontSize = '13px';
  toast.style.fontWeight = '500';
  toast.style.fontFamily = 'Inter, Roboto, sans-serif';
  toast.style.opacity = '0';
  toast.style.transform = 'translateY(12px)';
  toast.style.transition = 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)';
  toast.style.pointerEvents = 'auto';

  container.appendChild(toast);

  // Trigger smooth enter animation
  requestAnimationFrame(() => {
    toast.style.opacity = '1';
    toast.style.transform = 'translateY(0)';
  });

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(12px)';
    setTimeout(() => {
      if (toast.parentElement) {
        toast.parentElement.removeChild(toast);
      }
    }, 300);
  }, duration);
}
