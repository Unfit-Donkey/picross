// Import Pako for binary compression
import * as Pako from "../lib/pako.js";
import {RowSolve} from "./rowSolve.js";
window.Pako = Pako;
//Puzzle also has other methods below this definition
export class Puzzle {
    //Constructors
    constructor(dimension = 0, size = []) {
        //Number of dimensions of the puzzle
        this.dimension = dimension;
        //Array with the length in each dimension
        this.size = size.slice();
        this.calculateSizes();
        //List of blocks
        this.shape = new Array(this.shapeSize);
        //List of hints, which is the maximum face size multiplied by the dimension
        this.hintsTotal = new Array(this.maxFaceSize * dimension);
        this.hintsPieces = new Array(this.maxFaceSize * dimension);
        //Metadata like name, color...
        this.metadata = {};
    }
    calculateSizes() {
        //Computer total size of shape
        this.shapeSize = 1;
        let minimumRowLength = 10000;
        for(let i = 0; i < this.dimension; i++) {
            this.shapeSize *= this.size[i];
            minimumRowLength = Math.min(minimumRowLength, this.size[i]);
        }
        //Max face size is the total size divided by the smallest row.
        this.maxFaceSize = this.shapeSize / minimumRowLength;
        //Spacing is a cumulative size metric. If this.size=[4,3,2], this.spacing=[1,4,12]
        this.spacing = [];
        let spacing = 1;
        for(let i = 0; i < this.dimension + 1; i++) {
            this.spacing.push(spacing);
            spacing *= this.size[i];
        }
    }
}
//Positional retrieval functions
//Turns position vector into an index
Puzzle.prototype.collapsePos = function (vector) {
    //Multiply each position component by its spacing and take the sum
    return vector.map((p, i) => p * this.spacing[i]).reduce((a, b) => a + b);
}
//Splices a row from a starting position index and a direction
Puzzle.prototype.getRow = function (pos, dim) {
    let out = [];
    let spacing = this.spacing[dim];
    //Start is the position at the beginning of the row
    let start = pos % spacing + Math.floor(pos / this.spacing[dim + 1]) * this.spacing[dim + 1];
    for(let i = 0; i < this.size[dim]; i++) {
        out[i] = this.shape[start + spacing * i];
    }
    return out;
}
Puzzle.prototype.setRow = function (pos, dim, row) {
    let spacing = this.spacing[dim];
    //Start is the position at the beginning of the row
    let start = pos % spacing + Math.floor(pos / this.spacing[dim + 1]) * this.spacing[dim + 1];
    for(let i = 0; i < this.size[dim]; i++) {
        this.shape[start + spacing * i] = row[i];
    }
    return out;
}
Puzzle.prototype.hintToPos = function (hint) {
    let dim = Math.floor(hint / this.maxFaceSize);
    hint -= dim * this.maxFaceSize;
    let below = hint % this.spacing[dim];
    let above = Math.floor(hint / this.spacing[dim]) * this.spacing[dim + 1];
    return below + above;
}
//Convert a position and direction into a hint position in the hint array
Puzzle.prototype.getHintPosition = function (position, direction) {
    let below = position % this.spacing[direction];
    let above = Math.floor(position / this.spacing[direction + 1]) * this.spacing[direction];
    return this.maxFaceSize * direction + below + above;
}
//Converts multidimensional position index into 3d position index where dims is the slicer state
Puzzle.prototype.positionTo3D = function (vector, dims) {
    let size = [];
    for(let i in [0, 1, 2]) size[i] = this.size[dims.indexOf(-1 - i)] || 1;
    let posArray = dims.slice();
    //Set x,y, and z of the output array
    posArray[dims.indexOf(-1)] = vector % size[0];
    posArray[dims.indexOf(-2)] = Math.floor(vector / size[0]) % size[1];
    posArray[dims.indexOf(-3)] = Math.floor(vector / size[0] / size[1]) % size[2];
    //Collapse to 3d position
    return this.collapsePos(posArray);
}
//Converts position index into position vector
Puzzle.prototype.getVector = function (position) {
    let out = [];
    for(let i = 0; i < this.dimension; i++) {
        out[i] = Math.floor(position / this.spacing[i]) % this.size[i];
    }
    return out;
}
//Extra data generation
//Generate all hints for the entire puzzle (puzzle should not have indetermined pieces)
Puzzle.prototype.generateHints = function () {
    //Reset hint arrays
    this.hintsPieces = new Array(this.maxFaceSize * this.dimension);
    this.hintsPieces.fill(0, 0, this.hintsPieces.length);
    this.hintsTotal = new Array(this.maxFaceSize * this.dimension);
    this.hintsTotal.fill(0, 0, this.hintsTotal.length);
    //Iterate through each hint
    this.foreachHint((cell, t, p, dim, i) => {
        let row = this.getRow(cell, dim);
        //Count total and how many pieces its in
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
//Generate visible sides of a 3d puzzle
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
//Create a new puzzle from a puzzle and a slicer state
Puzzle.prototype.project3D = function (dims, puz) {
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
    //Copy hints
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
//Generate a new puzzle with certain hints missing based on a linear difficulty scale
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
//Iterate over each hint and run func(cell,total,pieces,dimension,index)
Puzzle.prototype.foreachHint = function (func) {
    for(let dim = 0; dim < this.dimension; dim++) {
        for(let i = 0; i < this.shapeSize / this.size[dim]; i++) {
            let cell = Math.floor(i / this.spacing[dim]) * this.spacing[dim + 1] + i % this.spacing[dim];
            let hintPos = i + dim * this.maxFaceSize;
            func(cell, this.hintsTotal[hintPos], this.hintsPieces[hintPos], dim, i);
        }
    }
}
//Runs func(row,hintIndex) on each row
Puzzle.prototype.foreachRow = function (func) {
    for(let dim = 0; dim < this.dimension; dim++) {
        for(let i = 0; i < this.shapeSize / this.size[dim]; i++) {
            let pos = Math.floor(i / this.spacing[dim]) * this.spacing[dim + 1] + i % this.spacing[dim];
            let hintPos = i + dim * this.maxFaceSize;
            func(this.getRow(pos, dim), hintPos);
        }
    }
}
//Utility Functions
//Delete all rows that have a zero for a hint
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
Puzzle.prototype.generateHints = function () {
    //Iterate through each row and create the hints
    this.foreachRow((row, index) => {
        let pieces = 0;
        let total = 0;
        let prev = cell_broken;
        row.forEach(v => {
            if(v == cell_unsure) v = cell_colored;
            if(v == cell_colored) total++;
            if(v == cell_colored && prev == cell_broken) pieces++;
            prev = v;
        });
        this.hintsPieces[index] = pieces;
        this.hintsTotal[index] = total;
    });
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
//Not sure what this is supposed to be for
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
//Convert puzzle to a base64 string that can be shared
Puzzle.prototype.toBase64 = function () {
    let string = this.toString();
    return btoa(String.fromCharCode.apply(null, Pako.deflate(string)));
}
//Import functions
//Create puzzle from raw string
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
//Create puzzle from base64
Puzzle.fromBase64 = function (str) {
    try {
        let unencoded = atob(str);
        let data = new Uint8Array(unencoded.length);
        unencoded.split("").map((a, i) => data[i] = a.charCodeAt(0));
        let unzippedString = Pako.inflate(data, {to: "string"});
        return Puzzle.fromString(unzippedString);
    }
    catch(e) {
        printError("Invalid puzzle");
    }
}
//Solving functions
//Solves a puzzle using brute force (checking every row repeatedly)
Puzzle.prototype.bruteForceSolve = function () {
    let isChange = true;
    //Loop through each row while there is still a change
    while(isChange) this.foreachRow((row, hintIndex) => {
        if(this.hintsPieces[hintIndex] == 0) return;
        let newRow = RowSolve.solve(row, this.hintsTotal[hintIndex], this.hintsPieces[hintIndex]);
        if(newRow == null) return;
        isChange = true;
        this.setRow(hintIndex, newRow);
    });
}
//Solves puzzles using row solve. Returns the number of time units (arbitrary unit of complexity) of the solution
Puzzle.prototype.smartSolve = function () {
    //One time unit is approximately one second for an average solver
    let complexity = {size: this.shapeSize, rowComplexity: 0, zeroes: 0, rowChecks: 0}
    //Keep track of which rows are in the queue
    let isQueued = [];
    //Queue of rows to be checked
    let rowQueue = [];
    //Add all rows to a queue
    for(let i = 0; i < this.dimension; i++) {
        let offset = i * this.maxFaceSize;
        for(let x = 0; x < this.shapeSize / this.size[i]; x++) {
            if(this.hintsPieces[offset + x] == 0) continue;
            isQueued[offset + x] = true;
            rowQueue.push(offset + x);
        }
    }
    console.log(rowQueue);
    //Loop while there is still a row in the queue
    while(rowQueue.length != 0) {
        console.log(rowQueue[0]);
        complexity.rowChecks++;
        let rowId = rowQueue.shift();
        isQueued[rowId] = false;
        //Get position information
        let dim = Math.floor(rowId / this.maxFaceSize);
        let pos = this.hintToPos(rowId);
        let row = this.getRow(pos, dim);
        //Skip if solved already
        if(row.indexOf(3) == -1) continue;
        complexity.rowComplexity += this.hintsTotal[rowId] + 2 * this.hintsPieces[rowId];
        if(this.hintsTotal[rowId] == 0) complexity.zeroes++;
        //Solve row
        let newRow = RowSolve.solve(row, this.hintsTotal[rowId], this.hintsPieces[rowId]);
        console.log(newRow,row);
        if(newRow == null) continue;
        //Update cells in new row if it is different
        for(let i = 0; i < row.length; i++) {
            if(row[i] == newRow[i]) continue;
            //Update cell
            this.shape[pos + this.spacing[dim] * i] = newRow[i];
            //Add intersecting rows to list
            for(let x = 0; x < this.dimension; x++) {
                let id = this.getHintPosition(pos + this.spacing[dim] * i, x);
                //Skip if already queued or is current row
                if(isQueued[id]) continue;
                if(id == rowId) continue;
                isQueued[id] = true;
                rowQueue.push(id);
            }
        }
    }
    return complexity.size * 0.2 +
        complexity.rowChecks * 0.5 +
        complexity.rowComplexity * 0.3 -
        complexity.zeroes * 0.3;
    //Done!
}
const cell_error = 0;
const cell_broken = 1;
const cell_colored = 2;
const cell_unsure = 3;