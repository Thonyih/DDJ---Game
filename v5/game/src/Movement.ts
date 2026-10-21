import * as THREE from 'three';

export function flatDistance(a: THREE.Vector3, b: THREE.Vector3): number {
  return Math.hypot(b.x - a.x, b.z - a.z);
}

export function faceToward(object: THREE.Object3D, point: THREE.Vector3): void {
  object.lookAt(point.x, object.position.y, point.z);
}

// Moves on the X/Z plane. Returns true once the point is reached.
export function moveToward(object: THREE.Object3D, point: THREE.Vector3, step: number): boolean {
  const dx = point.x - object.position.x;
  const dz = point.z - object.position.z;
  const distance = Math.hypot(dx, dz);

  if (distance <= step) {
    object.position.x = point.x;
    object.position.z = point.z;
    return true;
  }

  faceToward(object, point);
  object.position.x += (dx / distance) * step;
  object.position.z += (dz / distance) * step;
  return false;
}
