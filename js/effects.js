/* ============================================
   Omah Sop - 3D Background Effects (Three.js)
   ============================================ */

// 3D Scene Manager
class Scene3D {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.geometries = [];
        this.mouseX = 0;
        this.mouseY = 0;
        this.init();
    }

    init() {
        const container = document.getElementById('three-canvas');
        if (!container) return;

        // Scene
        this.scene = new THREE.Scene();

        // Camera
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.z = 30;

        // Renderer
        this.renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        container.appendChild(this.renderer.domElement);

        // Create floating geometries
        this.createFloatingShapes();
        this.createParticleField();
        this.createGrid();

        // Mouse tracking
        document.addEventListener('mousemove', (e) => {
            this.mouseX = (e.clientX / window.innerWidth) * 2 - 1;
            this.mouseY = -(e.clientY / window.innerHeight) * 2 + 1;
        });

        // Resize
        window.addEventListener('resize', () => this.onResize());

        // Start animation
        this.animate();
    }

    createFloatingShapes() {
        const shapes = [];
        const colors = [0x00d4ff, 0x7c5cfc, 0x00ff88, 0xff4757, 0xffa502];
        const geometries = [
            new THREE.IcosahedronGeometry(0.4, 0),
            new THREE.OctahedronGeometry(0.4, 0),
            new THREE.TorusGeometry(0.3, 0.12, 8, 12),
            new THREE.TetrahedronGeometry(0.4, 0),
            new THREE.BoxGeometry(0.4, 0.4, 0.4)
        ];

        for (let i = 0; i < 35; i++) {
            const geo = geometries[Math.floor(Math.random() * geometries.length)];
            const color = colors[Math.floor(Math.random() * colors.length)];
            const mat = new THREE.MeshPhysicalMaterial({
                color: color,
                metalness: 0.3,
                roughness: 0.4,
                transparent: true,
                opacity: 0.6,
                emissive: color,
                emissiveIntensity: 0.1
            });

            const mesh = new THREE.Mesh(geo, mat);
            mesh.position.set(
                (Math.random() - 0.5) * 40,
                (Math.random() - 0.5) * 30,
                (Math.random() - 0.5) * 20 - 5
            );
            mesh.rotation.set(
                Math.random() * Math.PI * 2,
                Math.random() * Math.PI * 2,
                Math.random() * Math.PI * 2
            );

            // Store animation properties
            mesh.userData = {
                speed: 0.002 + Math.random() * 0.008,
                rotSpeed: { x: (Math.random() - 0.5) * 0.02, y: (Math.random() - 0.5) * 0.02 },
                floatAmplitude: 0.3 + Math.random() * 0.5,
                floatSpeed: 0.5 + Math.random() * 0.5,
                initialY: mesh.position.y,
                phase: Math.random() * Math.PI * 2
            };

            this.scene.add(mesh);
            shapes.push(mesh);
        }

        this.floatingShapes = shapes;
    }

    createParticleField() {
        const particleCount = 1500;
        const positions = new Float32Array(particleCount * 3);
        const sizes = new Float32Array(particleCount);

        for (let i = 0; i < particleCount; i++) {
            positions[i * 3] = (Math.random() - 0.5) * 60;
            positions[i * 3 + 1] = (Math.random() - 0.5) * 40;
            positions[i * 3 + 2] = (Math.random() - 0.5) * 30 - 10;
            sizes[i] = 0.02 + Math.random() * 0.08;
        }

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

        const material = new THREE.PointsMaterial({
            color: 0x00d4ff,
            size: 0.08,
            transparent: true,
            opacity: 0.4,
            blending: THREE.AdditiveBlending,
            sizeAttenuation: true
        });

        this.particles = new THREE.Points(geometry, material);
        this.scene.add(this.particles);
    }

    createGrid() {
        // Wireframe grid
        const gridHelper = new THREE.GridHelper(40, 30, 0x00d4ff, 0x7c5cfc);
        gridHelper.position.y = -8;
        gridHelper.material.transparent = true;
        gridHelper.material.opacity = 0.15;
        this.scene.add(gridHelper);
        this.grid = gridHelper;

        // Additional floating lines
        const lineGeo = new THREE.BufferGeometry();
        const linePoints = [];
        for (let i = 0; i < 50; i++) {
            const x = (Math.random() - 0.5) * 30;
            const y = (Math.random() - 0.5) * 20;
            const z = (Math.random() - 0.5) * 15;
            linePoints.push(new THREE.Vector3(x, y, z));
        }
        lineGeo.setFromPoints(linePoints);
        const lineMat = new THREE.LineBasicMaterial({
            color: 0x7c5cfc,
            transparent: true,
            opacity: 0.1
        });
        this.line = new THREE.Line(lineGeo, lineMat);
        this.scene.add(this.line);
    }

    onResize() {
        if (!this.camera || !this.renderer) return;
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    animate() {
        if (!this.scene) return;

        requestAnimationFrame(() => this.animate());

        // Rotate floating shapes
        if (this.floatingShapes) {
            this.floatingShapes.forEach(mesh => {
                mesh.rotation.x += mesh.userData.rotSpeed.x;
                mesh.rotation.y += mesh.userData.rotSpeed.y;
                mesh.position.y = mesh.userData.initialY + 
                    Math.sin(Date.now() * mesh.userData.floatSpeed * 0.001 + mesh.userData.phase) * 
                    mesh.userData.floatAmplitude;
            });
        }

        // Rotate particles slowly
        if (this.particles) {
            this.particles.rotation.y += 0.0002;
            this.particles.rotation.x += 0.0001;
        }

        // Follow mouse slightly
        if (this.camera) {
            this.camera.position.x += (this.mouseX * 2 - this.camera.position.x) * 0.02;
            this.camera.position.y += (-this.mouseY * 1.5 - this.camera.position.y) * 0.02;
            this.camera.lookAt(0, 0, 0);
        }

        if (this.grid) {
            this.grid.rotation.z += 0.0003;
        }

        this.renderer.render(this.scene, this.camera);
    }
}

// Initialize 3D scene when Three.js loads
let scene3D = null;

function init3DScene() {
    if (typeof THREE !== 'undefined' && !scene3D) {
        scene3D = new Scene3D();
    }
}

// Load Three.js dynamically if not already loaded
if (typeof THREE === 'undefined') {
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
    script.onload = init3DScene;
    document.head.appendChild(script);
} else {
    init3DScene();
}

// ============ Sparkline Charts (Mini charts for stat cards) ============
class Sparkline {
    constructor(canvasId, data, color) {
        const canvas = document.getElementById(canvasId);
        if (!canvas || !data || data.length < 2) return;

        const ctx = canvas.getContext('2d');
        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        ctx.scale(dpr, dpr);

        const width = rect.width;
        const height = rect.height;
        const padding = 4;

        const max = Math.max(...data);
        const min = Math.min(...data);
        const range = max - min || 1;

        ctx.clearRect(0, 0, width, height);

        // Draw line
        ctx.beginPath();
        data.forEach((val, i) => {
            const x = padding + (i / (data.length - 1)) * (width - padding * 2);
            const y = padding + (1 - (val - min) / range) * (height - padding * 2);
            i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        });

        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        ctx.stroke();

        // Fill gradient
        const gradient = ctx.createLinearGradient(0, 0, 0, height);
        gradient.addColorStop(0, color + '40');
        gradient.addColorStop(1, color + '00');
        ctx.lineTo(width - padding, height);
        ctx.lineTo(padding, height);
        ctx.closePath();
        ctx.fillStyle = gradient;
        ctx.fill();
    }
}

window.Sparkline = Sparkline;

