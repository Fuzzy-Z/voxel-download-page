/**
 * VOXEL // INTERACTIVE 3D ISOMETRIC ENGINE
 * Pure Canvas 2D isometric ray-projector & voxel sandbox.
 * Zero external libraries, zero bloat, high precision.
 */

class VoxelCanvasEngine {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');
    
    // Grid Configuration
    this.gridSize = 8;
    this.tileSize = 20;
    this.voxels = new Map(); // key "x,y,z" -> { mat: 'slate' }
    
    // Materials Definition (Solid tactile colors)
    this.materials = {
      slate: {
        name: 'Slate',
        top: '#475569',
        left: '#334155',
        right: '#1e293b',
        accent: '#94a3b8'
      },
      obsidian: {
        name: 'Basalt',
        top: '#242e3d',
        left: '#151c27',
        right: '#0d131c',
        accent: '#38475c'
      },
      brass: {
        name: 'Brass',
        top: '#d4a373',
        left: '#b08968',
        right: '#7f5539',
        accent: '#faedcd'
      },
      concrete: {
        name: 'Concrete',
        top: '#94a3b8',
        left: '#64748b',
        right: '#475569',
        accent: '#cbd5e1'
      }
    };

    this.activeMaterial = 'slate';
    this.activeTool = 'add';
    this.wireframeMode = false;
    this.autoRotate = false; // Disabled by default for stability

    // Fixed Isometric Camera View
    this.angle = 0.65;
    this.pitch = 0.60;
    this.zoom = 1.0;
    this.panX = 0;
    this.panY = 0;

    // Interaction State
    this.isDragging = false;
    this.lastMouse = { x: 0, y: 0 };
    this.hoverTarget = null;
    this.mouseMoved = false;

    // Performance Stats
    this.lastTime = performance.now();
    this.fps = 60;
    this.fpsTimer = 0;

    this.init();
  }

  init() {
    this.resize();
    window.addEventListener('resize', () => this.resize());

    // Bind UI & Canvas Events
    this.bindEvents();
    
    // Load Voxel Official Isometric Cluster
    this.loadPreset('monolith');

    // Start Rendering Loop
    requestAnimationFrame((t) => this.renderLoop(t));
  }

  resize() {
    const rect = this.canvas.parentElement.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.width = rect.width;
    this.height = rect.height || 380;
    
    this.canvas.width = this.width * dpr;
    this.canvas.height = this.height * dpr;
    this.ctx.scale(dpr, dpr);
    
    this.originX = this.width / 2 + this.panX;
    this.originY = this.height / 2 + 40 + this.panY;
  }

  bindEvents() {
    this.canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
    window.addEventListener('mousemove', (e) => this.onMouseMove(e));
    window.addEventListener('mouseup', (e) => this.onMouseUp(e));
    this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    // Touch Support
    this.canvas.addEventListener('touchstart', (e) => this.onTouchStart(e), { passive: false });
    this.canvas.addEventListener('touchmove', (e) => this.onTouchMove(e), { passive: false });
    this.canvas.addEventListener('touchend', (e) => this.onTouchEnd(e));

    // Preset buttons
    document.querySelectorAll('[data-preset]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const preset = e.currentTarget.getAttribute('data-preset');
        this.loadPreset(preset);
      });
    });

    // Tool buttons
    document.querySelectorAll('[data-tool]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('[data-tool]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.activeTool = btn.getAttribute('data-tool');
      });
    });

    // Material pills
    document.querySelectorAll('.mat-pill').forEach(pill => {
      pill.addEventListener('click', (e) => {
        document.querySelectorAll('.mat-pill').forEach(p => p.classList.remove('selected'));
        pill.classList.add('selected');
        this.activeMaterial = pill.getAttribute('data-mat');
      });
    });

    // Wireframe Toggle
    const wireBtn = document.getElementById('toggleWireframe');
    if (wireBtn) {
      wireBtn.addEventListener('click', () => {
        this.wireframeMode = !this.wireframeMode;
        wireBtn.classList.toggle('active', this.wireframeMode);
      });
    }

    // Auto Rotate Toggle
    const rotateBtn = document.getElementById('toggleRotate');
    if (rotateBtn) {
      rotateBtn.addEventListener('click', () => {
        this.autoRotate = !this.autoRotate;
        rotateBtn.classList.toggle('active', this.autoRotate);
      });
    }
  }

  setVoxel(x, y, z, mat) {
    const key = `${x},${y},${z}`;
    this.voxels.set(key, { x, y, z, mat: mat || this.activeMaterial });
  }

  removeVoxel(x, y, z) {
    const key = `${x},${y},${z}`;
    this.voxels.delete(key);
  }

  clear() {
    this.voxels.clear();
  }

  loadPreset(preset) {
    this.clear();

    if (preset === 'monolith') {
      // Recreates the authentic solid Voxel geometric cluster
      // Ground foundation
      this.setVoxel(-1, -1, 0, 'obsidian');
      this.setVoxel(0, -1, 0, 'obsidian');
      this.setVoxel(1, -1, 0, 'obsidian');
      this.setVoxel(-1, 0, 0, 'obsidian');
      this.setVoxel(0, 0, 0, 'obsidian');
      this.setVoxel(1, 0, 0, 'obsidian');

      // Tier 1
      this.setVoxel(-1, 0, 1, 'slate');
      this.setVoxel(0, 0, 1, 'slate');
      this.setVoxel(1, 0, 1, 'slate');
      this.setVoxel(0, -1, 1, 'slate');

      // Tier 2 (Central column)
      this.setVoxel(-1, 0, 2, 'concrete');
      this.setVoxel(0, 0, 2, 'slate');
      this.setVoxel(1, 0, 2, 'slate');

      // Crown
      this.setVoxel(0, 0, 3, 'concrete');
      this.setVoxel(0, -1, 2, 'brass');
      this.setVoxel(1, 0, 3, 'brass');
    } else if (preset === 'arch') {
      // Architectural Portal
      for (let z = 0; z <= 4; z++) {
        this.setVoxel(-2, 0, z, 'obsidian');
        this.setVoxel(2, 0, z, 'obsidian');
      }
      this.setVoxel(-1, 0, 4, 'slate');
      this.setVoxel(0, 0, 4, 'brass');
      this.setVoxel(1, 0, 4, 'slate');
      this.setVoxel(0, 0, 0, 'concrete');
    } else if (preset === 'slab') {
      // Flat 4x4 builder slab
      for (let x = -2; x <= 2; x++) {
        for (let y = -2; y <= 2; y++) {
          this.setVoxel(x, y, 0, 'slate');
        }
      }
    }
  }

  // 3D Isometric Projection
  project(x, y, z) {
    const cos = Math.cos(this.angle);
    const sin = Math.sin(this.angle);

    // Rotate around Z
    const rx = x * cos - y * sin;
    const ry = x * sin + y * cos;

    // Isometric projection
    const isoX = (rx - ry) * (this.tileSize * this.zoom) * 0.866;
    const isoY = (rx + ry) * (this.tileSize * this.zoom) * 0.5 * this.pitch - z * (this.tileSize * this.zoom);

    return {
      x: this.originX + isoX,
      y: this.originY + isoY,
      depth: rx + ry + z * 1.5
    };
  }

  onMouseDown(e) {
    this.isDragging = true;
    this.mouseMoved = false;
    this.lastMouse = { x: e.clientX, y: e.clientY };
  }

  onMouseMove(e) {
    const rect = this.canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    if (this.isDragging) {
      const dx = e.clientX - this.lastMouse.x;
      const dy = e.clientY - this.lastMouse.y;

      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
        this.mouseMoved = true;
      }

      this.angle += dx * 0.007;
      this.pitch = Math.max(0.3, Math.min(1.0, this.pitch + dy * 0.003));
      this.lastMouse = { x: e.clientX, y: e.clientY };
    } else {
      this.updateHover(mouseX, mouseY);
    }
  }

  onMouseUp(e) {
    if (!this.mouseMoved && e.target === this.canvas) {
      const isRightClick = e.button === 2;
      
      if (isRightClick || this.activeTool === 'remove') {
        if (this.hoverTarget) {
          this.removeVoxel(this.hoverTarget.x, this.hoverTarget.y, this.hoverTarget.z);
        }
      } else if (this.activeTool === 'add') {
        if (this.hoverTarget && this.hoverTarget.addPos) {
          const { x, y, z } = this.hoverTarget.addPos;
          this.setVoxel(x, y, z, this.activeMaterial);
        } else {
          this.setVoxel(0, 0, 0, this.activeMaterial);
        }
      }
    }

    this.isDragging = false;
  }

  onTouchStart(e) {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      this.isDragging = true;
      this.mouseMoved = false;
      this.lastMouse = { x: touch.clientX, y: touch.clientY };
    }
  }

  onTouchMove(e) {
    if (this.isDragging && e.touches.length === 1) {
      e.preventDefault();
      const touch = e.touches[0];
      const dx = touch.clientX - this.lastMouse.x;
      const dy = touch.clientY - this.lastMouse.y;

      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
        this.mouseMoved = true;
      }

      this.angle += dx * 0.007;
      this.pitch = Math.max(0.3, Math.min(1.0, this.pitch + dy * 0.003));
      this.lastMouse = { x: touch.clientX, y: touch.clientY };
    }
  }

  onTouchEnd(e) {
    this.isDragging = false;
  }

  updateHover(mouseX, mouseY) {
    const voxelList = Array.from(this.voxels.values());
    const cos = Math.cos(this.angle);
    const sin = Math.sin(this.angle);

    voxelList.sort((a, b) => {
      const da = (a.x * cos + a.y * sin) + a.z * 1.5;
      const db = (b.x * cos + b.y * sin) + b.z * 1.5;
      return db - da;
    });

    let found = null;
    const s = this.tileSize * this.zoom;

    for (const v of voxelList) {
      const p = this.project(v.x, v.y, v.z);
      const dist = Math.hypot(p.x - mouseX, p.y - mouseY);
      if (dist < s * 1.2) {
        const dy = mouseY - p.y;
        let addPos = { x: v.x, y: v.y, z: v.z + 1 };
        if (dy > s * 0.2) {
          addPos = { x: v.x + 1, y: v.y, z: v.z };
        }
        found = { ...v, addPos };
        break;
      }
    }

    this.hoverTarget = found;
  }

  renderLoop(time) {
    const dt = (time - this.lastTime) / 1000;
    this.lastTime = time;

    this.fpsTimer += dt;
    if (this.fpsTimer >= 0.5) {
      this.fps = Math.round(1 / dt);
      this.fpsTimer = 0;
      const fpsEl = document.getElementById('voxelFps');
      if (fpsEl) fpsEl.textContent = `${this.fps} FPS`;
    }

    if (this.autoRotate && !this.isDragging) {
      this.angle += dt * 0.20;
    }

    this.render();
    requestAnimationFrame((t) => this.renderLoop(t));
  }

  render() {
    this.ctx.clearRect(0, 0, this.width, this.height);

    // 1. Base Grid Blueprint Lines
    this.drawGridBase();

    // 2. Sort Voxels (Back to Front)
    const voxelList = Array.from(this.voxels.values());
    const cos = Math.cos(this.angle);
    const sin = Math.sin(this.angle);

    voxelList.sort((a, b) => {
      const da = (a.x * cos + a.y * sin) + a.z * 1.5;
      const db = (b.x * cos + b.y * sin) + b.z * 1.5;
      return da - db;
    });

    // 3. Render Voxels
    for (const v of voxelList) {
      this.drawVoxel(v.x, v.y, v.z, v.mat, false);
    }

    // 4. Ghost Box on Hover
    if (this.hoverTarget && this.activeTool === 'add' && this.hoverTarget.addPos) {
      const p = this.hoverTarget.addPos;
      this.drawVoxel(p.x, p.y, p.z, this.activeMaterial, true);
    }
  }

  drawGridBase() {
    const half = 3;
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    this.ctx.lineWidth = 1;

    for (let x = -half; x <= half; x++) {
      const p1 = this.project(x, -half, 0);
      const p2 = this.project(x, half, 0);
      this.ctx.beginPath();
      this.ctx.moveTo(p1.x, p1.y);
      this.ctx.lineTo(p2.x, p2.y);
      this.ctx.stroke();
    }

    for (let y = -half; y <= half; y++) {
      const p1 = this.project(-half, y, 0);
      const p2 = this.project(half, y, 0);
      this.ctx.beginPath();
      this.ctx.moveTo(p1.x, p1.y);
      this.ctx.lineTo(p2.x, p2.y);
      this.ctx.stroke();
    }
  }

  drawVoxel(vx, vy, vz, matName, isGhost = false) {
    const mat = this.materials[matName] || this.materials.slate;
    const s = this.tileSize * this.zoom;
    const w = s * 0.866;
    const h = s * 0.5 * this.pitch;
    const p = this.project(vx, vy, vz);

    const cx = p.x;
    const cy = p.y;

    this.ctx.save();

    if (isGhost) {
      this.ctx.globalAlpha = 0.45;
      this.ctx.setLineDash([2, 2]);
    }

    if (this.wireframeMode) {
      this.ctx.strokeStyle = isGhost ? 'rgba(212, 163, 115, 0.8)' : '#e2e8f0';
      this.ctx.lineWidth = 1.2;

      // Top face
      this.ctx.beginPath();
      this.ctx.moveTo(cx, cy - h);
      this.ctx.lineTo(cx + w, cy);
      this.ctx.lineTo(cx, cy + h);
      this.ctx.lineTo(cx - w, cy);
      this.ctx.closePath();
      this.ctx.stroke();

      // Vertical edges
      this.ctx.beginPath();
      this.ctx.moveTo(cx - w, cy);
      this.ctx.lineTo(cx - w, cy + s);
      this.ctx.moveTo(cx + w, cy);
      this.ctx.lineTo(cx + w, cy + s);
      this.ctx.moveTo(cx, cy + h);
      this.ctx.lineTo(cx, cy + h + s);
      this.ctx.stroke();

      // Bottom
      this.ctx.beginPath();
      this.ctx.moveTo(cx - w, cy + s);
      this.ctx.lineTo(cx, cy + h + s);
      this.ctx.lineTo(cx + w, cy + s);
      this.ctx.stroke();
    } else {
      // Solid Shaded Isometric Cube with clean tactile edges

      // Top Face
      this.ctx.fillStyle = mat.top;
      this.ctx.beginPath();
      this.ctx.moveTo(cx, cy - h);
      this.ctx.lineTo(cx + w, cy);
      this.ctx.lineTo(cx, cy + h);
      this.ctx.lineTo(cx - w, cy);
      this.ctx.closePath();
      this.ctx.fill();

      // Contour stroke
      this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
      this.ctx.lineWidth = 0.8;
      this.ctx.stroke();

      // Left Face
      this.ctx.fillStyle = mat.left;
      this.ctx.beginPath();
      this.ctx.moveTo(cx - w, cy);
      this.ctx.lineTo(cx, cy + h);
      this.ctx.lineTo(cx, cy + h + s);
      this.ctx.lineTo(cx - w, cy + s);
      this.ctx.closePath();
      this.ctx.fill();

      this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.28)';
      this.ctx.stroke();

      // Right Face
      this.ctx.fillStyle = mat.right;
      this.ctx.beginPath();
      this.ctx.moveTo(cx, cy + h);
      this.ctx.lineTo(cx + w, cy);
      this.ctx.lineTo(cx + w, cy + s);
      this.ctx.lineTo(cx, cy + h + s);
      this.ctx.closePath();
      this.ctx.fill();

      this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.42)';
      this.ctx.stroke();
    }

    this.ctx.restore();
  }
}

// Instantiate on DOM load
document.addEventListener('DOMContentLoaded', () => {
  window.voxelEngine = new VoxelCanvasEngine('voxelCanvas');
});
