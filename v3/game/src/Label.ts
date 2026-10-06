import * as THREE from 'three';

const LABEL_WIDTH = 2;

// Text drawn on a canvas and shown on a flat plane. The caller positions it and faces it to the camera.
export function createNameLabel(name: string): THREE.Mesh {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 96;
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('2D canvas context not available');
  }
  // Shrink the font until long names fit on the label.
  let fontSize = 56;
  context.font = `bold ${fontSize}px Cinzel, Georgia, serif`;
  while (context.measureText(name).width > 490 && fontSize > 20) {
    fontSize -= 2;
    context.font = `bold ${fontSize}px Cinzel, Georgia, serif`;
  }
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.lineWidth = 8;
  context.strokeStyle = '#000000';
  context.strokeText(name, 256, 48);
  context.fillStyle = '#eadfc4';
  context.fillText(name, 256, 48);

  return new THREE.Mesh(
    new THREE.PlaneGeometry(LABEL_WIDTH, LABEL_WIDTH * (96 / 512)),
    new THREE.MeshBasicMaterial({
      map: new THREE.CanvasTexture(canvas),
      transparent: true,
      depthWrite: false,
    }),
  );
}
