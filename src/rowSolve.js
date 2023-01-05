const cell_error = 0;
const cell_broken = 1;
const cell_colored = 2;
const cell_unsure = 3;
export class RowSolve {

}
//Checks if (row1 | row2) == row1 for each element, but returns false if row1==row2. Assumes they are the same length
RowSolve.RowMatches = function (row1, row2) {
    //Check if they match
    for(let i = 0; i < row1.length; i++) {
        if((row1[i] | row2[i]) != row1[i]) return false;
    }
    //If they are different, return true
    for(let i = 0; i < row1.length; i++) {
        if(row1[i] != row2[i]) return true;
    }
    return false;
}
//Return a row that has guaranteed cells
RowSolve.solve = function (row, total, pieces) {
    if(pieces == 0) return null;
    let output = new Array(row.length);
    output.fill(0);
    let isChange = false;
    let possibilities = RowSolve.possibilities(total, pieces, row.length);
    for(let possib of possibilities) {
        //If possibility is valid with current row, OR it with the current output
        if(RowSolve.RowMatches(row, possib)) {
            isChange = true;
            //OR the possilibity with the output
            for(let i in output) output[i] |= possib[i];
        }
    }
    if(isChange) return output;
    return null;
}
RowSolve.cache = [];
RowSolve.cache.get = function (total, pieces, length) {
    if(!this[length]) return null;
    const hint = total + "_" + pieces;
    if(!this[length][hint]) return null;
    return this[length][hint];
}
RowSolve.cache.set = function (total, pieces, length, possib) {
    if(!this[length]) this[length] = [];
    this[length][total + "_" + pieces] = possib;
}
//Returns an array of row possibilities (with each row being an array of cells) output is NOT MUTABLE
RowSolve.possibilities = function (total, pieces, length) {
    let cacheOut = RowSolve.cache.get(total, pieces, length);
    if(cacheOut != null) return cacheOut;
    let pieceArrangements = RowSolve.distributeTotal(total, pieces);
    let gaps = length - total;
    //Outer only are like: 1 2 2 1
    let gapArrangements = RowSolve.distributeTotal(gaps, pieces + 1);
    //Inner only are like: 0 3 3 0
    let innerOnlyGaps = RowSolve.distributeTotal(gaps, pieces - 1);
    innerOnlyGaps.forEach(v => {v.unshift(0); v.push(0); gapArrangements.push(v)});
    //Outer inner gaps are like: 0 3 1 2, or 3 1 2 0, both are possibilities
    let outerInnerGaps = RowSolve.distributeTotal(gaps, pieces);
    outerInnerGaps.forEach(v => {
        v.unshift(0);
        gapArrangements.push(v.slice());
        v.shift();
        v.push(0);
        gapArrangements.push(v);
    });
    let out = [];
    //Each piece arrangement combined with each gap arrangement
    pieceArrangements.forEach(pieceArr => {
        gapArrangements.forEach(gapArr => {
            let arr = new Array(length);
            let pos = 0
            arr.fill(cell_broken, 0, gapArr[0] + 1);
            for(let i = 0; i < pieceArr.length; i++) {
                pos += gapArr[i];
                arr.fill(cell_colored, pos, pos + pieceArr[i] + 1);
                pos += pieceArr[i];
                arr.fill(cell_broken, pos, pos + gapArr[i + 1] + 1);
            }
            out.push(arr);
        });
    });
    RowSolve.cache.set(total, pieces, length, out);
    return out;
}
//Return possibilities for how to distribute total across pieces
//EX RowSolve.distributeTotal(5,3) == [[1,1,3], [1,2,2], [1,3,1], [2,1,2], [2,2,1], [3,1,1]]
RowSolve.distributeTotal = function (total, pieces) {
    if(pieces == 0) return [];
    if(pieces == 1) return [[total]];
    let maximum = total - pieces + 1;
    let out = [];
    for(let i = 1; i <= maximum; i++) {
        let possib = RowSolve.distributeTotal(total - i, pieces - 1);
        possib.forEach(v => v.unshift(i));
        out.push.apply(out, possib);
    }
    return out;
}