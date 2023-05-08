// Translation of https://github.com/straaljager/GPU-path-tracing-with-CUDA-tutorial-4/blob/master/SplitBVHBuilder.h
import { Queue } from './utility.js';
import { Vec3 } from './vector.js'

const MAX_DEPTH = 64;
const MAX_SPATIAL_DEPTH = 48;
const NUM_SPATIAL_BINS = 128;
const MAX_LEAF_SIZE = 12;
const MIN_LEAF_SIZE = 4;

class BoundingBox {
  constructor() {
    this.min = [Infinity, Infinity, Infinity];
    this.max = [-Infinity, -Infinity, -Infinity];
    this._centroid = null;
  }

  addVertex(vert) {
    this.min = Vec3.min(vert, this.min);
    this.max = Vec3.max(vert, this.max);
    this._centroid = null;
    return this;
  }

  addTriangle(triangle) {
    for (let i = 0; i < triangle.verts.length; i++) {
      this.addVertex(triangle.verts[i]);
    }
    this._centroid = null;
    return this;
  }

  addBoundingBox(box) {
    this.addVertex(box.min);
    this.addVertex(box.max);
    this._centroid = null;
    return this;
  }

  addNode(node) {
    for (let i = 0; i < node.indices[0].length; i++) {
      this.addTriangle(node.triangles[node.indices[0][i]]);
    }
    this._centroid = null;
    return this;
  }

  get centroid() {
    if (!this._centroid) {
      this._centroid = Vec3.scale(Vec3.add(this.min, this.max), 0.5);
    }
    return this._centroid;
  }

  getSurfaceArea() {
    let xl = this.max[0] - this.min[0];
    let yl = this.max[1] - this.min[1];
    let zl = this.max[2] - this.min[2];
    return (xl * yl + xl * zl + yl * zl) * 2;
  }

  intersect(box) {
    this.min = Vec3.max(this.min, box.min); 
    this.max = Vec3.min(this.max, box.max);
  }
}

class BVHNode {
  constructor(bounds, left, right, triIndices, triangles) {
    this.bounds = bounds;
    this.left = left;
    this.right = right;
    this.triIndices = triIndices;
    this.triangles = triangles;
    this.lo = -1;
    this.hi = -1;
  }

  get leaf() {
    return this.lo > -1 && this.hi > -1;
  }

  getleafSize() {
    return this.hi - this.lo;
  }

  getTriangles() {
    return this.triIndices.slice(this.lo, this.hi).map(i => this.triangles[i]);
    // Avoid using this until final expor
  }
}

class Reference {
  constructor(idx, bounds) {
    this.triIdx = idx ?? -1;
    this.bounds = bounds ?? new BoundingBox();
  }
}

class NodeSpec {
  constructor() {
    this.numRef = 0;
    this.bounds = null;
  }
}

class ObjectSplit {
  constructor() {
    this.sah = Infinity;
    this.sortDim = 0;
    this.numLeft = 0;
    this.leftBounds = null;
    this.rightBounds = null;
  }
}

class SpatialSplit {
  constructor() {
    this.sah = Infinity;
    this.dim = 0;
    this.pos = 0.0;
  }
}

class SpatialBin {
  constructor() {
    this.bounds = null;
    this.enter = 0;
    this.exit = 0;
  }
}

export class SplitBVH {
  constructor(tris, vertices) {
    this.tris = tris;
    this.vertices = vertices;
    this.triIndices = [];
    this.splitAlpha = 1.0e-5;
    this.refStack = tris.map((t, i) => {return new Reference(i, t.bounds)});
    this.sortDim = -1;
    this.bins = new Array(3).fill(new Array(NUM_SPATIAL_BINS).fill(new SpatialBin()));
    this.depth = 0;
    this._numLeafTris = 0;
    this.root = this.build();
  }

  serializeTree() {
    let nodes = [];
    let root = { node: this.root, parent: -1 };
    // Array based queues are very slow at high lengths. A very naive linked list based one is far faster for large scenes.
    let qq = new Queue();
    qq.enqueue(root);
    while (qq.hasElements()) {
      root = qq.dequeue();
      let parent = nodes.length;
      nodes.push(root);
      if (!root.node.leaf) {
        qq.enqueue({ node: root.node.left, parent });
        qq.enqueue({ node: root.node.right, parent });
      }
    }
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      if (node.parent >= 0) {
        const parent = nodes[node.parent];
        // If i is odd, then it's the left node.  left/right nodes are always pushed on the queue together.
        if (i % 2 === 1) {
          parent.left = i;
        } else {
          parent.right = i;
        }
      }
    }
    return nodes;
  }

  get numLeafTris() {
    return this._numLeafTris;
  }

  build() {
    const rootSpec = new NodeSpec();
    rootSpec.numRef = this.tris.length;
    rootSpec.bounds = new BoundingBox();
    for (const vert of this.vertices) {
      rootSpec.bounds.addVertex(vert.position);
    }
    this.minOverlap = rootSpec.bounds.getSurfaceArea() * this.splitAlpha;  /// split alpha (maximum allowable overlap) relative to size of rootnode
    this.rightBounds = new Array(Math.max(rootSpec.numRef, NUM_SPATIAL_BINS - 1));
    this.numDuplicates = 0;
    const root = this.buildNode(rootSpec, 0, 0.0, 1.0);
    return root;
  }

  lerp(first, second, ratio) {
    return first + (second - first) * ratio;
  }

  createLeaf(spec) {
    for (let i = 0; i < spec.numRef; i++){
      this.triIndices.push(this.refStack.pop().triIdx); // take a triangle from the stack and add it to tris array
    }
    const leaf = new BVHNode(spec.bounds, null, null, this.triIndices, this.tris);
    leaf.lo = this.triIndices.length - spec.numRef;
    leaf.hi = this.triIndices.length;
    this._numLeafTris += leaf.hi - leaf.lo;
    return leaf;
  }

  buildNode(spec, level, progressStart, progressEnd) {
    this.depth = Math.max(this.depth, level);
    if (spec.numRef <= MIN_LEAF_SIZE || level >= MAX_DEPTH) {
      return this.createLeaf(spec);
    }

    // Find split candidates.
    const area = spec.bounds.getSurfaceArea();
    const leafSAH = area * spec.numRef;
    const nodeSAH = area * 2 * 1;
    const object = this.findObjectSplit(spec, nodeSAH);

    let spatial = new SpatialSplit();
    if (level < MAX_SPATIAL_DEPTH) {
      const overlap = object.leftBounds;
      overlap.intersect(object.rightBounds);
      if (overlap.getSurfaceArea() >= this.minOverlap) {
        spatial = this.findSpatialSplit(spec, nodeSAH);
      }
    }

    // Leaf SAH is the lowest => create leaf.
    const minSAH = Math.min(leafSAH, object.sah, spatial.sah);
    if (minSAH == leafSAH && spec.numRef <= MAX_LEAF_SIZE) {
      return this.createLeaf(spec);
    }

    // Leaf SAH is not the lowest => Perform spatial split.
    let left = new NodeSpec();
    let right = new NodeSpec();
    if (minSAH == spatial.sah) {
      this.performSpatialSplit(left, right, spec, spatial);
    }

    if (!left.numRef || !right.numRef) { /// if either child contains no triangles/references
      this.performObjectSplit(left, right, spec, object);
    }

    // Create inner node.
    this.numDuplicates += left.numRef + right.numRef - spec.numRef;
    const progressMid = this.lerp(progressStart, progressEnd, right.numRef / (left.numRef + right.numRef));
    const rightNode = this.buildNode(right, level + 1, progressStart, progressMid);
    const leftNode = this.buildNode(left, level + 1, progressMid, progressEnd);
    return new BVHNode(spec.bounds, leftNode, rightNode);
  }

  sortRefRange(start, end) {
    const range = this.refStack.splice(start, end - start + 1);
    range.sort((ra, rb) => {
      const dim = this.sortDim;
      const ca = ra.bounds.min[dim] + ra.bounds.max[dim];  
      const cb = rb.bounds.min[dim] + rb.bounds.max[dim];
      return (ca < cb) ? -1 : (ca > cb) ? 1 : (ra.triIdx < rb.triIdx) ? -1 : (ra.triIdx > rb.triIdx) ? 1 : 0;
    });
    this.refStack.splice(start, 0, ...range);
  }

  findObjectSplit(spec, nodeSAH) {
    let split = new ObjectSplit();
    const refIdx = this.refStack.length - spec.numRef;

    // Sort along each dimension.
    for (this.sortDim = 0; this.sortDim < 3; this.sortDim++) {
      this.sortRefRange(this.refStack.length - spec.numRef, this.refStack.length);

      // Sweep right to left and determine bounds.
      let rightBounds = new BoundingBox();
      for (let i = spec.numRef - 1; i > 0; i--) {
        rightBounds.addBoundingBox(this.refStack[refIdx + i].bounds);
        this.rightBounds[i - 1] = rightBounds;
      }

      // Sweep left to right and select lowest SAH.
      let leftBounds = new BoundingBox();
      for (let i = 1; i < spec.numRef; i++) {
        leftBounds.addBoundingBox(this.refStack[refIdx + i - 1].bounds);
        let sah = nodeSAH + leftBounds.getSurfaceArea() * i + this.rightBounds[i - 1].getSurfaceArea() * (spec.numRef - i);
        if (sah < split.sah) {
          split.sah = sah;
          split.sortDim = this.sortDim;
          split.numLeft = i;
          split.leftBounds = leftBounds;
          split.rightBounds = this.rightBounds[i - 1];
        }
      }
    }
    return split;
  }

  performObjectSplit(left, right, spec, split) {
    this.sortDim = split.sortDim;
    this.sortRefRange(this.refStack.length - spec.numRef, this.refStack.length);

    left.numRef = split.numLeft;
    left.bounds = split.leftBounds;
    right.numRef = spec.numRef - split.numLeft;
    right.bounds = split.rightBounds;
  }

  findSpatialSplit(spec, nodeSAH) {
    // Initialize bins.
    const origin = spec.bounds.min;
    const binSize = Vec3.scale(Vec3.sub(spec.bounds.max, origin), (1 / NUM_SPATIAL_BINS));
    const invBinSize = Vec3.inverse(binSize);//.map((e) => { return Math.abs(e) === Infinity ? Math.sign(e) * 1000000 : e });

    for (let dim = 0; dim < 3; dim++) {
      for (let i = 0; i < NUM_SPATIAL_BINS; i++) {
        let bin = this.bins[dim][i];
        bin.bounds = new BoundingBox();
        bin.enter = 0;
        bin.exit = 0;
      }
    }

    // Chop references into bins.
    for (let refIdx = this.refStack.length - spec.numRef; refIdx < this.refStack.length; refIdx++) {
      const ref = this.refStack[refIdx];
      let high = NUM_SPATIAL_BINS - 1;
      let min = new Int32Array(Vec3.mult(Vec3.sub(ref.bounds.min, origin), invBinSize));
      let max = new Int32Array(Vec3.mult(Vec3.sub(ref.bounds.max, origin), invBinSize));
      let firstBin = Vec3.clamp(min, [0, 0, 0], [high, high, high]);
      let lastBin = Vec3.clamp(max, firstBin, [high, high, high]);

      for (let dim = 0; dim < 3; dim++) {
        let currRef = ref;
        for (let i = firstBin[dim]; i < lastBin[dim]; i++) {
          let leftRef = new Reference();
          let rightRef = new Reference();
          this.splitReference(leftRef, rightRef, currRef, dim, origin[dim] + binSize[dim] * (i + 1));
          this.bins[dim][i].bounds.addBoundingBox(leftRef.bounds);
          currRef = rightRef;
        }
        this.bins[dim][lastBin[dim]].bounds.addBoundingBox(currRef.bounds);
        this.bins[dim][firstBin[dim]].enter++;
        this.bins[dim][lastBin[dim]].exit++;
      }
    }

    // Select best split plane.
    const split = new SpatialSplit();
    for (let dim = 0; dim < 3; dim++) {
      // Sweep right to left and determine bounds.
      const rightBounds = new BoundingBox();
      for (let i = NUM_SPATIAL_BINS - 1; i > 0; i--) {
        rightBounds.addBoundingBox(this.bins[dim][i].bounds);
        this.rightBounds[i - 1] = rightBounds;
      }

      // Sweep left to right and select lowest SAH.
      const leftBounds = new BoundingBox();
      let leftNum = 0;
      let rightNum = spec.numRef;

      for (let i = 1; i < NUM_SPATIAL_BINS; i++) {
        leftBounds.addBoundingBox(this.bins[dim][i - 1].bounds);
        leftNum += this.bins[dim][i - 1].enter;
        rightNum -= this.bins[dim][i - 1].exit;
        const sah = nodeSAH + leftBounds.getSurfaceArea() * leftNum + this.rightBounds[i - 1].getSurfaceArea() * rightNum;
        if (sah < split.sah) {
          split.sah = sah;
          split.dim = dim;
          split.pos = origin[dim] + binSize[dim] * i;
        }
      }
    }
    return split;
  }

  performSpatialSplit(left, right, spec, split) {
    // Categorize references and compute bounds.
    //
    // Left-hand side:      [leftStart, leftEnd[
    // Uncategorized/split: [leftEnd, rightStart[
    // Right-hand side:     [rightStart, refs.getSize()[
    const refs = this.refStack;
    let leftStart = refs.length - spec.numRef;
    let leftEnd = leftStart;
    let rightStart = refs.length;
    left.bounds = new BoundingBox();
    right.bounds = new BoundingBox();
    for (let i = leftEnd; i < rightStart; i++) {
      // Entirely on the left-hand side?
      if (refs[i].bounds.max[split.dim] <= split.pos) {
        left.bounds.addBoundingBox(refs[i].bounds);
        this.swap(refs, i, leftEnd++);
      }
      // Entirely on the right-hand side?
      else if (refs[i].bounds.min[split.dim] >= split.pos) {
        right.bounds.addBoundingBox(refs[i].bounds);
        this.swap(refs, i--, --rightStart);
      }
    }

    // Duplicate or unsplit references intersecting both sides.
    while (leftEnd < rightStart) {
      // Split reference.
      const lref = new Reference();
      const rref = new Reference();
      this.splitReference(lref, rref, refs[leftEnd], split.dim, split.pos);

      // Compute SAH for duplicate/unsplit candidates.
      const lub = left.bounds;  // Unsplit to left:     new left-hand bounds.
      const rub = right.bounds; // Unsplit to right:    new right-hand bounds.
      const ldb = left.bounds;  // Duplicate:           new left-hand bounds.
      const rdb = right.bounds; // Duplicate:           new right-hand bounds.
      lub.addBoundingBox(refs[leftEnd].bounds);
      rub.addBoundingBox(refs[leftEnd].bounds);
      ldb.addBoundingBox(lref.bounds);
      rdb.addBoundingBox(rref.bounds);

      const lac = leftEnd - leftStart;
      const rac = refs.length - rightStart;
      const lbc = leftEnd - leftStart + 1;
      const rbc = refs.length - rightStart + 1;

      const unsplitLeftSAH = lub.getSurfaceArea() * lbc + right.bounds.getSurfaceArea() * rac;
      const unsplitRightSAH = left.bounds.getSurfaceArea() * lac + rub.getSurfaceArea() * rbc;
      const duplicateSAH = ldb.getSurfaceArea() * lbc + rdb.getSurfaceArea() * rbc;
      const minSAH = Math.min(unsplitLeftSAH, unsplitRightSAH, duplicateSAH);

      // Unsplit to left?
      if (minSAH == unsplitLeftSAH) {
        left.bounds = lub;
        leftEnd++;
      } else if (minSAH == unsplitRightSAH) {
        // Unsplit to right?
        right.bounds = rub;
        this.swap(refs, leftEnd, --rightStart);
      } else {
        // Duplicate?
        left.bounds = ldb;
        right.bounds = rdb;
        refs[leftEnd++] = lref;
        refs.add(rref);
      }
    }

    left.numRef = leftEnd - leftStart;
    right.numRef = refs.length - rightStart;
  }

  splitReference(left, right, ref, dim, pos) {
    // Initialize references.
    left.triIdx = right.triIdx = ref.triIdx;
    left.bounds = new BoundingBox();
    right.bounds = new BoundingBox();

    // Loop over vertices/edges.
    const inds = this.tris[ref.triIdx].indices;
    let v1 = this.vertices[inds[2]].position;

    for (let i = 0; i < 3; i++) {
      const v0 = v1;
      v1 = this.vertices[inds[i]].position;
      let v0p = v0[dim];
      let v1p = v1[dim];

      // Insert vertex to the boxes it belongs to.
      if (v0p <= pos) {
        left.bounds.addVertex(v0);
      }
      if (v0p >= pos) {
        right.bounds.addVertex(v0);
      }

      // Edge intersects the plane => insert intersection to both boxes.
      if ((v0p < pos && v1p > pos) || (v0p > pos && v1p < pos)) {
        const t = Vec3.lerp1(v0, v1, Vec3.clamp1((pos - v0p) / (v1p - v0p), 0, 1));
        left.bounds.addVertex(t);
        right.bounds.addVertex(t);
      }
    }

    // Intersect with original bounds.
    left.bounds.max[dim] = pos;
    right.bounds.min[dim] = pos;
    left.bounds.intersect(ref.bounds);
    right.bounds.intersect(ref.bounds);
  }

  swap(a, i0, i1) {
    const temp = a[i0];
    a[i0] = a[i1];
    a[i1] = temp;
  }
}