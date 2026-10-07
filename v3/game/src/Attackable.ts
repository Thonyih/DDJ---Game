import type * as THREE from 'three';

// Something the player can target and hit: an enemy or another knight.
export interface Attackable {
  readonly name: string;
  readonly position: THREE.Vector3;
  readonly health: number;
  readonly maxHealth: number;
  readonly isDead: boolean;
  // How close the player must be to hit it.
  readonly hitRange: number;
  takeDamage(amount: number): void;
}
