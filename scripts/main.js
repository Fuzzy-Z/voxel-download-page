/**
 * VOXEL // UI LOGIC & PLATFORM DETECTION
 */

document.addEventListener('DOMContentLoaded', () => {
  // 1. Detect User Operating System & Architecture
  detectUserPlatform();

  // 2. Setup Clipboard Copy Triggers
  setupCopyButtons();

  // 3. Setup Terminal Package Manager Tabs
  setupTerminalTabs();

  // 4. Setup Global Keyboard Shortcuts
  setupKeyboardShortcuts();

  // 5. Setup Smooth Scrolling for Nav Links
  setupSmoothScroll();
});

/**
 * Auto-detect user OS and update primary download CTA
 */
function detectUserPlatform() {
  const userAgent = window.navigator.userAgent.toLowerCase();
  const platform = window.navigator.platform ? window.navigator.platform.toLowerCase() : '';

  let osName = 'Windows';
  let arch = 'x64';
  let size = '129 MB';
  let osIcon = '⊞';
  let isAvailable = true;
  let directDownloadUrl = 'https://github.com/Fuzzy-Z/voxel-download-page/releases/download/v1.0.35/Voxel-v1.0.37-Windows-x64.zip';

  if (userAgent.includes('mac') || platform.includes('mac')) {
    osName = 'macOS';
    osIcon = '';
    isAvailable = false;
  } else if (userAgent.includes('linux') || platform.includes('linux')) {
    osName = 'Linux';
    osIcon = '🐧';
    isAvailable = false;
  }

  // Update Main Download CTA text & properties
  const titleEl = document.getElementById('primaryDownloadTitle');
  const subEl = document.getElementById('primaryDownloadSub');
  const iconEl = document.getElementById('primaryDownloadIcon');
  const mainBtn = document.getElementById('primaryDownloadBtn');

  if (titleEl && subEl && iconEl && mainBtn) {
    if (isAvailable) {
      titleEl.textContent = `Baixar para ${osName}`;
      subEl.textContent = `v1.0.37 (Portátil .zip) • ${size}`;
      iconEl.textContent = osIcon;
      mainBtn.href = directDownloadUrl;
      mainBtn.setAttribute('download', 'Voxel-v1.0.37-Windows-x64.zip');
    } else {
      titleEl.textContent = `${osName} (Em andamento)`;
      subEl.textContent = `v1.0.37 • Em desenvolvimento`;
      iconEl.textContent = osIcon;
      mainBtn.href = `#downloads`;
      mainBtn.removeAttribute('download');
    }
  }
}

/**
 * Handle copy to clipboard buttons with visual tactical feedback
 */
function setupCopyButtons() {
  document.querySelectorAll('[data-copy]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const textToCopy = btn.getAttribute('data-copy');
      if (!textToCopy) return;

      try {
        await navigator.clipboard.writeText(textToCopy);
        const originalText = btn.textContent;
        btn.textContent = 'COPIADO ✓';
        btn.classList.add('copied');

        setTimeout(() => {
          btn.textContent = originalText;
          btn.classList.remove('copied');
        }, 2000);
      } catch (err) {
        console.error('Falha ao copiar:', err);
      }
    });
  });
}

/**
 * Setup terminal command package manager tabs
 */
function setupTerminalTabs() {
  const tabs = document.querySelectorAll('.term-tab');
  const cmdOutput = document.getElementById('terminalCommand');
  const copyBtn = document.getElementById('terminalCopyBtn');

  const commands = {
    curl: 'curl -fsSL https://getvoxel.dev/install.sh | sh',
    winget: 'winget install Fuzzy-Z.Voxel',
    brew: 'brew install fuzzy-z/tap/voxel',
    cargo: 'cargo install voxel-cli --locked'
  };

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      const tool = tab.getAttribute('data-tab');
      if (commands[tool] && cmdOutput && copyBtn) {
        cmdOutput.textContent = commands[tool];
        copyBtn.setAttribute('data-copy', commands[tool]);
      }
    });
  });
}

/**
 * Global keyboard shortcuts for quick control of Voxel canvas
 */
function setupKeyboardShortcuts() {
  window.addEventListener('keydown', (e) => {
    // Ignore if typing inside input
    if (['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;

    const key = e.key.toLowerCase();
    
    if (key === 'b') {
      const addTool = document.querySelector('[data-tool="add"]');
      if (addTool) addTool.click();
    } else if (key === 'd') {
      const removeTool = document.querySelector('[data-tool="remove"]');
      if (removeTool) removeTool.click();
    } else if (key === 'w') {
      const wireBtn = document.getElementById('toggleWireframe');
      if (wireBtn) wireBtn.click();
    } else if (key === 'r') {
      const rotateBtn = document.getElementById('toggleRotate');
      if (rotateBtn) rotateBtn.click();
    } else if (key === 'c') {
      const resetBtn = document.getElementById('resetCanvas');
      if (resetBtn) resetBtn.click();
    } else if (key === 'x') {
      const clearBtn = document.getElementById('clearCanvas');
      if (clearBtn) clearBtn.click();
    }
  });
}

/**
 * Smooth scrolling for anchors
 */
function setupSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      const targetId = this.getAttribute('href');
      if (targetId === '#') return;
      const targetElement = document.querySelector(targetId);
      if (targetElement) {
        e.preventDefault();
        targetElement.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
      }
    });
  });
}
