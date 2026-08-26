import * as THREE from 'three';

// Create exact script shapes matching the official Buglasan Festival logo
export function createLetterShape(char: string): THREE.Shape {
  const shape = new THREE.Shape();

  switch (char) {
    // ----------------------------------------------------
    // Grand Ribbon Initial 'B' (Iconic Crest & Swirling Bowls)
    // ----------------------------------------------------
    case 'B': {
      // Outer grand sweeping silhouette
      shape.moveTo(-0.2, 0.4);
      // Top sweeping crest
      shape.bezierCurveTo(-0.6, 1.2, -0.7, 2.0, 0.2, 2.35);
      shape.bezierCurveTo(0.8, 2.45, 1.45, 2.15, 1.45, 1.55);
      shape.bezierCurveTo(1.45, 1.15, 1.1, 0.9, 0.65, 0.85);
      // Bottom sweeping crescent bowl
      shape.bezierCurveTo(1.3, 0.8, 1.75, 0.45, 1.75, -0.2);
      shape.bezierCurveTo(1.75, -0.85, 1.1, -1.25, 0.1, -1.25);
      shape.bezierCurveTo(-0.8, -1.25, -1.2, -0.75, -0.9, -0.2);
      shape.bezierCurveTo(-0.7, 0.15, -0.3, 0.25, 0.05, 0.05);
      shape.bezierCurveTo(0.2, -0.05, 0.15, -0.35, -0.15, -0.45);
      shape.bezierCurveTo(-0.4, -0.5, -0.45, -0.8, 0.1, -0.85);
      shape.bezierCurveTo(0.7, -0.85, 1.05, -0.55, 1.05, -0.15);
      shape.bezierCurveTo(1.05, 0.25, 0.65, 0.45, 0.15, 0.45);
      shape.lineTo(-0.2, 0.4);
      shape.closePath();

      // Top Bowl Inner Hollow
      const topHole = new THREE.Path();
      topHole.moveTo(0.15, 1.35);
      topHole.bezierCurveTo(-0.05, 1.35, -0.15, 1.7, 0.15, 1.95);
      topHole.bezierCurveTo(0.55, 2.05, 0.85, 1.9, 0.85, 1.55);
      topHole.bezierCurveTo(0.85, 1.35, 0.6, 1.35, 0.15, 1.35);
      topHole.closePath();
      shape.holes.push(topHole);
      break;
    }

    // ----------------------------------------------------
    // Lowercase Script 'u'
    // ----------------------------------------------------
    case 'u':
    case 'U': {
      shape.moveTo(-0.1, 0.95);
      shape.bezierCurveTo(-0.05, 0.35, 0.05, 0.0, 0.38, 0.0);
      shape.bezierCurveTo(0.68, 0.0, 0.82, 0.3, 0.88, 0.95);
      shape.lineTo(0.64, 0.95);
      shape.bezierCurveTo(0.58, 0.4, 0.52, 0.24, 0.38, 0.24);
      shape.bezierCurveTo(0.24, 0.24, 0.18, 0.42, 0.14, 0.95);
      shape.closePath();
      break;
    }

    // ----------------------------------------------------
    // Lowercase Script 'g' (Soaring Top Frond & Tail)
    // ----------------------------------------------------
    case 'g':
    case 'G': {
      // Upper oval bowl
      shape.moveTo(0.42, 0.95);
      shape.bezierCurveTo(0.05, 0.95, -0.1, 0.65, -0.1, 0.45);
      shape.bezierCurveTo(-0.1, 0.15, 0.1, 0.0, 0.45, 0.0);
      shape.bezierCurveTo(0.68, 0.0, 0.8, 0.2, 0.84, 0.45);
      // Soaring Ascender Frond/Flame
      shape.bezierCurveTo(0.88, 1.0, 0.78, 1.7, 0.92, 2.15);
      shape.bezierCurveTo(0.72, 1.6, 0.68, 1.15, 0.65, 0.95);
      shape.bezierCurveTo(0.55, 0.95, 0.48, 0.95, 0.42, 0.95);
      shape.closePath();

      // Inner bowl hole
      const gHole = new THREE.Path();
      gHole.moveTo(0.38, 0.24);
      gHole.bezierCurveTo(0.18, 0.24, 0.12, 0.42, 0.12, 0.52);
      gHole.bezierCurveTo(0.12, 0.72, 0.25, 0.75, 0.4, 0.75);
      gHole.bezierCurveTo(0.58, 0.75, 0.64, 0.6, 0.64, 0.48);
      gHole.bezierCurveTo(0.64, 0.32, 0.52, 0.24, 0.38, 0.24);
      gHole.closePath();
      shape.holes.push(gHole);
      break;
    }

    // ----------------------------------------------------
    // Lowercase Script 'l' (Tall Ascender Loop)
    // ----------------------------------------------------
    case 'l':
    case 'L': {
      shape.moveTo(0.05, 0.0);
      shape.bezierCurveTo(0.1, 0.6, 0.2, 1.4, 0.48, 1.95);
      shape.bezierCurveTo(0.68, 1.95, 0.75, 1.7, 0.62, 1.15);
      shape.bezierCurveTo(0.5, 0.6, 0.42, 0.25, 0.65, 0.0);
      shape.lineTo(0.38, 0.0);
      shape.bezierCurveTo(0.28, 0.3, 0.25, 0.75, 0.28, 1.25);
      shape.bezierCurveTo(0.32, 1.55, 0.42, 1.68, 0.45, 1.68);
      shape.bezierCurveTo(0.42, 1.5, 0.32, 1.0, 0.22, 0.4);
      shape.lineTo(0.05, 0.0);
      shape.closePath();
      break;
    }

    // ----------------------------------------------------
    // Lowercase Script 'a'
    // ----------------------------------------------------
    case 'a':
    case 'A': {
      shape.moveTo(0.48, 0.95);
      shape.bezierCurveTo(0.08, 0.95, -0.08, 0.65, -0.08, 0.45);
      shape.bezierCurveTo(-0.08, 0.15, 0.12, 0.0, 0.46, 0.0);
      shape.bezierCurveTo(0.68, 0.0, 0.78, 0.18, 0.82, 0.35);
      shape.lineTo(0.82, 0.0);
      shape.lineTo(1.02, 0.0);
      shape.bezierCurveTo(0.98, 0.35, 0.98, 0.7, 1.02, 0.95);
      shape.lineTo(0.8, 0.95);
      shape.bezierCurveTo(0.78, 0.82, 0.72, 0.74, 0.68, 0.78);
      shape.bezierCurveTo(0.6, 0.92, 0.52, 0.95, 0.48, 0.95);
      shape.closePath();

      const aHole = new THREE.Path();
      aHole.moveTo(0.42, 0.24);
      aHole.bezierCurveTo(0.2, 0.24, 0.14, 0.42, 0.14, 0.54);
      aHole.bezierCurveTo(0.14, 0.72, 0.28, 0.75, 0.44, 0.75);
      aHole.bezierCurveTo(0.62, 0.75, 0.72, 0.6, 0.72, 0.45);
      aHole.bezierCurveTo(0.72, 0.3, 0.58, 0.24, 0.42, 0.24);
      aHole.closePath();
      shape.holes.push(aHole);
      break;
    }

    // ----------------------------------------------------
    // Lowercase Script 's'
    // ----------------------------------------------------
    case 's':
    case 'S': {
      shape.moveTo(0.08, 0.15);
      shape.bezierCurveTo(0.18, 0.0, 0.48, 0.0, 0.65, 0.12);
      shape.bezierCurveTo(0.82, 0.26, 0.78, 0.52, 0.55, 0.62);
      shape.bezierCurveTo(0.35, 0.7, 0.28, 0.78, 0.42, 0.85);
      shape.bezierCurveTo(0.55, 0.88, 0.68, 0.82, 0.72, 0.72);
      shape.lineTo(0.92, 0.78);
      shape.bezierCurveTo(0.82, 0.98, 0.58, 1.02, 0.38, 0.98);
      shape.bezierCurveTo(0.12, 0.88, 0.1, 0.62, 0.32, 0.48);
      shape.bezierCurveTo(0.55, 0.38, 0.6, 0.28, 0.48, 0.22);
      shape.bezierCurveTo(0.36, 0.18, 0.24, 0.25, 0.18, 0.35);
      shape.closePath();
      break;
    }

    // ----------------------------------------------------
    // Lowercase Script 'n'
    // ----------------------------------------------------
    case 'n':
    case 'N': {
      shape.moveTo(-0.05, 0.0);
      shape.lineTo(0.18, 0.0);
      shape.bezierCurveTo(0.18, 0.4, 0.18, 0.7, 0.18, 0.95);
      shape.lineTo(0.02, 0.95);
      shape.bezierCurveTo(0.05, 0.75, 0.22, 0.72, 0.35, 0.78);
      shape.bezierCurveTo(0.48, 0.96, 0.72, 0.96, 0.82, 0.72);
      shape.bezierCurveTo(0.88, 0.55, 0.88, 0.3, 0.88, 0.0);
      shape.lineTo(1.1, 0.0);
      shape.bezierCurveTo(1.1, 0.45, 1.08, 0.75, 0.88, 0.95);
      shape.bezierCurveTo(0.68, 1.02, 0.45, 0.95, 0.35, 0.8);
      shape.bezierCurveTo(0.3, 0.92, 0.22, 0.95, 0.12, 0.95);
      shape.bezierCurveTo(0.02, 0.95, -0.05, 0.85, -0.05, 0.0);
      shape.closePath();
      break;
    }

    // ----------------------------------------------------
    // Numbers '2', '0', '6'
    // ----------------------------------------------------
    case '2': {
      shape.moveTo(0.05, 0.72);
      shape.bezierCurveTo(0.08, 0.98, 0.75, 1.02, 0.78, 0.68);
      shape.bezierCurveTo(0.8, 0.45, 0.1, 0.32, 0.05, 0.0);
      shape.lineTo(0.85, 0.0);
      shape.lineTo(0.85, 0.22);
      shape.lineTo(0.32, 0.22);
      shape.bezierCurveTo(0.42, 0.42, 0.98, 0.46, 0.98, 0.72);
      shape.bezierCurveTo(0.98, 1.15, -0.15, 1.12, 0.05, 0.72);
      shape.closePath();
      break;
    }
    case '0': {
      shape.moveTo(0.45, 0.95);
      shape.bezierCurveTo(0.08, 0.95, 0.08, 0.0, 0.45, 0.0);
      shape.bezierCurveTo(0.82, 0.0, 0.82, 0.95, 0.45, 0.95);
      shape.closePath();

      const zeroHole = new THREE.Path();
      zeroHole.moveTo(0.45, 0.74);
      zeroHole.bezierCurveTo(0.28, 0.74, 0.28, 0.21, 0.45, 0.21);
      zeroHole.bezierCurveTo(0.62, 0.21, 0.62, 0.74, 0.45, 0.74);
      zeroHole.closePath();
      shape.holes.push(zeroHole);
      break;
    }
    case '6': {
      shape.moveTo(0.68, 0.95);
      shape.bezierCurveTo(0.32, 0.95, 0.08, 0.7, 0.08, 0.42);
      shape.bezierCurveTo(0.08, 0.15, 0.28, 0.0, 0.55, 0.0);
      shape.bezierCurveTo(0.85, 0.0, 0.88, 0.28, 0.88, 0.48);
      shape.bezierCurveTo(0.88, 0.72, 0.58, 0.72, 0.32, 0.68);
      shape.bezierCurveTo(0.3, 0.82, 0.45, 0.85, 0.68, 0.85);
      shape.closePath();

      const sixHole = new THREE.Path();
      sixHole.moveTo(0.48, 0.2);
      sixHole.bezierCurveTo(0.28, 0.2, 0.26, 0.48, 0.48, 0.52);
      sixHole.bezierCurveTo(0.68, 0.52, 0.68, 0.2, 0.48, 0.2);
      sixHole.closePath();
      shape.holes.push(sixHole);
      break;
    }
    default: {
      shape.moveTo(0, 0);
      shape.lineTo(0, 1.0);
      shape.lineTo(0.8, 1.0);
      shape.lineTo(0.8, 0);
      shape.closePath();
    }
  }

  return shape;
}

export interface LetterMeshInfo {
  mesh: THREE.Mesh;
  initialX: number;
  initialY: number;
  initialZ: number;
  initialRotX: number;
  initialRotY: number;
  initialRotZ: number;
  index: number;
  geo: THREE.BufferGeometry;
}

// Letter widths and offsets customized for authentic script cursive connections
const SCRIPT_WIDTHS: Record<string, number> = {
  B: 2.1,
  u: 0.92,
  g: 0.98,
  l: 0.82,
  a: 0.95,
  s: 0.88,
  n: 1.05,
  '2': 0.85,
  '0': 0.82,
  '6': 0.85,
};

export function build3DWord(
  word: string,
  material: THREE.Material,
  options: {
    depth?: number;
    bevelThickness?: number;
    bevelSize?: number;
    bevelSegments?: number;
    scale?: number;
    startIndex?: number;
  } = {},
): { group: THREE.Group; letters: LetterMeshInfo[]; dispose: () => void } {
  const group = new THREE.Group();
  const letters: LetterMeshInfo[] = [];

  const extrudeSettings: THREE.ExtrudeGeometryOptions = {
    depth: options.depth ?? 0.32,
    bevelEnabled: true,
    bevelSegments: options.bevelSegments ?? 3,
    steps: 1,
    bevelSize: options.bevelSize ?? 0.04,
    bevelThickness: options.bevelThickness ?? 0.05,
  };

  const chars = word.split('');
  let currentX = 0;
  const positionsX: number[] = [];

  chars.forEach((char) => {
    positionsX.push(currentX);
    const charWidth = SCRIPT_WIDTHS[char] ?? 0.9;
    // Script overlap / cursive connection spacing
    const kern = char === 'B' ? 0.42 : -0.12;
    currentX += charWidth + kern;
  });

  const totalWidth = currentX;
  const offsetX = -totalWidth / 2;

  chars.forEach((char, index) => {
    const shape = createLetterShape(char);
    const geo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    geo.computeVertexNormals();

    const charIndexAttr = new Float32Array(geo.attributes.position.count).fill(
      options.startIndex !== undefined ? options.startIndex + index : index,
    );
    geo.setAttribute('aCharIndex', new THREE.BufferAttribute(charIndexAttr, 1));

    const mesh = new THREE.Mesh(geo, material);
    const posX = offsetX + positionsX[index];
    const posY = char === 'B' ? -0.45 : 0;
    const posZ = 0;

    mesh.position.set(posX, posY, posZ);
    if (options.scale) {
      mesh.scale.setScalar(options.scale);
    }
    group.add(mesh);

    letters.push({
      mesh,
      initialX: posX,
      initialY: posY,
      initialZ: posZ,
      initialRotX: 0,
      initialRotY: 0,
      initialRotZ: 0,
      index,
      geo,
    });
  });

  const dispose = () => {
    letters.forEach((l) => l.geo.dispose());
  };

  return { group, letters, dispose };
}

