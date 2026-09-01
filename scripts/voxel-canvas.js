/**
 * VOXEL // INTERACTIVE ISOMETRIC 3D ENGINE
 * Pure mathematical isometric projection aligned 100% to floor grid.
 * Zero jitter, zero floating, pixel-perfect alignment.
 */

class VoxelCanvasEngine {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');

    // Isometric Projection Geometry Constants
    this.tileW = 36; // Diamond width (px)
    this.tileH = 20; // Diamond height (px)
    this.tileD = 22; // Voxel vertical extrusion height (px)
    this.gridRadius = 3; // -3 to +3 (7x7 floor grid)

    this.voxels = new Map(); // key "x,y,z" -> { x, y, z, mat }

    // Color/Material Themes (Solid, Raw, Tactile)
    this.materials = {
      slate: {
        name: 'Slate',
        top: '#475569',
        left: '#334155',
        right: '#1e293b',
        border: 'rgba(255, 255, 255, 0.15)'
      },
      obsidian: {
        name: 'Basalt',
        top: '#242e3d',
        left: '#151c27',
        right: '#0b1017',
        border: 'rgba(255, 255, 255, 0.12)'
      },
      brass: {
        name: 'Brass',
        top: '#d4a373',
        left: '#b08968',
        right: '#7f5539',
        border: 'rgba(250, 237, 205, 0.3)'
      },
      concrete: {
        name: 'Concrete',
        top: '#94a3b8',
        left: '#64748b',
        right: '#475569',
        border: 'rgba(255, 255, 255, 0.2)'
      }
    };

    this.activeMaterial = 'slate';
    this.activeTool = 'add'; // 'add' or 'remove'
    this.wireframeMode = false;
    this.autoRotate = false;

    // Camera rotation steps (0 = 0°, 1 = 90°, 2 = 180°, 3 = 270°)
    this.rotStep = 0;
    this.panX = 0;
    this.panY = 0;

    // Hover raycast state
    this.hover = null; // { x, y, z, face: 'top'|'left'|'right'|'floor', addPos: {x,y,z} }

    // Performance
    this.lastTime = performance.now();
    this.fps = 60;
    this.fpsTimer = 0;

    this.init();
  }

  init() {
    this.resize();
    window.addEventListener('resize', () => this.resize());
    this.bindEvents();
    this.loadPreset('monolith');
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

    // Center point for isometric origin
    this.originX = this.width / 2 + this.panX;
    this.originY = this.height / 2 + 35 + this.panY;
  }

  bindEvents() {
    this.canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
    this.canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
    this.canvas.addEventListener('mouseleave', () => { this.hover = null; });
    this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    // Presets
    document.querySelectorAll('[data-preset]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const p = e.currentTarget.getAttribute('data-preset');
        this.loadPreset(p);
      });
    });

    // Tools (Add / Remove)
    document.querySelectorAll('[data-tool]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('[data-tool]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.activeTool = btn.getAttribute('data-tool');
      });
    });

    // Materials
    document.querySelectorAll('.mat-pill').forEach(pill => {
      pill.addEventListener('click', (e) => {
        document.querySelectorAll('.mat-pill').forEach(p => p.classList.remove('selected'));
        pill.classList.add('selected');
        this.activeMaterial = pill.getAttribute('data-mat');
      });
    });

    // Wireframe
    const wireBtn = document.getElementById('toggleWireframe');
    if (wireBtn) {
      wireBtn.addEventListener('click', () => {
        this.wireframeMode = !this.wireframeMode;
        wireBtn.classList.toggle('active', this.wireframeMode);
      });
    }

    // Rotate Camera (90 degrees step per click)
    const rotateBtn = document.getElementById('toggleRotate');
    if (rotateBtn) {
      rotateBtn.addEventListener('click', () => {
        this.rotStep = (this.rotStep + 1) % 4;
      });
    }
  }

  // Rotate world coordinates by current camera step
  transformCoords(x, y) {
    switch (this.rotStep) {
      case 1: return { rx: -y, ry: x };
      case 2: return { rx: -x, ry: -y };
      case 3: return { rx: y, ry: -x };
      default: return { rx: x, ry: y };
    }
  }

  invTransformCoords(rx, ry) {
    switch (this.rotStep) {
      case 1: return { x: ry, y: -rx };
      case 2: return { x: -rx, y: -ry };
      case 3: return { x: -ry, y: rx };
      default: return { x: rx, y: ry };
    }
  }

  // Pure 2:1 Isometric Projection
  // Returns screen center of the base diamond for integer voxel (x,y,z)
  project(x, y, z) {
    const { rx, ry } = this.transformCoords(x, y);
    const sx = this.originX + (rx - ry) * (this.tileW / 2);
    const sy = this.originY + (rx + ry) * (this.tileH / 2) - z * this.tileD;
    const depth = (rx + ry) * 10 + z;
    return { sx, sy, depth };
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
      // Iconic Voxel Stepped Cluster sitting flush on the floor grid
      // Foundation (z = 0)
      this.setVoxel(-1, -1, 0, 'obsidian');
      this.setVoxel(0, -1, 0, 'obsidian');
      this.setVoxel(1, -1, 0, 'obsidian');
      this.setVoxel(-1, 0, 0, 'obsidian');
      this.setVoxel(0, 0, 0, 'obsidian');
      this.setVoxel(1, 0, 0, 'obsidian');
      this.setVoxel(0, 1, 0, 'obsidian');

      // Tier 1 (z = 1)
      this.setVoxel(-1, 0, 1, 'slate');
      this.setVoxel(0, 0, 1, 'slate');
      this.setVoxel(1, 0, 1, 'slate');
      this.setVoxel(0, -1, 1, 'slate');

      // Tier 2 (z = 2)
      this.setVoxel(-1, 0, 2, 'concrete');
      this.setVoxel(0, 0, 2, 'slate');
      this.setVoxel(1, 0, 2, 'slate');

      // Tier 3 Spire & Brass Accent (z = 3)
      this.setVoxel(0, 0, 3, 'concrete');
      this.setVoxel(1, 0, 3, 'brass');
    } else if (preset === 'arch') {
      // Clean Portal on Floor Grid
      for (let z = 0; z <= 3; z++) {
        this.setVoxel(-1, 0, z, 'obsidian');
        this.setVoxel(1, 0, z, 'obsidian');
      }
      this.setVoxel(-1, 0, 4, 'slate');
      this.setVoxel(0, 0, 4, 'brass');
      this.setVoxel(1, 0, 4, 'slate');
      this.setVoxel(0, 0, 0, 'concrete');
    } else if (preset === 'slab') {
      // Pure 3x3 base slab
      for (let x = -1; x <= 1; x++) {
        for (let y = -1; y <= 1; y++) {
          this.setVoxel(x, y, 0, 'slate');
        }
      }
    }
  }

  onMouseMove(e) {
    const rect = this.canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    this.updateHover(mx, my);
  }

  onMouseDown(e) {
    if (!this.hover) return;

    const isRightClick = e.button === 2;

    if (isRightClick || this.activeTool === 'remove') {
      if (this.hover.isVoxel) {
        this.removeVoxel(this.hover.x, this.hover.y, this.hover.z);
        this.hover = null;
      }
    } else if (this.activeTool === 'add') {
      if (this.hover.addPos) {
        const { x, y, z } = this.hover.addPos;
        this.setVoxel(x, y, z, this.activeMaterial);
      }
    }
  }

  updateHover(mx, my) {
    const hw = this.tileW / 2;
    const hh = this.tileH / 2;
    const hd = this.tileD;

    // 1. Check existing voxels from top to bottom (depth sorted)
    const list = Array.from(this.voxels.values());
    list.sort((a, b) => {
      const da = this.project(a.x, a.y, a.z).depth;
      const db = this.project(b.x, b.y, b.z).depth;
      return db - da; // front-most first
    });

    for (const v of list) {
      const p = this.project(v.x, v.y, v.z);
      const sx = p.sx;
      const baseSy = p.sy;
      const topSy = baseSy - hd;

      // Test Top Face (Diamond at topSy)
      const dxTop = Math.abs(mx - sx);
      const dyTop = Math.abs(my - topSy);
      if (dxTop / hw + dyTop / hh <= 1.0) {
        this.hover = {
          x: v.x, y: v.y, z: v.z,
          isVoxel: true,
          face: 'top',
          addPos: { x: v.x, y: v.y, z: v.z + 1 }
        };
        return;
      }

      // Test Left Face (Quad between sx-hw and sx, topSy+hh to baseSy+hh)
      if (mx >= sx - hw && mx <= sx && my >= topSy && my <= baseSy + hh) {
        // Precise diagonal check for left face
        const relX = (mx - (sx - hw)) / hw; // 0 to 1
        const topY = topSy - hh * (1 - relX) + hh * relX;
        if (my >= topY && my <= topY + hd) {
          const { x: ax, y: ay } = this.invTransformCoords(-1, 0);
          this.hover = {
            x: v.x, y: v.y, z: v.z,
            isVoxel: true,
            face: 'left',
            addPos: { x: v.x + ax, y: v.y + ay, z: v.z }
          };
          return;
        }
      }

      // Test Right Face (Quad between sx and sx+hw)
      if (mx >= sx && mx <= sx + hw && my >= topSy && my <= baseSy + hh) {
        const relX = (mx - sx) / hw; // 0 to 1
        const topY = topSy + hh * (1 - relX) - hh * relX;
        if (my >= topY && my <= topY + hd) {
          const { x: ax, y: ay } = this.invTransformCoords(0, 1);
          this.hover = {
            x: v.x, y: v.y, z: v.z,
            isVoxel: true,
            face: 'right',
            addPos: { x: v.x + ax, y: v.y + ay, z: v.z }
          };
          return;
        }
      }
    }

    // 2. If no voxel hovered, test Floor Grid (z = 0)
    for (let x = -this.gridRadius; x <= this.gridRadius; x++) {
      for (let y = -this.gridRadius; y <= this.gridRadius; y++) {
        const p = this.project(x, y, 0);
        const dx = Math.abs(mx - p.sx);
        const dy = Math.abs(my - p.sy);
        if (dx / hw + dy / hh <= 1.0) {
          // Check if voxel already exists at (x,y,0)
          if (!this.voxels.has(`${x},${y},0`)) {
            this.hover = {
              x, y, z: 0,
              isVoxel: false,
              face: 'floor',
              addPos: { x, y, z: 0 }
            };
            return;
          }
        }
      }
    }

    this.hover = null;
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

    this.render();
    requestAnimationFrame((t) => this.renderLoop(t));
  }

  render() {
    this.ctx.clearRect(0, 0, this.width, this.height);

    // 1. Draw Floor Grid (Sitting at z = 0)
    this.drawFloorGrid();

    // 2. Sort Voxels Back to Front
    const list = Array.from(this.voxels.values());
    list.sort((a, b) => {
      const da = this.project(a.x, a.y, a.z).depth;
      const db = this.project(b.x, b.y, b.z).depth;
      return da - db; // Draw back to front
    });

    // 3. Render Solid/Wireframe Voxels
    for (const v of list) {
      this.drawVoxel(v.x, v.y, v.z, v.mat, false);
    }

    // 4. Render Hover Ghost Block
    if (this.hover && this.activeTool === 'add' && this.hover.addPos) {
      const p = this.hover.addPos;
      this.drawVoxel(p.x, p.y, p.z, this.activeMaterial, true);
    }
  }

  // Draws the isometric diamond floor grid with aligned tiles
  drawFloorGrid() {
    const r = this.gridRadius;
    const hw = this.tileW / 2;
    const hh = this.tileH / 2;

    this.ctx.save();

    // Draw Floor Tiles
    for (let x = -r; x <= r; x++) {
      for (let y = -r; y <= r; y++) {
        const p = this.project(x, y, 0);
        const isHovered = this.hover && !this.hover.isVoxel && this.hover.x === x && this.hover.y === y;

        this.ctx.beginPath();
        this.ctx.moveTo(p.sx, p.sy - hh);
        this.ctx.lineTo(p.sx + hw, p.sy);
        this.ctx.lineTo(p.sx, p.sy + hh);
        this.ctx.lineTo(p.sx - hw, p.sy);
        this.ctx.closePath();

        if (isHovered) {
          this.ctx.fillStyle = 'rgba(212, 163, 115, 0.15)';
          this.ctx.fill();
          this.ctx.strokeStyle = 'rgba(212, 163, 115, 0.6)';
          this.ctx.lineWidth = 1.2;
        } else {
          this.ctx.fillStyle = ((x + y) % 2 === 0) ? 'rgba(255, 255, 255, 0.015)' : 'rgba(0, 0, 0, 0.15)';
          this.ctx.fill();
          this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
          this.ctx.lineWidth = 1;
        }
        this.ctx.stroke();
      }
    }

    this.ctx.restore();
  }

  // Draw a single voxel cube perfectly aligned with the floor grid
  drawVoxel(x, y, z, matName, isGhost = false) {
    const mat = this.materials[matName] || this.materials.slate;
    const hw = this.tileW / 2;
    const hh = this.tileH / 2;
    const hd = this.tileD;

    const p = this.project(x, y, z);
    const sx = p.sx;
    const baseSy = p.sy;
    const topSy = baseSy - hd;

    this.ctx.save();

    if (isGhost) {
      this.ctx.globalAlpha = 0.45;
      this.ctx.setLineDash([3, 2]);
    }

    if (this.wireframeMode) {
      this.ctx.strokeStyle = isGhost ? 'rgba(212, 163, 115, 0.8)' : '#e2e8f0';
      this.ctx.lineWidth = 1.2;

      // Top diamond
      this.ctx.beginPath();
      this.ctx.moveTo(sx, topSy - hh);
      this.ctx.lineTo(sx + hw, topSy);
      this.ctx.lineTo(sx, topSy + hh);
      this.ctx.lineTo(sx - hw, topSy);
      this.ctx.closePath();
      this.ctx.stroke();

      // Vertical edges
      this.ctx.beginPath();
      this.ctx.moveTo(sx - hw, topSy);
      this.ctx.lineTo(sx - hw, baseSy);
      this.ctx.moveTo(sx + hw, topSy);
      this.ctx.lineTo(sx + hw, baseSy);
      this.ctx.moveTo(sx, topSy + hh);
      this.ctx.lineTo(sx, baseSy + hh);
      this.ctx.stroke();

      // Bottom contour
      this.ctx.beginPath();
      this.ctx.moveTo(sx - hw, baseSy);
      this.ctx.lineTo(sx, baseSy + hh);
      this.ctx.lineTo(sx + hw, baseSy);
      this.ctx.stroke();
    } else {
      // 1. TOP FACE (Diamond at topSy)
      this.ctx.fillStyle = mat.top;
      this.ctx.beginPath();
      this.ctx.moveTo(sx, topSy - hh);
      this.ctx.lineTo(sx + hw, topSy);
      this.ctx.lineTo(sx, topSy + hh);
      this.ctx.lineTo(sx - hw, topSy);
      this.ctx.closePath();
      this.ctx.fill();

      this.ctx.strokeStyle = mat.border || 'rgba(255, 255, 255, 0.15)';
      this.ctx.lineWidth = 0.8;
      this.ctx.stroke();

      // 2. LEFT FACE (Mid tone shadow)
      this.ctx.fillStyle = mat.left;
      this.ctx.beginPath();
      this.ctx.moveTo(sx - hw, topSy);
      this.ctx.lineTo(sx, topSy + hh);
      this.ctx.lineTo(sx, baseSy + hh);
      this.ctx.lineTo(sx - hw, baseSy);
      this.ctx.closePath();
      this.ctx.fill();

      this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.25)';
      this.ctx.stroke();

      // 3. RIGHT FACE (Deep shadow)
      this.ctx.fillStyle = mat.right;
      this.ctx.beginPath();
      this.ctx.moveTo(sx, topSy + hh);
      this.ctx.lineTo(sx + hw, topSy);
      this.ctx.lineTo(sx + hw, baseSy);
      this.ctx.lineTo(sx, baseSy + hh);
      this.ctx.closePath();
      this.ctx.fill();

      this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.4)';
      this.ctx.stroke();
    }

    this.ctx.restore();
  }
}

// Instantiate on DOM load
document.addEventListener('DOMContentLoaded', () => {
  window.voxelEngine = new VoxelCanvasEngine('voxelCanvas');
});
