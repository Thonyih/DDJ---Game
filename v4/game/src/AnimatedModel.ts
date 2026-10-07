import * as THREE from 'three';
import type { GLTF } from 'three/addons/loaders/GLTFLoader.js';
import { clone as cloneSkinned } from 'three/addons/utils/SkeletonUtils.js';

const FADE_TIME = 0.15;
const GHOST_COLOR = 0x9fc4ff;
const GHOST_GLOW = 0x2a4c8a;

export interface ModelOptions {
  // Height in world units the model is scaled to.
  height: number;
  // Names of parts to hide (e.g. extra weapons the model carries).
  hide?: string[];
  // See-through, pale blue look for spirits.
  ghost?: boolean;
  // Colour multiplied over the whole model's textures.
  tint?: number;
  // Replaces the colour of specific materials, by material name.
  colors?: Record<string, number>;
}

// An animated glTF character: a looping base animation (idle/move) with one-shots played on top.
export class AnimatedModel {
  readonly object: THREE.Object3D;
  protected readonly materials: THREE.MeshStandardMaterial[] = [];
  private readonly mixer: THREE.AnimationMixer;
  private readonly actions = new Map<string, THREE.AnimationAction>();
  private readonly baseGlow: number;
  private current: THREE.AnimationAction | null = null;
  private oneShot: THREE.AnimationAction | null = null;
  private keepLastPose = false;
  private loop = '';
  private flashColor: number | null = null;

  constructor(gltf: GLTF, options: ModelOptions) {
    // Each copy gets its own skeleton, so many enemies can share one loaded model.
    const model = cloneSkinned(gltf.scene);

    // Measure the real (skinned) size. Some models have a scaled armature, so the
    // world matrices must be up to date first.
    model.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(model);
    const scale = options.height / (box.max.y - box.min.y);
    model.scale.multiplyScalar(scale);
    // Stand the feet on the ground (y = 0 of this.object).
    model.position.y = -box.min.y * scale;

    this.object = new THREE.Group();
    this.object.add(model);
    model.traverse((child) => {
      child.castShadow = true;
    });

    for (const name of options.hide ?? []) {
      const part = this.object.getObjectByName(name);
      if (part) {
        part.visible = false;
      }
    }

    // Own materials per copy, so tints and hit flashes don't affect other copies.
    this.baseGlow = options.ghost ? GHOST_GLOW : 0x000000;
    this.object.traverse((child) => {
      if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshStandardMaterial) {
        const material = child.material.clone();
        const newColor = options.colors?.[material.name];
        if (newColor !== undefined) {
          material.color.setHex(newColor);
        }
        if (options.tint !== undefined) {
          material.color.multiply(new THREE.Color(options.tint));
        }
        if (options.ghost) {
          material.transparent = true;
          material.opacity = 0.55;
          material.color.lerp(new THREE.Color(GHOST_COLOR), 0.6);
        }
        material.emissive.setHex(this.baseGlow);
        material.emissiveIntensity = options.ghost ? 0.6 : 0;
        child.material = material;
        this.materials.push(material);
      }
    });

    this.mixer = new THREE.AnimationMixer(model);
    for (const clip of gltf.animations) {
      // Some models prefix clip names, e.g. "CharacterArmature|Idle".
      const name = clip.name.split('|').pop() ?? clip.name;
      this.actions.set(name, this.mixer.clipAction(clip));
    }
    this.mixer.addEventListener('finished', (event) => {
      if (event.action === this.oneShot && !this.keepLastPose) {
        this.oneShot = null;
        this.fadeTo(this.action(this.loop));
      }
    });
  }

  get isPlayingOnce(): boolean {
    return this.oneShot !== null;
  }

  // The looping base animation; one-shots play on top and then return to it.
  setLoop(name: string): void {
    this.loop = name;
    if (!this.oneShot) {
      this.fadeTo(this.action(name));
    }
  }

  // Plays an animation once. `duration` speeds it up or slows it down to last that long;
  // `keepLastPose` holds the final frame (used for death).
  playOnce(name: string, duration?: number, keepLastPose = false): void {
    const action = this.action(name);
    action.reset();
    action.setLoop(THREE.LoopOnce, 1);
    action.clampWhenFinished = true;
    action.timeScale = duration ? action.getClip().duration / duration : 1;
    this.oneShot = action;
    this.keepLastPose = keepLastPose;
    this.fadeTo(action, true);
  }

  // Back to the base animation straight away (e.g. after respawning).
  cancelOnce(): void {
    this.oneShot = null;
    this.keepLastPose = false;
    if (this.loop) {
      this.fadeTo(this.action(this.loop));
    }
  }

  setFlash(color: number | null): void {
    if (color === this.flashColor) {
      return;
    }
    this.flashColor = color;
    for (const material of this.materials) {
      material.emissive.setHex(color ?? this.baseGlow);
      material.emissiveIntensity = color === null ? (this.baseGlow ? 0.6 : 0) : 0.6;
    }
    if (color === null) {
      this.onFlashEnded();
    }
  }

  protected get isFlashing(): boolean {
    return this.flashColor !== null;
  }

  // Lets subclasses restore their own glow after a flash.
  protected onFlashEnded(): void {}

  update(delta: number): void {
    this.mixer.update(delta);
  }

  private action(name: string): THREE.AnimationAction {
    const action = this.actions.get(name);
    if (!action) {
      throw new Error(`Animation "${name}" not found in model`);
    }
    return action;
  }

  private fadeTo(action: THREE.AnimationAction, restart = false): void {
    if (action === this.current && !restart) {
      return;
    }
    this.current?.fadeOut(FADE_TIME);
    if (!restart) {
      action.reset();
      action.setLoop(THREE.LoopRepeat, Infinity);
      action.timeScale = 1;
    }
    action.fadeIn(FADE_TIME).play();
    this.current = action;
  }
}
