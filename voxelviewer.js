let curPuzzle=new Puzzle(3,[3,4,3],"Basic puzzle");
curPuzzle.shape=[0, 1, 1, 1, 0, 1, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 1, 1, 0, 0, 0, 0, 1, 1, 1, 1, 0 ,0];
let size = [3, 3, 2];
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
function setup() {
    //Create orthogonal 3d canvas with the size of the window
    createCanvas(windowWidth, windowHeight, WEBGL);
    ortho(-width / 2, width / 2, -height / 2, height / 2, -100000, 10000);
}
var windowResized = setup;
var pmouseX;
var pmouseY;
var selectedBlock = -1;
var xRot = -0.31799999999999995, yRot = 0.270000000000001350;
var mouseSpeed = 0.006;
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
        if(curCell.x >= 0 && curCell.y >= 0 && curCell.z >= 0 && curCell.x < size[0] && curCell.y < size[1] && curCell.z < size[2]) {
            let pos = curCell.x + (curCell.y + (curCell.z * size[1])) * size[0];
            let voxel = curPuzzle.shape[pos];
            if(voxel == 0 || voxel == 2) return pos;
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
//Basically this works to control the slicer in the bottom right corner
function draw() {
    background(255, 255, 255)
    //Set up transformation and draw cardinal indicator
    drawCardinalDirections();
    rotateX(xRot);
    rotateY(yRot);
    scale(50);
    translate(-curPuzzle.size[0] / 2, -curPuzzle.size[1] / 2, -curPuzzle.size[2] / 2);
    //Find mouse position in space and raycast
    {
        let mouse = createVector(mouseX - windowWidth / 2, mouseY - windowHeight / 2);
        let camera = createVector(Math.sin(yRot) * -Math.cos(xRot), Math.sin(xRot), Math.cos(xRot) * Math.cos(yRot));
        camera.mult(10);
        let xPixelStep = createVector(1, 0, Math.tan(yRot)).normalize();
        if(yRot > Math.PI / 2 && yRot < 3 * Math.PI / 2) {
            xPixelStep.x = -xPixelStep.x;
            xPixelStep.z = -xPixelStep.z;
        }
        let yPixelStep = createVector(-Math.sin(yRot), -1 / Math.tan(xRot), Math.cos(yRot)).normalize();
        xPixelStep.mult(mouse.x / boxScale);
        yPixelStep.mult((xRot > 0 ? -1 : 1) * mouse.y / boxScale);
        let cursorPos = p5.Vector.add(p5.Vector.add(xPixelStep, yPixelStep), camera);
        cursorPos.x += curPuzzle.size[0] / 2;
        cursorPos.y += curPuzzle.size[1] / 2;
        cursorPos.z += curPuzzle.size[2] / 2;
        let direction = p5.Vector.mult(camera, -1).normalize();
        selectedBlock = rayIntersect(cursorPos, direction);
    }
    //Change rotation value if mouse is pressed
    if(mouseIsPressed && !keyIsDown(SHIFT) && !keyIsDown(CONTROL)) {
        yRot -= (pmouseX - mouseX) * mouseSpeed;
        xRot += (pmouseY - mouseY) * mouseSpeed;
        if(xRot > Math.PI / 2) xRot = Math.PI / 2;
        if(xRot < -Math.PI / 2) xRot = -Math.PI / 2;
        if(yRot > Math.PI * 2) yRot -= Math.PI * 2;
        if(yRot < 0) yRot += Math.PI * 2;
    }
    pmouseX = mouseX;
    pmouseY = mouseY;
    stroke("#555555");
    strokeWeight(2);
    //Loop through voxels
    for(let x = 0; x < size[0]; x++) for(let y = 0; y < size[1]; y++) for(let z = 0; z < size[2]; z++) {
        //Find array index of voxels
        let position = x + (y + z * size[1]) * size[0];
        if(curPuzzle.shape[position] != 1) {
            //Find appropriate fill color
            if(curPuzzle.shape[position] == 2) fill("pink");
            else if(curPuzzle.shape[position] == 0) fill("white");
            if(position == selectedBlock) fill("yellow");
            //Draw voxel
            push();
            translate(x + 0.5, y + 0.5, z + 0.5);
            box(1, 1, 1);
            pop();
        }
    }

}
let lastPress = 0;
var lastColoredBlock = -1;
function mouseDragged() {
    if(selectedBlock != -1) {
        if(keyIsDown(SHIFT)) curPuzzle.shape[selectedBlock] = 1;
        if(keyIsDown(CONTROL) && lastColoredBlock != selectedBlock) {
            curPuzzle.shape[selectedBlock] = curPuzzle.shape[selectedBlock] == 0 ? 2 : 0;
        }
        lastColoredBlock = selectedBlock;
    }
}
var mousePressed=mouseDragged;
function mouseReleased() {
    lastColoredBlock=-1;
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