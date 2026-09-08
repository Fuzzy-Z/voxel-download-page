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

  // 6. Setup Referral & Personalized Link Detection
  setupReferralLinks();

  // 7. Setup FAQ Interactive Form Action
  setupFaqContactForm();

  // 8. Setup Download Redirect to Thank You Page
  setupDownloadRedirects();
});

/**
 * Auto-detect user OS and update primary download CTA
 */
function detectUserPlatform() {
  const userAgent = window.navigator.userAgent.toLowerCase();
  const platform = window.navigator.platform ? window.navigator.platform.toLowerCase() : '';

  let osName = 'Windows';
  let arch = 'x64';
  let size = '123 MB';
  let osIcon = '⊞';
  let isAvailable = true;
  let directDownloadUrl = 'https://github.com/Fuzzy-Z/voxel-download-page/releases/download/v1.0.58/Voxel.Setup.1.0.58.exe';

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
      subEl.textContent = `v1.0.58 (Instalador .exe) • ${size}`;
      iconEl.textContent = osIcon;
      mainBtn.href = directDownloadUrl;
      mainBtn.setAttribute('download', 'Voxel Setup 1.0.58.exe');
    } else {
      titleEl.textContent = `${osName} (Em andamento)`;
      subEl.textContent = `v1.0.58 • Em desenvolvimento`;
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

/**
 * Personalized / Referral link handler (?ref=instagram, ?ref=amigo, etc.)
 */
function setupReferralLinks() {
  const urlParams = new URLSearchParams(window.location.search);
  const ref = urlParams.get('ref') || urlParams.get('source') || urlParams.get('from');

  const banner = document.getElementById('referralBanner');
  const bannerText = document.getElementById('referralText');

  if (ref && banner && bannerText) {
    sessionStorage.setItem('voxel_ref', ref);
    banner.classList.add('active');

    if (ref.toLowerCase().includes('instagram') || ref.toLowerCase() === 'ig') {
      bannerText.innerHTML = '👋 <b>Comunidade @voxelchat:</b> Seja bem-vindo pelo Instagram! Baixe o instalador oficial ou teste no navegador.';
    } else if (ref.toLowerCase() === 'amigo' || ref.toLowerCase() === 'invite') {
      bannerText.innerHTML = '🎮 <b>Convite VIP:</b> Você foi convidado para testar o Voxel em primeira mão!';
    } else if (ref.toLowerCase() === 'android' || ref.toLowerCase() === 'mobile') {
      bannerText.innerHTML = '📱 <b>Acesso Mobile:</b> Conheça a versão web e APK dedicado para Android do Voxel.';
    } else {
      bannerText.innerHTML = `✨ <b>Origem [${ref.toUpperCase()}]:</b> Bem-vindo ao programa de testes abertos do Voxel!`;
    }
  }
}

/**
 * FAQ Quick Contact Form
 */
function setupFaqContactForm() {
  const form = document.getElementById('faqQuestionForm');
  if (!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const question = document.getElementById('faqQuestionInput')?.value.trim();
    const channel = document.querySelector('input[name="contactChannel"]:checked')?.value || 'instagram';

    if (!question) return;

    // Envia também para o endpoint central da VM da Oracle
    fetch('http://150.230.73.46:4000/api/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Visitante FAQ',
        contact: `Canal: ${channel}`,
        message: question,
        source: 'faq-form'
      })
    }).catch(() => {});

    if (channel === 'instagram') {
      const igUrl = `https://ig.me/m/voxelchat`;
      if (navigator.clipboard?.writeText) {
        navigator.clipboard.writeText(`Dúvida do site Voxel: ${question}`).catch(() => {});
      }
      window.open(igUrl, '_blank') || window.open('https://instagram.com/voxelchat', '_blank');
    } else if (channel === 'email') {
      const subject = encodeURIComponent('Dúvida sobre o Voxel');
      const body = encodeURIComponent(`Olá equipe do Voxel,\n\nTenho a seguinte dúvida:\n${question}`);
      window.location.href = `mailto:contato@voxelchat.app?subject=${subject}&body=${body}`;
    } else if (channel === 'whatsapp') {
      const text = encodeURIComponent(`Olá! Tenho uma dúvida sobre o Voxel:\n${question}`);
      window.open(`https://wa.me/?text=${text}`, '_blank');
    }
  });
}

/**
 * Trigger file download and redirect user to Thank You page
 */
function setupDownloadRedirects() {
  const downloadUrl = 'https://github.com/Fuzzy-Z/voxel-download-page/releases/download/v1.0.58/Voxel.Setup.1.0.58.exe';
  const thankYouTarget = window.location.protocol === 'file:' ? 'obrigado.html?download=auto' : '/obrigado?download=auto';

  const downloadSelectors = [
    '#primaryDownloadBtn',
    '.download-btn-main',
    '.btn-cta-main',
    '.sticky-btn-download',
    'a[href*="Voxel.Setup"]',
    'a[download*="Voxel"]'
  ];

  const downloadElements = document.querySelectorAll(downloadSelectors.join(', '));

  downloadElements.forEach(el => {
    el.addEventListener('click', (e) => {
      e.preventDefault();

      // 1. Trigger the download of the executable
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = 'Voxel Setup 1.0.58.exe';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      // 2. Open / redirect to the thank you page
      setTimeout(() => {
        window.location.href = thankYouTarget;
      }, 350);
    });
  });
}


