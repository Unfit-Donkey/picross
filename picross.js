
class Puzzle {
    constructor(dimension, size, name) {
        this.name = name;
        this.dimension = dimension;
        this.size = size.slice();
        this.calculateSizes();
        this.shape = new Array(this.shapeSize);
        this.hintsTotal = new Array(this.maxFaceSize * dimension);
        this.hintsGaps = new Array(this.maxFaceSize * dimension);
    }
    calculateSizes() {
        this.shapeSize = 1;
        let minimumRowLength = 10000;
        for(let i = 0; i < this.dimension; i++) {
            this.shapeSize *= this.size[i];
            minimumRowLength = Math.min(minimumRowLength, this.size[i]);
        }
        this.maxFaceSize = this.shapeSize / minimumRowLength;
    }
    fromString(str) {
        const A = 'A'.charCodeAt(0);
        let strs = str.split("~");
        this.name = strs[0];
        this.dimension = Number(strs[1]);
        this.size = [];
        for(let i = 0; i < strs[2].length; i++) {
            this.size[i] = strs[2].charCodeAt(i) - A;
        }
        this.calculateSizes();
        this.shape = new Array(this.shapeSize);
        for(let i = 0; i < strs[3].length; i++) {
            this.shape[i] = strs[3].charCodeAt(i) - A;
        }
        this.hintsTotal = new Array(this.maxFaceSize * dimension);
        this.hintsGaps = new Array(this.maxFaceSize * dimension);
        for(let i = 0; i < strs[4].length; i += 2) {
            this.hintsTotal[i / 2] = strs[4].charCodeAt(i) - A;
        }
        for(let i = 1; i < strs[4].length; i += 2) {
            this.hintsGaps[(i - 1) / 2] = strs[4].charCodeAt(i) - A;
        }
    }
    collapsePos(position) {
        let sliceSize = 1;
        let out = 0;
        for(let i = 0; i < position.length; i++) {
            out += position[i] * sliceSize;
            sliceSize *= this.size[i];
        }
    }
    getRow(position) {
        let dim = position.indexOf(-1);
        let out = [];
        let spacing = 1;
        for(let i = 0; i < dim; i++) spacing *= size[i];
        let start = this.collapsePos(position) + spacing;
        for(let i = 0; i < this.size[dim]; i++) {
            out[i] = shape[start + spacing * i];
        }
        return out;
    }
    getCell(position) {
        let flatPos = 0;
        let sliceSize = 1;
        for(let i = 0; i < dimension; i++) {
            flatPos += position[i] * sliceSize;
            sliceSize *= this.size[i];
        }
        return flatPos;
    }
    sliceUp(dims) {
        let out = [];
        //Find x, y, and z axis
        size = [0, 0, 0];
        let xAxis = dims.indexOf(-1);
        let yAxis = dims.indexOf(-2);
        let zAxis = dims.indexOf(-3);
        size[0] = shapeSize[xAxis] || 1;
        size[1] = shapeSize[yAxis] || 1;
        size[2] = shapeSize[zAxis] || 1;
        //Loop through each cube in the destination map
        for(let x = 0; x < size[0]; x++) {
            dims[xAxis] = x;
            for(let y = 0; y < size[1]; y++) {
                dims[yAxis] = y;
                for(let z = 0; z < size[2]; z++) {
                    dims[zAxis] = z;
                    //Find position in original map
                    let oldPos = 0;
                    for(let i = dims.length - 1; i >= 1; i--) oldPos = (dims[i] + oldPos) * shapeSize[i - 1];
                    oldPos += dims[0];
                    //Find position in new map
                    let newPos = x + (y + (z * size[1])) * size[0];
                    //Copy voxel
                    out[newPos] = shape[oldPos];
                }
            }
        }
        return out;
    }
    toString() {
        let out = this.name + "~" + this.dimension + "~";
        const A = 'A'.charCodeAt(0);
        for(let i = 0; i < this.dimension; i++) {
            out += String.fromCharCode(A + size[i]);
        }
        out += "~";
        for(let i = 0; i < this.shapeSize; i++) {
            out += this.shape[i] == cell_unsure ? " " : (this.shape[i] == cell_painted ? "+" : "-");
        }
        for(let i = 0; i < this.dimension * this.maxFaceSize; i++) {
            out += String.fromCharCode(A + this.hintsTotal[i], A + this.hintsGaps[i]);
        }
        return out;
    }
    toBase64() {

    }
}
function getCell(shape, position) {
    let newShape = shape;
    for(let i = 0; i < position.length; i++) newShape = shape[position[i]];
    return newShape;
}
const cell_unsure = 0;
const cell_broken = 1;
const cell_colored = 2;