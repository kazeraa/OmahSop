// Run this with Node.js to generate PWA icons
// Usage: node generate-icons.js
// Requires: npm install canvas fs

const fs = require('fs');
const path = require('path');
const { createCanvas } = require('canvas');

const SIZES = [72, 96, 128, 144, 152, 192, 384, 512];
const ICONS_DIR = path.join(__dirname, 'icons');

if (!fs.existsSync(ICONS_DIR)) {
    fs.mkdirSync(ICONS_DIR, { recursive: true });
}

SIZES.forEach(size => {
    const canvas = createCanvas(size, size);
    const ctx = canvas.getContext('2d');
    const s = size;

    // Background gradient
    const gradient = ctx.createLinearGradient(0, 0, s, s);
    gradient.addColorStop(0, '#00d4ff');
    gradient.addColorStop(1, '#7c5cfc');
    ctx.fillStyle = gradient;
    
    // Rounded rect
    const r = s * 0.2;
    ctx.beginPath();
    ctx.moveTo(r, 0);
    ctx.lineTo(s - r, 0);
    ctx.quadraticCurveTo(s, 0, s, r);
    ctx.lineTo(s, s - r);
    ctx.quadraticCurveTo(s, s, s - r, s);
    ctx.lineTo(r, s);
    ctx.quadraticCurveTo(0, s, 0, s - r);
    ctx.lineTo(0, r);
    ctx.quadraticCurveTo(0, 0, r, 0);
    ctx.closePath();
    ctx.fill();

    // Bowl icon for "Omah Sop"
    const bowlSize = s * 0.35;
    const cx = s * 0.5;
    const cy = s * 0.45;
    
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.lineWidth = s * 0.04;
    ctx.beginPath();
    ctx.ellipse(cx, cy + bowlSize * 0.4, bowlSize * 0.8, bowlSize * 0.3, 0, 0, Math.PI);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx, cy, bowlSize * 0.6, Math.PI, 0, true);
    ctx.stroke();
    
    // Steam
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = s * 0.025;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(cx - bowlSize * 0.2, cy - bowlSize * 0.55);
    ctx.quadraticCurveTo(cx - bowlSize * 0.3, cy - bowlSize * 0.8, cx - bowlSize * 0.15, cy - bowlSize * 0.9);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx, cy - bowlSize * 0.6);
    ctx.quadraticCurveTo(cx + bowlSize * 0.1, cy - bowlSize * 0.85, cx - bowlSize * 0.05, cy - bowlSize * 0.95);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx + bowlSize * 0.2, cy - bowlSize * 0.55);
    ctx.quadraticCurveTo(cx + bowlSize * 0.3, cy - bowlSize * 0.8, cx + bowlSize * 0.15, cy - bowlSize * 0.9);
    ctx.stroke();
    
    ctx.restore();

    // Rp text
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${s * 0.22}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Rp', s * 0.5, s * 0.82);

    const buffer = canvas.toBuffer('image/png');
    fs.writeFileSync(path.join(ICONS_DIR, `icon-${size}.png`), buffer);
    console.log(`Created icon-${size}.png (${size}x${size})`);
});

console.log('All icons generated!');
