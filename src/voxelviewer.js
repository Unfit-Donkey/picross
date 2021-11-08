import * as THREE from "../three.js/build/three.module.js";
import {Puzzle} from "./picross.js";
const cell_broken = 1;
const cell_colored = 2;
const cell_unsure = 3;
window.THREE = THREE;
window.curPuzzle = Puzzle.fromString('Basic puzzle~3~MHF~+--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------~BBBBAAAAAAAAAABBCBCBGBGBCCCCBBFCFCJBGBAAAABBCBCBGBGBCCCCBBBBAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACBAAAAAAAAAAAAAAAAAAAACBHBCBCBCBCBEBAAAAAAAABBCBEBCBCBCBCBCBBBCCEBCBAACBHBCBCBCBCBEBAAAAAAAAAAAACBAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAECAAAAAAAAAAAAAABBAAAADBFBAAAAAAAAAAAABBBBBBBBDBDBAAAAAAAAAAAAAABBBBAAAADBDBDBDBDBDBBBBBBBAAAAAADBDBDBDBDBDBAAAAAAAAAAAACCAAAAAAAACCAAAAAAAAAAAACCAAAAAAAACCAAAAAAAA');
window.fullPuzzle = Puzzle.fromString('Basic puzzle~3~MHF~------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------~BBBBAAAAAAAAAABBCBCBGBGBCCCCBBFCFCJBGBAAAABBCBCBGBGBCCCCBBBBAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACBAAAAAAAAAAAAAAAAAAAACBHBCBCBCBCBEBAAAAAAAABBCBEBCBCBCBCBCBBBCCEBCBAACBHBCBCBCBCBEBAAAAAAAAAAAACBAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAECAAAAAAAAAAAAAABBAAAADBFBAAAAAAAAAAAABBBBBBBBDBDBAAAAAAAAAAAAAABBBBAAAADBDBDBDBDBDBBBBBBBAAAAAADBDBDBDBDBDBAAAAAAAAAAAACCAAAAAAAACCAAAAAAAAAAAACCAAAAAAAACCAAAAAAAA');
curPuzzle = Puzzle.fromString('Basic puzzle~3~MHF~                                                              +           +           +    +      +    +      ++++++      ++++++     ++          ++           +                                   ++++++      +++++++++ +++       ++ ++      +++          +   +    +      +    +      ++++++      ++++++     ++          ++           +                                                                       +           +         ~AAAAAAAAAABBBBCCCCGBGBCBCBBBAAAAGBJBFCFCBBCCCCGBGBCBCBBBAAAAAAAAAABBBBAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACBAAAAAAAAAAAAAAAAAAAACBHBCBCBCBCBEBAAAAAAAABBCBEBCBCBCBCBCBBBCCEBCBAACBHBCBCBCBCBEBAAAAAAAAAAAACBAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACCAAAAAAAACCAAAAAAAAAAAACCAAAAAAAACCAAAAAAAAAAAADBDBDBDBDBDBAAAAAAAAAAAADBDBDBDBDBDBBBBBBBAABBDBDBAAAAAAAAAAAAAABBBBAADBFBAAAAAAAAAAAABBBBBBAAAAECAAAAAAAAAAAAAABBAA');

window.scene = {
    camera: null,
    obj: null,
    renderer: null,
    voxels: [],
    materials: {
        unsure: new THREE.MeshStandardMaterial({color: 0xffffff}),
        painted: new THREE.MeshStandardMaterial({color: 0xbbff99, metalness: 0.5, roughness: 0}),
        selected: new THREE.MeshStandardMaterial({color: 0xff0000}),
        wire: new THREE.LineBasicMaterial({color: 0x444444, linewidth: 2}),
        text: [],
        textUnsure: [],
        textPainted: [],
    },
    geometry: {
    },
    debug: {
    },
    cardinal: [],
    input: {
        xRot: 0,
        yRot: 0,
        boxSize: 0,
        mouseX: 0,
        pmouseX: 0,
        mouseY: 0,
        pmouseY: 0,
        selectedBlock: -1,
        latestEvent: {},
    }
};
window.cameraPos;
document.body.onload = function () {
    createSceneBasics();
    createVoxelScene();
    resize();
    window.addEventListener("resize", resize);
    generateSidesVisible();
    updateRotation();

    render();
}
function resize() {
    //Compute camera variables
    let frustumSize = 10;
    let aspectRatio = window.innerWidth / window.innerHeight;
    let aspect = Math.sqrt(aspectRatio);
    scene.input.boxSize = window.innerWidth / 2 / frustumSize / aspect;
    //Change camera viewport
    scene.camera.left = -frustumSize * aspect;
    scene.camera.right = frustumSize * aspect;
    scene.camera.top = frustumSize / aspect;
    scene.camera.bottom = -frustumSize / aspect;
    scene.camera.updateMatrixWorld();
    scene.camera.updateProjectionMatrix();
    //Update cardinal directions
    for(let i = 0; i < 3; i++) {
        scene.cardinal[i].position.set(scene.camera.left + 1, scene.camera.bottom + 1, 0);
    }
    scene.renderer.setSize(window.innerWidth, window.innerHeight, true);
}
ontouchstart = function(e) {
    console.log(e.touches[0]);
    scene.input.mouseX=e.touches[0].clientX-window.innerWidth/2;
    scene.input.mouseY=-e.touches[0].clientY+window.innerHeight/2;
}
onmousemove = function (e) {
    scene.input.pmouseX = scene.input.mouseX;
    scene.input.pmouseY = scene.input.mouseY;
    if(e.type == "touchmove") {
        scene.input.mouseX = e.touches[0].clientX - window.innerWidth / 2;
        scene.input.mouseY = -e.touches[0].clientY + window.innerHeight / 2;
    }
    else {
        scene.input.mouseX = e.clientX - window.innerWidth / 2;
        scene.input.mouseY = -e.clientY + window.innerHeight / 2;
    }
    scene.input.latestEvent = e;
    if(e.buttons & 1 == 1||e.type=="touchmove") updateRotation();
}
ontouchmove = onmousemove;
onkeyup = onkeydown = function (e) {
    scene.input.latestEvent = e;
}
function rayIntersect(start, vel) {
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
function render() {
    if(scene.input.selectedBlock != -1) scene.voxels[scene.input.selectedBlock].material = scene.materials.unsure;
    if(scene.input.latestEvent.shiftKey || scene.input.latestEvent.ctrlKey) {
        let cursorPos = getCursorPosition();
        let direction = new THREE.Vector3(0, 0, 0).copy(scene.camera.position).multiplyScalar(-1).normalize();
        scene.input.selectedBlock = rayIntersect(cursorPos, direction);
        if(scene.input.selectedBlock != -1) scene.voxels[scene.input.selectedBlock].material = scene.materials.selected;
    }
    else scene.input.selectedBlock = -1;
    requestAnimationFrame(render);
    scene.renderer.clear();
    scene.renderer.render(scene.obj, scene.camera);
}
window.destroyObjects = function (object, scene) {
    if(typeof object != "object") return;
    else if(object instanceof THREE.Mesh || object instanceof THREE.Line) scene.remove(object);
    else if(object instanceof THREE.Object3D) return;
    else if(object instanceof THREE.Material) return;
    else for(let i in object) destroyObjects(object[i], scene);
}
function createSceneBasics() {
    //Camera, scene, and renderer
    scene.renderer = new THREE.WebGLRenderer({antialias: true});
    scene.renderer.setClearColor(0xffffff);
    scene.camera = new THREE.OrthographicCamera(0, 0, 0, 0, -1000, 1000);
    scene.obj = new THREE.Scene();
    scene.obj.add(scene.camera);
    scene.camera.position.set(50, 0, 0);
    document.body.appendChild(scene.renderer.domElement);
    //Lighting
    scene.ambientLight = new THREE.AmbientLight(0x999999, 1);
    scene.obj.add(scene.ambientLight);
    scene.light = new THREE.PointLight(0xfff8ee, 1, 0, 1);
    scene.camera.add(scene.light);
    scene.light.position.set(0, 10, -30);
    //Cardinal indicator
    const cardinalColors = [0xFF0000, 0x00FF00, 0x0000FF];
    const directions = ['x', 'y', 'z'];
    for(let i = 0; i < 3; i++) {
        let endPosition = new THREE.Vector3();
        endPosition[directions[i]] = 1;
        scene.cardinal[i] = new THREE.Line(
            new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), endPosition]),
            new THREE.LineBasicMaterial({color: cardinalColors[i]})
        );
        scene.camera.add(scene.cardinal[i]);
    }
    //Debug objects
    //scene.debug.cursorIndicator=new THREE.Mesh(geometry,scene.materials.painted);
    //scene.obj.add(scene.debug.cursorIndicator);
}
function createVoxelScene() {
    scene.geometry.box = new THREE.BoxGeometry(1, 1, 1);
    scene.geometry.wire = new THREE.EdgesGeometry(scene.geometry.box);
    scene.geometry.wire.scale(1.001, 1.001, 1.001);
    //Loop through voxels
    const size = curPuzzle.size;
    for(let x = 0; x < size[0]; x++) for(let y = 0; y < size[1]; y++) for(let z = 0; z < size[2]; z++) {
        //Find array index of voxels
        let position = x + (y + z * size[1]) * size[0];
        scene.voxels[position] = voxelMesh(x, y, z, position);
        scene.obj.add(scene.voxels[position]);
    }
}
function voxelMesh(x, y, z, position) {
    let cell = curPuzzle.shape[position];
    let materials = [];
    for(let i = 0; i < 3; i++) {
        let hint = curPuzzle.getHintPosition(position, i);
        let material = getVoxelTexture(curPuzzle.hintsTotal[hint], curPuzzle.hintsPieces[hint], cell);
        materials[i * 2] = material;
        materials[i * 2 + 1] = material;
    }
    let mesh = new THREE.Mesh(scene.geometry.box, materials);
    let pos = new THREE.Vector3(x - curPuzzle.size[0] / 2 + 0.5, y - curPuzzle.size[1] / 2 + 0.5, z - curPuzzle.size[2] / 2 + 0.5);
    mesh.position.copy(pos);

    mesh.add(new THREE.LineSegments(scene.geometry.wire, scene.materials.wire));
    return mesh;
}
function getVoxelTexture(hint, hintPieces, cellType) {
    if(cellType == cell_unsure) {
        if(hintPieces == 0) return scene.materials.unsure;
        else if(scene.materials.textUnsure[hint] == null) {
            scene.materials.textUnsure[hint] = new THREE.MeshStandardMaterial().copy(scene.materials.unsure);
            let texture = getTextTexture(hint);
            scene.materials.textUnsure[hint].map = texture;
        }
        return scene.materials.textUnsure[hint];

    }
    if(cellType == cell_colored) {
        if(hintPieces == 0) return scene.materials.painted;
        else if(scene.materials.textPainted[hint] == null) {
            scene.materials.textPainted[hint] = new THREE.MeshStandardMaterial().copy(scene.materials.painted);
            let texture = getTextTexture(hint);
            scene.materials.textPainted[hint].map = texture;
        }
        return scene.materials.textPainted[hint];

    }

}
window.getTextTexture = function (num) {
    let context = document.getElementById("textRender").getContext("2d");
    context.clearRect(0, 0, 50, 50);
    context.font = "40px Consolas";
    context.fillStyle = "black";
    context.textAlign = "center";
    context.fillText(num, 25, 40);
    let imageData = context.getImageData(0, 0, 50, 50).data;
    let grayscale = new Uint8Array(50 * 50);
    for(let x = 0; x < 50; x++) for(let y = 0; y < 50; y++) grayscale[x + y * 50] = 255 - imageData[(x + (49 - y) * 50) * 4 + 3];
    let texture = new THREE.DataTexture(grayscale, 50, 50, THREE.LuminanceFormat, THREE.UnsignedByteType);
    texture.magFilter = THREE.LinearFilter;
    texture.minFilter = THREE.LinearFilter;
    texture.anisotropy = 16;
    return texture;
}
function updateRotation() {
    let oldVisibleSideMap = (scene.camera.position.x > 0 ? 2 : 1) + (scene.camera.position.y > 0 ? 2 : 1) * 4 + (scene.camera.position.z > 0 ? 2 : 1) * 16;
    const mouseSpeed = 0.006;
    let inp = scene.input;
    inp.yRot -= (inp.pmouseX - inp.mouseX) * mouseSpeed;
    inp.xRot += (inp.pmouseY - inp.mouseY) * mouseSpeed;
    if(inp.xRot > Math.PI / 2) inp.xRot = Math.PI / 2;
    if(inp.xRot < -Math.PI / 2) inp.xRot = -Math.PI / 2;
    if(inp.yRot > Math.PI * 2) inp.yRot -= Math.PI * 2;
    if(inp.yRot < 0) inp.yRot += Math.PI * 2;
    scene.camera.position.set(Math.sin(inp.yRot) * - Math.cos(inp.xRot), Math.sin(inp.xRot), Math.cos(inp.xRot) * Math.cos(inp.yRot));
    scene.camera.position.multiplyScalar(50);
    scene.camera.lookAt(0, 0, 0);
    scene.camera.updateProjectionMatrix();
    for(let i = 0; i < 3; i++) {
        scene.cardinal[i].setRotationFromEuler(new THREE.Euler(inp.xRot, inp.yRot, 0));
    }
    let visibleSideMap = (scene.camera.position.x > 0 ? 2 : 1) + (scene.camera.position.y > 0 ? 2 : 1) * 4 + (scene.camera.position.z > 0 ? 2 : 1) * 16;
    if(oldVisibleSideMap != visibleSideMap) for(let i = 0; i < curPuzzle.shapeSize; i++) {
        let isVisible = (curPuzzle.visibleSides[i] & visibleSideMap) == 0 ? false : true;
        scene.voxels[i].visible = isVisible;
    }
}
//Returns the position of the cursor in 3d space
window.getCursorPosition = function () {
    let xRot = scene.input.xRot;
    let yRot = scene.input.yRot;
    let xPixelStep = new THREE.Vector3(1, 0, Math.tan(yRot)).normalize();
    if(yRot > Math.PI / 2 && yRot < 3 * Math.PI / 2) {
        xPixelStep.x = -xPixelStep.x;
        xPixelStep.z = -xPixelStep.z;
    }
    let yPixelStep = new THREE.Vector3(Math.sin(yRot), 1 / Math.tan(xRot), -Math.cos(yRot)).normalize();
    xPixelStep.multiplyScalar(scene.input.mouseX / scene.input.boxSize);
    yPixelStep.multiplyScalar((xRot < 0 ? -1 : 1) * scene.input.mouseY / scene.input.boxSize);
    let cursorPos = new THREE.Vector3(0, 0, 0).add(xPixelStep).add(yPixelStep).add(scene.camera.position);
    //scene.debug.cursorIndicator.position.set(cursorPos.x,cursorPos.y,cursorPos.z);
    cursorPos.x += curPuzzle.size[0] / 2;
    cursorPos.y += curPuzzle.size[1] / 2;
    cursorPos.z += curPuzzle.size[2] / 2;
    return cursorPos;
}
window.generateSidesVisible = function () {
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