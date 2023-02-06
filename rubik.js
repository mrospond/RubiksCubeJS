function Rubik(element) {

    dimensions = 3;
    background =  0x403030;
  
    var width = element.innerWidth(),
        height = element.innerHeight();
  
  
    // Scena i parametry threejs
    var scene = new THREE.Scene(),
        camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000),
        renderer = new THREE.WebGLRenderer({ antialias: true });
  
    renderer.setClearColor(background, 1.0);
    renderer.setSize(width, height);
    renderer.shadowMapEnabled = false;
    element.append(renderer.domElement);
  
    camera.position = new THREE.Vector3(-30, 30, 20);
    camera.lookAt(scene.position);
    THREE.Object3D._threexDomEvent.camera(camera);
  
    scene.add(new THREE.AmbientLight(0xffffff));
  
    var orbitControl = new THREE.OrbitControls(camera, renderer.domElement);
  
    function enableCameraControl() {
      orbitControl.noRotate = false;
    }
  
    function disableCameraControl() {
      orbitControl.noRotate = true;
    }
  
    // Zmienne do ustalania czy współrzędne należą do którychś sześcianów
    var raycaster = new THREE.Raycaster(),
        projector = new THREE.Projector();
  
    // Listener dodawany do każdego sześcianu
    function isMouseOverCube(mouseX, mouseY) {
      var directionVector = new THREE.Vector3();
  
      //Normalise mouse x and y
      var x = ( mouseX / window.innerWidth ) * 2 - 1;
      var y = -( mouseY /  window.innerHeight ) * 2 + 1;
  
      // DirectionVector w połączeniu z projectorem i raycasterem służy do określenia czy  współrzędne 
      // należą do któregoś sześcianu w danej prespektywie
      directionVector.set(x, y, 1);
      

      projector.unprojectVector(directionVector, camera);
      directionVector.sub(camera.position);
      directionVector.normalize();
      raycaster.set(camera.position, directionVector);
  
      return raycaster.intersectObjects(allCubes, true).length > 0;
    }
  
    // Zmienne do śledzenia od którego sześcianu i której ściany zaczęliśmy kliknięcie
    var clickVector, clickFace;
  
    // Zmienna zapisująca na którym sześcianie zakończyliśmy kliknięcie
    var lastCube;
  
    var onCubeMouseDown = function(e, cube) {
      disableCameraControl();
  
        clickVector = cube.rubikPosition.clone();
        
        var centroid = e.targetFace.centroid.clone();
        centroid.applyMatrix4(cube.matrixWorld);
  
        // Która ściana kostki została kliknięta
        if(nearlyEqual(Math.abs(centroid.x), maxExtent))
          clickFace = 'x';
        else if(nearlyEqual(Math.abs(centroid.y), maxExtent))
          clickFace = 'y';
        else if(nearlyEqual(Math.abs(centroid.z), maxExtent))
          clickFace = 'z';     
    };
  
    //Macierz przejść mówiąca względem której osi ma być zrobiony obrót się obrócić
    var transitions = {
      'x': {'y': 'z', 'z': 'y'},
      'y': {'x': 'z', 'z': 'x'},
      'z': {'x': 'y', 'y': 'x'}
    }
  
    // Funkcja działająca po zakończeniu kliknięcia. 
    var onCubeMouseUp = function(e, cube) {

        var dragVector = cube.rubikPosition.clone();
        dragVector.sub(clickVector);
  
          //Rotate with the most significant component of the drag vector
          // (excluding the current axis, because we can't rotate that way)
          var dragVectorOtherAxes = dragVector.clone();
          dragVectorOtherAxes[clickFace] = 0;

          var maxAxis = 'x',
              max = Math.abs(dragVectorOtherAxes.x);
          if(Math.abs(dragVectorOtherAxes.y) > max) {
            maxAxis = 'y';
            max = Math.abs(dragVectorOtherAxes.y);
          }
          if(Math.abs(dragVectorOtherAxes.z) > max) {
            maxAxis = 'z';
            max = Math.abs(dragVectorOtherAxes.z);
          }
          
  
          var rotateAxis = transitions[clickFace][maxAxis],
              direction = dragVector[maxAxis] >= 0 ? 1 : -1;

          makeMove(cube, clickVector.clone(), rotateAxis, direction);
          enableCameraControl();
    };
  
    //If the mouse was released outside of the Rubik's cube, use the cube that the mouse 
    // was last over to determine which move to make
    var onCubeMouseOut = function(e, cube) {
      lastCube = cube;
    }
  
    element.on('mouseup', function(e) {
      if(!isMouseOverCube(e.clientX, e.clientY)) {
        if(lastCube)
          onCubeMouseUp(e, lastCube);
      }
    });
  
    /*** Build 27 cubes ***/

    var colours = [0xD40F4B, 0x108B72, 0x0042CD, 0xFF4300, 0xFFC300, 0xFFFFFF],
        faceMaterials = colours.map(function(c) {
          return new THREE.MeshLambertMaterial({ color: c , ambient: c });
        }),
        cubeMaterials = new THREE.MeshFaceMaterial(faceMaterials);
  
    var cubeSize = 3,
        spacing = 0.1;
  
    var increment = cubeSize + spacing,
        maxExtent = (cubeSize * 3 + spacing * 2) / 2, 
        allCubes = [];
  
    function newCube(x, y, z) {
      var cubeGeometry = new THREE.CubeGeometry(cubeSize, cubeSize, cubeSize);
      var cube = new THREE.Mesh(cubeGeometry, cubeMaterials);
      cube.castShadow = true;
  
      cube.position = new THREE.Vector3(x, y, z);
      cube.rubikPosition = cube.position.clone();
  
      cube.on('mousedown', function(e) {
        onCubeMouseDown(e, cube);
      });
  
      cube.on('mouseup', function(e) {
        onCubeMouseUp(e, cube);
      });
  
      cube.on('mouseout', function(e) {
        onCubeMouseOut(e, cube);
      });
  
      scene.add(cube);
      allCubes.push(cube);
    }
  
    var positionOffset = 1;
    for(var i = 0; i < 3; i ++) {
      for(var j = 0; j < 3; j ++) {
        for(var k = 0; k < 3; k ++) {
  
          var x = (i - positionOffset) * increment,
              y = (j - positionOffset) * increment,
              z = (k - positionOffset) * increment;
  
          newCube(x, y, z);
        }
      }
    }

  
    var isMoving = false,
        moveAxis, moveDirection,
        rotationSpeed = 0.2;
  
    // obiekt umozliwiajacy obracanie 
    var pivot = new THREE.Object3D(),
        activeGroup = [];
  
    function nearlyEqual(a, b, d) {
      d = d || 0.001;
      return Math.abs(a - b) <= d;
    }
  
    //Select the plane of cubes that aligns with clickVector
    // on the given axis
    function setActiveGroup(axis) {
      if(clickVector) {
        activeGroup = [];
  
        allCubes.forEach(function(cube) {
          if(nearlyEqual(cube.rubikPosition[axis], clickVector[axis])) { 
            activeGroup.push(cube);
          }
        });
      } else {
        console.log("Nothing to move!");
      }
    }

    var makeMove = function (cube, clickVector, axis, direction){
     
      move = { cube: cube, vector: clickVector, axis: axis, direction: direction }
  
      
        clickVector = move.vector;
        
        var direction = move.direction || 1,
            axis = move.axis;   
            isMoving = true;
            moveAxis = axis;
            moveDirection = direction;
  
            setActiveGroup(axis);
  
            pivot.rotation.set(0,0,0);
            pivot.updateMatrixWorld();
            scene.add(pivot);
  
            activeGroup.forEach(function(e) {
              THREE.SceneUtils.attach(e, scene, pivot);
            });
      }
  
    
  
    function doMove() {
      if(pivot.rotation[moveAxis] >= Math.PI / 2) {
        pivot.rotation[moveAxis] = Math.PI / 2;
        moveComplete();
      } else if(pivot.rotation[moveAxis] <= Math.PI / -2) {
        pivot.rotation[moveAxis] = Math.PI / -2;
        moveComplete()
      } else {
        pivot.rotation[moveAxis] += (moveDirection * rotationSpeed);
      }
    }
  
    var moveComplete = function() {
      isMoving = false;
      moveAxis, moveDirection = undefined;
      clickVector = undefined;
  
      pivot.updateMatrixWorld();

      // Usuwamy pivot ze sceny, i klonujemy male szesciany w odpowiednie miejsca
      scene.remove(pivot);
      activeGroup.forEach(function(cube) {
        cube.updateMatrixWorld();
  
        cube.rubikPosition = cube.position.clone();
        cube.rubikPosition.applyMatrix4(pivot.matrixWorld);
  
        THREE.SceneUtils.detach(cube, pivot, scene);
      });

  
    }
  
  
    function render() {
      
      if(isMoving) {
        doMove();
      } 
  
      renderer.render(scene, camera);
      requestAnimationFrame(render);
    }
    //Go!
    render();
    }
  