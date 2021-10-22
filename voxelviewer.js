let voxels = [0, 2, 2, 1, 0, 1, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0];
let size = [3, 3, 2];
let shape = [
    0, 2, 2, 1,
    2, 2, 1, 2,

    1, 0, 0, 0,
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
    ortho();
}
var windowResized=setup;
var pmouseX;
var pmouseY;
var xRot = -0.31799999999999995, yRot = 0.270000000000001350;
var mouseSpeed = 0.006;
//Basically this works to control the slicer in the bottom right corner
function slicer(dims) {
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
                for(let i = dims.length - 1; i >= 1; i--) oldPos = (dims[i] + oldPos) * shapeSize[i-1];
                oldPos += dims[0];
                //Find position in new map
                let newPos = x + (y + (z * size[1])) * size[0];
                //Copy voxel
                voxels[newPos] = shape[oldPos];
            }
        }
    }

}
function draw() {
    background(0, 0, 0);
    //Change rotation value if mouse is pressed
    if(mouseIsPressed) {
        yRot -= (pmouseX - mouseX) * mouseSpeed;
        xRot += (pmouseY - mouseY) * mouseSpeed;
        if(xRot > Math.PI / 2) xRot = Math.PI / 2;
        if(xRot < -Math.PI / 2) xRot = -Math.PI / 2;
        if(yRot>Math.PI) yRot-=Math.PI*2;
        if(yRot<-Math.PI) yRot+=Math.PI*2;
    }
    pmouseX = mouseX;
    pmouseY = mouseY;
    //Set up transformation and draw cardinal indicator
    drawCardinalDirections();
    rotateX(xRot);
    rotateY(yRot);
    scale(50);
    stroke("#555555");
    strokeWeight(2);
    translate(-size[0]/2,-size[1]/2,-size[2]/2);
    //Loop through voxels
    for(let x = 0; x < size[0]; x++) for(let y = 0; y < size[1]; y++) for(let z = 0; z < size[2]; z++) {
        //Find array index of voxels
        let position = x + (y + z * size[1]) * size[0];
        if(voxels[position]) {
            //Find appropriate fill color
            if(voxels[position] == 2) fill("pink");
            else if(voxels[position] == 1) fill("white");
            //Draw voxel
            push();
            translate(x, y, z);
            box(1, 1, 1);
            pop();
        }
    }

}
function drawCardinalDirections() {
    strokeWeight(7);
    //Transformations
    push();
    translate(-windowWidth/2+50,windowHeight/2-50);
    push();
    rotateX(xRot);
    rotateY(yRot);
    scale(30);
    //Draw xyz lines
    stroke("red");
    line(0,0,0,1,0,0);
    stroke("green");
    line(0,0,0,0,1,0);
    stroke("blue");
    line(0,0,0,0,0,1);
    pop();
    //Draw small grey sphere at intersection point
    noStroke();
    fill("#666666");
    sphere(3);
    pop();
}