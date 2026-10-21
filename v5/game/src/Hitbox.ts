import * as THREE from 'three';

// Invisible cylinder that catches mouse clicks, larger than the model itself so things are easy
// to click. The raycaster still hits invisible objects. Standing on the ground (y = 0 of its parent).
export function createHitbox(radius: number, height: number): THREE.Mesh {
  const hitbox = new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius, height, 12),
    new THREE.MeshBasicMaterial(),
  );
  hitbox.position.y = height / 2;
  hitbox.visible = false;
  return hitbox;
}
