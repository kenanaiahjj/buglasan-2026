export type Vector3Tuple = [number, number, number];

export type CameraStop = {
  position: Vector3Tuple;
  target: Vector3Tuple;
  fov: number;
};

const clamp = (value: number, minimum: number, maximum: number) =>
  Math.min(maximum, Math.max(minimum, value));

export function progressForScroll(scrollY: number, anchors: number[]): number {
  if (anchors.length < 2) return 0;
  if (scrollY <= anchors[0]) return 0;

  const finalIndex = anchors.length - 1;
  if (scrollY >= anchors[finalIndex]) return finalIndex;

  for (let index = 0; index < finalIndex; index += 1) {
    const start = anchors[index];
    const end = anchors[index + 1];
    if (scrollY <= end) {
      const span = Math.max(1, end - start);
      return index + (scrollY - start) / span;
    }
  }

  return finalIndex;
}

const lerp = (start: number, end: number, amount: number) => start + (end - start) * amount;

const lerpTuple = (start: Vector3Tuple, end: Vector3Tuple, amount: number): Vector3Tuple => [
  lerp(start[0], end[0], amount),
  lerp(start[1], end[1], amount),
  lerp(start[2], end[2], amount),
];

export function interpolateCamera(stops: CameraStop[], progress: number): CameraStop {
  if (stops.length === 0) {
    return { position: [0, 0, 0], target: [0, 0, -1], fov: 45 };
  }

  if (stops.length === 1) {
    const onlyStop = stops[0];
    return { ...onlyStop, position: [...onlyStop.position], target: [...onlyStop.target] };
  }

  const finalIndex = stops.length - 1;
  const boundedProgress = clamp(progress, 0, finalIndex);
  const startIndex = Math.min(Math.floor(boundedProgress), finalIndex - 1);
  const amount = boundedProgress - startIndex;
  const start = stops[startIndex];
  const end = stops[startIndex + 1];

  return {
    position: lerpTuple(start.position, end.position, amount),
    target: lerpTuple(start.target, end.target, amount),
    fov: lerp(start.fov, end.fov, amount),
  };
}
