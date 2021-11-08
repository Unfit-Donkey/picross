export class Puzzle {
    constructor(dimension = 0, size = [], name = "Basic puzzle") {
        this.name = name;
        this.dimension = dimension;
        this.size = size.slice();
        this.calculateSizes();
        this.shape = new Array(this.shapeSize);
        this.hintsTotal = new Array(this.maxFaceSize * dimension);
        this.hintsPieces = new Array(this.maxFaceSize * dimension);
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
    static fromString(str) {
        var puz = new Puzzle();
        const A = 'A'.charCodeAt(0);
        let strs = str.split("~");
        puz.name = strs[0];
        puz.dimension = Number(strs[1]);
        puz.size = [];
        for(let i = 0; i < strs[2].length; i++) {
            puz.size[i] = strs[2].charCodeAt(i) - A;
        }
        puz.calculateSizes();
        puz.shape = new Array(puz.shapeSize);
        for(let i = 0; i < strs[3].length; i++) {
            let char = strs[3].charAt(i);
            if(char == '+') puz.shape[i] = cell_colored;
            else if(char == ' ') puz.shape[i] = cell_broken;
            else puz.shape[i] = cell_unsure;
        }
        puz.hintsTotal = new Array(puz.maxFaceSize * puz.dimension);
        puz.hintsPieces = new Array(puz.maxFaceSize * puz.dimension);
        for(let i = 0; i < strs[4].length; i += 2) {
            puz.hintsTotal[i / 2] = strs[4].charCodeAt(i) - A;
        }
        for(let i = 1; i < strs[4].length; i += 2) {
            puz.hintsPieces[(i - 1) / 2] = strs[4].charCodeAt(i) - A;
        }
        return puz;
    }
    collapsePos(position) {
        let sliceSize = 1;
        let out = 0;
        for(let i = 0; i < position.length; i++) {
            out += position[i] * sliceSize;
            sliceSize *= this.size[i];
        }
        return out;
    }
    getRow(position) {
        let dim = position.indexOf(-1);
        let out = [];
        let spacing = 1;
        for(let i = 0; i < dim; i++) spacing *= this.size[i];
        let start = this.collapsePos(position) + spacing;
        for(let i = 0; i < this.size[dim]; i++) {
            out[i] = this.shape[start + spacing * i];
        }
        return out;
    }
    getHintPosition(positionIndex, direction) {
        let belowSize = 1;
        for(let i = 0; i < direction; i++) belowSize *= this.size[i];
        let below = positionIndex % belowSize;
        let above = Math.floor(positionIndex / belowSize / this.size[direction]) * belowSize;
        return this.maxFaceSize * direction + below + above;
    }
    getCell(position) {
        const pos = p5Vector(position);
        let flatPos = 0;
        let sliceSize = 1;
        for(let i = 0; i < this.dimension; i++) {
            flatPos += pos[i] * sliceSize;
            if(pos[i] > this.size[i] || pos[i] < 0) return -1;
            sliceSize *= this.size[i];
        }
        return this.shape[flatPos];
    }
    sliceUp(dims) {

        //Find x, y, and z axis
        let size = [0, 0, 0];
        let xAxis = dims.indexOf(-1);
        let yAxis = dims.indexOf(-2);
        let zAxis = dims.indexOf(-3);
        size[0] = this.size[xAxis] || 1;
        size[1] = this.size[yAxis] || 1;
        size[2] = this.size[zAxis] || 1;
        let out = new Puzzle(3, size, this.name + " Sliced");
        //Loop through each cube in the destination map
        for(let x = 0; x < size[0]; x++) {
            dims[xAxis] = x;
            for(let y = 0; y < size[1]; y++) {
                dims[yAxis] = y;
                for(let z = 0; z < size[2]; z++) {
                    dims[zAxis] = z;
                    //Find position in original map
                    let oldPos = 0;
                    for(let i = dims.length - 1; i >= 1; i--) oldPos = (dims[i] + oldPos) * this.size[i - 1];
                    oldPos += dims[0];
                    //Find position in new map
                    let newPos = x + (y + (z * size[1])) * size[0];
                    //Copy voxel
                    out.shape[newPos] = this.shape[oldPos];
                }
            }
        }
        return out;
    }
    toString() {
        let out = this.name + "~" + this.dimension + "~";
        const A = 'A'.charCodeAt(0);
        for(let i = 0; i < this.dimension; i++) {
            out += String.fromCharCode(A + this.size[i]);
        }
        out += "~";
        for(let i = 0; i < this.shapeSize; i++) {
            out += this.shape[i] == cell_unsure ? "-" : (this.shape[i] == cell_colored ? "+" : " ");
        }
        out += "~";
        for(let i = 0; i < this.dimension * this.maxFaceSize; i++) {
            out += String.fromCharCode(A + this.hintsTotal[i], A + this.hintsPieces[i]);
        }
        return out;
    }
    toBase64() {

    }
    generateHints() {
        this.hintsPieces = new Array(this.maxFaceSize * this.dimension);
        this.hintsPieces.fill(0, 0, this.hintsPieces.length);
        this.hintsTotal = new Array(this.maxFaceSize * this.dimension);
        this.hintsTotal.fill(0, 0, this.hintsTotal.length);
        for(let i = 0; i < this.shapeSize; i++) {
            for(let dim = 0; dim < this.dimension; dim++) {
                let hint = this.getHintPosition(i, dim);
                //To prevent duplicate calculations
                if(this.hintsPieces[hint] != 0) continue;
                let spacing = 1;
                if(dim < 0 || dim > 2) console.log(dim);
                for(let x = 0; x < dim; x++) spacing *= this.size[x];
                //Set i to first cell in the row
                let firstCell = Math.floor((i / spacing) / this.size[dim]) * spacing * this.size[dim] + i % spacing;
                let total = 0, pieces = 0, prev = cell_broken;
                for(let x = 0; x < this.size[dim]; x++) {
                    let cell = firstCell + x * spacing;
                    if(this.shape[cell] == cell_colored) {
                        total++;
                        if(prev == cell_broken) pieces++;
                    }
                    prev = this.shape[cell];
                }
                this.hintsPieces[hint] = pieces;
                this.hintsTotal[hint] = total;
            }
        }
    }
}
function p5Vector(cell) {
    if(typeof cell.x != "undefined") {
        return [cell.x, cell.y, cell.z];
    }
    else return cell;
}
const cell_broken = 1;
const cell_colored = 2;
const cell_unsure = 3;