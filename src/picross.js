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
        this.spacing = [];
        let spacing = 1;
        for(let i = 0; i < this.dimension + 1; i++) {
            this.spacing.push(spacing);
            spacing *= this.size[i];
        }
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
        let below = positionIndex % this.spacing[direction];
        let above = Math.floor(positionIndex / this.spacing[direction + 1]) * this.spacing[direction];
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
    sliceFrom(dims, puz) {
        //Find x, y, and z axis
        this.size = [0, 0, 0];
        let xAxis = dims.indexOf(-1);
        let yAxis = dims.indexOf(-2);
        let zAxis = dims.indexOf(-3);
        this.size[0] = puz.size[xAxis] || 1;
        this.size[1] = puz.size[yAxis] || 1;
        this.size[2] = puz.size[zAxis] || 1;
        this.dimension = 3;
        this.calculateSizes();
        this.shape = new Array(this.shapeSize);
        this.hintsTotal = new Array(this.maxFaceSize * this.dimension);
        this.hintsPieces = new Array(this.maxFaceSize * this.dimension).fill(0);
        let pos = dims.slice();
        //Loop through each cube in the destination map
        for(let x = 0; x < this.size[0]; x++) {
            pos[xAxis] = x;
            for(let y = 0; y < this.size[1]; y++) {
                pos[yAxis] = y;
                for(let z = 0; z < this.size[2]; z++) {
                    pos[zAxis] = z;
                    //Find position in original map
                    let oldPos = 0;
                    for(let i = dims.length - 1; i >= 1; i--) oldPos = (pos[i] + oldPos) * puz.size[i - 1];
                    oldPos += pos[0];
                    //Find position in new map
                    let newPos = x + (y + (z * this.size[1])) * this.size[0];
                    //Copy voxel
                    this.shape[newPos] = puz.shape[oldPos];
                }
            }
        }
        //Loop through each face
        for(let dim = 0; dim < 3; dim++) if([xAxis, yAxis, zAxis][dim] != -1) {
            let xDir = [1, 0, 0][dim];
            let yDir = [2, 2, 1][dim];
            let oldXDir = dims.indexOf(-1 - xDir);
            let oldYDir = dims.indexOf(-1 - yDir);
            let oldZDir = dims.indexOf(-1 - dim);
            let width = this.size[xDir];
            let height = this.size[yDir];
            let basePosition = dims.slice();
            basePosition[oldXDir] = 0;
            basePosition[oldYDir] = 0;
            basePosition[oldZDir] = 0;
            let oldBase = puz.collapsePos(basePosition);
            for(let x = 0; x < width; x++) for(let y = 0; y < height; y++) {
                let newPosition = x * this.spacing[xDir] + y * this.spacing[yDir];
                let newHintPos = this.getHintPosition(newPosition, dim);
                let oldPosition = oldBase + x * (puz.spacing[oldXDir]||0) + y * (puz.spacing[oldYDir]||0);
                let oldHintPos = puz.getHintPosition(oldPosition, oldZDir);
                this.hintsPieces[newHintPos] = puz.hintsPieces[oldHintPos];
                this.hintsTotal[newHintPos] = puz.hintsTotal[oldHintPos];
            }
        }
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
    rayIntersect(start, vel) {
        function modOne(x) {return (x % 1 + 1) % 1;}
        let dir = new THREE.Vector3(Math.sign(vel.x), Math.sign(vel.y), Math.sign(vel.z));
        let normVel = new THREE.Vector3(0, 0, 0).copy(vel).normalize();
        let closestCellDist = new THREE.Vector3(0, 0, 0);
        if(dir.x > 0) closestCellDist.x = 1 - modOne(start.x);
        else closestCellDist.x = modOne(start.x);
        if(dir.y > 0) closestCellDist.y = 1 - modOne(start.y);
        else closestCellDist.y = modOne(start.y);
        if(dir.z > 0) closestCellDist.z = 1 - modOne(start.z);
        else closestCellDist.z = modOne(start.z);
        let tMax = new THREE.Vector3(Math.abs(closestCellDist.x / normVel.x), Math.abs(closestCellDist.y / normVel.y), Math.abs(closestCellDist.z / normVel.z));
        let tDelta = new THREE.Vector3(Math.abs(1 / normVel.x), Math.abs(1 / normVel.y), Math.abs(1 / normVel.z));
        let curCell = new THREE.Vector3(Math.floor(start.x), Math.floor(start.y), Math.floor(start.z));
        for(let count = 0; count < 100; count++) {
            if(curCell.x >= 0 && curCell.y >= 0 && curCell.z >= 0 && curCell.x < this.size[0] && curCell.y < this.size[1] && curCell.z < this.size[2]) {
                let pos = curCell.x + (curCell.y + (curCell.z * this.size[1])) * this.size[0];
                if(this.shape[pos] != cell_broken) return pos;
            }
            let closest = Math.min(tMax.x, tMax.y, tMax.z);
            if(closest == tMax.x) {
                tMax.x += tDelta.x;
                curCell.x += dir.x;
            }
            else if(closest == tMax.y) {
                tMax.y += tDelta.y;
                curCell.y += dir.y;
            }
            else if(closest == tMax.z) {
                tMax.z += tDelta.z;
                curCell.z += dir.z;
            }
        }
        return -1;
    }
    generateSidesVisible() {
        this.visibleSides = [];
        let spacing = [1, this.size[0], this.size[0] * this.size[1]];
        for(let x = 0; x < this.size[0]; x++) for(let y = 0; y < this.size[1]; y++) for(let z = 0; z < this.size[2]; z++) {
            let position = x + y * spacing[1] + z * spacing[2];
            if(this.shape[position] == cell_broken) {
                this.visibleSides[position] = 0;
                continue;
            }
            let posArr = [x, y, z];
            let visible = 0;
            for(let dim = 0; dim < 3; dim++) {
                let positionPositive = position + spacing[dim];
                let positionNegative = position - spacing[dim];
                if(posArr[dim] == 0 || this.shape[positionNegative] == cell_broken) visible |= (4 ** dim);

                if(posArr[dim] == this.size[dim] - 1 || this.shape[positionPositive] == cell_broken) visible |= (4 ** dim) * 2;
            }
            this.visibleSides[position] = visible;
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