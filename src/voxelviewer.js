let curPuzzle = new Puzzle(3, [4, 3, 4], "Basic puzzle");
curPuzzle.shape = [3, 1, 1, 3, 3, 3, 3, 3, 3, 3, 3, 3, 1, 1, 3, 3, 1, 3, 1, 3, 1, 3, 1, 3, 3, 3, 3, 3, 3, 3, 3, 3, 1, 3, 3, 3, 3, 1, 1, 1, 1, 3, 3, 3, 1, 3, 1, 3, 1, 3, 1, 3, 1, 3, 1, 3, 1, 3, 1, 3, 1, 1, 1, 1, 3, 3, 3, 3, 3, 3, 3, 1, 1, 1, 3, 3, 3, 3];
curPuzzle.hintsTotal = [15, 2, 5, 1, 5, 1, 2, 10, 9, 2, 3, 4, 1, 2, 59, 1, 2, 4, 1, 2, 5, 6, 19, 1, 24, 21, 2, 5, 61, 7, 1, 2, 5, 2, 3, 4, 5, 6, 1, 2, 34, 4, 6, 1, 7, 1, 5, 3, 6, 3, 46, 3, 7, 3, 3, 1, 2, 2, 3, 1, 2, 3, 2, 1, 2, 3,];
curPuzzle.hintsPieces = [1, 1, 1, 1, 1, 2, 3, 1, 0, 1, 4, 1, 3, 4, 0, 1, 1, 0, 2, 2, 1, 1, 0, 4, 1, 1, 1, 0, 1, 1, 0, 2, 2, 1, 2, 0, 1, 2, 1, 0, 2, 1, 1, 0, 1, 0, 3, 2, 1, 1, 0, 1, 1, 3, 2, 0, 1, 2, 1, 0, 3, 0, 2, 1, 1, 0, 2, 1, 3, 1, 0, 1, 1];
let shape = [
    0, 2, 2, 2,
    2, 2, 2, 2,

    2, 0, 0, 0,
    0, 2, 0, 2,

    2, 1, 2, 0,
    1, 2, 0, 2,

    1, 2, 0, 1,
    2, 0, 0, 1,

    2, 0, 0, 0,
    2, 1, 0, 0,

    0, 1, 2, 0, 2, 0, 2, 1, 1, 2, 0, 2, 2, 2, 1, 0, 0, 2, 0, 1, 0, 0, 2, 0, 1, 0, 2, 2, 2, 2, 2, 2, 2, 2, 0, 0, 0, 0, 1, 1, 1, 1, 2, 0, 0, 2, 2, 1, 2, 0, 0, 0, 0, 0, 1, 2, 2, 0, 0, 0, 1, 0, 0, 0, 0, 1, 2, 2, 0, 0, 2, 1, 2, 2, 1, 2, 0, 0, 0];
let shapeSize = [4, 3, 2, 2];
var font;
function preload() {
    font = loadFont("lib/robotoMono.ttf");
}
function setup() {
    //Create orthogonal 3d canvas with the size of the window
    createCanvas(windowWidth, windowHeight, WEBGL);
    ortho(-width / 2, width / 2, -height / 2, height / 2, -100000, 10000);
    updateRotation();
    generateSidesVisible();
    render();
}
var windowResized = setup;
var pmouseX;
var pmouseY;
var selectedBlock = -1;
var xRot = -0.31799999999999995, yRot = 0.270000000000001350;
var mouseSpeed = 0.006;
var cameraPos;
const boxScale = 50;
function rayIntersect(start, vel) {
    function modOne(x) {return (x % 1 + 1) % 1;}
    let dir = createVector(Math.sign(vel.x), Math.sign(vel.y), Math.sign(vel.z));
    let normVel = p5.Vector.normalize(vel);
    let closestCellDist = createVector(0, 0, 0);
    if(dir.x > 0) closestCellDist.x = 1 - modOne(start.x);
    else closestCellDist.x = modOne(start.x);
    if(dir.y > 0) closestCellDist.y = 1 - modOne(start.y);
    else closestCellDist.y = modOne(start.y);
    if(dir.z > 0) closestCellDist.z = 1 - modOne(start.z);
    else closestCellDist.z = modOne(start.z);
    let tMax = createVector(Math.abs(closestCellDist.x / normVel.x), Math.abs(closestCellDist.y / normVel.y), Math.abs(closestCellDist.z / normVel.z));
    let tDelta = createVector(Math.abs(1 / normVel.x), Math.abs(1 / normVel.y), Math.abs(1 / normVel.z));
    let curCell = createVector(Math.floor(start.x), Math.floor(start.y), Math.floor(start.z));
    for(let count = 0; count < 70; count++) {
        if(curCell.x >= 0 && curCell.y >= 0 && curCell.z >= 0 && curCell.x < curPuzzle.size[0] && curCell.y < curPuzzle.size[1] && curCell.z < curPuzzle.size[2]) {
            let pos = curCell.x + (curCell.y + (curCell.z * curPuzzle.size[1])) * curPuzzle.size[0];
            if(curPuzzle.shape[pos] != cell_broken) return pos;
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
function draw() {
    //Change rotation value if mouse is pressed
    let doRender = false;
    if(mouseIsPressed && !keyIsDown(SHIFT) && !keyIsDown(CONTROL) && (mouseX != pmouseX || mouseY != pmouseY)) {
        updateRotation();
        doRender = true;
    }
    if(keyIsDown(SHIFT) || keyIsDown(CONTROL)) {
        let cursorPos = getCursorPosition();
        let direction = p5.Vector.mult(cameraPos, -1).normalize();
        selectedBlock = rayIntersect(cursorPos, direction);
        doRender = true;
    }
    else selectedBlock = -1;
    pmouseX = mouseX;
    pmouseY = mouseY;
    if(doRender) render();
}
let lastPress = 0;
var lastColoredBlock = -1;
function render() {
    background(255, 255, 255)
    drawCardinalDirections();
    renderVoxels();
    renderHints();
}
function renderVoxels() {
    push();
    rotateX(xRot);
    rotateY(yRot);
    scale(boxScale);
    translate(-curPuzzle.size[0] / 2, -curPuzzle.size[1] / 2, -curPuzzle.size[2] / 2);
    stroke("#555555");
    strokeWeight(2);
    //Loop through voxels
    const size = curPuzzle.size;
    for(let x = 0; x < size[0]; x++) for(let y = 0; y < size[1]; y++) for(let z = 0; z < size[2]; z++) {
        //Find array index of voxels
        let position = x + (y + z * size[1]) * size[0];
        if(curPuzzle.visibleSides[position] == 0) continue;
        if(curPuzzle.shape[position] != cell_broken) {
            //Find appropriate fill color
            if(curPuzzle.shape[position] == cell_colored) fill("pink");
            else if(curPuzzle.shape[position] == cell_unsure) fill("white");
            if(position == selectedBlock) fill("yellow");
            //Draw voxel
            push();
            translate(x + 0.5, y + 0.5, z + 0.5);
            box(1, 1, 1);
            pop();
        }
    }
    pop();
}
function renderHints() {
    push();
    rotateX(xRot);
    rotateY(yRot);
    scale(boxScale);
    translate(-curPuzzle.size[0] / 2, -curPuzzle.size[1] / 2, -curPuzzle.size[2] / 2);
    textAlign(CENTER, CENTER);
    textFont(font);
    textSize(0.6);
    fill("#000000");
    stroke("#000000");
    strokeWeight(2);
    let faceSize = curPuzzle.maxFaceSize;
    for(let dim = 0; dim < 3; dim++) {
        //Get subsection of hints
        const faceHints = curPuzzle.hintsTotal.slice(faceSize * dim, faceSize * (dim + 1));
        const faceHintPieces = curPuzzle.hintsPieces.slice(faceSize * dim, faceSize * (dim + 1));
        //Get other dimensions
        const xDim = dim == 0 ? 2 : 0;
        const yDim = dim == 1 ? 2 : 1;
        let faceWidth = curPuzzle.size[xDim], faceHeight = curPuzzle.size[yDim];
        let facing = Math.sign(cameraPos[['x', 'y', 'z'][dim]]);
        let facingMask = (4 ** dim) * (facing == -1 ? 1 : 2);
        for(let x = 0; x < faceWidth; x++) for(let y = 0; y < faceHeight; y++) {
            //Get hints
            let Coords2D = x + faceWidth * y;
            const pieces = faceHintPieces[Coords2D];
            if(pieces == 0) continue;
            const total = faceHints[Coords2D];
            //Get row of cells
            let cell = [0, 0, 0];
            cell[xDim] = x;
            cell[yDim] = y;
            let start = curPuzzle.collapsePos(cell);
            let spacing = dim == 0 ? 1 : (dim == 1 ? faceHeight : faceWidth * faceHeight);
            //Render text for each uncovered block
            let textPosition = [0, 0, 0];
            textPosition[xDim] = x + 0.5;
            textPosition[yDim] = y + 0.4;
            for(let i = 0; i < curPuzzle.size[dim]; i++) {
                if((curPuzzle.visibleSides[start + spacing * i] & facingMask) == 0) continue;
                push();
                textPosition[dim] = i + 0.501 * facing + 0.5;
                translate(textPosition[0], textPosition[1], textPosition[2]);
                //Rotate onto face
                if(dim == 0) rotateY(Math.PI / 2);
                if(dim == 1) rotateX(Math.PI / 2);
                //Flip text if viewing from negative side
                if(facing == -1 ^ dim == 1) scale(-1, 1);
                //Draw shape around text if applicable
                if(pieces != 1) {
                    noFill();
                    if(pieces == 2) ellipse(0, 0.1, 0.8);
                    if(pieces == 3) rect(-0.4, -0.3, 0.8, 0.8);
                    if(pieces == 4) triangle(-0.4, -0.3, 0.4, -0.3, 0, 0.5);
                    fill("#000000");
                }
                //Draw text
                text(total, 0, 0);
                pop();
            }
        }
    }
}
function updateRotation() {
    yRot -= (pmouseX - mouseX) * mouseSpeed;
    xRot += (pmouseY - mouseY) * mouseSpeed;
    if(xRot > Math.PI / 2) xRot = Math.PI / 2;
    if(xRot < -Math.PI / 2) xRot = -Math.PI / 2;
    if(yRot > Math.PI * 2) yRot -= Math.PI * 2;
    if(yRot < 0) yRot += Math.PI * 2;
    cameraPos = createVector(Math.sin(yRot) * -Math.cos(xRot), Math.sin(xRot), Math.cos(xRot) * Math.cos(yRot));
    cameraPos.mult(10);
}
//Returns the position of the cursor in 3d space
function getCursorPosition() {
    let mouse = createVector(mouseX - windowWidth / 2, mouseY - windowHeight / 2);
    let xPixelStep = createVector(1, 0, Math.tan(yRot)).normalize();
    if(yRot > Math.PI / 2 && yRot < 3 * Math.PI / 2) {
        xPixelStep.x = -xPixelStep.x;
        xPixelStep.z = -xPixelStep.z;
    }
    let yPixelStep = createVector(-Math.sin(yRot), -1 / Math.tan(xRot), Math.cos(yRot)).normalize();
    xPixelStep.mult(mouse.x / boxScale);
    yPixelStep.mult((xRot > 0 ? -1 : 1) * mouse.y / boxScale);
    let cursorPos = p5.Vector.add(p5.Vector.add(xPixelStep, yPixelStep), cameraPos);
    cursorPos.x += curPuzzle.size[0] / 2;
    cursorPos.y += curPuzzle.size[1] / 2;
    cursorPos.z += curPuzzle.size[2] / 2;
    return cursorPos;
}
function generateSidesVisible() {
    curPuzzle.visibleSides = [];
    let spacing = [1, curPuzzle.size[0], curPuzzle.size[0] * curPuzzle.size[1]];
    for(let x = 0; x < curPuzzle.size[0]; x++) for(let y = 0; y < curPuzzle.size[1]; y++) for(let z = 0; z < curPuzzle.size[2]; z++) {
        let position = x + y * spacing[1] + z * spacing[2];
        if(curPuzzle.shape[position] == cell_broken) {
            curPuzzle.visibleSides[position] = 0;
            continue;
        }
        let posArr = [x, y, z];
        let visible = 0;
        for(let dim = 0; dim < 3; dim++) {
            let positionPositive = position + spacing[dim];
            let positionNegative = position - spacing[dim];
            if(posArr[dim] == 0 || curPuzzle.shape[positionNegative] == cell_broken) visible |= (4 ** dim);

            if(posArr[dim] == curPuzzle.size[dim] - 1 || curPuzzle.shape[positionPositive] == cell_broken) visible |= (4 ** dim) * 2;
        }
        curPuzzle.visibleSides[position] = visible;
    }
}
function mouseDragged() {
    if(selectedBlock != -1) {
        if(keyIsDown(SHIFT)) {
            curPuzzle.shape[selectedBlock] = 1;
            generateSidesVisible();
        }
        if(keyIsDown(CONTROL) && lastColoredBlock != selectedBlock) {
            curPuzzle.shape[selectedBlock] = curPuzzle.shape[selectedBlock] == 0 ? 2 : 0;
        }
        lastColoredBlock = selectedBlock;
    }
}
var mousePressed = mouseDragged;
function mouseReleased() {
    lastColoredBlock = -1;
}
function drawCardinalDirections() {
    strokeWeight(7);
    //Transformations
    push();
    translate(-windowWidth / 2 + 50, windowHeight / 2 - 50);
    push();
    rotateX(xRot);
    rotateY(yRot);
    scale(30);
    //Draw xyz lines
    stroke("red");
    line(0, 0, 0, 1, 0, 0);
    stroke("green");
    line(0, 0, 0, 0, 1, 0);
    stroke("blue");
    line(0, 0, 0, 0, 0, 1);
    pop();
    //Draw small grey sphere at intersection point
    noStroke();
    fill("#666666");
    sphere(3);
    pop();
}