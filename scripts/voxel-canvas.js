/**
 * VOXEL // INTERACTIVE 3D ENGINE
 * Real-time 3D camera with free orbit, dynamic lighting and 100% floor-grid alignment.
 * Zero external libraries, zero bloat, mathematically unified 3D pipeline.
 */

class VoxelCanvasEngine {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');

    // 3D Voxel Unit Scale (pixels per 1.0 unit in 3D world)
    this.scale = 22;
    this.gridRadius = 3; // -3 to +3 (7x7 floor grid)

    this.voxels = new Map(); // key "x,y,z" -> { x, y, z, mat }

    // Raw Material Palette
    this.materials = {
      slate: {
        name: 'Slate',
        color: [71, 85, 105], // #475569
        border: 'rgba(255, 255, 255, 0.12)'
      },
      obsidian: {
        name: 'Basalt',
        color: [36, 46, 61], // #242e3d
        border: 'rgba(255, 255, 255, 0.10)'
      },
      brass: {
        name: 'Brass',
        color: [212, 163, 115], // #d4a373
        border: 'rgba(250, 237, 205, 0.25)'
      },
      concrete: {
        name: 'Concrete',
        color: [148, 163, 184], // #94a3b8
        border: 'rgba(255, 255, 255, 0.15)'
      }
    };

    this.activeMaterial = 'slate';
    this.activeTool = 'add';
    this.wireframeMode = false;
    this.autoRotate = false;

    // Free 3D Camera Angles (Yaw, Pitch)
    this.yaw = Math.PI / 4 + 0.1; // ~45 deg
    this.pitch = 0.58; // ~33 deg elevation
    this.panX = 0;
    this.panY = 0;

    // Orbit Interaction State
    this.isDragging = false;
    this.lastMouse = { x: 0, y: 0 };
    this.mouseMoved = false;
    this.hover = null; // { isVoxel, x, y, z, normal, addPos }

    // Light direction vector (normalized) in world space
    this.lightDir = this.normalizeVector({ x: 0.4, y: -0.6, z: 0.8 });

    // FPS
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

    this.originX = this.width / 2 + this.panX;
    this.originY = this.height / 2 + 35 + this.panY;
  }

  bindEvents() {
    this.canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
    window.addEventListener('mousemove', (e) => this.onMouseMove(e));
    window.addEventListener('mouseup', (e) => this.onMouseUp(e));
    this.canvas.addEventListener('mouseleave', () => { if (!this.isDragging) this.hover = null; });
    this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    // Touch Support
    this.canvas.addEventListener('touchstart', (e) => this.onTouchStart(e), { passive: false });
    this.canvas.addEventListener('touchmove', (e) => this.onTouchMove(e), { passive: false });
    this.canvas.addEventListener('touchend', (e) => this.onTouchEnd(e));

    // Presets
    document.querySelectorAll('[data-preset]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const p = e.currentTarget.getAttribute('data-preset');
        this.loadPreset(p);
      });
    });

    // Tools
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

    // Auto Rotate Toggle
    const rotateBtn = document.getElementById('toggleRotate');
    if (rotateBtn) {
      rotateBtn.addEventListener('click', () => {
        this.autoRotate = !this.autoRotate;
        rotateBtn.classList.toggle('active', this.autoRotate);
      });
    }
  }

  normalizeVector(v) {
    const len = Math.hypot(v.x, v.y, v.z) || 1;
    return { x: v.x / len, y: v.y / len, z: v.z / len };
  }

  // 3D to 2D Screen Projection
  project(x, y, z) {
    const cosY = Math.cos(this.yaw);
    const sinY = Math.sin(this.yaw);
    const cosP = Math.cos(this.pitch);
    const sinP = Math.sin(this.pitch);

    // 1. Rotate around Z (Yaw)
    const x1 = x * cosY - y * sinY;
    const y1 = x * sinY + y * cosY;
    const z1 = z;

    // 2. Rotate around X (Pitch / Elevation)
    const x2 = x1;
    const y2 = y1 * cosP - z1 * sinP;
    const z2 = y1 * sinP + z1 * cosP; // Depth along camera axis

    return {
      sx: this.originX + x2 * this.scale,
      sy: this.originY - y2 * this.scale,
      depth: z2
    };
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
      // Authentic Voxel stepped cluster sitting perfectly on floor grid
      // Ground foundation (z = 0)
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
      // Portal Preset
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

  // Mouse & Touch Camera Orbit Controls
  onMouseDown(e) {
    this.isDragging = true;
    this.mouseMoved = false;
    this.lastMouse = { x: e.clientX, y: e.clientY };
  }

  onMouseMove(e) {
    const rect = this.canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    if (this.isDragging) {
      const dx = e.clientX - this.lastMouse.x;
      const dy = e.clientY - this.lastMouse.y;

      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
        this.mouseMoved = true;
      }

      this.yaw += dx * 0.008;
      this.pitch = Math.max(0.15, Math.min(1.25, this.pitch + dy * 0.005));
      this.lastMouse = { x: e.clientX, y: e.clientY };
      this.hover = null;
    } else {
      this.updateHover(mx, my);
    }
  }

  onMouseUp(e) {
    if (!this.mouseMoved && e.target === this.canvas && this.hover) {
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

      this.yaw += dx * 0.008;
      this.pitch = Math.max(0.15, Math.min(1.25, this.pitch + dy * 0.005));
      this.lastMouse = { x: touch.clientX, y: touch.clientY };
    }
  }

  onTouchEnd(e) {
    this.isDragging = false;
  }

  // Point in Polygon Test for precise face raycasting
  pointInPoly(px, py, poly) {
    let inside = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const xi = poly[i].sx, yi = poly[i].sy;
      const xj = poly[j].sx, yj = poly[j].sy;
      const intersect = ((yi > py) !== (yj > py)) && (px < (xj - xi) * (py - yi) / (yj - yi) + xi);
      if (intersect) inside = !inside;
    }
    return inside;
  }

  // Raycast all polygons (faces) from front to back
  updateHover(mx, my) {
    const polygons = this.generateScenePolygons();
    // Sort from front-most (highest depth) to back-most
    polygons.sort((a, b) => b.depth - a.depth);

    for (const poly of polygons) {
      if (this.pointInPoly(mx, my, poly.points)) {
        this.hover = poly.hoverData;
        return;
      }
    }

    this.hover = null;
  }

  // Generates 3D quad polygons for all visible faces of voxels and floor grid
  generateScenePolygons() {
    const polys = [];

    // 1. Floor Grid Tiles (Sitting at Z = 0)
    const r = this.gridRadius;
    for (let x = -r; x <= r; x++) {
      for (let y = -r; y <= r; y++) {
        // Floor tile corners: (x±0.5, y±0.5, 0)
        const p1 = this.project(x - 0.5, y - 0.5, 0);
        const p2 = this.project(x + 0.5, y - 0.5, 0);
        const p3 = this.project(x + 0.5, y + 0.5, 0);
        const p4 = this.project(x - 0.5, y + 0.5, 0);

        const depth = (p1.depth + p2.depth + p3.depth + p4.depth) / 4;

        polys.push({
          type: 'floor',
          x, y, z: 0,
          depth,
          points: [p1, p2, p3, p4],
          hoverData: {
            isVoxel: false,
            x, y, z: 0,
            normal: { x: 0, y: 0, z: 1 },
            addPos: { x, y, z: 0 }
          }
        });
      }
    }

    // 2. Voxel Cube Faces (6 faces per cube)
    const faceDefs = [
      // Top (+Z)
      { normal: { x: 0, y: 0, z: 1 }, getVerts: (x,y,z) => [ [x-0.5, y-0.5, z+1], [x+0.5, y-0.5, z+1], [x+0.5, y+0.5, z+1], [x-0.5, y+0.5, z+1] ] },
      // Bottom (-Z)
      { normal: { x: 0, y: 0, z: -1 }, getVerts: (x,y,z) => [ [x-0.5, y-0.5, z], [x-0.5, y+0.5, z], [x+0.5, y+0.5, z], [x+0.5, y-0.5, z] ] },
      // Front (+Y)
      { normal: { x: 0, y: 1, z: 0 }, getVerts: (x,y,z) => [ [x-0.5, y+0.5, z], [x+0.5, y+0.5, z], [x+0.5, y+0.5, z+1], [x-0.5, y+0.5, z+1] ] },
      // Back (-Y)
      { normal: { x: 0, y: -1, z: 0 }, getVerts: (x,y,z) => [ [x-0.5, y-0.5, z], [x-0.5, y-0.5, z+1], [x+0.5, y-0.5, z+1], [x+0.5, y-0.5, z] ] },
      // Right (+X)
      { normal: { x: 1, y: 0, z: 0 }, getVerts: (x,y,z) => [ [x+0.5, y-0.5, z], [x+0.5, y+0.5, z], [x+0.5, y+0.5, z+1], [x+0.5, y-0.5, z+1] ] },
      // Left (-X)
      { normal: { x: -1, y: 0, z: 0 }, getVerts: (x,y,z) => [ [x-0.5, y-0.5, z], [x-0.5, y-0.5, z+1], [x-0.5, y+0.5, z+1], [x-0.5, y+0.5, z] ] }
    ];

    const cosY = Math.cos(this.yaw);
    const sinY = Math.sin(this.yaw);
    const cosP = Math.cos(this.pitch);
    const sinP = Math.sin(this.pitch);

    for (const v of this.voxels.values()) {
      for (const fd of faceDefs) {
        // Compute Camera-Space Normal to test Backface Culling
        const nx = fd.normal.x * cosY - fd.normal.y * sinY;
        const ny = fd.normal.x * sinY + fd.normal.y * cosY;
        const camNormalZ = ny * sinP + fd.normal.z * cosP;

        // If face points towards camera (camNormalZ > 0)
        if (camNormalZ > 0.001) {
          const rawVerts = fd.getVerts(v.x, v.y, v.z);
          const pts = rawVerts.map(pt => this.project(pt[0], pt[1], pt[2]));
          const depth = (pts[0].depth + pts[1].depth + pts[2].depth + pts[3].depth) / 4;

          // Compute Light Shading (dot product with light vector)
          const dot = Math.max(0, fd.normal.x * this.lightDir.x + fd.normal.y * this.lightDir.y + fd.normal.z * this.lightDir.z);
          const lightFactor = 0.45 + 0.55 * dot; // Ambient + Diffuse

          polys.push({
            type: 'voxel',
            x: v.x, y: v.y, z: v.z,
            mat: v.mat,
            normal: fd.normal,
            depth,
            points: pts,
            lightFactor,
            hoverData: {
              isVoxel: true,
              x: v.x, y: v.y, z: v.z,
              normal: fd.normal,
              addPos: {
                x: v.x + fd.normal.x,
                y: v.y + fd.normal.y,
                z: v.z + fd.normal.z
              }
            }
          });
        }
      }
    }

    return polys;
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
      this.yaw += dt * 0.25;
    }

    this.render();
    requestAnimationFrame((t) => this.renderLoop(t));
  }

  render() {
    this.ctx.clearRect(0, 0, this.width, this.height);

    // 1. Generate & Sort all 3D Polygons (Back to Front)
    const polys = this.generateScenePolygons();
    polys.sort((a, b) => a.depth - b.depth); // Painter's Algorithm

    // 2. Draw Floor Grid & Voxels
    for (const poly of polys) {
      if (poly.type === 'floor') {
        this.drawFloorTile(poly);
      } else if (poly.type === 'voxel') {
        this.drawVoxelFace(poly);
      }
    }

    // 3. Render Ghost Box on Hover (Add tool)
    if (this.hover && this.activeTool === 'add' && this.hover.addPos) {
      this.drawGhostVoxel(this.hover.addPos.x, this.hover.addPos.y, this.hover.addPos.z, this.activeMaterial);
    }
  }

  drawFloorTile(poly) {
    const isHovered = this.hover && !this.hover.isVoxel && this.hover.x === poly.x && this.hover.y === poly.y;
    const pts = poly.points;

    this.ctx.beginPath();
    this.ctx.moveTo(pts[0].sx, pts[0].sy);
    this.ctx.lineTo(pts[1].sx, pts[1].sy);
    this.ctx.lineTo(pts[2].sx, pts[2].sy);
    this.ctx.lineTo(pts[3].sx, pts[3].sy);
    this.ctx.closePath();

    if (isHovered) {
      this.ctx.fillStyle = 'rgba(212, 163, 115, 0.18)';
      this.ctx.fill();
      this.ctx.strokeStyle = 'rgba(212, 163, 115, 0.7)';
      this.ctx.lineWidth = 1.2;
    } else {
      this.ctx.fillStyle = ((poly.x + poly.y) % 2 === 0) ? 'rgba(255, 255, 255, 0.015)' : 'rgba(0, 0, 0, 0.12)';
      this.ctx.fill();
      this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
      this.ctx.lineWidth = 1;
    }
    this.ctx.stroke();
  }

  drawVoxelFace(poly) {
    const mat = this.materials[poly.mat] || this.materials.slate;
    const pts = poly.points;

    this.ctx.beginPath();
    this.ctx.moveTo(pts[0].sx, pts[0].sy);
    this.ctx.lineTo(pts[1].sx, pts[1].sy);
    this.ctx.lineTo(pts[2].sx, pts[2].sy);
    this.ctx.lineTo(pts[3].sx, pts[3].sy);
    this.ctx.closePath();

    if (this.wireframeMode) {
      this.ctx.strokeStyle = '#e2e8f0';
      this.ctx.lineWidth = 1.1;
      this.ctx.stroke();
    } else {
      // Calculate shaded color with light factor
      const r = Math.round(mat.color[0] * poly.lightFactor);
      const g = Math.round(mat.color[1] * poly.lightFactor);
      const b = Math.round(mat.color[2] * poly.lightFactor);

      this.ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
      this.ctx.fill();

      // Subtle edge bevel stroke
      this.ctx.strokeStyle = mat.border || 'rgba(255, 255, 255, 0.12)';
      this.ctx.lineWidth = 0.75;
      this.ctx.stroke();
    }
  }

  drawGhostVoxel(x, y, z, matName) {
    const mat = this.materials[matName] || this.materials.slate;
    const pts = [
      this.project(x - 0.5, y - 0.5, z),
      this.project(x + 0.5, y - 0.5, z),
      this.project(x + 0.5, y + 0.5, z),
      this.project(x - 0.5, y + 0.5, z),
      this.project(x - 0.5, y - 0.5, z + 1),
      this.project(x + 0.5, y - 0.5, z + 1),
      this.project(x + 0.5, y + 0.5, z + 1),
      this.project(x - 0.5, y + 0.5, z + 1)
    ];

    this.ctx.save();
    this.ctx.strokeStyle = 'rgba(212, 163, 115, 0.8)';
    this.ctx.fillStyle = 'rgba(212, 163, 115, 0.15)';
    this.ctx.lineWidth = 1.2;
    this.ctx.setLineDash([3, 2]);

    // Top face
    this.ctx.beginPath();
    this.ctx.moveTo(pts[4].sx, pts[4].sy);
    this.ctx.lineTo(pts[5].sx, pts[5].sy);
    this.ctx.lineTo(pts[6].sx, pts[6].sy);
    this.ctx.lineTo(pts[7].sx, pts[7].sy);
    this.ctx.closePath();
    this.ctx.fill();
    this.ctx.stroke();

    // Side edges
    const edges = [[0, 4], [1, 5], [2, 6], [3, 7], [0, 1], [1, 2], [2, 3], [3, 0]];
    for (const [i, j] of edges) {
      this.ctx.beginPath();
      this.ctx.moveTo(pts[i].sx, pts[i].sy);
      this.ctx.lineTo(pts[j].sx, pts[j].sy);
      this.ctx.stroke();
    }

    this.ctx.restore();
  }
}

// Instantiate on DOM load
document.addEventListener('DOMContentLoaded', () => {
  window.voxelEngine = new VoxelCanvasEngine('voxelCanvas');
});
