import * as Pako from "../lib/pako.js";
window.Pako = Pako;
export class Puzzle {
    //Constructors
    constructor(dimension = 0, size = []) {
        this.dimension = dimension;
        this.size = size.slice();
        this.calculateSizes();
        this.shape = new Array(this.shapeSize);
        this.hintsTotal = new Array(this.maxFaceSize * dimension);
        this.hintsPieces = new Array(this.maxFaceSize * dimension);
        this.metadata = {};
    }
    calculateSizes() {
        this.shapeSize = 1;
        let minimumRowLength = 10000;
        for(let i = 0; i < this.dimension; i++) {
            this.shapeSize *= this.size[i];
            minimumRowLength = Math.min(minimumRowLength, this.size[i]);
        }
        this.maxFaceSize = this.shapeSize / minimumRowLength;
        this.spacing = [];
        let spacing = 1;
        for(let i = 0; i < this.dimension + 1; i++) {
            this.spacing.push(spacing);
            spacing *= this.size[i];
        }
    }
}
//Positional retrieval functions
Puzzle.prototype.collapsePos = function (position) {
    return position.map((p, i) => p * this.spacing[i]).reduce((a, b) => a + b);
}
Puzzle.prototype.getRow = function (pos, dim) {
    let out = [];
    let spacing = this.spacing[dim];
    let start = pos % spacing + Math.floor(pos / this.spacing[dim + 1]) * this.spacing[dim + 1];
    for(let i = 0; i < this.size[dim]; i++) {
        out[i] = this.shape[start + spacing * i];
    }
    return out;
}
Puzzle.prototype.getHintPosition = function (positionIndex, direction) {
    let below = positionIndex % this.spacing[direction];
    let above = Math.floor(positionIndex / this.spacing[direction + 1]) * this.spacing[direction];
    return this.maxFaceSize * direction + below + above;
}
Puzzle.prototype.unslicePosition = function (pos, dims) {
    let size = [];
    for(let i in [0, 1, 2]) size[i] = this.size[dims.indexOf(-1 - i)] || 1;
    let posArray = dims.slice();
    posArray[dims.indexOf(-1)] = pos % size[0];
    posArray[dims.indexOf(-2)] = Math.floor(pos / size[0]) % size[1];
    posArray[dims.indexOf(-3)] = Math.floor(pos / size[0] / size[1]) % size[2];
    return this.collapsePos(posArray);
}
Puzzle.prototype.getXYZ = function (position) {
    let out = [];
    for(let i = 0; i < this.dimension; i++) {
        out[i] = Math.floor(position / this.spacing[i]) % this.size[i];
    }
    return out;
}
//Extra data generation
Puzzle.prototype.generateHints = function () {
    this.hintsPieces = new Array(this.maxFaceSize * this.dimension);
    this.hintsPieces.fill(0, 0, this.hintsPieces.length);
    this.hintsTotal = new Array(this.maxFaceSize * this.dimension);
    this.hintsTotal.fill(0, 0, this.hintsTotal.length);
    this.foreachHint((cell, t, p, dim, i) => {
        let row = this.getRow(cell, dim);
        let total = 0, pieces = 0, prev = cell_broken;
        for(let x = 0; x < row.length; x++) {
            if(row[x] == cell_colored) {
                total++;
                if(prev == cell_broken) pieces++;
            }
            prev = row[x];
        }
        if(total == 0) pieces = 1;
        this.hintsPieces[i + this.maxFaceSize * dim] = pieces;
        this.hintsTotal[i + this.maxFaceSize * dim] = total;
    });
}
Puzzle.prototype.generateSidesVisible = function () {
    this.visibleSides = [];
    let spacing = [1, this.size[0], this.size[0] * this.size[1]];
    this.foreachCell((cell, i, pos) => {
        if(cell == cell_broken) return this.visibleSides[i] = 0;
        let visible = 0;
        for(let dim = 0; dim < this.dimension; dim++) {
            let indexInRow = Math.floor(i / this.spacing[dim]) % this.size[dim];
            let spa = spacing[dim];
            if(indexInRow == 0 || this.shape[i - spa] == cell_broken) visible |= (4 ** dim);
            if(indexInRow == this.size[dim] - 1 || this.shape[i + spa] == cell_broken) visible |= (4 ** dim) * 2;
        }
        this.visibleSides[i] = visible;
    });
}
Puzzle.prototype.sliceFrom = function (dims, puz) {
    //Find x, y, and z axis
    this.size = [];
    for(let i in [0, 1, 2]) this.size[i] = puz.size[dims.indexOf(-1 - i)] || 1;
    this.dimension = 3;
    this.calculateSizes();
    this.shape = new Array(this.shapeSize);
    this.hintsTotal = new Array(this.maxFaceSize * this.dimension);
    this.hintsPieces = new Array(this.maxFaceSize * this.dimension).fill(0);
    //Copy cells
    this.foreachCell((cell, i, pos) => {
        //Find position in original map
        let oldPos = dims.slice();
        for(let i in [0, 1, 2]) oldPos[dims.indexOf(-1 - i)] = pos[i];
        this.shape[i] = puz.shape[puz.collapsePos(oldPos)];
    });
    this.foreachHint((cell, total, pieces, dim, i) => {
        let hintPos = i + dim * this.maxFaceSize;
        if(dims.indexOf(-1 - dim) == -1) {
            this.hintsTotal[hintPos] = 0;
            this.hintsPieces[hintPos] = 0;
            return;
        }
        let position = [];
        for(let i = 0; i < this.dimension; i++) {
            position[i] = cell % this.size[i];
            cell = Math.floor(cell / this.size[i]);
        }
        position[dim] = 0;
        let newPosition = dims.slice();
        for(let i = 0; i < 3; i++) newPosition[dims.indexOf(-1 - i)] = position[i];
        let oldHintPosition = puz.getHintPosition(puz.collapsePos(newPosition), dims.indexOf(-1 - dim));
        this.hintsTotal[hintPos] = puz.hintsTotal[oldHintPosition];
        this.hintsPieces[hintPos] = puz.hintsPieces[oldHintPosition];
    });
}
Puzzle.prototype.rayIntersect = function (start, vel) {
    let velocityMagnitude = Math.sqrt(vel[0] * vel[0] + vel[1] * vel[1] + vel[2] * vel[2]);
    //Setup starting variables
    let normVel = vel.map(v => v / velocityMagnitude);
    let dir = vel.map(v => Math.sign(v));
    let closestCell = start.map((v, i) => ((v < 0 ? 1 - v : v) % 1 + 1) % 1);
    let tDelta = normVel.map(v => Math.abs(1 / v));
    let tMax = tDelta.map((v, i) => closestCell[i] * v);
    //Variables that keep track of state
    let curCell = start.map(v => Math.floor(v));
    let recentFace = 0;
    let pos = this.collapsePos(curCell);
    //Raycast loop
    for(let count = 0; count < 100; count++) {
        //Check if intersects cube
        if(curCell.every(v => v >= 0) && curCell.every((v, i) => v < this.size[i])) {
            if(scene.voxels[pos].visible) return {pos: pos, face: (recentFace * 2) + (dir[recentFace] < 0 ? 1 : 0)};
        }
        //Advance along closest plane to tip of ray
        let closest = Math.min(tMax[0], tMax[1], tMax[2]);
        for(let i = 0; i < 3; i++) if(closest == tMax[i]) {
            tMax[i] += tDelta[i];
            curCell[i] += dir[i];
            recentFace = i;
            pos += dir[i] * this.spacing[i];
            break;
        }
    }
    return {pos: -1, face: -1};
}
Puzzle.prototype.fromDifficulty = function (difficulty) {
    //Random number generator seeded with a
    function mulberry32(a) {
        return function () {
            var t = a += 0x6D2B79F5;
            t = Math.imul(t ^ t >>> 15, t | 1);
            t ^= t + Math.imul(t ^ t >>> 7, t | 61);
            return ((t ^ t >>> 14) >>> 0) / 4294967296;
        }
    }
    let rand = mulberry32(0xDEADBEEF);
    let out = Puzzle.fromString(this.toString());
    out.foreachHint((cell, total, pieces, dim, i) => {
        if(rand() < difficulty) out.hintsPieces[dim * out.maxFaceSize + i] = 0;
    });
    return out;
}
//Foreach functions
Puzzle.prototype.foreachCell = function (func) {
    let pos = new Array(this.dimension);
    pos.fill(0);
    for(let i = 0; i < this.shapeSize; i++) {
        func(this.shape[i], i, pos);
        pos[0]++;
        let x = -1;
        while(pos[++x] >= this.size[x]) {
            pos[x] = 0;
            pos[x + 1]++;
        }
    }
}
Puzzle.prototype.foreachHint = function (func) {
    for(let dim = 0; dim < this.dimension; dim++) {
        for(let i = 0; i < this.shapeSize / this.size[dim]; i++) {
            let cell = Math.floor(i / this.spacing[dim]) * this.spacing[dim + 1] + i % this.spacing[dim];
            let hintPos = i + dim * this.maxFaceSize;
            func(cell, this.hintsTotal[hintPos], this.hintsPieces[hintPos], dim, i);
        }
    }
}
//Utility Functions
Puzzle.prototype.deleteZeroedRows = function () {
    this.foreachHint((cell, total, pieces, dim) => {
        if(total == 0 && pieces == 1) {
            for(let i = 0; i < this.size[dim]; i++) {
                this.shape[cell + this.spacing[dim] * i] = cell_broken;
            }
        }
    });
}
Puzzle.prototype.generateActionableRows = function () {

}
//Export functions
Puzzle.prototype.toString = function () {
    const A = 'A'.charCodeAt(0);
    //Sizes and dimension
    let out = this.dimension + "~"
        + this.size.map(size => String.fromCharCode(A + size)).join("") + "~"
        //Shape
        + this.shape.map(cell => cell == cell_unsure ? "-" : (cell == cell_colored ? "+" : " ")).join("") + "~";
    //Hints
    for(let i = 0; i < this.dimension; i++) {
        for(let x = 0; x < this.shapeSize / this.size[i]; x++) {
            let index = i * this.maxFaceSize + x;
            out += String.fromCharCode(A + this.hintsTotal[index], A + this.hintsPieces[index]);
        }
    }
    out += "~" + JSON.stringify(this.metadata);
    return out;
}
Puzzle.prototype.toUintArray = function () {
    let meta = JSON.stringify(this.metadata);
    let length = 16;
    let hintLength = this.size.reduce((p, v) => p + this.shapeSize / v, 0);
    let sizes = [this.dimension + 1, hintLength, Math.ceil(this.shapeSize / 4), meta.length];
    console.log(sizes);
    for(let i = 0; i < 4; i++) length += sizes[i];
    let out = new Uint8ClampedArray(length);
    for(let i = 0; i < 4; i++) {
        let size = sizes[i];
        for(let x = 3; x >= 0; x--) {
            out[i * 4 + x] = size % 256;
            size = Math.floor(size / 256);
        }
    }
    let pos = 17;
    out[16] = this.dimension;
    for(let i = 0; i < this.dimension; i++) {
        out[pos++] = this.size[i];
    }
    console.log(pos);
    for(let i = 0; i < this.dimension; i++) {
        for(let x = 0; x < this.shapeSize / this.size[i]; x++) {
            let index = i * this.maxFaceSize + x;
            out[pos++] = this.hintsTotal[index] << 3 + this.hintsPieces[index];
        }
    }
    console.log(pos);
    pos--;
    for(let i = 0; i < this.shapeSize; i++) {
        if(i % 4 == 0) pos++;
        out[pos] |= this.shape[i] << (2 * i);
    }
    console.log(pos);
    pos++;
    for(let i = 0; i < meta.length; i++) {
        out[pos++] = meta.charCodeAt(i);
    }
    console.log(pos);
    return out;
}
Puzzle.prototype.toBase64 = function () {
    let string = this.toString();
    return btoa(String.fromCharCode.apply(null, Pako.deflate(string)));
}
//Import functions
Puzzle.fromString = function (str) {
    const A = 'A'.charCodeAt(0);
    let strs = str.split("~");
    let size = strs[1].split("").map(c => c.charCodeAt(0) - A);
    let puz = new Puzzle(Number(strs[0]), size, "");
    for(let i = 0; i < strs[2].length; i++) {
        let char = strs[2].charAt(i);
        if(char == '+') puz.shape[i] = cell_colored;
        else if(char == ' ') puz.shape[i] = cell_broken;
        else if(char == '-') puz.shape[i] = cell_unsure;
        else puz.shape[i] = cell_error;
    }
    puz.hintsTotal = new Array(puz.maxFaceSize * puz.dimension);
    puz.hintsPieces = new Array(puz.maxFaceSize * puz.dimension);
    let index = 0;
    for(let dim = 0; dim < puz.dimension; dim++) {
        for(let x = 0; x < puz.shapeSize / puz.size[dim]; x++) {
            let hintPos = dim * puz.maxFaceSize + x;
            puz.hintsTotal[hintPos] = strs[3].charCodeAt(index) - A;
            puz.hintsPieces[hintPos] = strs[3].charCodeAt(index + 1) - A;
            index += 2;
        }
    }
    puz.metadata = JSON.parse(strs[4] || "{}");
    return puz;

}
Puzzle.fromBase64 = function (str) {
    let unencoded = atob(str);
    let data = new Uint8Array(unencoded.length);
    unencoded.split("").map((a, i) => data[i] = a.charCodeAt(0));
    let unzippedString = Pako.inflate(data, {to: "string"});
    return Puzzle.fromString(unzippedString);
}
const cell_error = 0;
const cell_broken = 1;
const cell_colored = 2;
const cell_unsure = 3;